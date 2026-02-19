const storageKeys = {
  users: "inkwell_users",
  currentUser: "inkwell_current_user",
};

function initInkWell() {
  const authView = document.getElementById("auth-view");
  const editorView = document.getElementById("editor-view");
  const authMessage = document.getElementById("auth-message");
  const statusLine = document.getElementById("status-line");
  const welcomeTitle = document.getElementById("welcome-title");
  const editor = document.getElementById("note-editor");

  if (!authView || !editorView || !authMessage || !statusLine || !welcomeTitle || !editor) {
    return;
  }

  const getUsers = () => JSON.parse(localStorage.getItem(storageKeys.users) || "[]");
  const setUsers = (users) => localStorage.setItem(storageKeys.users, JSON.stringify(users));
  const getCurrentUser = () => JSON.parse(localStorage.getItem(storageKeys.currentUser) || "null");
  const setCurrentUser = (user) => localStorage.setItem(storageKeys.currentUser, JSON.stringify(user));
  const noteKey = (email) => `inkwell_note_${email.toLowerCase()}`;

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
    const saved = localStorage.getItem(noteKey(user.email)) || "";
    editor.value = saved;
    welcomeTitle.textContent = `${user.name}'s notes`;
    setEditorStatus(saved ? "Draft restored from local storage." : "Start writing your note…");
  };

  const saveUserNote = () => {
    const user = getCurrentUser();
    if (!user) return;
    localStorage.setItem(noteKey(user.email), editor.value);
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
    const updatedBlock = selectedBlock
      .split("\n")
      .map((line) => transform(line))
      .join("\n");

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
    localStorage.removeItem(storageKeys.currentUser);
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
  if (existingUser) {
    showView(true);
    loadUserNote(existingUser);
  } else {
    showView(false);
  }
}

document.addEventListener("DOMContentLoaded", initInkWell);
