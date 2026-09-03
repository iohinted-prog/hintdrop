# HintDrop — platforms & stores roadmap

Everything discussed, one place. Grouped by dependency, not just alphabetically — some of these block others.

---

## Group A — The core native apps (foundational)

### 1. iOS app (App Store)
**Status:** Resubmitted (removed the "native shell" disclosure line), awaiting Apple's review.
**Real risk:** Apple's reviewers test actual behavior, not just notes — the underlying "thin wrapper" concern (no offline handling, no native navigation) is likely still true of the app itself. Removing the sentence may not be enough on its own.

### 2. Push notifications
**Status:** Not started. This is the recommended next real step, regardless of how the current iOS review goes.
**Why it matters:** The single most commonly cited fix for both Apple's Guideline 4.2/2.1 (Minimum Functionality) and Google Play's Policy 4.3 — real, genuine native functionality that "elevates it beyond a repackaged website." Already has a head start: the existing bell/feed notification system has the data model, this is wiring device push into something that already exists, not building from scratch.
**Serves both platforms at once** — once it's in the Capacitor build, it's there for Android's build too.

### 3. Android app (Play Store)
**Status:** Not started at all. No Android app exists yet.
**Recommendation:** Hold off on the "just point at the website for now" plan specifically — Google's 2026 enforcement of Policy 4.3 (Minimum Functionality) is described as their single biggest source of rejections for website-wrapped apps, tightened significantly this year. Building this with push notifications already included (once #2 is done) avoids very likely repeating the same rejection pattern currently playing out on iOS.

---

## Group B — Desktop browser extensions (save from any page you're on)

### 4. Chrome
**Status:** Built, fully working, submitted to the Chrome Web Store, awaiting review.

### 5. Firefox
**Status:** Not started — but genuinely low-cost. Firefox now supports Manifest V3, uses the same `action` structure already in place, and the extension's actual logic (no background service worker, standard WebExtensions APIs) should port with minimal changes. Needs: a `browser_specific_settings.gecko` block (extension ID + data-collection disclosure, similar categories to what Chrome just required) and a submission to addons.mozilla.org. Review is typically 24-48 hours.
**Recommendation:** Do this next — most of the work is already done.

### 6. Edge / Brave / Opera
**Status:** Not started — nearly free once Firefox/Chrome exist. These are Chromium-based and can generally accept the same package already built. Just a separate listing on the Microsoft Edge Add-ons store; Brave/Opera users can often install directly from the Chrome Web Store.

### 7. Safari (desktop, Mac)
**Status:** Not started — real, non-trivial work. Apple provides a genuine conversion tool (`safari-web-extension-converter`, ships with Xcode — already set up from the iOS work), but it generates an actual Xcode project needing compatibility testing, and distributes *through the App Store*, likely needing its own separate review.
**Recommendation:** Hold until the main iOS App Store situation is resolved — no reason to open a second Apple review front while the first one's unsettled.

---

## Group C — Mobile native "save from anywhere" (the phone equivalent of a browser extension)

### 8. iOS Share Extension
**Status:** Not started — this was the *original* idea behind this whole effort, before the Chrome extension existed. A native Share Sheet integration — "Save to HintDrop" appears when sharing from Safari (or any app) on iPhone/iPad.
**Why it's worth prioritizing once the app situation settles:** Genuinely reuses a lot of what's already built (the JSON-LD/page-reading logic from the Chrome extension is directly portable — same underlying problem, different container), and the iOS Xcode project already exists in this repo to add it as a new target to.
**Real gap this closes:** Chrome extensions don't work on mobile at all — this is the only way to get the "read the real page directly" benefit on an iPhone.

### 9. Android Share Intent
**Status:** Not started — the Android equivalent of #8, using Android's native share sheet.
**Blocked by:** Needs the actual Android app (#3) to exist first, since a Share Intent is registered by an app.

---

## Group D — The floating "on-page tile" (Honey / RocketReach style)

### 10. Proactive on-page tile
**Status:** Not started, and deliberately not recommended yet. A real, proven pattern — but a different architecture, not a small addition: requires a content script watching most/all pages automatically (broader permissions than today's click-to-activate model) and injecting UI directly into pages HintDrop doesn't control.
**Recommendation:** Wait until the current, simple Chrome extension is proven and approved before taking on a materially bigger permission scope and review scrutiny. Worth revisiting as a genuine v2 feature, not now.

---

## Suggested order, given everything above

1. Push notifications (serves iOS + Android both)
2. See how the current iOS resubmission lands
3. Firefox extension (cheap, most work already done)
4. Edge/Brave/Opera listing (nearly free once Firefox exists)
5. Android app, once push notifications exist to include from day one
6. iOS Share Extension
7. Android Share Intent (once the Android app exists)
8. Safari desktop extension (once iOS App Store situation is settled)
9. Proactive on-page tile (v2 feature, once Chrome extension is proven)
