@echo off
rem Mematikan server SIAP SMP secara permanen di laptop lama.
rem Jalankan setelah data dipindahkan ke laptop baru.
rem
rem Jika server dijalankan oleh akun lain (mis. sebagai Administrator), skrip ini
rem akan meminta izin Administrator (UAC) secara otomatis.

setlocal
title SIAP SMP - Mematikan Server Permanen

if /I "%~1"=="--elevated" goto jalan

echo Skrip ini akan:
echo   1. Menghentikan server yang sedang berjalan.
echo   2. Menghapus auto-start saat Windows login.
echo   3. Menonaktifkan shortcut SIAP SMP.
echo.
echo Data di folder server-data TIDAK dihapus.
echo.
choice /C YN /M "Lanjutkan"
if errorlevel 2 goto batal

:jalan
echo.
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0matikan-server-permanen.ps1"
if errorlevel 1 goto perluadmin

echo.
pause
goto selesai

:perluadmin
if /I "%~1"=="--elevated" goto gagal

echo.
echo Auto-start dan shortcut sudah dinonaktifkan, tetapi server masih berjalan.
echo Meminta izin Administrator. Silakan pilih "Yes" pada jendela yang muncul.
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -Command "try { Start-Process -FilePath '%~f0' -ArgumentList '--elevated' -WorkingDirectory '%~dp0' -Verb RunAs -ErrorAction Stop } catch { Write-Host 'Permintaan Administrator dibatalkan.' -ForegroundColor Yellow }"

echo.
pause
goto selesai

:gagal
echo.
echo Server masih berjalan. Setelah restart Windows, server tidak akan menyala lagi
echo karena auto-start sudah dihapus.
echo.
pause
goto selesai

:batal
echo Dibatalkan.
echo.
pause

:selesai
endlocal
