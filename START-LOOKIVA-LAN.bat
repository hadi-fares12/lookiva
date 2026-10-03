@echo off
setlocal EnableExtensions EnableDelayedExpansion
title LOOKIVA One-Click LAN Launcher
cd /d "%~dp0"

set "SERVER_IP=192.168.1.173"
set "API_PORT=4000"
set "CUSTOMER_PORT=3001"
set "BUSINESS_PORT=3002"
set "ADMIN_PORT=3003"
set "MINIO_PORT=9000"

echo.
echo ============================================================
echo  LOOKIVA ONE-CLICK LAN START
echo ============================================================
echo  Root      : %CD%
echo  Server IP : %SERVER_IP%
echo.

where node >nul 2>&1 || (
  echo [ERROR] Node.js is not installed or not in PATH.
  pause
  exit /b 1
)
where pnpm >nul 2>&1 || (
  echo [ERROR] pnpm is not installed or not in PATH.
  pause
  exit /b 1
)

set "DOCKER=docker"
where docker >nul 2>&1
if errorlevel 1 (
  if exist "%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin\docker.exe" set "DOCKER=%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin\docker.exe"
  if exist "%ProgramFiles%\Docker\Docker\resources\bin\docker.exe" set "DOCKER=%ProgramFiles%\Docker\Docker\resources\bin\docker.exe"
)

echo [1/8] Stopping old LOOKIVA listeners...
for %%P in (%API_PORT% %CUSTOMER_PORT% %BUSINESS_PORT% %ADMIN_PORT%) do (
  powershell.exe -NoLogo -NoProfile -Command "$c=Get-NetTCPConnection -State Listen -LocalPort %%P -ErrorAction SilentlyContinue; if($c){$c.OwningProcess ^| Sort-Object -Unique ^| ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }}" >nul 2>&1
)

echo [2/8] Checking Docker engine...
"%DOCKER%" info >nul 2>&1
if not errorlevel 1 goto DOCKER_READY

echo Docker engine is not running. Starting Docker Desktop...
if exist "%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe" (
  start "" "%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe"
) else if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
  start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
) else (
  echo [ERROR] Docker Desktop executable was not found.
  pause
  exit /b 1
)

set /a TRY=0
:WAIT_DOCKER
set /a TRY+=1
timeout /t 1 /nobreak >nul
"%DOCKER%" info >nul 2>&1
if not errorlevel 1 goto DOCKER_READY
if !TRY! LSS 60 goto WAIT_DOCKER
echo [ERROR] Docker engine did not become ready.
pause
exit /b 1

:DOCKER_READY

echo [3/8] Starting PostgreSQL, Redis and MinIO...
if exist "docker-compose.minio.local.yml" (
  "%DOCKER%" compose -f docker-compose.yml -f docker-compose.minio.local.yml up -d postgres redis minio
) else (
  "%DOCKER%" compose -f docker-compose.yml up -d postgres redis minio
)
if errorlevel 1 (
  echo [ERROR] Docker services failed.
  pause
  exit /b 1
)

echo [4/8] Applying LOOKIVA settings...
if exist "production\SERVER\lookiva-settings.txt" set "LOOKIVA_SETTINGS_FILE=%CD%\production\SERVER\lookiva-settings.txt"
set "NEXT_PUBLIC_API_URL=http://%SERVER_IP%:%API_PORT%/api/v1"
set "NEXT_PUBLIC_API_BASE_URL=http://%SERVER_IP%:%API_PORT%/api/v1"
set "NEXT_PUBLIC_MEDIA_BASE_URL=http://%SERVER_IP%:%MINIO_PORT%"
set "PUBLIC_CUSTOMER_WEB_URL=http://%SERVER_IP%:%CUSTOMER_PORT%"
set "PUBLIC_BUSINESS_WEB_URL=http://%SERVER_IP%:%BUSINESS_PORT%"
set "MEDIA_PUBLIC_BASE_URL=http://%SERVER_IP%:%MINIO_PORT%"
set "CORS_ORIGINS=http://localhost:3001,http://localhost:3002,http://localhost:3003,http://%SERVER_IP%:3001,http://%SERVER_IP%:3002,http://%SERVER_IP%:3003"
set "PORT=%API_PORT%"
set "API_PORT=%API_PORT%"
set "MINIO_ENDPOINT=localhost"
set "MINIO_PORT=%MINIO_PORT%"
set "MINIO_USE_SSL=false"
node scripts\apply-settings.js all
if errorlevel 1 (
  echo [ERROR] Settings synchronization failed.
  pause
  exit /b 1
)

