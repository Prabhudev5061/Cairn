import { promises as fs } from 'fs';
import path from 'path';
import { isSupportedNotePath } from '../../shared/formats/registry';
import type { StoredSyncState, StoredSyncStateEntry, SyncConflict, SyncProgress, SyncSummary } from '../../shared/sync/types';
import { deleteNote, writeNoteAtomic } from '../vault/io';
import type { DriveFileItem, IDriveClient } from './googleDriveClient';
import { computeFileHashes, generateConflictPath, loadSyncState, saveSyncState } from './syncState';

export interface LocalFileInfo {
  relPath: string;
  fullPath: string;
  content: Buffer;
  sha256: string;
  md5: string;
  mtimeMs: number;
}

export interface RemoteFileInfo {
  relPath: string;
  fileItem: DriveFileItem;
}

export interface SyncEngineOptions {
  dryRun?: boolean;
  onProgress?: (progress: SyncProgress) => void;
  folderName?: string;
}

/**
 * Recursively scans a local vault for all supported note files, ignoring hidden/internal directories.
 */
export async function scanLocalVault(vaultPath: string): Promise<Map<string, LocalFileInfo>> {
  const fileMap = new Map<string, LocalFileInfo>();

  async function walk(currentDir: string, relDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const name = entry.name;
      // Skip hidden directories, cairn cache, obsidian, git, node_modules
      if (name.startsWith('.') || name === 'node_modules') {
        continue;
      }

      const fullPath = path.join(currentDir, name);
      const relPath = relDir ? `${relDir}/${name}` : name;

      if (entry.isDirectory()) {
        await walk(fullPath, relPath);
      } else if (entry.isFile()) {
        if (isSupportedNotePath(name)) {
          try {
            const content = await fs.readFile(fullPath);
            const { sha256, md5 } = computeFileHashes(content);
            const stat = await fs.stat(fullPath);
            fileMap.set(relPath, {
              relPath,
              fullPath,
              content,
              sha256,
              md5,
              mtimeMs: stat.mtimeMs
            });
          } catch {
            // Skip unreadable files safely
          }
        }
      }
    }
  }

  await walk(vaultPath, '');
  return fileMap;
}

/**
 * Synchronizes a local vault with a Google Drive folder.
 */
export class SyncEngine {
  constructor(
    private vaultPath: string,
    private token: string,
    private driveClient: IDriveClient
  ) {}

  /**
   * Resolves or creates the remote folder hierarchy corresponding to a relative directory.
   */
  private async resolveRemoteFolder(
    rootFolderId: string,
    relDir: string,
    folderCache: Map<string, string>
  ): Promise<string> {
    if (!relDir || relDir === '.' || relDir === '') {
      return rootFolderId;
    }

    if (folderCache.has(relDir)) {
      return folderCache.get(relDir)!;
    }

    const parts = relDir.split('/').filter(Boolean);
    let currentParent = rootFolderId;
    let accumulatedPath = '';

    for (const part of parts) {
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;
      if (folderCache.has(accumulatedPath)) {
        currentParent = folderCache.get(accumulatedPath)!;
      } else {
        const folderId = await this.driveClient.getOrCreateFolder(this.token, part, currentParent);
        folderCache.set(accumulatedPath, folderId);
        currentParent = folderId;
      }
    }

    return currentParent;
  }

  /**
   * Recursively scans the remote Google Drive vault folder and maps file items to relative paths.
   */
  private async scanRemoteDriveFiles(
    rootFolderId: string,
    folderCache: Map<string, string>
  ): Promise<Map<string, RemoteFileInfo>> {
    const remoteFiles = new Map<string, RemoteFileInfo>();

    const traverse = async (folderId: string, currentRelDir: string): Promise<void> => {
      const items = await this.driveClient.listFiles(this.token, folderId);

      for (const item of items) {
        if (item.trashed) continue;

        if (item.mimeType === 'application/vnd.google-apps.folder') {
          const subRelDir = currentRelDir ? `${currentRelDir}/${item.name}` : item.name;
          folderCache.set(subRelDir, item.id);
          await traverse(item.id, subRelDir);
        } else {
          const fileRelPath = currentRelDir ? `${currentRelDir}/${item.name}` : item.name;
          if (isSupportedNotePath(item.name)) {
            remoteFiles.set(fileRelPath, {
              relPath: fileRelPath,
              fileItem: item
            });
          }
        }
      }
    };

    await traverse(rootFolderId, '');
    return remoteFiles;
  }

