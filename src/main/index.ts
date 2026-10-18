import { existsSync } from 'fs';
import { join } from 'path';
import { app, BrowserWindow, session, shell } from 'electron';
import { registerAppHandlers } from './ipc/app';
import { registerExportHandlers } from './ipc/export';
import { registerSyncIpcHandlers } from './ipc/sync';
import { initVaultService, registerVaultHandlers } from './ipc/vault';

// Linux Wayland/X11 auto selection
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('ozone-platform-hint', 'auto');
}

function getPreloadPath(): string {
  const cjsPath = join(__dirname, '../preload/index.cjs');
  if (existsSync(cjsPath)) {
    return cjsPath;
  }
  const mjsPath = join(__dirname, '../preload/index.mjs');
  if (existsSync(mjsPath)) {
    return mjsPath;
  }
  return join(__dirname, '../preload/index.js');
}

function safeOpenExternal(url: string): void {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'mailto:') {
      void shell.openExternal(url);
    }
  } catch {
    // Discard invalid or malformed URLs
  }
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  // Block in-app navigation and open external links safely
  mainWindow.webContents.on('will-navigate', (event, url) => {
    event.preventDefault();
    safeOpenExternal(url);
  });

  // Block window.open and delegate external links to system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    safeOpenExternal(url);
    return { action: 'deny' };
  });

  // Load renderer
  const rendererUrl = process.env['ELECTRON_RENDERER_URL'];
  if (rendererUrl) {
    mainWindow.loadURL(rendererUrl);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  // Enforce distinct dev vs production CSP
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const isDev = !app.isPackaged;
    const csp = isDev
      ? "default-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self' ws:;"
      : "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self';";

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    });
  });

  // Zero-privilege security lockdown: deny all device & web permissions
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  session.defaultSession.setPermissionCheckHandler(() => false);

  registerAppHandlers();
  registerVaultHandlers();
  registerSyncIpcHandlers();
  registerExportHandlers();
  initVaultService().catch(() => {});
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
