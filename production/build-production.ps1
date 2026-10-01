$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $ROOT

$PROD = "$ROOT\production"
$DIST_APK       = "$PROD\APK"
$DIST_WEB       = "$PROD\WEB"
$DIST_SERVER    = "$PROD\SERVER"
$DIST_MANIFEST  = "$PROD\manifest.json"

$env:LOOKIVA_ROOT = $ROOT
$env:PUB_CACHE = "$ROOT\.pub-cache"
$API_URL = if ($env:LOOKIVA_API_URL) { $env:LOOKIVA_API_URL } else { "http://192.168.1.120:8000/api/v1" }
$ServerPort = if ($env:LOOKIVA_PORT) { $env:LOOKIVA_PORT } else { 8000 }

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " LOOKIVA Production Suite Build -> $PROD" -ForegroundColor Cyan
Write-Host " API_URL  (embedded in apps) = $API_URL" -ForegroundColor Gray
Write-Host " SERVER PORT (when launched) = $ServerPort" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Cyan

if (-not (Get-Command flutter -ErrorAction SilentlyContinue)) { throw "flutter not in PATH" }
if (-not (Get-Command node    -ErrorAction SilentlyContinue)) { throw "node not in PATH" }

$Step = 0
function Next-Step([string]$msg) {
    $script:Step++
    Write-Host ""
    Write-Host "[$Step/8] $msg" -ForegroundColor Yellow
    Write-Host ("-" * 60) -ForegroundColor Gray
}

# --- Prep output dirs ---
foreach ($d in @($PROD,$DIST_APK,$DIST_WEB,$DIST_SERVER)) {
    if (Test-Path $d) { Remove-Item $d -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $d | Out-Null
}

# --- Toolchain: pnpm ---
Next-Step "Setup pnpm 9.15.0"
try { corepack enable 2>$null } catch {}
try { corepack prepare pnpm@9.15.0 --activate 2>$null } catch {}
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    if (-not (Test-Path "$ROOT\_tools\node_modules\.bin\pnpm.cmd")) {
        npm install pnpm@9.15.0 --no-save --prefix "$ROOT\_tools" | Out-Null
    }
    $env:PATH = "$ROOT\_tools\node_modules\.bin;$env:PATH"
    $PNPM = "$ROOT\_tools\node_modules\.bin\pnpm.cmd"
} else { $PNPM = "pnpm" }
Write-Host "  pnpm version: $((& $PNPM --version))" -ForegroundColor Green

Next-Step "Sync workspace settings (apply-settings.js)"
node "$ROOT\scripts\apply-settings.js" all | ForEach-Object { Write-Host "  $_" }

Next-Step "Install workspace dependencies (pnpm install --prefer-offline)"
& $PNPM install --prefer-offline
if ($LASTEXITCODE -ne 0) { throw "pnpm install failed" }

# ============================================================
# 1) APKs (Customer + Business)
# ============================================================
Next-Step "Customer Android APK (release)"
Push-Location "$ROOT\apps\customer-mobile"
flutter pub get --prefer-offline
flutter build apk --release "--dart-define=LOOKIVA_API_URL=$API_URL"
if ($LASTEXITCODE -ne 0) { throw "Customer APK build failed" }
$src = ".\build\app\outputs\flutter-apk\app-release.apk"
if (-not (Test-Path $src)) { throw "Customer APK missing after build" }
Copy-Item $src "$DIST_APK\LOOKIVA-Customer.apk" -Force
Write-Host "  -> $DIST_APK\LOOKIVA-Customer.apk" -ForegroundColor Green
Pop-Location

Next-Step "Business Android APK (release)"
Push-Location "$ROOT\apps\business-mobile"
flutter pub get --prefer-offline
flutter build apk --release "--dart-define=LOOKIVA_API_URL=$API_URL"
if ($LASTEXITCODE -ne 0) { throw "Business APK build failed" }
$src = ".\build\app\outputs\flutter-apk\app-release.apk"
if (-not (Test-Path $src)) { throw "Business APK missing after build" }
Copy-Item $src "$DIST_APK\LOOKIVA-Business.apk" -Force
Write-Host "  -> $DIST_APK\LOOKIVA-Business.apk" -ForegroundColor Green
Pop-Location

