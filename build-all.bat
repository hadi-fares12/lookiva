@echo off
setlocal
cd /d "%~dp0"
echo Starting LOOKIVA full build suite (bypassing execution policy)...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-all.ps1"
set EX=%ERRORLEVEL%
echo.
if "%EX%"=="0" (echo [OK] Build completed. Check .\dist\) else (echo [FAIL] Build exited with code %EX%)
pause
exit /b %EX%
