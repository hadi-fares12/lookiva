@echo off
setlocal EnableExtensions EnableDelayedExpansion
title LOOKIVA One-Click LAN Launcher
cd /d "%~dp0"

set "SERVER_IP=192.168.1.173"
if not "%~1"=="" set "SERVER_IP=%~1"
set "API_PORT=4000"
set "CUSTOMER_PORT=3001"
set "BUSINESS_PORT=3002"
set "ADMIN_PORT=3003"
set "CUSTOMER_FLUTTER_PORT=8081"
set "BUSINESS_FLUTTER_PORT=8082"
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
for %%P in (%API_PORT% %CUSTOMER_PORT% %BUSINESS_PORT% %ADMIN_PORT% %CUSTOMER_FLUTTER_PORT% %BUSINESS_FLUTTER_PORT%) do (
  powershell.exe -NoLogo -NoProfile -Command "$c=Get-NetTCPConnection -State Listen -LocalPort %%P -ErrorAction SilentlyContinue; if($c){$c.OwningProcess ^| Sort-Object -Unique ^| ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }}" >nul 2>&1
)

echo Releasing stale LOOKIVA Node/Prisma file handles...
powershell.exe -NoLogo -NoProfile -Command "$root=[IO.Path]::GetFullPath('%CD%'); Get-CimInstance Win32_Process -Filter 'Name=''node.exe''' -ErrorAction SilentlyContinue ^| Where-Object { $_.CommandLine -and $_.CommandLine -like ('*' + $root + '*') } ^| ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; Start-Sleep -Milliseconds 700" >nul 2>&1

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
set "CORS_ORIGINS=http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:8081,http://localhost:8082,http://%SERVER_IP%:3001,http://%SERVER_IP%:3002,http://%SERVER_IP%:3003,http://%SERVER_IP%:8081,http://%SERVER_IP%:8082"
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
set /a PRISMA_TRY=0
:PRISMA_GENERATE_RETRY
set /a PRISMA_TRY+=1
powershell.exe -NoLogo -NoProfile -Command "Remove-Item -LiteralPath '%CD%\node_modules\.prisma\client\query_engine-windows.dll.node.tmp*' -Force -ErrorAction SilentlyContinue" >nul 2>&1
call pnpm --filter @lookiva/api prisma:generate
if not errorlevel 1 goto PRISMA_GENERATE_OK

if !PRISMA_TRY! GEQ 3 (
  echo [ERROR] Prisma client is still locked after !PRISMA_TRY! attempts.
  echo Close any terminal, VS Code task, Node server, Prisma Studio, or antivirus scan using this LOOKIVA folder, then run START-LOOKIVA-LAN.bat again.
  goto FAILED
)

echo Prisma engine is locked. Releasing stale LOOKIVA Node processes and retrying...
powershell.exe -NoLogo -NoProfile -Command "$root=[IO.Path]::GetFullPath('%CD%'); Get-CimInstance Win32_Process -Filter 'Name=''node.exe''' -ErrorAction SilentlyContinue ^| Where-Object { $_.CommandLine -and $_.CommandLine -like ('*' + $root + '*') } ^| ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; Start-Sleep -Seconds 2" >nul 2>&1
goto PRISMA_GENERATE_RETRY

:PRISMA_GENERATE_OK
call pnpm --filter @lookiva/api prisma:migrate
if errorlevel 1 goto FAILED

echo Seeding required LOOKIVA reference data...
call pnpm --filter @lookiva/api prisma:seed:prod
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

set "FLUTTER_AVAILABLE=0"
where flutter >nul 2>&1
if not errorlevel 1 set "FLUTTER_AVAILABLE=1"

set "NEED_FLUTTER_BUILD=0"
if "%NEED_BUILD%"=="1" set "NEED_FLUTTER_BUILD=1"
if not exist "apps\customer-mobile\build\web\index.html" set "NEED_FLUTTER_BUILD=1"
if not exist "apps\business-mobile\build\web\index.html" set "NEED_FLUTTER_BUILD=1"

if "%NEED_FLUTTER_BUILD%"=="1" (
  if "%FLUTTER_AVAILABLE%"=="1" (
    echo Building Customer Flutter Web...
    pushd "apps\customer-mobile"
    call flutter pub get
    if errorlevel 1 (popd & goto FAILED)
    call flutter build web --release --dart-define=LOOKIVA_API_URL=http://%SERVER_IP%:%API_PORT%/api/v1
    if errorlevel 1 (popd & goto FAILED)
    popd

    echo Building Business Flutter Web...
    pushd "apps\business-mobile"
    call flutter pub get
    if errorlevel 1 (popd & goto FAILED)
    call flutter build web --release --dart-define=LOOKIVA_API_URL=http://%SERVER_IP%:%API_PORT%/api/v1
    if errorlevel 1 (popd & goto FAILED)
    popd
  ) else (
    echo [WARNING] Flutter is not in PATH. Flutter Web portals will be skipped.
  )
)

