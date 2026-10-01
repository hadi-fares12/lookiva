$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $ROOT

Write-Host "=== LOOKIVA Full Build Suite ===" -ForegroundColor Cyan
Write-Host "Project root: $ROOT" -ForegroundColor Gray

$env:LOOKIVA_ROOT = $ROOT
$env:PUB_CACHE = "$ROOT\.pub-cache"
$GRADLE_USER_HOME = "$env:USERPROFILE\.gradle"
$API_URL = if ($env:LOOKIVA_API_URL) { $env:LOOKIVA_API_URL } elseif ($env:MOBILE_API_URL) { $env:MOBILE_API_URL } else { "http://10.0.2.2:4000/api/v1" }

if (-not (Get-Command flutter -ErrorAction SilentlyContinue)) {
    Write-Error "flutter not found in PATH. Ensure Flutter SDK is installed and in PATH."
    exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "node not found in PATH. Install Node.js 20+."
    exit 1
}

$Step = 0
function Next-Step([string]$msg) {
    $script:Step++
    Write-Host ""
    Write-Host "[$Step] $msg" -ForegroundColor Yellow
    Write-Host ("-" * 60) -ForegroundColor Gray
}

Next-Step "Enable pnpm via corepack (project requires pnpm@9.15.0)"
try {
    corepack enable 2>$null
} catch {}
try {
    corepack prepare pnpm@9.15.0 --activate 2>$null
} catch {}
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "  Falling back to npm-installed local pnpm..." -ForegroundColor Gray
    if (-not (Test-Path "$ROOT\_tools\node_modules\.bin\pnpm.cmd")) {
        npm install pnpm@9.15.0 --no-save --prefix "$ROOT\_tools"
    }
    $env:PATH = "$ROOT\_tools\node_modules\.bin;$env:PATH"
    $PNPM = "$ROOT\_tools\node_modules\.bin\pnpm.cmd"
} else {
    $PNPM = "pnpm"
}
Write-Host "  OK: using $((& $PNPM --version))" -ForegroundColor Green

Next-Step "pnpm workspace install (offline if possible)"
& $PNPM install --prefer-offline
if ($LASTEXITCODE -ne 0) { throw "pnpm install failed" }

Next-Step "Apply project settings (apply-settings.js)"
node "$ROOT\scripts\apply-settings.js" all

Next-Step "[1/4] Customer Mobile APK (flutter build apk --release)"
Push-Location "$ROOT\apps\customer-mobile"
flutter pub get --prefer-offline
flutter build apk --release "--dart-define=LOOKIVA_API_URL=$API_URL"
if ($LASTEXITCODE -ne 0) { throw "Customer APK build failed" }
$apkCust = "$ROOT\apps\customer-mobile\build\app\outputs\flutter-apk\app-release.apk"
if (Test-Path $apkCust) {
    $dest = "$ROOT\dist\lookiva_customer-release.apk"
    New-Item -ItemType Directory -Force -Path "$ROOT\dist" | Out-Null
    Copy-Item $apkCust $dest -Force
    Write-Host "  OK -> $dest" -ForegroundColor Green
}
Pop-Location

Next-Step "[2/4] Business Mobile APK (flutter build apk --release)"
Push-Location "$ROOT\apps\business-mobile"
flutter pub get --prefer-offline
flutter build apk --release "--dart-define=LOOKIVA_API_URL=$API_URL"
if ($LASTEXITCODE -ne 0) { throw "Business APK build failed" }
$apkBiz = "$ROOT\apps\business-mobile\build\app\outputs\flutter-apk\app-release.apk"
if (Test-Path $apkBiz) {
    $dest = "$ROOT\dist\lookiva_business-release.apk"
    New-Item -ItemType Directory -Force -Path "$ROOT\dist" | Out-Null
    Copy-Item $apkBiz $dest -Force
    Write-Host "  OK -> $dest" -ForegroundColor Green
}
Pop-Location

Next-Step "[3a/4] Customer Mobile WEB (flutter build web --release)"
Push-Location "$ROOT\apps\customer-mobile"
flutter build web --release "--dart-define=LOOKIVA_API_URL=$API_URL" --no-tree-shake-icons
if ($LASTEXITCODE -ne 0) { throw "Customer Flutter Web build failed" }
$src = "$ROOT\apps\customer-mobile\build\web"
$dst = "$ROOT\dist\web\customer-flutter-web"
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Copy-Item "$src\*" $dst -Recurse -Force
Write-Host "  OK -> $dst" -ForegroundColor Green
Pop-Location

