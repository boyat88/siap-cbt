# Menghentikan server SIAP SMP milik folder aplikasi ini saja.
# Dipakai oleh stop-server.cmd dan matikan-server-permanen.ps1.
#
# Keluar dengan kode 0 bila server berhasil dimatikan (atau memang tidak ada),
# dan kode 1 bila server masih berjalan (biasanya karena dijalankan sebagai
# Administrator/sistem sehingga perlu izin tambahan).

param(
    [switch]$Quiet,
    [int]$Port = 5173
)

$ErrorActionPreference = 'SilentlyContinue'
$AppDir = Split-Path -Parent $PSScriptRoot
$ServerJs = Join-Path $AppDir 'server.cjs'
$ServerPattern = [Regex]::Escape($ServerJs)

function Get-CommandLine {
    param($Process)
    if ($Process.CommandLine) {
        return $Process.CommandLine.Replace('/', '\')
    }
    return ''
}

function Test-Port {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne(300)) { return $false }
        $client.EndConnect($async)
        return $true
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

$killed = 0
$failed = $false

# Proses Node yang jelas menjalankan server.cjs dari folder ini.
$nodeProcs = @(
    Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
        Where-Object {
            $commandLine = Get-CommandLine $_
            $commandLine -match $ServerPattern -or
            ($commandLine -match 'server\.cjs' -and $commandLine -like "*$AppDir*")
        }
)

# Bila port 5173 tetap hidup tetapi tidak ada proses yang bisa dikenali,
# kemungkinan server dijalankan oleh akun lain (mis. Administrator/sistem).
if ($nodeProcs.Count -eq 0 -and (Test-Port)) {
    # Cara pertama: tanya Windows siapa pemilik port tersebut.
    $listenerPid = 0
    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($connection -and $connection.OwningProcess -gt 0) {
        $listenerPid = $connection.OwningProcess
    }
    if ($listenerPid -gt 0) {
        $listener = Get-CimInstance Win32_Process -Filter "ProcessId=$listenerPid" -ErrorAction SilentlyContinue
        if ($listener -and $listener.Name -eq 'node.exe') {
            $nodeProcs = @($listener)
        }
    }

    # Cara kedua: bila pemilik port tidak terbaca, dan hanya ada satu proses
    # Node tanpa command line, proses itulah server.
    if ($nodeProcs.Count -eq 0) {
        $opaque = @(
            Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
                Where-Object { -not $_.CommandLine -or $_.CommandLine.Trim() -eq '' }
        )
        if ($opaque.Count -eq 1) {
            $nodeProcs = $opaque
        }
    }
}

# Pembungkus start-server.cmd akan menyalakan ulang Node setelah 5 detik,
# jadi hentikan dulu pembungkusnya (induk proses Node), baru Node-nya.
$wrappers = @()
$parentIds = $nodeProcs | Select-Object -ExpandProperty ParentProcessId -Unique
foreach ($parentId in $parentIds) {
    $parent = Get-CimInstance Win32_Process -Filter "ProcessId=$parentId" -ErrorAction SilentlyContinue
    if ($parent -and $parent.Name -eq 'cmd.exe' -and (Get-CommandLine $parent) -match 'start-server\.cmd') {
        $wrappers += $parent
    }
}
$wrappers += @(
    Get-CimInstance Win32_Process -Filter "Name='cmd.exe'" |
        Where-Object {
            $commandLine = Get-CommandLine $_
            $commandLine -match 'start-server\.cmd' -and $commandLine -like "*$AppDir*"
        }
)
$wrappers = $wrappers | Sort-Object ProcessId -Unique

foreach ($wrapper in $wrappers) {
    try {
        Stop-Process -Id $wrapper.ProcessId -Force -ErrorAction Stop
        $killed++
    } catch {
        $failed = $true
    }
}
foreach ($process in $nodeProcs) {
    try {
        Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
        $killed++
    } catch {
        $failed = $true
    }
}

Start-Sleep -Milliseconds 600

# Port bisa masih terbuka sesaat setelah proses dihentikan, jadi tunggu
# sampai benar-benar tertutup sebelum menyimpulkan gagal.
$stillListening = Test-Port
$waited = 0
while ($stillListening -and $waited -lt 3000) {
    Start-Sleep -Milliseconds 300
    $waited += 300
    $stillListening = Test-Port
}

if ($stillListening) {
    if (-not $Quiet) {
        Write-Host "Server SIAP SMP masih berjalan." -ForegroundColor Yellow
        if ($failed) {
            Write-Host "Akses ditolak: server kemungkinan dijalankan sebagai Administrator/sistem." -ForegroundColor Yellow
        }
        Write-Host ""
        Write-Host "Cara menghentikannya:" -ForegroundColor Cyan
        Write-Host "  - Jalankan ulang skrip ini lalu setujui permintaan Administrator (UAC), atau"
        Write-Host "  - buka Task Manager sebagai Administrator > Details > node.exe > End task, atau"
        Write-Host "  - restart Windows (server tidak akan menyala lagi bila auto-start sudah dihapus)."
    }
    exit 1
}

if (-not $Quiet) {
    if ($killed -gt 0) {
        Write-Host "Server SIAP SMP sudah dimatikan ($killed proses)." -ForegroundColor Green
    } else {
        Write-Host "Tidak ada server SIAP SMP yang sedang berjalan." -ForegroundColor Green
    }
}
exit 0
