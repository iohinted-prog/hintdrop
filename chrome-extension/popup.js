const statusEl = document.getElementById("status");
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
  loginFormEl.style.display = "none";
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

function showLoginView() {
  statusEl.style.display = "none";
  resultEl.style.display = "none";
  loginFormEl.style.display = "block";
}

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
    const user = await login(email, password);
    await showResultView({ email: user.email });
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = "block";
  }
});

document.getElementById("logoutLink").addEventListener("click", async () => {
  await logout();
  showLoginView();
});

// Entry point: check for a stored session on popup open, branch accordingly.
(async () => {
  const session = await getStoredSession();
  if (session) {
    await showResultView(session);
  } else {
    showLoginView();
  }
})();
