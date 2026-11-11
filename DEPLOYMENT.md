# Panduan Deploy Aplikasi CBT (SIAP SMP)

Aplikasi ini terdiri dari frontend (Vite/React) dan backend (Node.js) yang menyimpan data ke file JSON di folder `server-data/`. Agar bisa diakses dari mana saja (termasuk data seluler), deploy ke server publik dengan salah satu cara berikut.

## 🆓 Rekomendasi: Deploy GRATIS (Fly.io)

**Fly.io** adalah pilihan gratis terbaik untuk aplikasi ini karena:
- ✅ **Gratis** (free tier: 3 VM kecil + 3GB storage persisten)
- ✅ **Data tidak hilang** (persistent volume untuk `server-data/`)
- ✅ **HTTPS otomatis** (sertifikat SSL gratis)
- ✅ **Tidak sleep** (tidak seperti Render free tier yang mati saat tidak dipakai)
- ⚠️ Memerlukan kartu kredit untuk verifikasi (tidak akan ditagih selama dalam free tier)

### Langkah deploy ke Fly.io (±10 menit)
```bash
# 1. Install flyctl (CLI Fly.io)
# Windows (PowerShell):
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
# Mac/Linux:
curl -L https://fly.io/install.sh | sh

# 2. Login / buat akun
fly auth login

# 3. Masuk ke folder project
cd Open-Project

# 4. Launch app (Fly.io baca fly.toml otomatis)
fly launch --no-deploy
#   -> konfirmasi nama app, region (pilih Singapore "sin")
#   -> JANGAN buat Postgres (tidak perlu)

# 5. Buat persistent volume untuk data
fly volumes create cbt_data --size 1 --region sin

# 6. Deploy!
fly deploy

# 7. Buka aplikasi
fly open
```
Aplikasi terbuka di `https://siap-cbt.fly.dev/`. Siswa buka `https://siap-cbt.fly.dev/ujian`.

### Update aplikasi setelah perubahan kode
```bash
fly deploy   # rebuild & redeploy otomatis
```

---

## Opsi A — Docker (di VPS/komputer sendiri)

### Jalankan di komputer/VPS sendiri
```bash
docker build -t siap-cbt .
docker run -d --name siap-cbt \
  -p 80:3000 \
  -v cbt-data:/app/server-data \
  --restart unless-stopped \
  siap-cbt
```

### Atau pakai docker-compose
```bash
docker compose up -d --build
```

### Pasang HTTPS (wajib untuk produksi)
Gunakan Nginx/Caddy sebagai reverse proxy dengan sertifikat Let's Encrypt. Contoh Caddy (otomatis HTTPS):
```bash
# /etc/caddy/Caddyfile
cbt.sekolah.sch.id {
    reverse_proxy localhost:3000
}
```

---

## Opsi B — VPS tanpa Docker (PM2 + Nginx)

```bash
sudo apt update && sudo apt install -y nodejs npm nginx
git clone <repo-url> /opt/siap-cbt && cd /opt/siap-cbt
npm ci
npm run build
sudo npm i -g pm2
PORT=3000 pm2 start server.cjs --name siap-cbt
pm2 save && pm2 startup
```

Konfigurasi Nginx (`/etc/nginx/sites-available/cbt`):
```nginx
server {
    listen 80;
    server_name cbt.sekolah.sch.id;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/cbt /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d cbt.sekolah.sch.id
```

---

## Opsi C — Platform PaaS (Render / Railway)

### Render (gratis, tapi data hilang saat restart di free tier)
1. Push repo ke GitHub.
2. Buat Web Service baru di render.com, set:
   - **Build command**: `npm ci && npm run build`
   - **Start command**: `node server.cjs`
   - **Environment**: `NODE_ENV=production`
3. ⚠️ Free tier Render **tidak mendukung persistent disk** — data `cbt.json` akan hilang saat spin-down. Untuk data persisten, upgrade ke paid plan ($7/bulan) atau gunakan Fly.io (gratis dengan persistent volume).

### Railway (gratis $5/bulan credit)
1. Push repo ke GitHub.
2. Buat project di railway.app → Deploy from GitHub.
3. Tambahkan **Volume** yang di-mount ke `/app/server-data`.

---

## 🆓 Perbandingan Pilihan Gratis

| Platform | Biaya | Persistent Data | Sleep/Cold Start | HTTPS | Kartu Kredit |
|----------|-------|-----------------|------------------|-------|--------------|
| **Fly.io** | Gratis (free tier) | ✅ Ya (3GB) | ❌ Tidak sleep | ✅ Otomatis | ⚠️ Verifikasi saja |
| **Render free** | Gratis | ❌ Tidak (data hilang) | ✅ Sleep 15 menit | ✅ Otomatis | ❌ Tidak perlu |
| **Railway** | $5 credit/bulan | ✅ Ya | ❌ Tidak sleep | ✅ Otomatis | ⚠️ Perlu |
| **Oracle Cloud** | Always Free | ✅ Ya (VM) | ❌ Tidak sleep | ⚠️ Manual | ⚠️ Verifikasi |
| **VPS** | ~$5/bulan | ✅ Ya | ❌ Tidak sleep | ⚠️ Manual | ⚠️ Perlu |

