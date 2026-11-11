# Mematikan server SIAP SMP secara permanen di laptop lama:
#   1. Menghentikan server yang sedang berjalan.
#   2. Menghapus auto-start SIAP-Server.bat dari folder Startup.
#   3. Mengganti nama shortcut menjadi "SIAP SMP (nonaktif).lnk" agar tidak
#      tidak sengaja menyalakan server lagi.
#
# Jalankan dari folder aplikasi:
#   powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\matikan-server-permanen.ps1
#
# Keluar dengan kode 1 bila server masih berjalan (biasanya perlu Administrator).
# Auto-start dan shortcut tetap dinonaktifkan meskipun server belum berhasil
# dihentikan, sehingga server tidak menyala lagi setelah Windows restart.

param(
    [switch]$Quiet,
    [int]$Port = 5173
)

$ErrorActionPreference = 'SilentlyContinue'
$AppDir = Split-Path -Parent $PSScriptRoot

# Jalankan stop-server.ps1 sebagai proses terpisah agar "exit 1" di dalamnya
# tidak menghentikan pembersihan auto-start dan shortcut.
$powershellExe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
& $powershellExe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'stop-server.ps1') -Quiet -Port $Port
$stopExitCode = $LASTEXITCODE

$startupFolder = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup'
$startupBat = Join-Path $startupFolder 'SIAP-Server.bat'
$removedAutostart = $false
if (Test-Path $startupBat) {
    Remove-Item -Path $startupBat -Force
    $removedAutostart = $true
}

$folders = @(
    [Environment]::GetFolderPath('Desktop'),
    (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs')
)
$renamedShortcut = $false
foreach ($folder in $folders) {
    if (-not (Test-Path $folder)) { continue }
    $shortcut = Join-Path $folder 'SIAP SMP.lnk'
    $disabled = Join-Path $folder 'SIAP SMP (nonaktif).lnk'
    if (Test-Path $shortcut) {
        Move-Item -Path $shortcut -Destination $disabled -Force
        $renamedShortcut = $true
    }
}

if (-not $Quiet) {
    Write-Host ""
    if ($removedAutostart) {
        Write-Host "Auto-start dihapus: $startupBat" -ForegroundColor Green
    } else {
        Write-Host "Auto-start memang sudah tidak ada." -ForegroundColor Green
    }

    if ($renamedShortcut) {
        Write-Host 'Shortcut SIAP SMP dinonaktifkan menjadi "SIAP SMP (nonaktif).lnk".' -ForegroundColor Green
    } else {
        Write-Host "Tidak ada shortcut SIAP SMP yang perlu dinonaktifkan." -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "Semua data tetap tersimpan di folder server-data dan tidak dihapus." -ForegroundColor Cyan
    Write-Host ""

    if ($stopExitCode -ne 0) {
        Write-Host "Server masih berjalan dan perlu izin Administrator untuk dimatikan." -ForegroundColor Yellow
        Write-Host "Setelah Windows restart, server tidak akan menyala lagi karena auto-start sudah dihapus." -ForegroundColor Yellow
    } else {
        Write-Host "Server di laptop ini tidak akan menyala lagi, termasuk setelah restart." -ForegroundColor Green
    }
}

if ($stopExitCode -ne 0) {
    exit 1
}
exit 0
