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
node "$ROOT\scripts\apply-settings.js" all
& $PNPM install --prefer-offline
Write-Host "Building Next.js customer-web + business-web" -ForegroundColor Cyan
& $PNPM --filter @lookiva/customer-web build
& $PNPM --filter @lookiva/business-web build
New-Item -ItemType Directory -Force -Path "$ROOT\dist\web" | Out-Null
foreach ($name in @("customer-web","business-web")) {
    $dst = "$ROOT\dist\web\$name"
    New-Item -ItemType Directory -Force -Path $dst | Out-Null
    if (Test-Path "$ROOT\apps\$name\.next") { Copy-Item "$ROOT\apps\$name\.next\*" $dst -Recurse -Force }
    Copy-Item "$ROOT\apps\$name\package.json" $dst -Force
    Copy-Item "$ROOT\apps\$name\.env.local" "$dst\.env.local" -Force
    Write-Host "  -> $dst  (start with pnpm start -C apps/$name)" -ForegroundColor Green
}
Pop-Location
