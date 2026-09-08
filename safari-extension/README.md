# HintDrop Safari Extension - source files

This folder is a Chrome/Firefox-style web extension (same code as
`../chrome-extension` and `../firefox-extension`, same icons already
updated to the current logo). It is **not** itself a working Safari
extension - Safari doesn't load this format directly. It's the exact
input Apple's own conversion tool expects, so the remaining steps
require a Mac and can't be done from here.

## What's left (needs macOS + Xcode + an Apple Developer account)

1. Install Xcode (from the Mac App Store) if you don't have it.
2. Open Terminal and run Apple's converter tool, pointed at this
   folder:
   ```
   xcrun safari-web-extension-converter /path/to/safari-extension
   ```
   This generates a new Xcode project that wraps this extension in a
   native macOS app - the app is just a thin shell Safari requires;
   all the actual logic stays in the files already here.
3. Open the generated `.xcodeproj` in Xcode, set your Apple
   Developer team under Signing & Capabilities for both the app
   target and the extension target.
4. Build and run once locally to confirm it loads (Safari >
   Settings > Extensions, or Safari > Settings > Advanced > Show
   Develop menu, then Develop > Allow Unsigned Extensions while
   testing before you have a distribution certificate).
5. For real users: either
   - **Mac App Store**: archive and submit through Xcode like any
     other Mac app - Apple reviews it, same as an iOS app.
   - **Direct distribution**: archive, notarize with `xcrun
     notarytool`, and distribute the signed app directly - no App
     Store review, but users have to trust and open it manually
     the first time (Gatekeeper).

## Notes for whoever does this

- `host_permissions` and `content_scripts` matches are already
  scoped to `hintdrop.app` - should carry over into the converted
  project without changes needed to the permissions themselves.
- Safari's Manifest V3 support (16.4+) doesn't implement every
  Chrome/Firefox API this code might touch - worth a real
  functional test pass after conversion (saving a hint, the popup's
  auth flow) rather than assuming parity, since a couple of small
  API differences are common between the three even off Chrome's
  own APIs.
- `browser-polyfill.min.js` (Mozilla's WebExtension polyfill) is
  included so the code can keep using `browser.*` calls if it does
  anywhere - Safari supports this the same way Firefox does.
