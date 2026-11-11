@echo off
rem Mematikan server SIAP SMP untuk sementara.
rem Server bisa menyala lagi saat Windows login berikutnya atau saat shortcut
rem SIAP SMP diklik. Untuk mematikan permanen, jalankan matikan-server-permanen.cmd.
rem
rem Jika server dijalankan oleh akun lain (mis. sebagai Administrator), skrip ini
rem akan meminta izin Administrator (UAC) secara otomatis.

setlocal
title SIAP SMP - Menghentikan Server

if /I "%~1"=="--elevated" goto jalankan

:jalankan
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-server.ps1"
if errorlevel 1 goto perluadmin

echo.
pause
goto selesai

:perluadmin
if /I "%~1"=="--elevated" goto gagal

echo.
echo Meminta izin Administrator. Silakan pilih "Yes" pada jendela yang muncul.
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -Command "try { Start-Process -FilePath '%~f0' -ArgumentList '--elevated' -WorkingDirectory '%~dp0' -Verb RunAs -ErrorAction Stop } catch { Write-Host 'Permintaan Administrator dibatalkan.' -ForegroundColor Yellow }"

echo.
pause
goto selesai

:gagal
echo.
echo Server masih berjalan. Ikuti petunjuk di atas, atau restart Windows.
echo.
pause

:selesai
endlocal
