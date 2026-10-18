import {
  AppPingResponse,
  AppSettings,
  FileMetadata,
  IpcResult,
  RecentVault,
  VaultTreeNode,
  WatcherAlert,
  WatcherEvent
} from '@shared/ipc';

export async function pingApp(): Promise<AppPingResponse> {
  return window.cairn.ping();
}

export async function chooseVault(): Promise<IpcResult<{ path: string; name: string } | null>> {
  return window.cairn.chooseVault();
}

export async function openVaultPath(path: string): Promise<IpcResult<{ path: string; name: string }>> {
  return window.cairn.openVaultPath({ path });
}

export async function getCurrentVault(): Promise<IpcResult<{ path: string; name: string } | null>> {
  return window.cairn.getCurrentVault();
}

export async function listVaultTree(): Promise<IpcResult<VaultTreeNode>> {
  return window.cairn.listTree();
}

export async function readNoteFile(
  path: string
): Promise<IpcResult<{ content: string; metadata: FileMetadata }>> {
  return window.cairn.readNote({ path });
}

export async function writeNoteFile(
  path: string,
  content: string,
  metadata?: FileMetadata
): Promise<IpcResult<{ written: boolean }>> {
  return window.cairn.writeNote({ path, content, metadata });
}

export async function createNoteFile(path: string): Promise<IpcResult<{ path: string }>> {
  return window.cairn.createNote({ path });
}

export async function renameNoteFile(
  oldPath: string,
  newPath: string
): Promise<IpcResult<{ path: string }>> {
  return window.cairn.renameNote({ oldPath, newPath });
}

export async function deleteNoteFile(path: string): Promise<IpcResult<void>> {
  return window.cairn.deleteNote({ path });
}

export async function getAppSettings(): Promise<IpcResult<AppSettings>> {
  return window.cairn.getSettings();
}

export async function setAppSettings(settings: Partial<AppSettings>): Promise<IpcResult<void>> {
  return window.cairn.setSettings(settings);
}

export async function removeRecentVault(path: string): Promise<IpcResult<RecentVault[]>> {
  return window.cairn.removeRecentVault({ path });
}

export async function getBacklinks(path: string) {
  return window.cairn.getBacklinks({ path });
}

export async function searchVault(query: string) {
  return window.cairn.searchVault({ query });
}

export async function getGraphData() {
  return window.cairn.getGraphData();
}

export async function getAllIndexEntries() {
  return window.cairn.getAllIndexEntries();
}

export async function renameNoteRefactor(oldPath: string, newPath: string) {
  return window.cairn.renameNoteRefactor({ oldPath, newPath });
}

export function subscribeVaultSwitched(
  callback: (vault: { path: string; name: string }) => void
): () => void {
  return window.cairn.onVaultSwitched(callback);
}

export function subscribeWatcherEvents(callback: (event: WatcherEvent) => void): () => void {
  return window.cairn.onWatchEvent(callback);
}

export function subscribeWatcherAlerts(callback: (alert: WatcherAlert) => void): () => void {
  return window.cairn.onWatchAlert(callback);
}

export async function getSyncStatus() {
  return window.cairn.syncGetStatus();
}

export async function startSyncAuth(req?: { customClientId?: string; mock?: boolean }) {
  return window.cairn.syncStartAuth(req);
}

export async function disconnectSync() {
  return window.cairn.syncDisconnect();
}

export async function triggerVaultSync(req?: { dryRun?: boolean }) {
  return window.cairn.syncTrigger(req);
}

export async function getSyncSettings() {
  return window.cairn.syncGetSettings();
}

export async function setSyncSettings(settings: Partial<import('@shared/ipc').SyncSettings>) {
  return window.cairn.syncSetSettings(settings);
}

export function subscribeSyncStatus(callback: (status: import('@shared/ipc').SyncStatus) => void): () => void {
  return window.cairn.onSyncStatusChanged(callback);
}

export async function exportNoteHtml(path: string, destinationPath?: string) {
  return window.cairn.exportHtml({ path, destinationPath });
}

export async function exportNoteMarkdown(path: string, destinationPath?: string) {
  return window.cairn.exportMarkdown({ path, destinationPath });
}

