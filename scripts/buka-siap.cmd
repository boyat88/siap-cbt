@echo off
setlocal
title SIAP SMP - Buka Aplikasi

rem ---------------------------------------------------------------------------
rem Peluncur tanpa PowerShell.
rem Dipakai bila PowerShell diblokir kebijakan Windows (mis. di laptop sekolah).
rem Skrip ini:
rem   1. mengecek apakah server sudah berjalan di port 5173,
rem   2. menyalakan server di jendela minimalkan bila belum berjalan,
rem   3. membuka aplikasi di browser bawaan.
rem ---------------------------------------------------------------------------

set "APP_DIR=%~dp0.."
for %%I in ("%APP_DIR%") do set "APP_DIR=%%~fI"

set "NODE_EXE=%APP_DIR%\runtime\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"

set "SERVER_JS=%APP_DIR%\server.cjs"
set "LOG_DIR=%APP_DIR%\logs"
set "LOG_FILE=%LOG_DIR%\server.log"
set "URL=http://localhost:5173"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
cd /d "%APP_DIR%"

call :server_up
if not errorlevel 1 goto buka

echo Menyalakan server SIAP SMP...
start "SIAP SMP Server" /min cmd /c ""%NODE_EXE%" "%SERVER_JS%" >> "%LOG_FILE%" 2>&1"

rem Tunggu maksimal 20 detik sampai server siap.
for /l %%i in (1,1,20) do (
  >nul 2>&1 timeout /t 1 /nobreak
  call :server_up
  if not errorlevel 1 goto buka
)

echo.
echo Server belum merespons. Periksa file logs\server.log.
echo Mencoba membuka browser tetap dilakukan...
echo.

:buka
start "" "%URL%"
exit /b 0

:server_up
"%NODE_EXE%" -e "const n=require('net');const s=n.connect(5173,'127.0.0.1');s.on('connect',()=>{s.destroy();process.exit(0)});s.on('error',()=>process.exit(1));setTimeout(()=>process.exit(1),500)" >nul 2>&1
exit /b %errorlevel%
