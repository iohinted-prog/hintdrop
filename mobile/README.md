# HintDrop mobile app

A real React Native app (via Expo), not a wrapped website - built
because the previous approach (Capacitor, wrapping the live site in
a native shell) got rejected from the App Store as a "proxy to
website" with no native functionality. This is the actual rebuild.

Connects to the exact same Supabase project as the web app
(hintdrop.app) - same users, same database, same auth accounts.
Signing in here with an existing HintDrop account works immediately,
nothing to migrate.

## Status

**Working right now:**
- Email/password sign-in, wired to the real Supabase project
- Feed screen with real data (the signed-in user's own `feed_items`)
- Bottom tab navigation matching the web app's sections (Feed,
  Circle, Hints, Calendar, Shop)
- Real branding throughout (icons, splash screen, colors)

**Not yet built (placeholder "Coming soon" screens):**
- Circle, Hints, Calendar, Shop - each needs the same treatment
  FeedScreen.js got: real Supabase queries and real UI, ported from
  the equivalent web page

**Not yet built at all:**
- Google/Microsoft/Apple sign-in - the web app's OAuth flow relies on
  a browser redirect back to the same origin, which doesn't apply
  here. Needs `expo-web-browser` + `expo-linking` for a proper
  deep-link OAuth flow (the `scheme: "hintdrop"` in app.json is
  already set up for this), plus adding this app's redirect URL to
  Supabase's allowed redirect URLs in the dashboard (Authentication >
  URL Configuration)
- Feed's full complexity - the web version merges the user's own
  items with their contacts' shared items, and renders many distinct
  item types (reminders, dropped hints, circle activity, invites)
  each with their own layout, reactions, and comments. This version
  only shows the user's own items, rendered generically. See
  FeedClient.js on the web for the full logic to port over.
- Push notifications, camera integration, or anything else that
  would give Apple's review a reason to see this as more than a
  website - worth deciding which of these matters most before the
  next submission attempt

## Setup

```
cd mobile
npm install
cp .env.example .env
# edit .env - fill in EXPO_PUBLIC_SUPABASE_ANON_KEY with the real
# value (same one the web app's Vercel project already has)
npm start
```

Then either:
- Scan the QR code with the Expo Go app on a real phone (fastest way
  to see it running, no build needed)
- Press `i` for iOS Simulator or `a` for Android Emulator, if you
  have Xcode / Android Studio installed

## Building a real installable app (not just Expo Go)

This project wasn't run through `expo prebuild` here, so there's no
`ios/`/`android/` native folder in this `mobile/` directory yet
(deliberately - gitignored, generated on demand). Two paths:

- **EAS Build** (Expo's cloud build service) - builds real iOS/
  Android binaries without needing Xcode or Android Studio locally at
  all. `npm install -g eas-cli`, `eas login`, `eas build`. This is
  the recommended path given building locally needs tooling this
  environment doesn't have.
- **Local build** - `npx expo prebuild` generates real `ios`/
  `android` folders, then build normally through Xcode / Android
  Studio. Needs those installed.

## Why this instead of the Capacitor app

The `capacitor.config.ts` / `ios/` folder at the repo root is a
separate, earlier attempt - a native shell that just loads
hintdrop.app in a WebView. Fast to build, but Apple rejected it under
their minimum-functionality rule for being "just a website." This
`mobile/` folder is the real rebuild: actual React Native UI, real
native capability available through Expo's plugin ecosystem, a
genuine path to passing review. The Capacitor project isn't deleted
- still useful as a fallback or for quick internal testing - but this
is the one intended to actually ship.
