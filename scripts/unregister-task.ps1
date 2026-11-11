# Menghapus SIAP SMP dari daftar auto-start Windows.
# Jalankan sebagai Administrator:
#   powershell -ExecutionPolicy Bypass -File D:\Open-Project\scripts\unregister-task.ps1

$ErrorActionPreference = 'SilentlyContinue'
$TaskName = 'SIAP-ABSENSI-DevServer'

Write-Host 'Menghentikan Scheduled Task...'
Stop-ScheduledTask -TaskName $TaskName

Write-Host 'Menghapus Scheduled Task...'
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false

Write-Host 'Menghapus aturan firewall...'
Remove-NetFirewallRule -DisplayName 'SIAP SMP Dev Server (TCP 5173)'

Write-Host 'Selesai. Auto-start sudah dihapus.'
