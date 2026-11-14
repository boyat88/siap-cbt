# Membuat paket aplikasi SIAP SMP untuk dipindah ke laptop lain.
#
# Paket berisi aplikasi siap pakai + seluruh data server + Node.js portabel,
# sehingga laptop tujuan tidak perlu memasang Node.js atau mengunduh apa pun.
#
# Jalankan dari folder aplikasi:
#   powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\pindah-laptop.ps1
#
# Hasil: file ZIP di Desktop dengan nama SIAP-SMP-Pindah-<tanggal>.zip

$ErrorActionPreference = 'Stop'
$AppDir = Split-Path -Parent $PSScriptRoot
$DateTag = Get-Date -Format 'yyyy-MM-dd'
$PackageName = 'SIAP-SMP'
$StagingRoot = Join-Path $env:TEMP ("siap-smp-pindah-" + [Guid]::NewGuid().ToString('N').Substring(0, 8))
$StagingDir = Join-Path $StagingRoot $PackageName
$Desktop = [Environment]::GetFolderPath('Desktop')
if (-not $Desktop -or -not (Test-Path $Desktop)) { $Desktop = $AppDir }
$ZipPath = Join-Path $Desktop ("SIAP-SMP-Pindah-" + $DateTag + ".zip")

function Write-Step {
    param([string]$Text)
    Write-Host ""
    Write-Host "==> $Text" -ForegroundColor Cyan
}

function Copy-Folder {
    param([string]$Source, [string]$Destination)
    if (-not (Test-Path $Source)) { throw "Folder tidak ditemukan: $Source" }
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    $null = robocopy $Source $Destination /E /NFL /NDL /NJH /NJS /NP /R:1 /W:1
    if ($LASTEXITCODE -ge 8) {
        throw "Gagal menyalin $Source (kode robocopy $LASTEXITCODE)."
    }
    $global:LASTEXITCODE = 0
}

Write-Host "SIAP SMP - Membuat paket pindah laptop" -ForegroundColor Green
Write-Host "Folder aplikasi: $AppDir"

Write-Step "Memeriksa file penting"
$required = @(
    (Join-Path $AppDir 'server.cjs'),
    (Join-Path $AppDir 'dist\index.html'),
    (Join-Path $AppDir 'server-data\state.json'),
    (Join-Path $AppDir 'scripts\pasang-di-laptop-baru.ps1')
)
foreach ($file in $required) {
    if (-not (Test-Path $file)) { throw "File penting tidak ditemukan: $file" }
}
Write-Host "Aplikasi, data server, dan skrip pemasangan lengkap." -ForegroundColor Green

Write-Step "Menyiapkan folder paket"
if (Test-Path $StagingRoot) { Remove-Item -Recurse -Force $StagingRoot }
New-Item -ItemType Directory -Path $StagingDir -Force | Out-Null

Copy-Folder -Source (Join-Path $AppDir 'dist') -Destination (Join-Path $StagingDir 'dist')
Copy-Folder -Source (Join-Path $AppDir 'server-data') -Destination (Join-Path $StagingDir 'server-data')
Copy-Folder -Source (Join-Path $AppDir 'scripts') -Destination (Join-Path $StagingDir 'scripts')
Copy-Folder -Source (Join-Path $AppDir 'public') -Destination (Join-Path $StagingDir 'public')
Copy-Item -Path (Join-Path $AppDir 'server.cjs') -Destination $StagingDir

$packageJson = Join-Path $AppDir 'package.json'
if (Test-Path $packageJson) { Copy-Item -Path $packageJson -Destination $StagingDir }
Write-Host "Aplikasi dan data disalin." -ForegroundColor Green

Write-Step "Menyalin Node.js portabel"
$runtimeDir = Join-Path $StagingDir 'runtime'
New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
$nodeCandidates = @(
    (Join-Path $AppDir 'runtime\node.exe'),
    "$env:ProgramFiles\nodejs\node.exe",
    "${env:ProgramFiles(x86)}\nodejs\node.exe",
    "$env:LOCALAPPDATA\Programs\nodejs\node.exe"
)
$node = $nodeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $node) {
    $node = (Get-Command node -ErrorAction SilentlyContinue).Source
}
if (-not $node) {
    throw "Node.js tidak ditemukan. Pasang Node.js atau sediakan runtime\node.exe lalu jalankan ulang."
}
Copy-Item -Path $node -Destination (Join-Path $runtimeDir 'node.exe')
Write-Host "Node.js disalin dari: $node" -ForegroundColor Green

Write-Step "Membuat panduan dan pemasang cepat"
$panduan = @"
SIAP SMP - PANDUAN PINDAH LAPTOP
================================

Paket ini sudah berisi aplikasi, seluruh data (siswa, guru, kelas, absensi,
pengaturan sekolah, foto, akun guru, dan menu tersembunyi), serta Node.js
portabel. Tidak perlu memasang aplikasi lain dan tidak perlu internet.

LANGKAH PEMINDAHAN
------------------
1. Salin file ZIP ini ke laptop baru (flashdisk, jaringan, atau Google Drive).
2. Ekstrak ke folder yang mudah diingat, misalnya:
      D:\SIAP-SMP
   Jangan mengekstrak ke dalam folder Downloads bila folder itu sering dibersihkan.
   Jangan memisahkan folder server-data dari file lainnya.
3. Buka folder hasil ekstrak, lalu klik dua kali:
      PASANG-SIAP.bat
