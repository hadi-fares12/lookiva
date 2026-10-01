@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title LOOKIVA Production Build Suite

echo ============================================================
echo   LOOKIVA One-Click Production Builder
echo   Output: %~dp0production\
echo ============================================================
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-production.ps1"
set EX=%ERRORLEVEL%

echo.
if "%EX%"=="0" (
  echo [BUILD OK] Production folder created: %~dp0production
  echo.
  choice /C YN /M "Run one-click launcher now (START-ALL.bat - starts server + web)"
  if ERRORLEVEL 2 goto end
  call "%~dp0production\START-ALL.bat"
) else (
  echo [BUILD FAILED] exit code %EX%
)
:end
pause
exit /b %EX%
