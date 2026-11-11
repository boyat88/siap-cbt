# Memasang SIAP SMP di laptop baru (hasil pemindahan dari laptop lama).
#
# Yang dilakukan skrip ini:
#   1. Memeriksa kelengkapan aplikasi dan data.
#   2. Menentukan Node.js (portabel di runtime\node.exe atau yang terpasang).
#   3. Membuat server otomatis menyala saat Windows login.
#   4. Membuat shortcut "SIAP SMP" di Desktop dan Start Menu.
#   5. Menyalakan server sekarang dan menampilkan alamat akses.
#
# Jalankan dari folder aplikasi:
#   powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\pasang-di-laptop-baru.ps1
#
# Opsi (untuk pengujian):
#   -Port 5199 -SkipShortcut -SkipAutostart -NoPause

param(
    [int]$Port = 5173,
    [string]$StartupFolder = '',
    [switch]$SkipShortcut,
    [switch]$SkipAutostart,
    [switch]$NoPause
)

$ErrorActionPreference = 'Stop'
$AppDir = Split-Path -Parent $PSScriptRoot
$ServerJs = Join-Path $AppDir 'server.cjs'
$DistIndex = Join-Path $AppDir 'dist\index.html'
$LogDir = Join-Path $AppDir 'logs'

function Write-Step {
    param([string]$Text)
    Write-Host ""
    Write-Host "==> $Text" -ForegroundColor Cyan
}

Write-Host "SIAP SMP - Pemasangan di laptop baru" -ForegroundColor Green
Write-Host "Folder aplikasi: $AppDir"

Write-Step "Memeriksa kelengkapan aplikasi"
if (-not (Test-Path $ServerJs)) { throw "server.cjs tidak ditemukan di $AppDir" }
if (-not (Test-Path $DistIndex)) {
    throw "Folder dist\ tidak lengkap. Pastikan seluruh isi ZIP dipindahkan, bukan hanya sebagian."
}
if (-not (Test-Path (Join-Path $AppDir 'server-data\state.json'))) {
    Write-Host "Peringatan: server-data\state.json belum ada. Aplikasi akan mulai dengan data awal." -ForegroundColor Yellow
}
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
Write-Host "Aplikasi dan data ditemukan." -ForegroundColor Green

Write-Step "Menentukan Node.js"
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
    throw "Node.js tidak ditemukan. Salin runtime\node.exe ke folder aplikasi atau pasang Node.js dari https://nodejs.org lalu jalankan ulang skrip ini."
}
Write-Host "Node.js: $node" -ForegroundColor Green

function Test-Server {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne(200)) { return $false }
        $client.EndConnect($async)
        return $true
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

Write-Step "Membuat server otomatis menyala saat login"
if ($SkipAutostart) {
    Write-Host "Dilewati (opsi -SkipAutostart)." -ForegroundColor Yellow
} else {
    if (-not $StartupFolder) {
        $StartupFolder = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup'
    }
    if (Test-Path $StartupFolder) {
        $batPath = Join-Path $StartupFolder 'SIAP-Server.bat'
        $bat = @"
@echo off
rem Dijalankan otomatis saat Windows login (dibuat oleh pasang-di-laptop-baru.ps1).
set "PORT=$Port"
cd /d "$AppDir"
if not exist "$LogDir" mkdir "$LogDir"
start "" /b cmd /c ""$node" "$ServerJs" >> "$LogDir\server.log" 2>&1"
"@
        Set-Content -Path $batPath -Value $bat -Encoding ASCII
        Write-Host "Auto-start dibuat: $batPath" -ForegroundColor Green
    } else {
        Write-Host "Folder Startup tidak ditemukan; lewati auto-start." -ForegroundColor Yellow
    }
}

