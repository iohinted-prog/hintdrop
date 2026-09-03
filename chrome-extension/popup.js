const statusEl = document.getElementById("status");
const errorBannerEl = document.getElementById("errorBanner");
const notLoggedInEl = document.getElementById("notLoggedIn");
const loginFormEl = document.getElementById("loginForm");
const resultEl = document.getElementById("result");
const boardPickerEl = document.getElementById("boardPicker");
const addButtonEl = document.getElementById("addButton");
const saveSuccessEl = document.getElementById("saveSuccess");
const resultImageEl = document.getElementById("resultImage");
const gradientPickerEl = document.getElementById("gradientPicker");
const gradientHintEl = document.getElementById("gradientHint");
const titleInputEl = document.getElementById("titleInput");
const priceInputEl = document.getElementById("priceInput");

// Same 3 gradients (of the 6 the main app generated) already used in
// HintsClient.jsx's own "Choose a photo" picker for exactly this situation
// - nothing real found, offer a nice colour instead of a blank card. Hosted
// as real static files at hintdrop.app, so no need to duplicate the images
// into the extension itself.
const GRADIENT_OPTIONS = [
  "https://hintdrop.app/gradients/1.png",
  "https://hintdrop.app/gradients/2.png",
  "https://hintdrop.app/gradients/3.png",
];

let currentSession = null;
let currentPageInfo = null;
let selectedGradient = null;

function showError(message) {
  errorBannerEl.textContent = message;
  errorBannerEl.style.display = "block";
}

function clearError() {
  errorBannerEl.style.display = "none";
}

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

function renderGradientPicker() {
  gradientPickerEl.innerHTML = "";
  GRADIENT_OPTIONS.forEach((url) => {
    const btn = document.createElement("button");
    btn.style.backgroundImage = `url(${url})`;
    btn.addEventListener("click", () => {
      selectedGradient = url;
      [...gradientPickerEl.children].forEach((c) => c.classList.remove("selected"));
      btn.classList.add("selected");
    });
    gradientPickerEl.appendChild(btn);
  });
}

async function showResultView(session) {
  currentSession = session;
  clearError();

  statusEl.style.display = "none";
  notLoggedInEl.style.display = "none";
  resultEl.style.display = "block";
  addButtonEl.style.display = "block";
  boardPickerEl.style.display = "none";
  saveSuccessEl.style.display = "none";
  titleInputEl.style.display = "block";
  priceInputEl.style.display = "block";
  document.querySelectorAll("label.fieldLabel").forEach((l) => (l.style.display = "block"));

  document.getElementById("loggedInEmail").textContent = session.email || "";

  try {
    currentPageInfo = await readCurrentPage();

    if (currentPageInfo.image) {
      resultImageEl.src = currentPageInfo.image;
      resultImageEl.style.display = "block";
      gradientPickerEl.style.display = "none";
      gradientHintEl.style.display = "none";
    } else {
      resultImageEl.style.display = "none";
      gradientPickerEl.style.display = "flex";
      gradientHintEl.style.display = "block";
      renderGradientPicker();
      selectedGradient = GRADIENT_OPTIONS[0];
      gradientPickerEl.children[0].classList.add("selected");
    }

    titleInputEl.value = currentPageInfo.title || "";
    priceInputEl.value = currentPageInfo.price
      ? `${currentPageInfo.currency || ""}${currentPageInfo.price}`
      : "";
  } catch (err) {
    showError("Couldn't read this page. Try a regular product page.");
    addButtonEl.style.display = "none";
    console.error(err);
  }
}

function showNotLoggedInView() {
  statusEl.style.display = "none";
  resultEl.style.display = "none";
  notLoggedInEl.style.display = "block";
}

async function loadAndShowBoardPicker() {
  clearError();
  addButtonEl.textContent = "Loading your lists…";
  addButtonEl.disabled = true;

  try {
    const boards = await fetchBoards(currentSession);
    renderBoardList(boards);
    addButtonEl.style.display = "none";
    titleInputEl.style.display = "none";
    priceInputEl.style.display = "none";
    document.querySelectorAll("label.fieldLabel").forEach((l) => (l.style.display = "none"));
    boardPickerEl.style.display = "block";
  } catch (err) {
    showError(err.message);
    console.error(err);
  } finally {
    addButtonEl.textContent = "+ Add to Hints";
    addButtonEl.disabled = false;
  }
}

