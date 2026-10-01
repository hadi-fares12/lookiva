$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Push-Location $ROOT
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    corepack enable 2>$null
    corepack prepare pnpm@9.15.0 --activate 2>$null
}
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    if (-not (Test-Path "$ROOT\_tools\node_modules\.bin\pnpm.cmd")) {
        npm install pnpm@9.15.0 --no-save --prefix "$ROOT\_tools"
    }
    $env:PATH = "$ROOT\_tools\node_modules\.bin;$env:PATH"
    $PNPM = "$ROOT\_tools\node_modules\.bin\pnpm.cmd"
} else { $PNPM = "pnpm" }
node "$ROOT\scripts\apply-settings.js" api
& $PNPM install --prefer-offline

Write-Host "Building NestJS API dist + Prisma client" -ForegroundColor Cyan
& $PNPM --filter @lookiva/api prisma:generate
& $PNPM --filter @lookiva/api build
if (-not (Test-Path "$ROOT\apps\api\dist\main.js")) { throw "API build missing dist/main.js" }

$stage = "$ROOT\.stage-exe"
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Force -Path "$stage\prisma" | Out-Null
Copy-Item "$ROOT\apps\api\dist\*" $stage -Recurse -Force
Copy-Item "$ROOT\apps\api\prisma\schema.prisma" "$stage\prisma\" -Force
Copy-Item "$ROOT\apps\api\.env.local" "$stage\.env" -Force

New-Item -ItemType Directory -Force -Path "$ROOT\dist" | Out-Null

$pkgExe = "$ROOT\_tools\node_modules\.bin\pkg.cmd"
$pkgOk = $false
if (-not (Test-Path $pkgExe)) {
    npm install pkg@5.8.1 --no-save --prefix "$ROOT\_tools"
}
if (Test-Path $pkgExe) {
    Push-Location $stage
    @"
{
  "name": "lookiva-server",
  "main": "main.js",
  "bin": "main.js",
  "pkg": {
    "assets": ["prisma/**",".env","**/*.node"],
    "targets": ["node20-win-x64"]
  }
}
"@ | Out-File "$stage\package.json" -Encoding utf8
    try {
        & $pkgExe . --target node20-win-x64 --output "$ROOT\dist\lookiva-server.exe"
        if (Test-Path "$ROOT\dist\lookiva-server.exe") { $pkgOk = $true }
    } catch { Write-Warning "pkg failed: $_" }
    Pop-Location
}

if ($pkgOk) {
    Write-Host "OK -> $ROOT\dist\lookiva-server.exe" -ForegroundColor Green
} else {
    Write-Host "Falling back to portable node folder + .bat launcher + zip" -ForegroundColor Yellow
    $exeDir = "$ROOT\dist\lookiva-server-portable"
    if (Test-Path $exeDir) { Remove-Item $exeDir -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $exeDir | Out-Null
    Copy-Item "$stage\*" $exeDir -Recurse -Force
    $nodeSrc = (Get-Command node).Source
    Copy-Item $nodeSrc "$exeDir\node.exe" -Force
@"
@echo off
setlocal
cd /d "%~dp0"
set NODE_ENV=production
node.exe main.js
"@ | Out-File "$exeDir\start-server.bat" -Encoding ascii

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zipOut = "$ROOT\dist\lookiva-server-portable.zip"
    if (Test-Path $zipOut) { Remove-Item $zipOut -Force }
    [System.IO.Compression.ZipFile]::CreateFromDirectory($exeDir, $zipOut)
    Write-Host "OK portable dir -> $exeDir  (start: .\start-server.bat)" -ForegroundColor Green
    Write-Host "OK portable zip -> $zipOut" -ForegroundColor Green
}
Pop-Location