4. Ikuti petunjuk di layar sampai selesai. Pemasang akan:
      - menyalakan server di port 5173,
      - membuat shortcut "SIAP SMP" di Desktop dan Start Menu,
      - membuat server otomatis menyala saat Windows login.
5. Buka aplikasi lewat shortcut "SIAP SMP".
6. Login memakai akun yang sama seperti di laptop lama.

Bila PASANG-SIAP.bat diblokir Windows
-------------------------------------
Klik kanan file > Properties > centang "Unblock" > OK.
Atau jalankan lewat Command Prompt:

   powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\pasang-di-laptop-baru.ps1

BILA POWERSHELL DIBLOKIR (TANPA POWERSHELL)
-------------------------------------------
Beberapa laptop memblokir PowerShell dengan pesan "This operation has been
cancelled due to restrictions in effect on this computer". Aplikasi tetap
bisa dipakai penuh tanpa PowerShell:

1. Ekstrak paket ke folder yang mudah diingat, misalnya D:\SIAP-SMP.
2. Klik dua kali file:
      scripts\buka-siap.cmd
   Skrip ini menyalakan server (bila belum menyala) lalu membuka browser.
   Bisa juga dibuat pintasan sendiri ke file tersebut.
3. Untuk membuat pintasan "SIAP SMP" di Desktop dan Start Menu sekaligus
   menyalakan server otomatis saat Windows login, klik dua kali:
      scripts\buat-shortcut-siap.vbs
4. Bila Windows memblokir file karena berasal dari internet, klik kanan file
   > Properties > centang "Unblock" > OK.

Tidak perlu PowerShell, Node.js, atau internet. Seluruh data tetap sama.

Bila server perlu dimatikan tetapi PowerShell diblokir: buka Task Manager
(Ctrl+Shift+Esc) > Details > pilih semua "node.exe" > End task. Data tidak
akan hilang karena tersimpan di folder server-data.

AGAR TAMPILAN (TEMA/WARNA) SAMA
------------------------------
Tema dan pengaturan tampilan tersimpan di browser, bukan di server, jadi
perlu dipindahkan terpisah:

1. Di laptop LAMA: buka menu Pengaturan > "Pengaturan Tampilan Perangkat" >
   "Unduh Pengaturan (JSON)".
2. Salin file JSON tersebut ke laptop baru.
3. Di laptop BARU: buka Pengaturan > "Pengaturan Tampilan Perangkat" >
   "Pilih File Pengaturan", lalu pilih file tadi.

Data siswa/guru/absensi TIDAK perlu diimpor ulang karena sudah ikut di paket.

AKSES DARI HP / KOMPUTER LAIN (LAN)
-----------------------------------
Saat pemasangan selesai, alamat http://IP-LAPTOP:5173 akan ditampilkan.
Buka alamat itu dari perangkat lain yang tersambung ke jaringan yang sama.
Jika tidak bisa dibuka, izinkan Node.js pada Windows Firewall (port 5173,
jaringan Private).

SETELAH DATA DIPINDAH: MATIKAN SERVER LAPTOP LAMA
------------------------------------------------
Agar tidak ada dua server dengan data berbeda di jaringan yang sama, matikan
server di laptop lama secara permanen:

   scripts\matikan-server-permanen.cmd

Skrip itu menghentikan server, menghapus auto-start saat Windows login, dan
menonaktifkan shortcut SIAP SMP. Seluruh data di folder server-data TIDAK
dihapus, jadi masih bisa dipakai sebagai cadangan. Jika Windows meminta izin
Administrator (UAC), pilih "Yes".

Jika hanya ingin mematikan sementara:

   scripts\stop-server.cmd

Kedua skrip meminta izin Administrator secara otomatis bila server dijalankan
oleh akun Administrator/sistem. Bila permintaan dibatalkan, auto-start dan
shortcut tetap dinonaktifkan sehingga server tidak menyala lagi setelah
Windows restart.

PENTING
-------
- Folder server-data berisi SELURUH data. Jangan dihapus atau dipindah sendiri.
- Laptop ini menjadi server. Biarkan aplikasi/server tetap berjalan saat
  perangkat lain sedang memakai aplikasi.
- Untuk cadangan berkala: Pengaturan > Cadangan & Pemulihan > Unduh Cadangan.
"@
$panduanPath = Join-Path $StagingDir 'BACA-DULU.txt'
Set-Content -Path $panduanPath -Value $panduan -Encoding UTF8

$pasangBat = @"
@echo off
cd /d "%~dp0"
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\pasang-di-laptop-baru.ps1"
if errorlevel 1 pause
"@
Set-Content -Path (Join-Path $StagingDir 'PASANG-SIAP.bat') -Value $pasangBat -Encoding ASCII

Write-Step "Membuat file ZIP"
if (Test-Path $ZipPath) { Remove-Item -Force $ZipPath }
Compress-Archive -Path (Join-Path $StagingDir '*') -DestinationPath $ZipPath -CompressionLevel Optimal
Remove-Item -Recurse -Force $StagingRoot

$sizeMb = [math]::Round((Get-Item $ZipPath).Length / 1MB, 1)
Write-Host ""
Write-Host "Selesai!" -ForegroundColor Green
Write-Host "File paket : $ZipPath" -ForegroundColor White
Write-Host "Ukuran     : $sizeMb MB" -ForegroundColor White
Write-Host ""
Write-Host "Salin file ZIP tersebut ke laptop baru, ekstrak, lalu jalankan PASANG-SIAP.bat." -ForegroundColor Cyan
