@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title LOOKIVA Production Build Suite

echo ============================================================
echo   LOOKIVA One-Click Production Builder
echo   Output: %~dp0production\
echo.
echo   This script:
echo     1. Installs pnpm@9.15.0 locally (no admin, no corepack EPERM)
echo     2. Builds Customer + Business APK (release)
echo     3. Builds Flutter static web + Next.js web (customer / business / admin)
echo     4. Builds NestJS API server -> LOOKIVA-Server.exe / portable
echo     5. Places EVERYTHING into one folder: production\
echo     6. On success, prompts to launch START-ALL.bat
echo ============================================================
echo.

REM Safety: if the user accidentally runs this .bat FROM inside the production copy,
REM go back to the real project root (parent of production folder that contains this .bat)
if exist "%~dp0..\build-production.ps1" (
  echo [NOTE] Detected this script was launched from inside a copied production\ folder.
  echo        Running from project root at: %~dp0..
  cd /d "%~dp0.."
)

set "SCRIPT=%~dp0build-production.ps1"
if not exist "%SCRIPT%" set "SCRIPT=%~dp0..\build-production.ps1"
if not exist "%SCRIPT%" (
  echo [FATAL] build-production.ps1 missing next to BUILD-PRODUCTION.bat.
  pause
  exit /b 2
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
set EX=%ERRORLEVEL%

echo.
if "%EX%"=="0" (
  echo [BUILD OK] Production folder created: %~dp0production
  echo.
  choice /C YN /M "Run one-click launcher now (START-ALL.bat - starts API server, all webs, workers) "
  if ERRORLEVEL 2 goto end
  if exist "%~dp0production\START-ALL.bat" (
    call "%~dp0production\START-ALL.bat"
  ) else (
    call "%~dp0..\production\START-ALL.bat"
  )
) else (
  echo.
  echo [BUILD FAILED] exit code %EX%
  echo.
  echo Troubleshooting checklist:
  echo   1. You ran this OUTSIDE any IDE sandbox (regular Windows PowerShell, not Trae terminal)
  echo   2. Flutter is on PATH:       flutter --version
  echo   3. Node 20+ is on PATH:      node --version
  echo   4. npm is on PATH:           npm --version
  echo   5. Internet OK for pnpm download (first run only, after that uses cache)
  echo   6. Android licenses accepted (flutter doctor --android-licenses)
)
:end
pause
exit /b %EX%
