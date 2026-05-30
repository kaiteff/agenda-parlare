# AGENTS.md

## Cursor Cloud specific instructions

### Project Overview

Agenda Parláre is a PWA for managing appointments at a speech therapy clinic. The frontend is vanilla JavaScript (ES Modules) with TailwindCSS. The backend is Firebase (Firestore, Auth, Storage, Cloud Functions). There is also a legacy Flask webhook on Render.

### Running the Dev Environment

1. **Dev server**: `python3 serve.py` — starts a local HTTP server on port 8081 (required port for Google Auth redirect URI).
2. **CSS watch**: `npm run watch` — recompiles TailwindCSS on file changes to `dist/output.css`.

Both must be running for active development.

### Key Commands

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Build CSS (one-off) | `npm run build` |
| Watch CSS | `npm run watch` |
| Dev server | `python3 serve.py` |

### Gotchas

- There are no automated tests (`npm test` just echoes an error). Validation is done manually via the browser.
- No linter is configured in `package.json`. TailwindCSS build serves as the only compilation check.
- The app uses Firebase SDK loaded from CDN (`https://www.gstatic.com/firebasejs/10.7.1/`), not bundled via npm.
- Firebase credentials are committed in `js/firebase.js` (project: `taconotaco-d94fc`). This is a real project — do not modify these credentials.
- The `serve.py` script attempts to open a browser via `webbrowser.open()` — this is harmless in headless environments (it will silently fail).
- Port 8081 is significant for Google Auth callback; the server will warn if it has to use a different port.
- There is no `package-lock.json` — `npm install` will resolve latest compatible versions each time.
- The `_backups/` and `old/` directories contain historical snapshots — do not modify or deploy these.
