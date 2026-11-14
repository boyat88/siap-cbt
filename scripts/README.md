# Menjalankan SIAP SMP otomatis

Folder ini berisi skrip untuk menjaga aplikasi tetap bisa dibuka kapan saja.

## Cara kerja

| Komponen | Fungsi |
| --- | --- |
| `scripts/start-server.cmd` | Menjalankan server produksi (`server.cjs`) di port `5173`. Jika server berhenti/crash, otomatis dijalankan ulang setelah 5 detik. Berguna untuk dinyalakan manual dengan jendela log. |
| `scripts/stop-server.cmd` | Mematikan server untuk sementara (termasuk pembungkus yang menyalakannya ulang). |
| `scripts/matikan-server-permanen.cmd` | Mematikan server permanen: menghentikan proses, menghapus auto-start, dan menonaktifkan shortcut. Data tidak dihapus. |
| `scripts/open-app.ps1` | Membuka aplikasi di tab browser biasa. Menyalakan server lebih dulu bila belum berjalan, dengan pengecekan TCP cepat sehingga aplikasi terbuka dalam waktu kurang dari 1 detik. Browser dipilih otomatis: **Edge**, lalu Chrome, lalu browser Chromium lain, lalu browser default. |
| `scripts/buka-siap.cmd` | Versi tanpa PowerShell dari `open-app.ps1`: cek server lewat Node, nyalakan bila perlu, lalu buka browser. Cocok saat PowerShell diblokir kebijakan Windows. |
| `scripts/start-server-senyap.vbs` | Menyalakan server tanpa jendela console. Dipakai pintasan auto-start di folder Startup. |
| `scripts/buat-shortcut-siap.vbs` | Membuat pintasan Desktop, Start Menu, dan auto-start tanpa PowerShell. Cukup klik dua kali. |
| `scripts/create-shortcut.ps1` | Membuat shortcut `SIAP SMP` di Desktop dan Start Menu beserta ikonnya. |
| `scripts/pindah-laptop.ps1` | Membuat paket ZIP siap pindah laptop (aplikasi + data + Node.js portabel). |
| `scripts/pasang-di-laptop-baru.ps1` | Memasang paket di laptop baru: auto-start, shortcut, server, dan info alamat LAN. |
| Startup `SIAP-Server.bat` | Menjalankan server produksi otomatis saat Windows login, tanpa jendela tambahan. |
| `logs/server.log` | Catatan aktivitas server. Diputar otomatis jika melebihi 5 MB. |

