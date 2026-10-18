# Rule: Electron security (always on)
- `BrowserWindow`: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity` left on.
- Preload exposes a **small, typed** API via `contextBridge`. No raw `ipcRenderer`, no generic "invoke anything".
- All channels are declared once in `src/shared/ipc.ts`, with request and response types. Main validates every argument.
- Set a strict Content-Security-Policy. No remote scripts. No `eval`. No `dangerouslySetInnerHTML` with user content (KaTeX output is the only allowed exception, from the library).
- Block navigation and `window.open`; open external links with `shell.openExternal` after allowlisting `http(s)` and `mailto`.
- Main resolves every path with `path.resolve` and rejects anything outside the vault root (including symlink escapes via `realpath`).