echo [5/8] Applying database migrations...
call pnpm --filter @lookiva/api prisma:generate
if errorlevel 1 goto FAILED
call pnpm --filter @lookiva/api prisma:migrate
if errorlevel 1 goto FAILED

echo [6/8] Checking production build artifacts...
set "NEED_BUILD=0"
set "CURRENT_HEAD="
for /f %%G in ('git rev-parse HEAD 2^>nul') do set "CURRENT_HEAD=%%G"
if not exist ".lookiva-runtime" mkdir ".lookiva-runtime"
if not exist ".lookiva-runtime\built-head.txt" set "NEED_BUILD=1"
if defined CURRENT_HEAD if exist ".lookiva-runtime\built-head.txt" (
  set /p "BUILT_HEAD="<".lookiva-runtime\built-head.txt"
  if /I not "!BUILT_HEAD!"=="!CURRENT_HEAD!" set "NEED_BUILD=1"
)
if not exist "apps\api\dist\apps\api\src\main.js" set "NEED_BUILD=1"
if not exist "apps\customer-web\.next\BUILD_ID" set "NEED_BUILD=1"
if not exist "apps\business-web\.next\BUILD_ID" set "NEED_BUILD=1"
if not exist "apps\admin-web\.next\BUILD_ID" set "NEED_BUILD=1"

if "%NEED_BUILD%"=="1" (
  echo Production artifacts are missing. Building once...
  call pnpm build
  if errorlevel 1 goto FAILED
  if defined CURRENT_HEAD >".lookiva-runtime\built-head.txt" echo !CURRENT_HEAD!
)

if not exist "apps\workers\dist\main.js" (
  echo Building workers...
  call pnpm --filter @lookiva/workers build
  if errorlevel 1 goto FAILED
)

if not exist ".lookiva-runtime\logs" mkdir ".lookiva-runtime\logs"

echo [7/8] Starting LOOKIVA services...
start "LOOKIVA API" /min cmd /d /c "call pnpm --filter @lookiva/api start 1>>.lookiva-runtime\logs\api.log 2>&1"
start "LOOKIVA WORKERS" /min cmd /d /c "call pnpm --filter @lookiva/workers start 1>>.lookiva-runtime\logs\workers.log 2>&1"
start "LOOKIVA CUSTOMER WEB" /min cmd /d /c "call pnpm --filter @lookiva/customer-web start --hostname 0.0.0.0 1>>.lookiva-runtime\logs\customer-web.log 2>&1"
start "LOOKIVA BUSINESS WEB" /min cmd /d /c "call pnpm --filter @lookiva/business-web start --hostname 0.0.0.0 1>>.lookiva-runtime\logs\business-web.log 2>&1"
start "LOOKIVA ADMIN WEB" /min cmd /d /c "call pnpm --filter @lookiva/admin-web start --hostname 0.0.0.0 1>>.lookiva-runtime\logs\admin-web.log 2>&1"

echo [8/8] Waiting for API health...
powershell.exe -NoLogo -NoProfile -Command "$u='http://%SERVER_IP%:%API_PORT%/health'; for($i=0;$i -lt 45;$i++){try{$r=Invoke-WebRequest -UseBasicParsing -Uri $u -TimeoutSec 3;if($r.StatusCode -ge 200 -and $r.StatusCode -lt 500){exit 0}}catch{};Start-Sleep -Seconds 1};exit 1"
if errorlevel 1 (
  echo [ERROR] API did not become healthy.
  echo Check: %CD%\.lookiva-runtime\logs\api.log
  pause
  exit /b 1
)

echo.
echo ============================================================
echo  LOOKIVA IS RUNNING
echo ============================================================
echo  Customer Web : http://%SERVER_IP%:%CUSTOMER_PORT%
echo  Business Web : http://%SERVER_IP%:%BUSINESS_PORT%
echo  Admin Web    : http://%SERVER_IP%:%ADMIN_PORT%
echo  API Health   : http://%SERVER_IP%:%API_PORT%/health
echo  Swagger      : http://%SERVER_IP%:%API_PORT%/api/docs
echo  MinIO        : http://%SERVER_IP%:%MINIO_PORT%
echo  Logs         : %CD%\.lookiva-runtime\logs
echo.
echo  Use STOP-LOOKIVA-LAN.bat to stop LOOKIVA.
echo ============================================================

start "" "http://%SERVER_IP%:%CUSTOMER_PORT%"
start "" "http://%SERVER_IP%:%BUSINESS_PORT%"
start "" "http://%SERVER_IP%:%ADMIN_PORT%"
start "" "http://%SERVER_IP%:%API_PORT%/api/docs"

exit /b 0

:FAILED
echo.
echo [ERROR] LOOKIVA startup failed during build/database preparation.
pause
exit /b 1
