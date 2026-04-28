# PhantomPen OS

**A Private, Offline Creative Workspace with Local AI**

> No cloud. No tracking. No lock-in. Your words, your device. Your AI.
---

## Deployed Live 

1. Go to this url: https://phantompen.vercel.app/

All core features work instantly


---

## Quick Start (no Python needed)

1. Unzip the folder
2. Open `index.html` in Chrome, Firefox, Edge, or Safari
3. Create a passphrase and start writing

All core features work instantly — no server required.

---

## Enable AI + Real Export (optional)

### Step 1 — Install Python deps
```
pip install flask flask-cors requests python-docx reportlab
```

### Step 2 — Install Ollama (local AI)
1. Go to https://ollama.com and install
2. Run: ollama pull llama3.2
3. Run: ollama serve

### Step 3 — Run the backend
```
python server.py
```

Open index.html — the AI panel will show "Connected".

---

## ✨ Features

- AES-GCM 256-bit encrypted local vault
- Rich text editor with autosave
- Local AI assistant (continue, improve, summarise, brainstorm, fix grammar)
- AI chat with full document context
- Encrypted file storage
- Git-like version history
- Secure expiring share links
- PDF + DOCX export (requires backend)
- Auto-lock, vault backup/restore

---

Built for Track 4: DIY Software