# ============================================================
# 2) WEB builds
# ============================================================
Next-Step "WEB: Customer Flutter Web"
Push-Location "$ROOT\apps\customer-mobile"
if (-not (Test-Path "web\index.html")) {
    echo y | flutter create . --platforms web --project-name lookiva_customer | Out-Null
}
flutter build web --release "--dart-define=LOOKIVA_API_URL=$API_URL" --no-tree-shake-icons
if ($LASTEXITCODE -ne 0) { throw "Customer Flutter Web failed" }
$dst = "$DIST_WEB\customer-mobile-web"
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Copy-Item ".\build\web\*" $dst -Recurse -Force
Write-Host "  -> $dst (index.html)" -ForegroundColor Green
Pop-Location

Next-Step "WEB: Business Flutter Web"
Push-Location "$ROOT\apps\business-mobile"
if (-not (Test-Path "web\index.html")) {
    echo y | flutter create . --platforms web --project-name lookiva_business | Out-Null
}
flutter build web --release "--dart-define=LOOKIVA_API_URL=$API_URL" --no-tree-shake-icons
if ($LASTEXITCODE -ne 0) { throw "Business Flutter Web failed" }
$dst = "$DIST_WEB\business-mobile-web"
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Copy-Item ".\build\web\*" $dst -Recurse -Force
Write-Host "  -> $dst (index.html)" -ForegroundColor Green
Pop-Location

