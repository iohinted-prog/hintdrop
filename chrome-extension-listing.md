# HintDrop Chrome Extension — Web Store Listing Content

Copy each section directly into the matching field in the Developer Dashboard.

---

## Single purpose description
*(Short, shown to reviewers for context — not user-facing)*

Reads the current page's product details (title, image, price) when the
user clicks the extension icon, so they can save it as a "hint" to their
HintDrop account without leaving the page.

---

## Store listing description
*(User-facing, shown on the extension's Chrome Web Store page)*

Save gift ideas straight from the page you're on.

HintDrop is a gift-coordination app — save things you'd actually like,
organize them into lists, and let friends and family know what you're
hoping for. This extension makes saving instant: click the icon on any
product page, and HintDrop grabs the photo, name, and price directly, no
copy-pasting a link required.

• Works on any online store
• Pick which list to save to, right from the popup
• Reads the page you're already looking at — nothing runs in the
  background
• Free, and requires a free HintDrop account (hintdrop.app)

---

## Permission justifications
*(Required individually for each permission declared in manifest.json)*

**activeTab**
Needed to read the product details (title, image, price) from the
current tab only when the user clicks the extension icon. Never
accesses tabs the user hasn't actively interacted with the extension on.

**scripting**
Needed to run the page-reading logic (extractProductInfo.js) inside the
current tab, triggered only by the user's click on the extension icon.

**storage**
Needed to remember the user's HintDrop sign-in session locally between
popup opens, so they aren't asked to sign in again every time.

**cookies**
Needed to check whether the user is already signed into hintdrop.app in
their browser, so the extension can use that existing session instead of
requiring a separate sign-in. Only reads HintDrop's own session cookie,
for hintdrop.app specifically.

**Host permission: hintdrop.app / www.hintdrop.app**
Needed to read the user's existing sign-in session cookie (see Cookies
above) and to open hintdrop.app when the user isn't signed in yet.

**Host permission: egdghdutgjcdvhazmblw.supabase.co**
Needed to communicate with HintDrop's own backend (Supabase) to save a
hint and fetch the user's lists — this is HintDrop's database, not a
third party.

**Content script on hintdrop.app / www.hintdrop.app**
A minimal script that runs only on HintDrop's own site, marking the
page so hintdrop.app's own code can tell the extension is installed
and avoid suggesting an install to someone who already has it. Does
not read page content, does not run on any other site.

---

## Privacy policy URL
https://hintdrop.app/privacy

(Points directly to the new "8. The HintDrop Chrome extension" section
added today, describing exactly what the extension does with data.)

---

## Data use certification
*(Questions Chrome Web Store will ask directly — answers based on what's
actually built)*

- Does this extension collect or transmit user data? **Yes** — the
  user's HintDrop session (to identify their account) and the product
  details from a page they actively chose to save.
- Is data sold to third parties? **No**
- Is data used for purposes unrelated to the extension's single purpose?
  **No**
- Is data used to determine creditworthiness or for lending? **No**

## Data usage checkboxes
*(Which specific data types to check, per the public-facing disclosure
form — reflects exactly what the code does, no more, no less)*

**Check:**
- Personally identifiable information (the user's email address is
  stored locally to show "Logged in as...")
- Authentication information (session access/refresh tokens, stored to
  keep the user signed in)
- Website content (the core function — reads text/image/price off the
  page on click)

**Leave unchecked:** Health information, Financial and payment
information (a product's price isn't the user's own payment data),
Personal communications, Location, Web history (the extension reads
one page at the moment of an explicit click — not a logged history of
everywhere someone's browsed), User activity (no click/mouse/scroll/
keystroke tracking).
