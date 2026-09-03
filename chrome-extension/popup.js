const statusEl = document.getElementById("status");
const notLoggedInEl = document.getElementById("notLoggedIn");
const loginFormEl = document.getElementById("loginForm");
const resultEl = document.getElementById("result");

async function readCurrentPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["extractProductInfo.js"],
  });

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => extractProductInfo(),
  });

  return result;
}

async function showResultView(session) {
  statusEl.style.display = "none";
  notLoggedInEl.style.display = "none";
  resultEl.style.display = "block";

  document.getElementById("loggedInEmail").textContent = session.email || "";

  try {
    const info = await readCurrentPage();

    const imageEl = document.getElementById("resultImage");
    if (info.image) {
      imageEl.src = info.image;
      imageEl.style.display = "block";
    } else {
      imageEl.style.display = "none";
    }

    document.getElementById("resultTitle").textContent = info.title || "(no title found)";
    document.getElementById("resultPrice").textContent = info.price
      ? `${info.currency || ""}${info.price}`
      : "(no price found)";
  } catch (err) {
    document.getElementById("resultTitle").textContent =
      "Couldn't read this page (try a regular product page).";
    console.error(err);
  }
}

function showNotLoggedInView() {
  statusEl.style.display = "none";
  resultEl.style.display = "none";
  notLoggedInEl.style.display = "block";
}

document.getElementById("openHintDropButton").addEventListener("click", () => {
  chrome.tabs.create({ url: "https://hintdrop.app" });
});

document.getElementById("showManualLogin").addEventListener("click", () => {
  loginFormEl.style.display = loginFormEl.style.display === "block" ? "none" : "block";
});

document.getElementById("loginButton").addEventListener("click", async () => {
  const email = document.getElementById("emailInput").value.trim();
  const password = document.getElementById("passwordInput").value;
  const errorEl = document.getElementById("loginError");
  errorEl.style.display = "none";

  if (!email || !password) {
    errorEl.textContent = "Enter both email and password.";
    errorEl.style.display = "block";
    return;
  }

  try {
    const session = await login(email, password);
    await showResultView(session);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = "block";
  }
});

document.getElementById("logoutLink").addEventListener("click", async () => {
  await logout();
  showNotLoggedInView();
});

// Entry point. Order: cached extension session first (fastest, works
// offline), then try reading the existing hintdrop.app web session
// cookie (covers Google sign-in and anything else - this is the main
// path most people will hit), then fall back to the not-logged-in view
// (which itself offers the manual email/password form as a last resort).
(async () => {
  let session = await getStoredSession();

  if (!session) {
    session = await getSessionFromWebCookie();
    if (session) {
      await storeSession(session);
    }
  }

  if (session) {
    await showResultView(session);
  } else {
    showNotLoggedInView();
  }
})();