Next-Step "WEB: Customer Next.js + Business Next.js + Admin Next.js (production builds)"
foreach ($pair in @(
    @("customer-web","customer-website"),
    @("business-web","business-website"),
    @("admin-web","admin-website")
)) {
    $app,$alias = $pair
    $srcApp = "$ROOT\apps\$app"
    if (-not (Test-Path "$srcApp\package.json")) { Write-Host "  skip $app (not found)" -ForegroundColor Gray; continue }
    & $PNPM --filter "@lookiva/$app" build 2>&1 | ForEach-Object { Write-Host "    [$app] $_" }
    if ($LASTEXITCODE -ne 0) { throw "$app build failed" }
    $dst = "$DIST_WEB\$alias"
    New-Item -ItemType Directory -Force -Path "$dst\.next" | Out-Null
    if (Test-Path "$srcApp\.next")        { Copy-Item "$srcApp\.next\*"        "$dst\.next" -Recurse -Force }
    if (Test-Path "$srcApp\public")       { Copy-Item "$srcApp\public\*"       "$dst\" -Recurse -Force }
    if (Test-Path "$srcApp\package.json") { Copy-Item "$srcApp\package.json"   "$dst\" -Force }
    if (Test-Path "$srcApp\.env.local")   { Copy-Item "$srcApp\.env.local"     "$dst\.env" -Force }
    if (Test-Path "$srcApp\next.config.mjs") { Copy-Item "$srcApp\next.config.mjs" "$dst\" -Force }
    Write-Host "  -> $dst  (run with: pnpm start -C $dst)" -ForegroundColor Green
}

# ============================================================
# 3) SERVER EXE (NestJS API -> standalone lookiva-server.exe OR portable launcher)
# ============================================================
Next-Step "SERVER EXE: build NestJS dist + package to .exe"
& $PNPM --filter @lookiva/api prisma:generate
& $PNPM --filter @lookiva/api build
if ($LASTEXITCODE -ne 0) { throw "NestJS API build failed" }
if (-not (Test-Path "$ROOT\apps\api\dist\main.js")) { throw "API dist/main.js missing" }

$stage = "$ROOT\.stage-server-exe"
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Force -Path "$stage\prisma" | Out-Null
Copy-Item "$ROOT\apps\api\dist\*" $stage -Recurse -Force
Copy-Item "$ROOT\apps\api\prisma\schema.prisma" "$stage\prisma\" -Force
Copy-Item "$ROOT\apps\api\.env.local" "$stage\.env" -Force
Copy-Item "$ROOT\apps\api\package.json" "$stage\package.json" -Force

# --- copy runtime node modules (best effort: api deps needed for dynamic requires like prisma engines/bcrypt/sharp) ---
& $PNPM --filter @lookiva/api deploy "$stage\_node_modules_prod" --prod --ignore-scripts 2>$null
if (-not (Test-Path "$stage\_node_modules_prod\node_modules")) {
    New-Item -ItemType Directory -Force -Path "$stage\node_modules" | Out-Null
    # fallback: copy top-level workspace deps the API references
    $wanted = @("@prisma","@nestjs","prisma","bcrypt","sharp","bullmq","ioredis","minio","class-validator","class-transformer","nestjs-i18n","nestjs-pino")
    foreach ($w in $wanted) {
        $srcDep = "$ROOT\node_modules\$w"
        if (Test-Path $srcDep) { Copy-Item $srcDep "$stage\node_modules\" -Recurse -Force }
    }
} else {
    Move-Item "$stage\_node_modules_prod\node_modules" "$stage\node_modules" -Force
    Remove-Item "$stage\_node_modules_prod" -Recurse -Force
}

# Attempt single-file pkg bundle to $DIST_SERVER\LOOKIVA-Server.exe
$pkgCmd = "$ROOT\_tools\node_modules\.bin\pkg.cmd"
$pkgOk = $false
if (-not (Test-Path $pkgCmd)) {
    npm install pkg@5.8.1 --no-save --prefix "$ROOT\_tools" 2>$null
}
if (Test-Path $pkgCmd) {
    Push-Location $stage
    @"
{
  "name": "lookiva-server",
  "version": "1.0.0",
  "main": "main.js",
  "bin": "main.js",
  "pkg": {
    "assets": [ "prisma/**", ".env", "node_modules/@prisma/client/**/*", "node_modules/.prisma/**/*", "node_modules/**/*.node" ],
    "targets": [ "node20-win-x64" ]
  }
}
"@ | Out-File "$stage\package.json" -Encoding utf8 -Force
    try {
        & $pkgCmd . --targets node20-win-x64 --output "$DIST_SERVER\LOOKIVA-Server.exe" --no-bytecode --public-packages "*" --public 2>&1 | ForEach-Object { Write-Host "    [pkg] $_" }
        if (Test-Path "$DIST_SERVER\LOOKIVA-Server.exe") { $pkgOk = $true }
    } catch { Write-Warning "pkg step: $_" }
    Pop-Location
}

if ($pkgOk) {
    Copy-Item "$stage\.env"           "$DIST_SERVER\.env" -Force
    Copy-Item "$stage\prisma\*"       "$DIST_SERVER\prisma\" -Recurse -Force
    New-Item -ItemType Directory -Force -Path "$DIST_SERVER\prisma" | Out-Null
    Write-Host "  -> $DIST_SERVER\LOOKIVA-Server.exe  (single file)" -ForegroundColor Green
} else {
    Write-Host "  pkg bundling skipped/failed. Using PORTABLE launcher + node.exe instead." -ForegroundColor Yellow
    $exeDir = "$DIST_SERVER"
    if (-not (Test-Path "$exeDir\node.exe")) {
        $nodeSrc = (Get-Command node).Source
        Copy-Item $nodeSrc "$exeDir\node.exe" -Force
    }
    Copy-Item "$stage\*" $exeDir -Recurse -Force
    # launcher bat
    $bat = @"
@echo off
setlocal
cd /d "%~dp0"
if not exist ".env" (
  echo [LOOKIVA] No .env found in SERVER folder. Copying .env.example if present...
  if exist ".env.example" copy /y ".env.example" ".env" >nul
)
set NODE_ENV=production
set PORT=$ServerPort
echo [LOOKIVA] Starting LOOKIVA Server on http://localhost:%PORT% ...
if exist "LOOKIVA-Server.exe" (
  start "LOOKIVA-Server" /B "LOOKIVA-Server.exe"
) else (
  start "LOOKIVA-Server" /B node.exe main.js
)
timeout /t 3 /nobreak >nul
echo.
echo [LOOKIVA] Server should be running. Press any key to exit launcher (server continues)...
pause >nul
"@
    $bat | Out-File "$exeDir\START-SERVER.bat" -Encoding ascii

    $oneClick = @"
@echo off
setlocal
cd /d "%~dp0\SERVER"
call START-SERVER.bat
"@
    $oneClick | Out-File "$PROD\START-LOOKIVA-SERVER.bat" -Encoding ascii

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zipOut = "$PROD\LOOKIVA-Server-portable.zip"
    if (Test-Path $zipOut) { Remove-Item $zipOut -Force }
    [System.IO.Compression.ZipFile]::CreateFromDirectory($exeDir, $zipOut)
    Write-Host "  -> $exeDir (portable folder, run START-SERVER.bat)" -ForegroundColor Green
    Write-Host "  -> $zipOut (zipped portable)" -ForegroundColor Green
}

# ============================================================
# 4) One-click launcher inside production/ for web + server
# ============================================================
Next-Step "WORKERS: Building @lookiva/workers (BullMQ background jobs)"
$workersOk = $false
if (Test-Path "$ROOT\apps\workers\package.json") {
    try {
        & $PNPM --filter @lookiva/workers build 2>&1 | ForEach-Object { Write-Host "    [workers] $_" }
        if ($LASTEXITCODE -eq 0 -and (Test-Path "$ROOT\apps\workers\dist\main.js")) {
            $wDst = "$DIST_SERVER\WORKERS"
            New-Item -ItemType Directory -Force -Path $wDst | Out-Null
            Copy-Item "$ROOT\apps\workers\dist\*" $wDst -Recurse -Force
            Copy-Item "$ROOT\apps\workers\.env.local" "$wDst\.env" -Force -ErrorAction SilentlyContinue
            Copy-Item "$ROOT\apps\workers\package.json" "$wDst\" -Force
            # launcher for workers
            $wbat = @"
@echo off
setlocal
cd /d "%~dp0"
set NODE_ENV=production
if exist "..\node.exe" (start "LOOKIVA-Workers" /B ..\node.exe main.js) else (start "LOOKIVA-Workers" /B node main.js)
"@
            $wbat | Out-File "$wDst\START-WORKERS.bat" -Encoding ascii
            $workersOk = $true
            Write-Host "  -> $wDst (START-WORKERS.bat)" -ForegroundColor Green
        }
    } catch { Write-Warning "workers build skipped: $_" }
}
if (-not $workersOk) { Write-Host "  workers build skipped (not fatal)." -ForegroundColor Gray }

Next-Step "Creating one-click launchers inside production/"
$launchAll = @"
@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
set PROD=%~dp0
set PORT=$ServerPort

echo ============================================================
echo  LOOKIVA - One Click Production Launch
echo ============================================================
echo.
echo [1/3] Starting LOOKIVA Server on http://localhost:%PORT% ...
start "LOOKIVA-Server" /MIN cmd /c "cd /d ""%PROD%\SERVER"" && START-SERVER.bat"
timeout /t 5 /nobreak >nul

echo [2/3] Starting Customer Website on http://localhost:3001 ...
start "LOOKIVA-CustomerWeb" /MIN cmd /c "cd /d ""%PROD%\WEB\customer-website"" && npm install -g pnpm@9.15.0 2>nul && pnpm start -p 3001"

echo [3/3] Starting Business Website on http://localhost:3002 ...
start "LOOKIVA-BusinessWeb" /MIN cmd /c "cd /d ""%PROD%\WEB\business-website"" && npm install -g pnpm@9.15.0 2>nul && pnpm start -p 3002"

echo [+] Starting background WORKERS ...
if exist "%PROD%\SERVER\WORKERS\START-WORKERS.bat" (
  start "LOOKIVA-Workers" /MIN cmd /c "call ""%PROD%\SERVER\WORKERS\START-WORKERS.bat"""
)

timeout /t 3 /nobreak >nul
echo.
echo ============================================================
echo  Services started:
echo   SERVER ........... http://localhost:%PORT%/api/v1/health
echo   CUSTOMER WEB ..... http://localhost:3001
echo   BUSINESS WEB ..... http://localhost:3002
echo   ADMIN WEB   (if built) run manually: pnpm start -C WEB\admin-website -p 3003
echo   APKS ... APK\LOOKIVA-Customer.apk, APK\LOOKIVA-Business.apk
echo.
echo   Flutter mobile web (static, open in browser):
echo     %PROD%WEB\customer-mobile-web\index.html
echo     %PROD%WEB\business-mobile-web\index.html
echo ============================================================
echo Press any key to open dashboards...
pause >nul
start "" "http://localhost:3001"
start "" "http://localhost:3002"
start "" "http://localhost:%PORT%/api/v1/health"
"@
$launchAll | Out-File "$PROD\START-ALL.bat" -Encoding ascii

# ============================================================
# 5) Manifest
# ============================================================
Next-Step "Writing production manifest"
function Get-Size($p) {
    if (-not (Test-Path $p)) { return 0 }
    return [math]::Round((Get-ChildItem $p -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum/1MB,2)
}
$manifest = [ordered]@{
    built_at               = Get-Date -Format "o"
    api_url_embedded       = $API_URL
    flutter                = (& flutter --version 2>$null | Select-Object -First 1)
    node                   = (& node -v)
    pnpm                   = (& $PNPM -v)
    outputs_mb             = [ordered]@{
        "APK\LOOKIVA-Customer.apk"           = Get-Size "$DIST_APK\LOOKIVA-Customer.apk"
        "APK\LOOKIVA-Business.apk"           = Get-Size "$DIST_APK\LOOKIVA-Business.apk"
        "WEB\customer-mobile-web"            = Get-Size "$DIST_WEB\customer-mobile-web"
        "WEB\business-mobile-web"            = Get-Size "$DIST_WEB\business-mobile-web"
        "WEB\customer-website (Next.js)"     = Get-Size "$DIST_WEB\customer-website"
        "WEB\business-website (Next.js)"     = Get-Size "$DIST_WEB\business-website"
        "WEB\admin-website (Next.js)"        = Get-Size "$DIST_WEB\admin-website"
        "SERVER"                              = Get-Size $DIST_SERVER
    }
    one_click_launcher     = "START-ALL.bat"
    server_launcher        = "START-LOOKIVA-SERVER.bat"
}
$manifest | ConvertTo-Json -Depth 10 | Out-File $DIST_MANIFEST -Encoding utf8

Pop-Location
Write-Host ""
Write-Host "======== PRODUCTION BUILD SUCCESS ========" -ForegroundColor Green
Write-Host "Folder : $PROD" -ForegroundColor Cyan
Write-Host "Launch : double-click $PROD\START-ALL.bat    (server + customer + business web)" -ForegroundColor Cyan
Write-Host "APKs   : $DIST_APK\LOOKIVA-Customer.apk"
Write-Host "         $DIST_APK\LOOKIVA-Business.apk"
Write-Host ""
Get-ChildItem $PROD -Recurse -File -ErrorAction SilentlyContinue |
    Select-Object @{N='Rel';E={$_.FullName.Substring($PROD.Length+1)}},@{N='MB';E={[math]::Round($_.Length/1MB,2)}} |
    Sort-Object Rel | Format-Table -AutoSize
exit 0
