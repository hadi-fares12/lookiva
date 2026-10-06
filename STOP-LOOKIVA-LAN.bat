@echo off
setlocal EnableExtensions
title STOP LOOKIVA LAN
cd /d "%~dp0"

echo.
echo ============================================================
echo  STOPPING LOOKIVA
echo ============================================================

for %%P in (4000 3001 3002 3003 8081 8082) do (
  powershell.exe -NoLogo -NoProfile -Command "$c=Get-NetTCPConnection -State Listen -LocalPort %%P -ErrorAction SilentlyContinue; if($c){$c.OwningProcess ^| Sort-Object -Unique ^| ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }}" >nul 2>&1
)

echo Releasing LOOKIVA Node/Prisma processes...
powershell.exe -NoLogo -NoProfile -Command "$root=[IO.Path]::GetFullPath('%CD%'); Get-CimInstance Win32_Process -Filter 'Name=''node.exe''' -ErrorAction SilentlyContinue ^| Where-Object { $_.CommandLine -and $_.CommandLine -like ('*' + $root + '*') } ^| ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1

set "DOCKER=docker"
where docker >nul 2>&1
if errorlevel 1 (
  if exist "%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin\docker.exe" set "DOCKER=%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin\docker.exe"
  if exist "%ProgramFiles%\Docker\Docker\resources\bin\docker.exe" set "DOCKER=%ProgramFiles%\Docker\Docker\resources\bin\docker.exe"
)

if exist "docker-compose.minio.local.yml" (
  "%DOCKER%" compose -f docker-compose.yml -f docker-compose.minio.local.yml stop postgres redis minio
) else (
  "%DOCKER%" compose -f docker-compose.yml stop postgres redis minio
)

echo.
echo LOOKIVA stopped.
echo Your Docker volumes/data were NOT deleted.
echo.
exit /b 0