if not exist ".lookiva-runtime\logs" mkdir ".lookiva-runtime\logs"
del /q ".lookiva-runtime\logs\*.log" >nul 2>&1

if not exist "apps\api\dist\packages\localization\src\locales\en.json" (
  echo [ERROR] API localization asset en.json is missing from production dist.
  goto FAILED
)
if not exist "apps\api\dist\packages\localization\src\locales\ar.json" (
  echo [ERROR] API localization asset ar.json is missing from production dist.
  goto FAILED
)
if not exist "apps\api\dist\packages\localization\src\locales\fr.json" (
  echo [ERROR] API localization asset fr.json is missing from production dist.
  goto FAILED
)

echo [7/8] Starting LOOKIVA services...
start "LOOKIVA API" /min cmd /d /c "call pnpm --filter @lookiva/api start 1>>.lookiva-runtime\logs\api.log 2>&1"
start "LOOKIVA WORKERS" /min cmd /d /c "call pnpm --filter @lookiva/workers start 1>>.lookiva-runtime\logs\workers.log 2>&1"
start "LOOKIVA CUSTOMER WEB" /min cmd /d /c "call pnpm --filter @lookiva/customer-web start --hostname 0.0.0.0 1>>.lookiva-runtime\logs\customer-web.log 2>&1"
start "LOOKIVA BUSINESS WEB" /min cmd /d /c "call pnpm --filter @lookiva/business-web start --hostname 0.0.0.0 1>>.lookiva-runtime\logs\business-web.log 2>&1"
start "LOOKIVA ADMIN WEB" /min cmd /d /c "call pnpm --filter @lookiva/admin-web start --hostname 0.0.0.0 1>>.lookiva-runtime\logs\admin-web.log 2>&1"

if exist "apps\customer-mobile\build\web\index.html" (
  start "LOOKIVA CUSTOMER FLUTTER WEB" /min cmd /d /c "node scripts\windows\static-server.js apps\customer-mobile\build\web %CUSTOMER_FLUTTER_PORT% 0.0.0.0 1>>.lookiva-runtime\logs\customer-flutter-web.log 2>&1"
)

if exist "apps\business-mobile\build\web\index.html" (
  start "LOOKIVA BUSINESS FLUTTER WEB" /min cmd /d /c "node scripts\windows\static-server.js apps\business-mobile\build\web %BUSINESS_FLUTTER_PORT% 0.0.0.0 1>>.lookiva-runtime\logs\business-flutter-web.log 2>&1"
)

echo [8/8] Waiting for API health...
powershell.exe -NoLogo -NoProfile -Command "$u='http://%SERVER_IP%:%API_PORT%/health'; for($i=0;$i -lt 45;$i++){try{$r=Invoke-WebRequest -UseBasicParsing -Uri $u -TimeoutSec 3;if($r.StatusCode -ge 200 -and $r.StatusCode -lt 500){exit 0}}catch{};Start-Sleep -Seconds 1};exit 1"
if errorlevel 1 (
  echo.
  echo [ERROR] API did not become healthy.
  echo ============================================================
  echo  LAST API LOG LINES
  echo ============================================================
  if exist ".lookiva-runtime\logs\api.log" (
    powershell.exe -NoLogo -NoProfile -Command "Get-Content '.lookiva-runtime\logs\api.log' -Tail 100"
  ) else (
    echo API log file was not created.
  )
  echo ============================================================
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
if exist "apps\customer-mobile\build\web\index.html" echo  Customer App : http://%SERVER_IP%:%CUSTOMER_FLUTTER_PORT%
if exist "apps\business-mobile\build\web\index.html" echo  Business App : http://%SERVER_IP%:%BUSINESS_FLUTTER_PORT%
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
if exist "apps\customer-mobile\build\web\index.html" start "" "http://%SERVER_IP%:%CUSTOMER_FLUTTER_PORT%"
if exist "apps\business-mobile\build\web\index.html" start "" "http://%SERVER_IP%:%BUSINESS_FLUTTER_PORT%"
start "" "http://%SERVER_IP%:%API_PORT%/api/docs"

exit /b 0

:FAILED
echo.
echo [ERROR] LOOKIVA startup failed during build/database preparation.
pause
exit /b 1