Semua skrip menghitung lokasi folder aplikasi dari keberadaan file skrip
(`scripts\`), jadi folder aplikasi bebas dipindah ke drive atau laptop lain.
Jika ada `runtime\node.exe` di dalam folder aplikasi, Node portabel itu yang
dipakai lebih dulu.

## Perintah berguna

```cmd
:: jalankan server sekarang (dengan jendela log)
scripts\start-server.cmd

:: hentikan sementara (bisa menyala lagi saat login/shortcut diklik)
scripts\stop-server.cmd

:: matikan permanen (untuk laptop lama setelah pindah)
scripts\matikan-server-permanen.cmd

:: lihat isi log server
type logs\server.log
```

`stop-server.cmd` menghentikan proses Node **dan** pembungkus
`start-server.cmd`, sehingga server tidak langsung menyala ulang. Jika hanya
ingin berhenti sementara, cukup jalankan skrip itu. Untuk laptop lama yang
sudah digantikan laptop baru, gunakan `matikan-server-permanen.cmd` agar
server tidak menyala lagi saat Windows login.

Jika server ternyata dijalankan oleh akun Administrator/sistem, Windows akan
menolak menghentikannya. Kedua skrip di atas otomatis meminta izin
Administrator (UAC); cukup pilih **Yes**. Bila permintaan itu dibatalkan,
`matikan-server-permanen.cmd` tetap menghapus auto-start dan menonaktifkan
shortcut, sehingga server tidak menyala lagi setelah Windows restart.

Server juga dinyalakan otomatis saat login lewat `SIAP-Server.bat` di folder
Startup. Shortcut `SIAP SMP` akan menyalakannya sendiri bila belum berjalan.

## Alamat akses

- Komputer ini: http://localhost:5173
- Jaringan lokal: http://<IP-komputer>:5173
- Shortcut `SIAP SMP` di Desktop dan Start Menu langsung membuka aplikasi
  sebagai tab browser biasa.
- Browser yang dipakai berurutan: **Microsoft Edge** → Google Chrome → Brave/Opera/Vivaldi → browser default.

## Akun & hak akses

- **Administrator** mengelola seluruh aplikasi: data kelas, data guru & akun
  login, data siswa, absensi, rekap, laporan, tanda tangan, tema, dan pengaturan.
- **Guru** harus didaftarkan dan diaktifkan administrator terlebih dahulu melalui
  **Data Guru → Tambah/Ubah Guru → Akun Login Guru (e-Rapor)**. Email guru
  menjadi username, sedangkan kata sandi diatur administrator (minimal 6 karakter).
- Guru yang belum memiliki akun aktif tidak dapat masuk walaupun emailnya ada.
- Hak akses guru dibatasi pada: mengisi absensi, melihat riwayat absensi,
  menambah/mengubah data siswa, mencetak rekap, dan mencetak laporan.
- Menu **Data Kelas**, **Data Guru**, **Tanda Tangan**, dan **Pengaturan** hanya
  tampil untuk administrator. Akses langsung ke alamat menu tersebut otomatis
  dialihkan ke Dashboard.
- Impor/Ekspor Excel dan hapus data siswa hanya tersedia untuk administrator.
- Menu akun di kiri bawah sidebar berisi **Profil Saya**, **Kelola Akun Guru**
  (admin), **Pengaturan** (admin), dan **Keluar**.

## Sinkronisasi absensi ke server administrator

Semua absensi yang disimpan guru otomatis dikirim ke server aplikasi:

- Endpoint: `POST/GET/DELETE /api/attendance` (dilayani `server.cjs`).
- Penyimpanan server: `server-data/attendance.json`.
- Aplikasi menarik dan mengirim data otomatis setiap 30 detik, serta saat absensi disimpan.
- Tombol status **Tersinkron / Menyinkronkan / Server offline** pada halaman
  **Absensi** dapat diklik untuk sinkronisasi manual.
- Jika server sedang mati, absensi disimpan di antrean lokal
  (`siap-absensi-pending-attendance-v1`) dan dikirim ulang otomatis saat server hidup.
- Sesi yang dihapus administrator tidak akan muncul kembali walaupun masih ada
  di perangkat guru, karena server menyimpan penanda penghapusan (tombstone).
- Server harus menyala agar absensi terkirim. Data tetap aman di perangkat
  masing-masing sampai berhasil disinkronkan.

## Backup & restore data

Buka **Pengaturan → Cadangan & Pemulihan**:

- **Unduh Cadangan (JSON)** menyimpan seluruh data (siswa, guru, kelas, absensi,
  pengaturan, foto, dan profil pengguna) ke satu file.
- **Pilih File Cadangan** memulihkan data dari file tersebut. Data saat ini
  akan diganti setelah konfirmasi.
- **Pengaturan Tampilan Perangkat** menyimpan tema/warna per akun, menu yang
  disembunyikan, dan status sidebar. Bagian ini perlu diunduh dan dipulihkan
  terpisah karena tidak ikut tersimpan di server. Alamat server tidak ikut
  diekspor karena bersifat khusus perangkat.

Menu **Pengaturan → Zona Berbahaya → Hapus Semua Siswa & Guru** menghapus
seluruh data siswa, guru, sesi absensi, dan notifikasi sekaligus. Data kelas
dan pengaturan sekolah tetap dipertahankan.

## Tema & tampilan

Klik tombol **Tema & Tampilan** di menu kiri (di atas menu akun), atau tombol
**palet warna** di kanan bawah layar. Tersedia:

- 28 pilihan warna tema, **12 warna pekat kontras tinggi**, plus pemilih warna kustom.
- Pengatur **transparansi panel** dan **efek kaca (blur)**.
- 11 latar belakang bawaan (gradien dan pola) serta unggah foto latar sendiri.
- Tombol **atur ulang tema** untuk kembali ke tampilan awal.

Setiap akun memiliki tema sendiri. Perubahan tema pada satu akun tidak mengubah
tampilan akun lain, dan tema tetap tersimpan setelah login ulang.

## Data guru & multi mata pelajaran

Buka **Data Guru → Tambah/Ubah Guru**. Pada bagian **Mata Pelajaran**, klik semua
mapel yang diampu guru tersebut. Tidak ada batas jumlah mata pelajaran per guru;
setiap mapel tampil sebagai label pada daftar guru dan dapat difilter.

Saat impor Excel, isi kolom `MATA_PELAJARAN` dengan satu atau beberapa mapel
yang dipisahkan tanda `;` atau `,`, misalnya `Matematika; Ilmu Pengetahuan Alam`.

## Tanda tangan laporan

Buka **Sistem → Tanda Tangan** untuk mengunggah tanda tangan kepala sekolah
dan setiap wali kelas. Nama pada bagian penandatanganan laporan otomatis
menggunakan nama lengkap beserta gelar dari data guru/identitas sekolah.

- Format yang disarankan: PNG transparan atau foto tanda tangan berlatar putih.
- Latar putih pada gambar akan dibersihkan otomatis.
- Tanda tangan langsung tampil di **Laporan → bagian penandatanganan** dan ikut tercetak.
- Tanda tangan wali kelas mengikuti guru yang ditetapkan sebagai wali kelas pada **Data Kelas**.

## Menyembunyikan menu

- Klik tombol panel di header aplikasi (layar desktop) untuk menyembunyikan atau
  menampilkan kembali seluruh sidebar.
- Buka **Pengaturan → Menu Navigasi** untuk menyembunyikan menu tertentu tanpa
  menghapus data. Menu **Dashboard** dan **Pengaturan** selalu ditampilkan agar
  pengaturan tetap dapat dibuka kembali.
- Preferensi menu dan status sidebar tersimpan otomatis di perangkat.

## Pindah ke laptop lain

Seluruh data tersimpan di folder `server-data` (bukan di dalam browser), jadi
memindahkan folder aplikasi berarti memindahkan semua data siswa, guru, kelas,
absensi, pengaturan sekolah, foto, dan akun guru.

1. Di laptop lama, jalankan:

   ```cmd
   C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe -NoProfile -ExecutionPolicy Bypass -File D:\Open-Project\scripts\pindah-laptop.ps1
   ```

   Skrip membuat `SIAP-SMP-Pindah-<tanggal>.zip` di Desktop. Paket sudah berisi
   `dist`, `server.cjs`, `server-data`, `scripts`, `public`, dan Node.js portabel
   di `runtime\node.exe`, sehingga laptop baru tidak perlu internet atau
   pemasangan Node.js.

2. Salin ZIP ke laptop baru, ekstrak (mis. ke `D:\SIAP-SMP`), lalu jalankan
   `PASANG-SIAP.bat` atau:

   ```cmd
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\pasang-di-laptop-baru.ps1
   ```

3. Pemasang membuat auto-start, shortcut, menyalakan server, dan menampilkan
   alamat LAN. Login memakai akun yang sama seperti sebelumnya.

4. Agar tema/warna per akun ikut pindah, di laptop lama buka **Pengaturan →
   Pengaturan Tampilan Perangkat → Unduh Pengaturan (JSON)**, lalu pulihkan file
   itu di laptop baru. Data utama tidak perlu diimpor ulang.

## Jika PowerShell diblokir Windows

Sebagian komputer sekolah memblokir PowerShell dengan pesan *"This operation has
been cancelled due to restrictions in effect on this computer"*. Aplikasi tetap
bisa dipakai tanpa PowerShell:

```cmd
:: nyalakan server (bila perlu) + buka browser
scripts\buka-siap.cmd
```

Untuk membuat pintasan Desktop, Start Menu, dan auto-start saat login, klik dua
kali:

```cmd
scripts\buat-shortcut-siap.vbs
```

Bila Windows menolak menjalankan file dari internet, klik kanan file →
**Properties** → centang **Unblock** → **OK**.

## Membuat ulang shortcut

Jika shortcut terhapus atau folder aplikasi dipindahkan, jalankan dari folder
aplikasi:

```cmd
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\create-shortcut.ps1
```

Tanpa PowerShell, klik dua kali `scripts\buat-shortcut-siap.vbs`.

Ikon shortcut memakai `public\app-icon.ico` (cadangan: `public\siap.ico`).

## Catatan

Aplikasi hanya bisa diakses selama komputer menyala dan terhubung ke jaringan.
Jika Windows dimatikan, server ikut berhenti dan akan hidup lagi otomatis
saat Windows dinyalakan kembali.
