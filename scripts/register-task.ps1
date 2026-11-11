# Mendaftarkan SIAP SMP agar otomatis berjalan saat Windows menyala.
# Jalankan sebagai Administrator:
#   powershell -ExecutionPolicy Bypass -File D:\Open-Project\scripts\register-task.ps1

$ErrorActionPreference = 'Stop'
$TaskName = 'SIAP-ABSENSI-DevServer'
$AppDir = 'D:\Open-Project'
$Launcher = Join-Path $AppDir 'scripts\start-server.cmd'

if (-not (Test-Path $Launcher)) {
    throw "Launcher tidak ditemukan: $Launcher"
}

Write-Host 'Menghentikan server lama pada port 5173 (jika ada)...'
try {
    $listeners = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
    foreach ($listener in $listeners) {
        if ($listener.OwningProcess -and $listener.OwningProcess -ne 0) {
            Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
            Write-Host ("  Proses PID {0} dihentikan." -f $listener.OwningProcess)
        }
    }
} catch {
    Write-Host '  Tidak ada proses lama yang perlu dihentikan.'
}

Write-Host 'Mendaftarkan Scheduled Task...'
try {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
} catch { }

$action = New-ScheduledTaskAction `
    -Execute 'C:\Windows\System32\cmd.exe' `
    -Argument ('/c "{0}"' -f $Launcher) `
    -WorkingDirectory $AppDir

$bootTrigger = New-ScheduledTaskTrigger -AtStartup
$bootTrigger.Delay = 'PT30S'
$logonTrigger = New-ScheduledTaskTrigger -AtLogOn

$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RestartCount 999 `
    -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger @($bootTrigger, $logonTrigger) `
    -Principal $principal `
    -Settings $settings `
    -Description 'Menjaga Vite dev server SIAP SMP (port 5173) tetap berjalan dan otomatis aktif saat Windows menyala.' `
    -Force | Out-Null

Write-Host 'Membuka port 5173 di Windows Firewall...'
try {
    if (-not (Get-NetFirewallRule -DisplayName 'SIAP SMP Dev Server (TCP 5173)' -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule `
            -DisplayName 'SIAP SMP Dev Server (TCP 5173)' `
            -Direction Inbound `
            -Action Allow `
            -Protocol TCP `
            -LocalPort 5173 `
            -Profile Any | Out-Null
    }
    Write-Host '  Aturan firewall siap.'
} catch {
    Write-Host ('  Gagal membuat aturan firewall: {0}' -f $_.Exception.Message)
}

Write-Host 'Menjalankan task sekarang...'
Start-ScheduledTask -TaskName $TaskName

Start-Sleep -Seconds 4

$state = (Get-ScheduledTask -TaskName $TaskName).State
Write-Host ('Status task: {0}' -f $state)
Write-Host 'Selesai. Aplikasi akan otomatis aktif setiap Windows menyala.'
