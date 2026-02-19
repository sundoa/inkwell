const storageKeys = {
  users: "inkwell_users",
  currentUser: "inkwell_current_user",
};

const memoryStore = new Map();

function getSafeStorage() {
  try {
    const testKey = "__inkwell_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return {
      getItem: (key) => (memoryStore.has(key) ? memoryStore.get(key) : null),
      setItem: (key, value) => memoryStore.set(key, String(value)),
      removeItem: (key) => memoryStore.delete(key),
    };
  }
}

function initInkWell() {
  const authView = document.getElementById("auth-view");
  const editorView = document.getElementById("editor-view");
  const authMessage = document.getElementById("auth-message");
  const statusLine = document.getElementById("status-line");
  const welcomeTitle = document.getElementById("welcome-title");
  const editor = document.getElementById("note-editor");
  const storage = getSafeStorage();

  if (!authView || !editorView || !authMessage || !statusLine || !welcomeTitle || !editor) return;

  const getUsers = () => JSON.parse(storage.getItem(storageKeys.users) || "[]");
  const setUsers = (users) => storage.setItem(storageKeys.users, JSON.stringify(users));
  const getCurrentUser = () => JSON.parse(storage.getItem(storageKeys.currentUser) || "null");
  const setCurrentUser = (user) => storage.setItem(storageKeys.currentUser, JSON.stringify(user));
  const noteKey = (email) => `inkwell_note_${String(email || "").toLowerCase()}`;

  const showAuthMessage = (text, isError = false) => {
    authMessage.textContent = text;
    authMessage.style.color = isError ? "#d92d20" : "#027a48";
  };

  const showView = (isAuthenticated) => {
    authView.classList.toggle("hidden", isAuthenticated);
    editorView.classList.toggle("hidden", !isAuthenticated);
  };

  const setEditorStatus = (text) => {
    statusLine.textContent = text;
  };

  const loadUserNote = (user) => {
    if (!user?.email) {
      showView(false);
      return;
    }
    const saved = storage.getItem(noteKey(user.email)) || "";
    editor.value = saved;
    welcomeTitle.textContent = `${user.name || "Your"}'s notes`;
    setEditorStatus(saved ? "Draft restored from storage." : "Start writing your note…");
  };

  const saveUserNote = () => {
    const user = getCurrentUser();
    if (!user?.email) return;
    storage.setItem(noteKey(user.email), editor.value);
    setEditorStatus(`Saved at ${new Date().toLocaleTimeString()}`);
  };

  const applyToSelectedLines = (transform) => {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const text = editor.value;
    const blockStart = text.lastIndexOf("\n", Math.max(start - 1, 0)) + 1;
    const blockEndIndex = text.indexOf("\n", end);
    const blockEnd = blockEndIndex === -1 ? text.length : blockEndIndex;

    const before = text.slice(0, blockStart);
    const selectedBlock = text.slice(blockStart, blockEnd);
    const after = text.slice(blockEnd);
    const updatedBlock = selectedBlock.split("\n").map((line) => transform(line)).join("\n");

    editor.value = `${before}${updatedBlock}${after}`;
    editor.selectionStart = blockStart;
    editor.selectionEnd = blockStart + updatedBlock.length;
    saveUserNote();
  };

  const normalizePunctuation = (input) => {
    const trimmed = input.replace(/[ \t]+\n/g, "\n").replace(/\s{2,}/g, " ").trim();
    if (!trimmed) return "";

    let out = trimmed
      .replace(/\s+([,.;!?])/g, "$1")
      .replace(/([,.;!?])(\S)/g, "$1 $2")
      .replace(/\bi\b/g, "I");

    out = out
      .split(/([.!?]\s+)/)
      .map((chunk) => chunk.replace(/^\s*([a-z])/, (_, c) => c.toUpperCase()))
      .join("");

    if (!/[.!?]$/.test(out)) out += ".";
    return out;
  };

  const downloadCurrentNote = () => {
    const blob = new Blob([editor.value], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `inkwell-note-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
    setEditorStatus("Note downloaded.");
  };

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      document.querySelectorAll(".auth-form").forEach((form) => form.classList.add("hidden"));
      const target = document.getElementById(tab.dataset.target);
      if (target) target.classList.remove("hidden");
      showAuthMessage("");
    });
  });

  document.getElementById("signup-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = document.getElementById("signup-name")?.value.trim() || "";
    const email = document.getElementById("signup-email")?.value.trim().toLowerCase() || "";
    const password = document.getElementById("signup-password")?.value || "";

    if (!name || !email || !password) {
      showAuthMessage("Please fill all sign up fields.", true);
      return;
    }

    const users = getUsers();
    if (users.some((user) => user.email === email)) {
      showAuthMessage("Email already exists. Please login.", true);
      return;
    }

    users.push({ name, email, password });
    setUsers(users);
    setCurrentUser({ name, email });
    showView(true);
    loadUserNote({ name, email });
  });

  document.getElementById("login-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = document.getElementById("login-email")?.value.trim().toLowerCase() || "";
    const password = document.getElementById("login-password")?.value || "";

    const user = getUsers().find((candidate) => candidate.email === email && candidate.password === password);
    if (!user) {
      showAuthMessage("Invalid credentials. Please try again.", true);
      return;
    }

    setCurrentUser({ name: user.name, email: user.email });
    showView(true);
    loadUserNote(user);
  });

  document.getElementById("logout-btn")?.addEventListener("click", () => {
    storage.removeItem(storageKeys.currentUser);
    showView(false);
    showAuthMessage("Logged out successfully.");
  });

  document.getElementById("save-btn")?.addEventListener("click", saveUserNote);
  document.getElementById("download-btn")?.addEventListener("click", downloadCurrentNote);
  document.getElementById("indent-btn")?.addEventListener("click", () => applyToSelectedLines((line) => `  ${line}`));
  document
    .getElementById("outdent-btn")
    ?.addEventListener("click", () => applyToSelectedLines((line) => line.replace(/^ {1,2}/, "")));
  document.getElementById("punctuation-btn")?.addEventListener("click", () => {
    editor.value = normalizePunctuation(editor.value);
    saveUserNote();
  });

  editor.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      const value = editor.value;
      editor.value = `${value.slice(0, start)}  ${value.slice(end)}`;
      editor.selectionStart = editor.selectionEnd = start + 2;
    }
  });

  editor.addEventListener("input", () => {
    if (getCurrentUser()) saveUserNote();
  });

  const existingUser = getCurrentUser();
  if (existingUser?.email) {
    showView(true);
    loadUserNote(existingUser);
  } else {
    showView(false);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    initInkWell();
  } catch (error) {
    const fallback = document.createElement("p");
    fallback.textContent = "InkWell failed to initialize. Please refresh or clear site data.";
    fallback.style.cssText = "margin:2rem auto;max-width:640px;padding:1rem;border:1px solid #fda29b;background:#fef3f2;border-radius:12px;color:#b42318;font-family:system-ui";
    document.body.prepend(fallback);
    console.error(error);
  }
});
