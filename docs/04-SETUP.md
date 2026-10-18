# Setup (Windows and Linux)

Needed: Git, Node.js 22 LTS, pnpm (via Corepack). No Rust or C++ toolchain is required.

## Windows (current)
1. Install Git for Windows and Node.js 22 LTS.
2. In a terminal: `corepack enable` then `pnpm -v` (if Corepack is blocked, `npm i -g pnpm`).
3. `pnpm install` then `pnpm dev`.

## Linux (Ubuntu or Debian family)
1. Install Node 22 LTS (via fnm, nvm, or NodeSource), then `corepack enable`.
2. Electron runtime libraries (usually present on a desktop install):
   `sudo apt install -y libgtk-3-0 libnss3 libgbm1 libxss1 xdg-utils` plus `libasound2t64` (Ubuntu 24.04+) or `libasound2` (older).
3. File watcher limit (large vaults): add `fs.inotify.max_user_watches=524288` to `/etc/sysctl.conf`, then `sudo sysctl -p`.
4. Newer Ubuntu may restrict the Chromium sandbox (AppArmor user namespaces). If Electron fails to start with a sandbox error, see Electron's sandbox docs. For dev only, a temporary workaround is to relax the restriction; never ship with the sandbox disabled.
5. Wayland: the app should pass `--ozone-platform-hint=auto` so it runs on Wayland and X11.
6. E2E tests need a display: CI uses `xvfb-run -a pnpm test:e2e`.
7. `pnpm install` then `pnpm dev`.

## Verifying a fresh machine
`pnpm check` and `pnpm test:e2e` must both pass. Record the date and OS in PROGRESS.md under "Tested on".
