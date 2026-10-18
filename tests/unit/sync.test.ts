import nodeCrypto from 'crypto';
import { existsSync, promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MockGoogleDriveClient } from '../../src/main/sync/googleDriveClient';
import {
  buildGoogleAuthUrl,
  generateOAuthState,
  generatePkcePair
} from '../../src/main/sync/oauth';
import { scanLocalVault, SyncEngine } from '../../src/main/sync/syncEngine';
import {
  computeFileHashes,
  generateConflictPath,
  loadSyncState,
  saveSyncState
} from '../../src/main/sync/syncState';
import { decryptToken, encryptToken } from '../../src/main/sync/tokenStore';

describe('Phase 6: Cloud Vault Sync (Google Drive Integration)', () => {
  let tempVaultDir: string;

  beforeEach(async () => {
    tempVaultDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cairn-sync-unit-'));
  });

  afterEach(async () => {
    if (tempVaultDir && existsSync(tempVaultDir)) {
      await fs.rm(tempVaultDir, { recursive: true, force: true });
    }
  });

  describe('OAuth 2.0 PKCE & URLs', () => {
    it('generates high-entropy PKCE verifier and SHA-256 base64url challenge', () => {
      const { verifier, challenge } = generatePkcePair();
      expect(verifier.length).toBeGreaterThanOrEqual(43);
      expect(challenge.length).toBeGreaterThan(0);
      expect(verifier).not.toBe(challenge);
      expect(/^[a-zA-Z0-9-._~]+$/.test(verifier)).toBe(true);
    });

    it('builds a Google OAuth authorization URL targeting drive.file least-privilege scope', () => {
      const { challenge } = generatePkcePair();
      const state = generateOAuthState();
      const clientId = 'cairn-test-client.apps.googleusercontent.com';
      const redirectUri = 'http://127.0.0.1:54321/oauth/callback';

      const urlString = buildGoogleAuthUrl(clientId, redirectUri, challenge, state);
      const url = new URL(urlString);

      expect(url.origin).toBe('https://accounts.google.com');
      expect(url.pathname).toBe('/o/oauth2/v2/auth');
      expect(url.searchParams.get('client_id')).toBe(clientId);
      expect(url.searchParams.get('redirect_uri')).toBe(redirectUri);
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('scope')).toBe('https://www.googleapis.com/auth/drive.file email');
      expect(url.searchParams.get('code_challenge')).toBe(challenge);
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
      expect(url.searchParams.get('state')).toBe(state);
      expect(url.searchParams.get('access_type')).toBe('offline');
    });
  });

  describe('Token Encryption & Fallback', () => {
    it('encrypts and decrypts refresh tokens faithfully', () => {
      const rawToken = '1//04_fake_refresh_token_xyz_12345';
      const encrypted = encryptToken(rawToken);
      expect(encrypted).not.toBe(rawToken);
      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(rawToken);
    });
  });

  describe('Sync State & Conflict Naming', () => {
    it('computes consistent SHA-256 and MD5 hashes for file contents', () => {
      const content = Buffer.from('Hello Cairn Sync!', 'utf8');
      const { sha256, md5 } = computeFileHashes(content);

      const expectedSha256 = nodeCrypto.createHash('sha256').update(content).digest('hex');
      const expectedMd5 = nodeCrypto.createHash('md5').update(content).digest('hex');
      expect(sha256).toBe(expectedSha256);
      expect(md5).toBe(expectedMd5);
    });

    it('generates an Obsidian-compatible conflict filename preserving extension and relative folder', () => {
      const conflictName = generateConflictPath('Projects/research-notes.org');
      expect(conflictName).toMatch(/^Projects\/research-notes \(conflict \d{4}-\d{2}-\d{2}-\d{6}\)\.org$/);
    });

    it('loads default sync state when none exists and saves state atomically', async () => {
      const state = await loadSyncState(tempVaultDir);
      expect(state.version).toBe(1);
      expect(state.vaultPath).toBe(tempVaultDir);
      expect(state.remoteFolderId).toBe('');
      expect(Object.keys(state.files).length).toBe(0);

      state.remoteFolderId = 'folder_12345';
      state.files['note.md'] = {
        path: 'note.md',
        driveFileId: 'file_999',
        driveModifiedTime: new Date().toISOString(),
        localMtime: Date.now(),
        localHash: 'hash_abc',
        driveMd5: 'md5_xyz'
      };

      await saveSyncState(tempVaultDir, state);

      const reloaded = await loadSyncState(tempVaultDir);
      expect(reloaded.remoteFolderId).toBe('folder_12345');
      expect(reloaded.files['note.md']?.driveFileId).toBe('file_999');
    });
  });

  describe('Mock Google Drive Client', () => {
    it('stores, updates, retrieves, lists, and trashes files in memory', async () => {
      const mock = new MockGoogleDriveClient();
      const folderId = await mock.getOrCreateFolder('token', 'Test Vault');
      expect(folderId).toBeDefined();

      const uploaded = await mock.uploadFile('token', folderId, 'sample.md', Buffer.from('# Test Note'));
      expect(uploaded.id).toBeDefined();
      expect(uploaded.name).toBe('sample.md');

      const downloaded = await mock.downloadFile('token', uploaded.id);
      expect(downloaded.toString('utf8')).toBe('# Test Note');

      await mock.updateFile('token', uploaded.id, Buffer.from('# Updated Note'));
      const updatedDownload = await mock.downloadFile('token', uploaded.id);
      expect(updatedDownload.toString('utf8')).toBe('# Updated Note');

      const list = await mock.listFiles('token', folderId);
      expect(list.length).toBe(1);

      await mock.trashFile('token', uploaded.id);
      const listAfterTrash = await mock.listFiles('token', folderId);
      expect(listAfterTrash.length).toBe(0);
    });
  });

  describe('SyncEngine Two-Way Incremental Reconciliation', () => {
    it('scans multi-format note files locally while ignoring dotfiles and cache', async () => {
      await fs.writeFile(path.join(tempVaultDir, 'readme.md'), '# Readme');
      await fs.writeFile(path.join(tempVaultDir, 'todo.org'), '* TODO Item');
      await fs.mkdir(path.join(tempVaultDir, 'Research'), { recursive: true });
      await fs.writeFile(path.join(tempVaultDir, 'Research', 'paper.typ'), '= Paper');
      await fs.mkdir(path.join(tempVaultDir, '.cairn'), { recursive: true });
      await fs.writeFile(path.join(tempVaultDir, '.cairn', 'cache.json'), '{}');

      const files = await scanLocalVault(tempVaultDir);
      expect(files.has('readme.md')).toBe(true);
      expect(files.has('todo.org')).toBe(true);
      expect(files.has('Research/paper.typ')).toBe(true);
      expect(files.has('.cairn/cache.json')).toBe(false);
    });

    it('uploads local additions to Google Drive and populates sync-state.json', async () => {
      await fs.writeFile(path.join(tempVaultDir, 'note.md'), 'Content from device A');
      const mock = new MockGoogleDriveClient();
      const engine = new SyncEngine(tempVaultDir, 'mock_token', mock);

      const summary = await engine.runSync();
      expect(summary.uploaded).toBe(1);
      expect(summary.downloaded).toBe(0);
      expect(summary.conflicts).toBe(0);

      const state = await loadSyncState(tempVaultDir);
      expect(state.files['note.md']).toBeDefined();
      expect(state.files['note.md']?.driveFileId).toBeDefined();

      const driveFiles = await mock.listFiles('mock_token', state.remoteFolderId);
      expect(driveFiles.some((f) => f.name === 'note.md')).toBe(true);
    });

    it('downloads remote additions from Google Drive to local vault', async () => {
      const mock = new MockGoogleDriveClient();
      const rootFolderId = await mock.getOrCreateFolder('mock_token', path.basename(tempVaultDir));
      await mock.uploadFile('mock_token', rootFolderId, 'remote-note.adoc', Buffer.from('= Remote Doc'));

      const engine = new SyncEngine(tempVaultDir, 'mock_token', mock);
      const summary = await engine.runSync();

      expect(summary.downloaded).toBe(1);
      expect(summary.uploaded).toBe(0);

      const localFile = path.join(tempVaultDir, 'remote-note.adoc');
      expect(existsSync(localFile)).toBe(true);
      const content = await fs.readFile(localFile, 'utf8');
      expect(content).toBe('= Remote Doc');
    });

    it('preserves data non-destructively on concurrent conflict', async () => {
      // 1. Initial sync
      await fs.writeFile(path.join(tempVaultDir, 'collaborative.md'), 'Initial line\n');
      const mock = new MockGoogleDriveClient();
      const engine = new SyncEngine(tempVaultDir, 'mock_token', mock);
      await engine.runSync();

      const state = await loadSyncState(tempVaultDir);
      const driveFileId = state.files['collaborative.md']!.driveFileId;

      // 2. Local edit
      await fs.writeFile(path.join(tempVaultDir, 'collaborative.md'), 'Local divergence edit\n');

      // 3. Remote edit on Drive
      await mock.updateFile('mock_token', driveFileId, Buffer.from('Remote divergence edit\n'));

      // 4. Run sync
      const summary = await engine.runSync();
      expect(summary.conflicts).toBe(1);

      // Verify canonical note contains local edit
      const canonicalContent = await fs.readFile(path.join(tempVaultDir, 'collaborative.md'), 'utf8');
      expect(canonicalContent).toBe('Local divergence edit\n');

      // Verify conflict copy exists locally containing the remote edit
      const files = await fs.readdir(tempVaultDir);
      const conflictFile = files.find((f) => f.startsWith('collaborative (conflict') && f.endsWith('.md'));
      expect(conflictFile).toBeDefined();

      const conflictContent = await fs.readFile(path.join(tempVaultDir, conflictFile!), 'utf8');
      expect(conflictContent).toBe('Remote divergence edit\n');
    });

    it('propagates local deletions to Google Drive trash', async () => {
      // 1. Initial sync
      const notePath = path.join(tempVaultDir, 'obsolete.md');
      await fs.writeFile(notePath, 'To be deleted');
      const mock = new MockGoogleDriveClient();
      const engine = new SyncEngine(tempVaultDir, 'mock_token', mock);
      await engine.runSync();

      const state = await loadSyncState(tempVaultDir);
      const fileId = state.files['obsolete.md']!.driveFileId;

      // 2. Delete locally
      await fs.unlink(notePath);

      // 3. Sync again
      const summary = await engine.runSync();
      expect(summary.deletedRemote).toBe(1);

      const driveFiles = await mock.listFiles('mock_token', state.remoteFolderId);
      expect(driveFiles.find((f) => f.id === fileId)).toBeUndefined();
    });
  });
});
