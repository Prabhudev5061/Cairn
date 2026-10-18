import { ipcMain } from 'electron';
import { IPC_CHANNELS, IpcResult } from '@shared/ipc';
import { exportNoteToHtml, exportNoteToMarkdown } from '../export/exporter';
import { getActiveVaultPath } from './vault';

export function registerExportHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.EXPORT_HTML,
    async (
      _e,
      req: { path: string; destinationPath?: string }
    ): Promise<IpcResult<{ filePath?: string }>> => {
      const vaultPath = getActiveVaultPath();
      if (!vaultPath) {
        return { ok: false, error: 'No active vault' };
      }
      const res = await exportNoteToHtml(vaultPath, req.path, req.destinationPath);
      if (res.success) {
        return { ok: true, value: { filePath: res.filePath } };
      }
      return { ok: false, error: res.error || 'Export canceled or failed' };
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.EXPORT_MARKDOWN,
    async (
      _e,
      req: { path: string; destinationPath?: string }
    ): Promise<IpcResult<{ filePath?: string }>> => {
      const vaultPath = getActiveVaultPath();
      if (!vaultPath) {
        return { ok: false, error: 'No active vault' };
      }
      const res = await exportNoteToMarkdown(vaultPath, req.path, req.destinationPath);
      if (res.success) {
        return { ok: true, value: { filePath: res.filePath } };
      }
      return { ok: false, error: res.error || 'Export canceled or failed' };
    }
  );
}