function renderBoardList(boards) {
  const boardListEl = document.getElementById("boardList");
  boardListEl.innerHTML = "";

  if (boards.length === 0) {
    boardListEl.innerHTML = '<p style="font-size:12px;color:#9a9a9a;margin:0 0 8px;">No lists yet — create one below.</p>';
  } else {
    boards.forEach((board) => {
      const btn = document.createElement("button");
      btn.className = "boardRow";
      btn.textContent = board.is_private ? `🔒 ${board.title}` : board.title;
      btn.addEventListener("click", () => handleSaveToBoard(board));
      boardListEl.appendChild(btn);
    });
  }
}

addButtonEl.addEventListener("click", loadAndShowBoardPicker);

document.getElementById("pickerBack").addEventListener("click", () => {
  boardPickerEl.style.display = "none";
  addButtonEl.style.display = "block";
  titleInputEl.style.display = "block";
  priceInputEl.style.display = "block";
  document.querySelectorAll("label.fieldLabel").forEach((l) => (l.style.display = "block"));
});

document.getElementById("createBoardButton").addEventListener("click", async () => {
  const input = document.getElementById("newBoardInput");
  const title = input.value.trim();
  if (!title) return;

  clearError();
  try {
    const board = await createBoard(currentSession, title);
    input.value = "";
    await handleSaveToBoard(board);
  } catch (err) {
    showError(err.message);
    console.error(err);
  }
});

async function handleSaveToBoard(board) {
  // Pick up whatever the person edited before saving - the review screen
  // is exactly for catching a messy scraped title or adding a price that
  // wasn't found automatically.
  currentPageInfo.title = titleInputEl.value.trim() || currentPageInfo.title;
  if (!currentPageInfo.image && selectedGradient) {
    currentPageInfo.image = selectedGradient;
  }
  const editedPrice = priceInputEl.value.trim();
  if (editedPrice) {
    const match = editedPrice.match(/(\d+(?:\.\d{1,2})?)/);
    currentPageInfo.price = match ? match[1] : "";
    currentPageInfo.currency = editedPrice.replace(/[\d.,\s]/g, "").trim() || currentPageInfo.currency;
  } else {
    currentPageInfo.price = "";
  }

  boardPickerEl.style.display = "none";
  statusEl.textContent = "Saving…";
  statusEl.style.display = "block";

  try {
    await saveHint(currentSession, board.id, currentPageInfo);
    statusEl.style.display = "none";
    saveSuccessEl.style.display = "block";
    document.getElementById("saveSuccessText").textContent = `✓ Saved to ${board.title}`;
    document.getElementById("viewInHintDrop").href = `https://hintdrop.app/hints/${board.id}`;
  } catch (err) {
    statusEl.style.display = "none";
    addButtonEl.style.display = "block";
    titleInputEl.style.display = "block";
    priceInputEl.style.display = "block";
    document.querySelectorAll("label.fieldLabel").forEach((l) => (l.style.display = "block"));
    showError(err.message);
    console.error(err);
  }
}

document.getElementById("addAnotherButton").addEventListener("click", () => {
  showResultView(currentSession);
});

document.getElementById("openHintDropButton").addEventListener("click", () => {
  chrome.tabs.create({ url: "https://hintdrop.app" });
});

document.getElementById("showManualLogin").addEventListener("click", () => {
  loginFormEl.style.display = loginFormEl.style.display === "block" ? "none" : "block";
});

document.getElementById("loginButton").addEventListener("click", async () => {
  const email = document.getElementById("emailInput").value.trim();
  const password = document.getElementById("passwordInput").value;
  clearError();

  if (!email || !password) {
    showError("Enter both email and password.");
    return;
  }

  try {
    const session = await login(email, password);
    await showResultView(session);
  } catch (err) {
    showError(err.message);
  }
});

document.getElementById("logoutLink").addEventListener("click", async () => {
  await logout();
  showNotLoggedInView();
});

// Entry point - cached session, then the web cookie, then not-logged-in.
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