Next-Step "[3b/4] Business Mobile WEB (flutter build web --release)"
Push-Location "$ROOT\apps\business-mobile"
flutter build web --release "--dart-define=LOOKIVA_API_URL=$API_URL" --no-tree-shake-icons
if ($LASTEXITCODE -ne 0) { throw "Business Flutter Web build failed" }
$src = "$ROOT\apps\business-mobile\build\web"
$dst = "$ROOT\dist\web\business-flutter-web"
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Copy-Item "$src\*" $dst -Recurse -Force
Write-Host "  OK -> $dst" -ForegroundColor Green
Pop-Location

Next-Step "[4a/4] Customer Next.js Web App build"
& $PNPM --filter @lookiva/customer-web build
if ($LASTEXITCODE -ne 0) { throw "Customer Next.js build failed" }
$src = "$ROOT\apps\customer-web\.next"
$dst = "$ROOT\dist\web\customer-next"
New-Item -ItemType Directory -Force -Path $dst | Out-Null
if (Test-Path $src) { Copy-Item "$src\*" $dst -Recurse -Force }
Copy-Item "$ROOT\apps\customer-web\package.json" "$dst\" -Force
Copy-Item "$ROOT\apps\customer-web\.env.local" "$dst\" -Force
Write-Host "  OK -> $dst (run via: pnpm start -C apps/customer-web)" -ForegroundColor Green

Next-Step "[4b/4] Business Next.js Web App build"
& $PNPM --filter @lookiva/business-web build
if ($LASTEXITCODE -ne 0) { throw "Business Next.js build failed" }
$src = "$ROOT\apps\business-web\.next"
$dst = "$ROOT\dist\web\business-next"
New-Item -ItemType Directory -Force -Path $dst | Out-Null
if (Test-Path $src) { Copy-Item "$src\*" $dst -Recurse -Force }
Copy-Item "$ROOT\apps\business-web\package.json" "$dst\" -Force
Copy-Item "$ROOT\apps\business-web\.env.local" "$dst\" -Force
Write-Host "  OK -> $dst (run via: pnpm start -C apps/business-web)" -ForegroundColor Green

Next-Step "[5/4] Build NestJS API + Package into lookiva-server.exe"
& $PNPM --filter @lookiva/api prisma:generate
& $PNPM --filter @lookiva/api build
if ($LASTEXITCODE -ne 0) { throw "NestJS API build (dist/) failed" }

$distDir = "$ROOT\apps\api\dist"
if (-not (Test-Path "$distDir\main.js")) { throw "Expected $distDir\main.js missing" }

Write-Host "  Copying runtime artifacts into staging folder..." -ForegroundColor Gray
$stage = "$ROOT\.stage-exe"
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Force -Path "$stage\prisma" | Out-Null
Copy-Item "$distDir\*" $stage -Recurse -Force
Copy-Item "$ROOT\apps\api\prisma\schema.prisma" "$stage\prisma\" -Force
Copy-Item "$ROOT\apps\api\.env.local" "$stage\.env" -Force

$pkgExe = "$ROOT\_tools\node_modules\.bin\pkg.cmd"
if (-not (Test-Path $pkgExe)) {
    Write-Host "  Installing pkg (exe bundler) locally..." -ForegroundColor Gray
    npm install pkg@5.8.1 --no-save --prefix "$ROOT\_tools"
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "pkg install failed. Falling back to standalone node + launcher exe."
        $useFallback = $true
    }
}

