# Mobile app (Android / iOS)

Two ways to have QC Lab on a phone:

## 1. Installable web app (recommended — no app store)

The portal is a Progressive Web App:

- **Android / Chrome / Edge:** open the site → menu ⋮ → **Install app**.
- **iPhone / iPad (iOS 16.4+):** Safari → **Share → Add to Home Screen**.

It opens full-screen with the QC Lab icon, and **push notifications** work on both
(Settings → *Mobile app & push notifications* → *Enable on this device*).

## 2. Native store app (Capacitor wrapper)

This folder wraps the hosted site in a native shell so it can be published on
Google Play / Apple App Store (e.g. for a managed corporate device fleet).

Requirements: Node 20, Android Studio (Android) and/or Xcode on macOS (iOS).

```bash
cd mobile
npm install
npx cap add android      # and/or: npx cap add ios
npx cap sync
npx cap open android     # build & sign in Android Studio (or: npx cap open ios)
```

- The app URL is set in `capacitor.config.json` → `server.url`. Change it if the portal moves to a
  Fanatics domain (e.g. `https://qclab.fanatics.com`).
- Icons / splash: generate from `www/icon.png` with `npx @capacitor/assets generate`.
- **Push inside the native app:** browsers' Web Push is not available inside Android/iOS WebViews.
  For store builds, add `@capacitor/push-notifications` with Firebase Cloud Messaging (Android) and
  APNs (iOS), and store the device token next to the web-push subscriptions. Until then, use the
  installable web app (option 1), where push already works.
