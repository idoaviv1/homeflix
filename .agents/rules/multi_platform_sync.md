# Multi-Platform Synchronization Rule (Web, iOS IPA, Android Galaxy APK)

## Mandatory Directive:
Whenever the user requests a bug fix, improvement, UI tweak, or new feature:
1. **Apply the change across ALL platforms**:
   - **Web App**: Test and verify in `apps/web` (served on port 8096).
   - **iPhone App (iOS IPA)**: Always run `npx cap sync ios`, ensure Capacitor iOS compatibility, and maintain up-to-date IPA generation in `/media/windows/Shared-IPA/`.
   - **Galaxy S22 Ultra App (Android APK)**: Always run `npx cap sync android`, ensure Android compatibility (cleartext HTTP, network security, hardware acceleration), and rebuild/save APKs to `/media/windows/Shared-APK/homeflix/`.

2. **Never leave any platform behind**:
   - Any fix made to the website MUST immediately be synced to both the iOS and Android bundles.
   - Always verify that API endpoints, streaming protocols, responsive styles, and offline capabilities work on mobile WebViews as well as desktop browsers.
   - Maintain the dual output folders:
     - `/media/windows/Shared-IPA/` for iPhone / iPad iOS packages.
     - `/media/windows/Shared-APK/homeflix/` for Samsung Galaxy S22 Ultra Android packages.
