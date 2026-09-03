document.addEventListener("DOMContentLoaded", async () => {
  const statusEl = document.getElementById("status");
  const resultEl = document.getElementById("result");
  const imageEl = document.getElementById("resultImage");
  const titleEl = document.getElementById("resultTitle");
  const priceEl = document.getElementById("resultPrice");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Two steps, standard Manifest V3 pattern: first inject the file so
    // extractProductInfo() is defined inside the page, then a second call
    // actually runs it and hands the return value back to the popup.
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["extractProductInfo.js"],
    });

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => extractProductInfo(),
    });

    statusEl.style.display = "none";
    resultEl.style.display = "block";

    if (result.image) {
      imageEl.src = result.image;
      imageEl.style.display = "block";
    } else {
      imageEl.style.display = "none";
    }

    titleEl.textContent = result.title || "(no title found)";
    priceEl.textContent = result.price
      ? `${result.currency || ""}${result.price}`
      : "(no price found)";
  } catch (err) {
    statusEl.textContent = "Couldn't read this page. Try a regular product page (not a Chrome settings page or new tab).";
    console.error(err);
  }
});
