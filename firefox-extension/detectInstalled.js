// Runs automatically on hintdrop.app (declared in manifest.json's
// content_scripts, not the on-demand activeTab+scripting mechanism the
// rest of the extension uses for reading product pages) - its only job
// is to mark the page so hintdrop.app's own code can tell the extension
// is installed, and skip suggesting it to someone who already has it.
// Runs at document_start, before the page's own JS/React has mounted,
// so the marker is already present by the time anything checks for it.
document.documentElement.setAttribute("data-hintdrop-extension", "installed");
