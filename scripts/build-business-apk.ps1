$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Push-Location "$ROOT\apps\business-mobile"
$env:PUB_CACHE = "$ROOT\.pub-cache"
$API_URL = if ($env:LOOKIVA_API_URL) { $env:LOOKIVA_API_URL } else { "http://192.168.1.120:8000/api/v1" }
Write-Host "Building Business APK (release) with API_URL=$API_URL" -ForegroundColor Cyan
flutter pub get --prefer-offline
flutter build apk --release "--dart-define=LOOKIVA_API_URL=$API_URL"
$src = ".\build\app\outputs\flutter-apk\app-release.apk"
if (Test-Path $src) {
    New-Item -ItemType Directory -Force -Path "$ROOT\dist" | Out-Null
    Copy-Item $src "$ROOT\dist\lookiva_business-release.apk" -Force
    Write-Host "OK -> $ROOT\dist\lookiva_business-release.apk" -ForegroundColor Green
}
Pop-Location
