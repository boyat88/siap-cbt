@echo off
setlocal enabledelayedexpansion
title SIAP SMP - Production Server

rem Folder aplikasi dihitung dari lokasi file ini (scripts\), sehingga aman
rem dipindah ke drive/folder/laptop lain tanpa mengubah isi skrip.
set "APP_DIR=%~dp0.."
for %%I in ("%APP_DIR%") do set "APP_DIR=%%~fI"

rem Utamakan Node portabel di dalam folder aplikasi, lalu Node di Windows.
set "NODE_EXE=%APP_DIR%\runtime\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"

set "SERVER_JS=%APP_DIR%\server.cjs"
set "LOG_DIR=%APP_DIR%\logs"
set "LOG_FILE=%LOG_DIR%\server.log"
set "OLD_LOG=%LOG_DIR%\server.old.log"
set "MAX_LOG_SIZE=5242880"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
cd /d "%APP_DIR%"

:loop
if exist "%LOG_FILE%" (
  for %%A in ("%LOG_FILE%") do if %%~zA GTR %MAX_LOG_SIZE% (
    move /y "%LOG_FILE%" "%OLD_LOG%" >nul 2>&1
  )
)

>>"%LOG_FILE%" echo [%date% %time%] Memulai production server (port 5173)...

"%NODE_EXE%" "%SERVER_JS%" >>"%LOG_FILE%" 2>&1

>>"%LOG_FILE%" echo [%date% %time%] Server berhenti dengan kode %errorlevel%. Restart dalam 5 detik...
ping -n 6 127.0.0.1 >nul 2>&1
goto loop
