# HintDrop Edge Extension

Identical to `../chrome-extension` (same Manifest V3 format, same
code, same icons) - Microsoft Edge is Chromium-based and loads this
format natively, so no adaptation is needed. This is the standard
approach: most Chrome extensions are submitted to the Edge Add-ons
store as the same package, sometimes literally the same zip file.

To publish: zip this folder's contents (not the folder itself - the
zip root should contain manifest.json directly) and upload through
the Microsoft Edge Add-ons developer dashboard at
https://partner.microsoft.com/dashboard/microsoftedge/overview.
Registering as a Microsoft Edge extension developer is free (no fee,
unlike Chrome's one-time $5) - sign in with a Microsoft account
(Outlook/Live/Hotmail) or a linked GitHub account.
