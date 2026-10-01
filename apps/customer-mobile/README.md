# LOOKIVA Customer Mobile App (Flutter)

## Feature Shell

This is the LOOKIVA Customer mobile app shell. It includes theme, locale, routing, onboarding, login entry, and offline-first feature screens for marketplace discovery, nearby map, bookings, wallet/profile, loyalty, packages, referrals, and social-style look previews.

## What's included now

- `pubspec.yaml` with Flutter SDK `>=3.19.0`, `cupertino_icons`, `flutter_localizations`, `go_router`, `provider`, `shared_preferences`, `dio`, and `intl`
- `lib/main.dart` with a MaterialApp using the LOOKIVA Midnight Gold brand palette
- Splash screen showing gold `LOOKIVA` logo text brand + `CircularProgressIndicator`
- Locale support: EN / AR / FR
- Customer tabs: Home, Discover, Map, Bookings, Profile

## Getting started

The `ios/` and `android/` platform folders are intentionally omitted from this scaffold. They will be generated locally on your machine by running `flutter create`.

1. Make sure you have the Flutter SDK installed (>=3.19.0). See [docs.flutter.dev/get-started](https://docs.flutter.dev/get-started/install).
2. From a terminal in this directory (`apps/customer-mobile`), regenerate the full platform scaffold:
   ```
   flutter create . --project-name lookiva_customer --org dev.lookiva --platforms ios,android
   ```
   This will write `ios/`, `android/`, `web/`, etc. without overwriting `pubspec.yaml` or `lib/main.dart` (accept the "y" overwrite prompt only for the generated runner files that you do not yet have).
3. Install dependencies:
   ```
   flutter pub get
   ```
4. Launch the app on a connected device / emulator / simulator:
   ```
   flutter run
   ```

## Next phases

- API/session clients are wired to `LOOKIVA_API_URL`; tokens use native secure storage.
- Replace offline sample data with API data for discovery, booking-v2, social-v2, retention-v2, and finance-v2.
- Add Flutter widget/unit tests after platform folders are generated.

## Resources

- Backend base URL (same as customer-web): `http://localhost:4000/api/v1`
- Brand seed color: `#D4AF37` (LOOKIVA Gold)
- Surface palette: `#080808 / #101010 / #151515` (Midnight Gold)
