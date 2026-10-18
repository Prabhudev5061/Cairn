import { app, ipcMain } from 'electron';
import { AppPingResponse, IPC_CHANNELS } from '@shared/ipc';

export function registerAppHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.APP_PING, async (): Promise<AppPingResponse> => {
    return {
      ok: true,
      value: {
        version: app.getVersion(),
        platform: process.platform
      }
    };
  });
}
