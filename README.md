# InkWell Notepad

A minimal, modern notepad web app with a simple auth flow and writing tools.

## Features
- Sign up / login (stored in browser localStorage for demo purposes)
- Personal note draft auto-save
- Manual save button with status updates
- Download note as `.txt`
- Tab indentation support in editor
- Indent / outdent selected lines
- Punctuation cleanup helper

## Run locally
Because this is plain HTML/CSS/JS, you can open `index.html` directly, or run a local server:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Note
This project uses localStorage only. For production auth, use a secure backend, password hashing, and real session handling.