  /**
   * Executes a two-way incremental sync run.
   */
  async runSync(options?: SyncEngineOptions): Promise<SyncSummary> {
    const dryRun = options?.dryRun ?? false;
    const folderName = options?.folderName || path.basename(this.vaultPath) || 'Cairn Vault';
    const report = (current: number, total: number, message: string) => {
      options?.onProgress?.({ current, total, message });
    };

    report(0, 100, 'Connecting to Google Drive folder...');
    const rootFolderId = await this.driveClient.getOrCreateFolder(this.token, folderName);

    report(10, 100, 'Loading sync state...');
    const state: StoredSyncState = await loadSyncState(this.vaultPath);
    state.remoteFolderId = rootFolderId;

    report(20, 100, 'Scanning local vault files...');
    const localFiles = await scanLocalVault(this.vaultPath);

    report(40, 100, 'Listing remote Google Drive files...');
    const folderCache = new Map<string, string>();
    folderCache.set('', rootFolderId);
    const remoteFiles = await this.scanRemoteDriveFiles(rootFolderId, folderCache);

    report(60, 100, 'Reconciling changes...');

    const summary: SyncSummary = {
      uploaded: 0,
      downloaded: 0,
      deletedLocal: 0,
      deletedRemote: 0,
      conflicts: 0,
      errors: [],
      conflictList: []
    };

    // Collect union of all relative paths
    const allPaths = new Set<string>([
      ...localFiles.keys(),
      ...remoteFiles.keys(),
      ...Object.keys(state.files)
    ]);

    const updatedStateFiles: Record<string, StoredSyncStateEntry> = { ...state.files };
    const conflictList: SyncConflict[] = [...state.conflicts];

    let processedCount = 0;
    const totalPaths = allPaths.size;

    for (const relPath of allPaths) {
      processedCount++;
      const local = localFiles.get(relPath);
      const remote = remoteFiles.get(relPath);
      const lastSynced = state.files[relPath];

      report(
        60 + Math.floor((processedCount / (totalPaths || 1)) * 35),
        100,
        `Processing ${relPath}...`
      );

      try {
        // Case 1: Local Added (in local, not in remote, not in last sync state)
        if (local && !remote && !lastSynced) {
          if (!dryRun) {
            const relDir = path.dirname(relPath) === '.' ? '' : path.dirname(relPath);
            const parentId = await this.resolveRemoteFolder(rootFolderId, relDir, folderCache);
            const uploadedItem = await this.driveClient.uploadFile(
              this.token,
              parentId,
              path.basename(relPath),
              local.content
            );
            updatedStateFiles[relPath] = {
              path: relPath,
              driveFileId: uploadedItem.id,
              driveModifiedTime: uploadedItem.modifiedTime,
              localMtime: local.mtimeMs,
              localHash: local.sha256,
              driveMd5: uploadedItem.md5Checksum || local.md5
            };
          }
          summary.uploaded++;
          continue;
        }

        // Case 2: Remote Added (in remote, not in local, not in last sync state)
        if (remote && !local && !lastSynced) {
          if (!dryRun) {
            const contentBuf = await this.driveClient.downloadFile(this.token, remote.fileItem.id);
            const fullTarget = path.join(this.vaultPath, relPath);
            await writeNoteAtomic(fullTarget, contentBuf.toString('utf8'));
            const { sha256 } = computeFileHashes(contentBuf);
            const stat = await fs.stat(fullTarget);
            updatedStateFiles[relPath] = {
              path: relPath,
              driveFileId: remote.fileItem.id,
              driveModifiedTime: remote.fileItem.modifiedTime,
              localMtime: stat.mtimeMs,
              localHash: sha256,
              driveMd5: remote.fileItem.md5Checksum || ''
            };
          }
          summary.downloaded++;
          continue;
        }

        // Case 3: Both exist on local and remote
        if (local && remote) {
          const isLocalModified = !lastSynced || local.sha256 !== lastSynced.localHash;
          const isRemoteModified = !lastSynced || (remote.fileItem.md5Checksum && remote.fileItem.md5Checksum !== lastSynced.driveMd5);

          if (!isLocalModified && !isRemoteModified) {
            // Neither modified: up to date
            continue;
          }

          if (isLocalModified && !isRemoteModified) {
            // Local modified, remote untouched: Upload to Drive
            if (!dryRun) {
              const updatedItem = await this.driveClient.updateFile(
                this.token,
                remote.fileItem.id,
                local.content
              );
              updatedStateFiles[relPath] = {
                path: relPath,
                driveFileId: updatedItem.id,
                driveModifiedTime: updatedItem.modifiedTime,
                localMtime: local.mtimeMs,
                localHash: local.sha256,
                driveMd5: updatedItem.md5Checksum || local.md5
              };
            }
            summary.uploaded++;
            continue;
          }

          if (!isLocalModified && isRemoteModified) {
            // Remote modified, local untouched: Download to local disk
            if (!dryRun) {
              const contentBuf = await this.driveClient.downloadFile(this.token, remote.fileItem.id);
              const fullTarget = path.join(this.vaultPath, relPath);
              await writeNoteAtomic(fullTarget, contentBuf.toString('utf8'));
              const { sha256 } = computeFileHashes(contentBuf);
              const stat = await fs.stat(fullTarget);
              updatedStateFiles[relPath] = {
                path: relPath,
                driveFileId: remote.fileItem.id,
                driveModifiedTime: remote.fileItem.modifiedTime,
                localMtime: stat.mtimeMs,
                localHash: sha256,
                driveMd5: remote.fileItem.md5Checksum || ''
              };
            }
            summary.downloaded++;
            continue;
          }

          // Case 3c: Both modified concurrently -> CONFLICT
          if (local.md5 === remote.fileItem.md5Checksum) {
            // Content happens to match identically, resolve without conflict copy
            if (!dryRun) {
              updatedStateFiles[relPath] = {
                path: relPath,
                driveFileId: remote.fileItem.id,
                driveModifiedTime: remote.fileItem.modifiedTime,
                localMtime: local.mtimeMs,
                localHash: local.sha256,
                driveMd5: remote.fileItem.md5Checksum
              };
            }
            continue;
          }

          // Truly diverging contents: create conflict copy locally
          if (!dryRun) {
            const conflictRelPath = generateConflictPath(relPath);
            const remoteBuf = await this.driveClient.downloadFile(this.token, remote.fileItem.id);
            const conflictFullPath = path.join(this.vaultPath, conflictRelPath);
            await writeNoteAtomic(conflictFullPath, remoteBuf.toString('utf8'));

            // Overwrite remote with local copy so the canonical name stays updated with local edit
            const updatedRemote = await this.driveClient.updateFile(
              this.token,
              remote.fileItem.id,
              local.content
            );

            updatedStateFiles[relPath] = {
              path: relPath,
              driveFileId: updatedRemote.id,
              driveModifiedTime: updatedRemote.modifiedTime,
              localMtime: local.mtimeMs,
              localHash: local.sha256,
              driveMd5: updatedRemote.md5Checksum || local.md5
            };

            const conflictEntry: SyncConflict = {
              originalPath: relPath,
              conflictPath: conflictRelPath,
              timestamp: Date.now()
            };
            conflictList.push(conflictEntry);
          }
          summary.conflicts++;
          continue;
        }

        // Case 4: Local exists, but remote deleted
        if (local && !remote && lastSynced) {
          const isLocalModified = local.sha256 !== lastSynced.localHash;
          if (isLocalModified) {
            // Re-upload locally modified note to Drive
            if (!dryRun) {
              const relDir = path.dirname(relPath) === '.' ? '' : path.dirname(relPath);
              const parentId = await this.resolveRemoteFolder(rootFolderId, relDir, folderCache);
              const uploadedItem = await this.driveClient.uploadFile(
                this.token,
                parentId,
                path.basename(relPath),
                local.content
              );
              updatedStateFiles[relPath] = {
                path: relPath,
                driveFileId: uploadedItem.id,
                driveModifiedTime: uploadedItem.modifiedTime,
                localMtime: local.mtimeMs,
                localHash: local.sha256,
                driveMd5: uploadedItem.md5Checksum || local.md5
              };
            }
            summary.uploaded++;
          } else {
            // Locally untouched, remote deleted -> Trash local file
            if (!dryRun) {
              await deleteNote(local.fullPath);
              delete updatedStateFiles[relPath];
            }
            summary.deletedLocal++;
          }
          continue;
        }

        // Case 5: Remote exists, but local deleted
        if (!local && remote && lastSynced) {
          const isRemoteModified = remote.fileItem.md5Checksum && remote.fileItem.md5Checksum !== lastSynced.driveMd5;
          if (isRemoteModified) {
            // Remote was updated after local delete -> Re-download remote version
            if (!dryRun) {
              const contentBuf = await this.driveClient.downloadFile(this.token, remote.fileItem.id);
              const fullTarget = path.join(this.vaultPath, relPath);
              await writeNoteAtomic(fullTarget, contentBuf.toString('utf8'));
              const { sha256 } = computeFileHashes(contentBuf);
              const stat = await fs.stat(fullTarget);
              updatedStateFiles[relPath] = {
                path: relPath,
                driveFileId: remote.fileItem.id,
                driveModifiedTime: remote.fileItem.modifiedTime,
                localMtime: stat.mtimeMs,
                localHash: sha256,
                driveMd5: remote.fileItem.md5Checksum || ''
              };
            }
            summary.downloaded++;
          } else {
            // Remote untouched, local deleted -> Trash remote file
            if (!dryRun) {
              await this.driveClient.trashFile(this.token, remote.fileItem.id);
              delete updatedStateFiles[relPath];
            }
            summary.deletedRemote++;
          }
          continue;
        }

        // Case 6: Deleted on both sides
        if (!local && !remote && lastSynced) {
          delete updatedStateFiles[relPath];
        }
      } catch (fileErr) {
        summary.errors.push(`${relPath}: ${fileErr instanceof Error ? fileErr.message : String(fileErr)}`);
      }
    }

    if (!dryRun) {
      state.files = updatedStateFiles;
      state.conflicts = conflictList;
      state.lastSyncTimestamp = Date.now();
      await saveSyncState(this.vaultPath, state);
    }

    summary.conflictList = conflictList;
    report(100, 100, 'Sync complete.');
    return summary;
  }
}
