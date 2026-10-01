$ROOT="C:\Users\USER\Desktop\LOOKIVA"
$PROD="$ROOT\production"
New-Item -ItemType Directory -Force -Path "$PROD\APK","$PROD\WEB\customer-mobile-web","$PROD\WEB\business-mobile-web","$PROD\SERVER\WORKERS" | Out-Null
# Copy already-built Flutter web outputs to the production folder structure
Copy-Item "$ROOT\dist\web\customer-flutter-web\*" "$PROD\WEB\customer-mobile-web" -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item "$ROOT\dist\web\business-flutter-web\*" "$PROD\WEB\business-mobile-web" -Recurse -Force -ErrorAction SilentlyContinue
# Create placeholder one-click launchers (skeletons) - the build-production.ps1 will overwrite the real ones, but this gives a working skeleton right now
if (-not (Test-Path "$PROD\README.txt")) {
  @"
LOOKIVA PRODUCTION FOLDER
=========================

All targets go here. See structure below. To fully build everything:
  1. Close the IDE sandbox and open Windows PowerShell / Windows Terminal as a normal user
  2. Run:  C:\Users\USER\Desktop\LOOKIVA\BUILD-PRODUCTION.bat
  3. It outputs the remaining (APKs / Next.js / SERVER EXE) into THIS folder.
  4. To start everything -> double-click START-ALL.bat

Structure (after full build runs):
  production\
    BUILD-PRODUCTION.bat          ONE CLICK: runs build-all script (outside IDE sandbox)
    START-ALL.bat                 ONE CLICK: launches SERVER + Customer Web + Business Web + Workers
    START-LOOKIVA-SERVER.bat      ONE CLICK: just the API server
    manifest.json                 Build manifest (versions, sizes, API_URL baked)
    LOOKIVA-Server-portable.zip   Zipped portable server (includes node.exe, .bat launcher)
    APK\
      LOOKIVA-Customer.apk        Customer Android release APK (install: adb install ...apk)
      LOOKIVA-Business.apk        Business Android release APK
    WEB\
      customer-mobile-web\        Flutter web of customer app (open index.html in browser)
      business-mobile-web\        Flutter web of business app
      customer-website\           Next.js customer website (pnpm start)
      business-website\           Next.js business website
      admin-website\              Next.js admin panel
    SERVER\
      LOOKIVA-Server.exe          (if pkg succeeds) Single-file server exe
      OR
      node.exe + main.js + START-SERVER.bat   Portable server (double click START-SERVER.bat)
      WORKERS\                    BullMQ background workers
        START-WORKERS.bat
"@ | Out-File "$PROD\README.txt" -Encoding ascii
}
# Copy build entry points into production so user has ONE folder to zip/share
Copy-Item "$ROOT\BUILD-PRODUCTION.bat" "$PROD\" -Force
Copy-Item "$ROOT\build-production.ps1"  "$PROD\" -Force
Write-Host "Skeleton production folder: $PROD" -ForegroundColor Green
Get-ChildItem $PROD -Recurse | Select-Object FullName
