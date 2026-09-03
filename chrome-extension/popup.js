const statusEl = document.getElementById("status");
const notLoggedInEl = document.getElementById("notLoggedIn");
const loginFormEl = document.getElementById("loginForm");
const resultEl = document.getElementById("result");
const boardPickerEl = document.getElementById("boardPicker");
const addButtonEl = document.getElementById("addButton");
const saveSuccessEl = document.getElementById("saveSuccess");

let currentSession = null;
let currentPageInfo = null;

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
  currentSession = session;

  statusEl.style.display = "none";
  notLoggedInEl.style.display = "none";
  resultEl.style.display = "block";
  addButtonEl.style.display = "block";
  boardPickerEl.style.display = "none";
  saveSuccessEl.style.display = "none";

  document.getElementById("loggedInEmail").textContent = session.email || "";

  try {
    currentPageInfo = await readCurrentPage();

    const imageEl = document.getElementById("resultImage");
    if (currentPageInfo.image) {
      imageEl.src = currentPageInfo.image;
      imageEl.style.display = "block";
    } else {
      imageEl.style.display = "none";
    }

    document.getElementById("resultTitle").textContent = currentPageInfo.title || "(no title found)";
    document.getElementById("resultPrice").textContent = currentPageInfo.price
      ? `${currentPageInfo.currency || ""}${currentPageInfo.price}`
      : "(no price found)";
  } catch (err) {
    document.getElementById("resultTitle").textContent =
      "Couldn't read this page (try a regular product page).";
    addButtonEl.style.display = "none";
    console.error(err);
  }
}

function showNotLoggedInView() {
  statusEl.style.display = "none";
  resultEl.style.display = "none";
  notLoggedInEl.style.display = "block";
}

addButtonEl.addEventListener("click", async () => {
  addButtonEl.textContent = "Loading your lists…";
  addButtonEl.disabled = true;

  try {
    const boards = await fetchBoards(currentSession);
    const boardListEl = document.getElementById("boardList");
    boardListEl.innerHTML = "";

    if (boards.length === 0) {
      boardListEl.innerHTML = '<p style="font-size:12px;color:#9a9a9a;">No lists yet — create one in HintDrop first.</p>';
    } else {
      boards.forEach((board) => {
        const btn = document.createElement("button");
        btn.className = "boardRow";
        btn.textContent = board.is_private ? `🔒 ${board.title}` : board.title;
        btn.addEventListener("click", () => handleSaveToBoard(board));
        boardListEl.appendChild(btn);
      });
    }

    addButtonEl.style.display = "none";
    boardPickerEl.style.display = "block";
  } catch (err) {
    console.error(err);
  } finally {
    addButtonEl.textContent = "+ Add to Hints";
    addButtonEl.disabled = false;
  }
});

document.getElementById("pickerBack").addEventListener("click", () => {
  boardPickerEl.style.display = "none";
  addButtonEl.style.display = "block";
});

async function handleSaveToBoard(board) {
  boardPickerEl.style.display = "none";
  statusEl.textContent = "Saving…";
  statusEl.style.display = "block";

  try {
    await saveHint(currentSession, board.id, currentPageInfo);
    statusEl.style.display = "none";
    saveSuccessEl.style.display = "block";
    document.getElementById("saveSuccessText").textContent = `✓ Saved to ${board.title}`;
  } catch (err) {
    statusEl.style.display = "none";
    addButtonEl.style.display = "block";
    alert(err.message);
    console.error(err);
  }
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

// Entry point - same order as before: cached session, then the web
// cookie, then the not-logged-in view.
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