**Rekomendasi: Fly.io** — gratis, data persisten, HTTPS otomatis, tidak sleep. Paling cocok untuk CBT sekolah.

---

## Checklist sebelum go-live

- [ ] `npm run build` sukses (sudah teruji).
- [ ] HTTPS aktif (wajib agar fitur fullscreen/clipboard di browser HP tidak diblokir).
- [ ] Backup berkala folder `server-data/` (cron harian: `tar czf backup-$(date +%F).tgz server-data/`).
- [ ] Ganti password akun demo (`admin123` / `guru123`) sebelum produksi.
- [ ] Test akses dari HP dengan **data seluler** (bukan WiFi sekolah) ke URL produksi.
- [ ] Pastikan port server terbuka di firewall (80/443 untuk publik).

## Mode Ujian Siswa

Setelah deploy, siswa membuka dari HP/laptop mana saja:
```
https://siap-cbt.fly.dev/ujian
```
Masukkan **NISN** + **token ujian** dari guru → Mulai Ujian. Tidak perlu install aplikasi.

## Catatan teknis

- Server mendengarkan di `0.0.0.0` (semua interface) dan membaca `PORT` dari environment — cocok untuk container/PaaS.
- Data disimpan di `server-data/state.json`, `attendance.json`, `cbt.json` (JSON file). Untuk skala besar (>1000 siswa / banyak ujian bersamaan), pertimbangkan migrasi ke database (PostgreSQL) di masa depan.
- Sinkronisasi antar perangkat berjalan otomatis setiap 15–30 detik.

## Opsi A — Docker (paling mudah & portabel)

### Jalankan di komputer/VPS sendiri
```bash
# 1. Build image
docker build -t siap-cbt .

# 2. Jalankan container (data persisten di volume "cbt-data")
docker run -d --name siap-cbt \
  -p 80:3000 \
  -v cbt-data:/app/server-data \
  --restart unless-stopped \
  siap-cbt
```
Aplikasi terbuka di `http://IP-server/`. Data tersimpan di volume Docker, tidak hilang saat container restart.

### Atau pakai docker-compose
```bash
docker compose up -d --build
```
Lalu buka `http://IP-server:3000/`.

### Pasang HTTPS (wajib untuk produksi)
Gunakan Nginx/Caddy sebagai reverse proxy dengan sertifikat Let's Encrypt. Contoh Caddy (otomatis HTTPS):
```bash
# /etc/caddy/Caddyfile
cbt.sekolah.sch.id {
    reverse_proxy localhost:3000
}
```
Lalu `systemctl reload caddy`.

## Opsi B — VPS tanpa Docker (PM2 + Nginx)

```bash
# di server (Ubuntu/Debian)
sudo apt update && sudo apt install -y nodejs npm nginx
git clone <repo-url> /opt/siap-cbt && cd /opt/siap-cbt
npm ci
npm run build
sudo npm i -g pm2
PORT=3000 pm2 start server.cjs --name siap-cbt
pm2 save && pm2 startup
```
Konfigurasi Nginx (`/etc/nginx/sites-available/cbt`):
```nginx
server {
    listen 80;
    server_name cbt.sekolah.sch.id;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/cbt /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
# SSL:
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d cbt.sekolah.sch.id
```

## Opsi C — Platform PaaS (Render / Railway / Fly.io)

1. Push repo ke GitHub.
2. Buat Web Service baru, set:
   - **Build command**: `npm run build`
   - **Start command**: `node server.cjs`
   - **Environment**: `NODE_ENV=production` (PORT disediakan platform)
3. **Penting — persistent storage**:
   - Render: tambahkan **Disk** yang di-mount ke `/app/server-data`.
   - Railway: tambahkan **Volume** yang di-mount ke `/app/server-data`.
   - Tanpa ini, data `cbt.json`/`state.json` akan hilang saat restart/redeploy.

## Checklist sebelum go-live

- [ ] `npm run build` sukses (sudah teruji).
- [ ] HTTPS aktif (wajib agar fitur fullscreen/clipboard tidak diblokir browser).
- [ ] Backup berkala folder `server-data/` (cron harian: `tar czf backup-$(date +%F).tgz server-data/`).
- [ ] Ganti password akun demo (`admin123` / `guru123`) sebelum produksi.
- [ ] Test akses dari HP dengan **data seluler** (bukan WiFi sekolah) ke `https://cbt.sekolah.sch.id/ujian`.
- [ ] Pastikan port server terbuka di firewall (80/443 untuk publik).

## Mode Ujian Siswa

Setelah deploy, siswa membuka dari HP/laptop mana saja:
```
https://cbt.sekolah.sch.id/ujian
```
Masukkan **NISN** + **token ujian** dari guru → Mulai Ujian. Tidak perlu install aplikasi.

## Catatan teknis

- Server mendengarkan di `0.0.0.0` (semua interface) dan membaca `PORT` dari environment — cocok untuk container/PaaS.
- Data disimpan di `server-data/state.json`, `attendance.json`, `cbt.json` (JSON file). Untuk skala besar (>1000 siswa / banyak ujian bersamaan), pertimbangkan migrasi ke database (PostgreSQL) di masa depan.
- Sinkronisasi antar perangkat berjalan otomatis setiap 15–30 detik.