Write-Step "Membuat shortcut SIAP SMP"
if ($SkipShortcut) {
    Write-Host "Dilewati (opsi -SkipShortcut)." -ForegroundColor Yellow
} else {
    $shortcutScript = Join-Path $AppDir 'scripts\create-shortcut.ps1'
    if (Test-Path $shortcutScript) {
        & $shortcutScript
    } else {
        Write-Host "create-shortcut.ps1 tidak ditemukan; shortcut dilewati." -ForegroundColor Yellow
    }
}

Write-Step "Menyalakan server"
if (Test-Server) {
    Write-Host "Server sudah berjalan; tidak perlu dinyalakan ulang." -ForegroundColor Green
} else {
    # PORT diteruskan lewat environment agar server memakai port yang dipilih.
    $previousPort = $env:PORT
    $env:PORT = [string]$Port
    try {
        Start-Process -FilePath $node -ArgumentList @('"{0}"' -f $ServerJs) -WorkingDirectory $AppDir -WindowStyle Hidden
    } finally {
        if ($null -ne $previousPort) {
            $env:PORT = $previousPort
        } else {
            Remove-Item Env:PORT -ErrorAction SilentlyContinue
        }
    }
}

$ready = $false
for ($i = 0; $i -lt 50; $i++) {
    Start-Sleep -Milliseconds 100
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
        if ($async.AsyncWaitHandle.WaitOne(150)) {
            $client.EndConnect($async)
            $ready = $true
            break
        }
    } catch {
        # Server belum siap; coba lagi.
    } finally {
        $client.Close()
    }
}

if ($ready) {
    Write-Host "Server siap: http://localhost:$Port" -ForegroundColor Green
} else {
    Write-Host "Server belum merespons. Coba jalankan scripts\start-server.cmd untuk melihat log." -ForegroundColor Yellow
}

Write-Step "Alamat akses dari perangkat lain (jaringan lokal)"
$addresses = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
    Select-Object -ExpandProperty IPAddress
if ($addresses) {
    foreach ($address in $addresses) {
        Write-Host "  http://${address}:$Port" -ForegroundColor White
    }
} else {
    Write-Host "  (IP lokal tidak terdeteksi; cek dengan perintah ipconfig)" -ForegroundColor Yellow
}

Write-Step "Izin firewall (opsional, perlu Administrator)"
$firewallOk = $false
try {
    $existing = Get-NetFirewallRule -DisplayName 'SIAP SMP (Node.js)' -ErrorAction SilentlyContinue
    if (-not $existing) {
        New-NetFirewallRule -DisplayName 'SIAP SMP (Node.js)' -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Private -ErrorAction Stop | Out-Null
    }
    $firewallOk = $true
    Write-Host "Aturan firewall untuk port $Port sudah aktif (jaringan Private)." -ForegroundColor Green
} catch {
    Write-Host "Tidak dapat menambah aturan firewall tanpa hak Administrator." -ForegroundColor Yellow
    Write-Host "Jika perangkat lain tidak bisa membuka aplikasi:" -ForegroundColor Yellow
    Write-Host "  1. Buka Windows Defender Firewall > Advanced settings > Inbound Rules > New Rule." -ForegroundColor Yellow
    Write-Host "  2. Pilih Port > TCP > $Port > Allow the connection > centang Private." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Selesai. Buka aplikasi lewat shortcut 'SIAP SMP' di Desktop." -ForegroundColor Green
Write-Host "Gunakan akun yang sama seperti di laptop lama." -ForegroundColor Green
Write-Host ""
Write-Host "Agar tampilan (tema/warna per akun) sama seperti sebelumnya:" -ForegroundColor Cyan
Write-Host "  1. Di laptop lama: Pengaturan > Pengaturan Tampilan Perangkat > Unduh Pengaturan." -ForegroundColor Cyan
Write-Host "  2. Di laptop baru: Pengaturan > Pengaturan Tampilan Perangkat > Pilih File Pengaturan." -ForegroundColor Cyan
Write-Host ""
if (-not $NoPause) {
    Read-Host "Tekan Enter untuk menutup"
}