if (-not $useFallback) {
    Write-Host "  Running pkg to build single-file lookiva-server.exe..." -ForegroundColor Gray
    Push-Location $stage
    @"
{
  "name": "lookiva-server",
  "main": "main.js",
  "bin": "main.js",
  "pkg": {
    "assets": [
      "prisma/**/*",
      ".env",
      "**/*.node",
      "node_modules/.prisma/**/*",
      "node_modules/@prisma/client/**/*.node"
    ],
    "targets": [ "node20-win-x64" ],
    "outputPath": ".."
  },
  "dependencies": $(Get-Content "$ROOT\apps\api\package.json" | ConvertFrom-Json | Select-Object -ExpandProperty dependencies | ConvertTo-Json -Compress)
}
"@ | Out-File "$stage\package.json" -Encoding utf8

    try {
        & $pkgExe . --target node20-win-x64 --output "$ROOT\dist\lookiva-server.exe" 2>&1 | ForEach-Object { Write-Host "    $_" }
        if ($LASTEXITCODE -eq 0 -and (Test-Path "$ROOT\dist\lookiva-server.exe")) {
            Write-Host "  OK -> $ROOT\dist\lookiva-server.exe" -ForegroundColor Green
            $pkgOk = $true
        }
    } catch {
        Write-Warning "pkg bundling failed: $_"
    }
    Pop-Location
}

if (-not $pkgOk) {
    Write-Host "  Fallback: building zero-dependency PowerShell launcher + portable node folder" -ForegroundColor Gray
    $exeDir = "$ROOT\dist\lookiva-server-portable"
    New-Item -ItemType Directory -Force -Path $exeDir | Out-Null
    Copy-Item "$stage\*" $exeDir -Recurse -Force
    if (-not (Test-Path "$exeDir\node.exe")) {
        $nodeSrc = (Get-Command node).Source
        Copy-Item $nodeSrc "$exeDir\node.exe" -Force
    }

    $launcher = @"
@echo off
setlocal
cd /d "%~dp0"
set NODE_ENV=production
if not exist ".env" copy /y .env.example .env >nul 2>nul
start /B node.exe main.js
"@
    $launcher | Out-File "$exeDir\start-server.bat" -Encoding ascii

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zipOut = "$ROOT\dist\lookiva-server-portable.zip"
    if (Test-Path $zipOut) { Remove-Item $zipOut -Force }
    [System.IO.Compression.ZipFile]::CreateFromDirectory($exeDir, $zipOut)
    Write-Host "  OK portable (start via start-server.bat) -> $exeDir" -ForegroundColor Green
    Write-Host "  OK portable zip -> $zipOut" -ForegroundColor Green
}

Next-Step "Write summary manifest"
$manifest = [ordered]@{
    built_at = Get-Date -Format "o"
    flutter_version = (& flutter --version | Select-Object -First 1)
    node_version    = (& node -v)
    pnpm_version    = (& $PNPM -v)
    outputs = [ordered]@{
        customer_apk             = "dist/lookiva_customer-release.apk"
        business_apk             = "dist/lookiva_business-release.apk"
        customer_flutter_web     = "dist/web/customer-flutter-web (index.html)"
        business_flutter_web     = "dist/web/business-flutter-web (index.html)"
        customer_next_web        = "dist/web/customer-next (run via pnpm start)"
        business_next_web        = "dist/web/business-next (run via pnpm start)"
        server_exe_or_portable   = "dist/lookiva-server.exe or dist/lookiva-server-portable/start-server.bat"
    }
    api_url_embedded = $API_URL
    notes = @(
        "Flutter APK/Web are built with LOOKIVA_API_URL=$API_URL",
        "NestJS exe/pkg is built with apps/api/.env.local copied as .env",
        "Before running server: ensure PostgreSQL+PostGIS, Redis, MinIO are reachable",
        "For prod: set NODE_ENV=production and rotate JWT/DB secrets"
    )
}
$manifest | ConvertTo-Json -Depth 6 | Out-File "$ROOT\dist\build-manifest.json" -Encoding utf8

Pop-Location
Write-Host ""
Write-Host "=== ALL BUILDS COMPLETE ===" -ForegroundColor Green
Write-Host "Output folder: $ROOT\dist\" -ForegroundColor Cyan
Get-ChildItem "$ROOT\dist" -Recurse -File | Select-Object FullName, Length | Format-Table -AutoSize
Write-Host ""
Write-Host "Quick test commands:" -ForegroundColor White
Write-Host "  Customer APK side-load: adb install $ROOT\dist\lookiva_customer-release.apk"
Write-Host "  Customer web preview:  npx serve $ROOT\dist\web\customer-flutter-web"
Write-Host "  Server start (portable): cd $ROOT\dist\lookiva-server-portable ; .\start-server.bat"
exit 0
