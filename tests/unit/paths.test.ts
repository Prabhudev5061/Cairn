import path from 'path';
import { describe, expect, it } from 'vitest';
import { toVaultRelativePath } from '../../src/shared/paths';

describe('toVaultRelativePath', () => {
  describe('Windows paths (path.win32)', () => {
    it('resolves relative path and converts backslashes to forward slashes', () => {
      const rel = toVaultRelativePath(
        'C:\\Vault\\notes\\daily\\today.md',
        'C:\\Vault',
        path.win32
      );
      expect(rel).toBe('notes/daily/today.md');
    });

    it('performs case-insensitive containment check while preserving output casing', () => {
      const rel = toVaultRelativePath(
        'c:\\VAULT\\Folder\\MyNote.MD',
        'C:\\vault',
        path.win32
      );
      expect(rel).toBe('Folder/MyNote.MD');
    });

    it('handles trailing slashes on vault root', () => {
      const rel = toVaultRelativePath(
        'C:\\Vault\\notes\\today.md',
        'C:\\Vault\\',
        path.win32
      );
      expect(rel).toBe('notes/today.md');
    });

    it('handles drive root as vault root', () => {
      const rel = toVaultRelativePath(
        'C:\\notes\\today.md',
        'C:\\',
        path.win32
      );
      expect(rel).toBe('notes/today.md');
    });

    it('returns empty string for vault root itself', () => {
      const rel = toVaultRelativePath(
        'C:\\Vault',
        'c:\\vault',
        path.win32
      );
      expect(rel).toBe('');
    });

    it('rejects path traversal escaping the vault', () => {
      const rel = toVaultRelativePath(
        'C:\\Vault\\..\\escape.md',
        'C:\\Vault',
        path.win32
      );
      expect(rel).toBeNull();
    });

    it('rejects sibling directory sharing same prefix', () => {
      const rel = toVaultRelativePath(
        'C:\\Vault_other\\note.md',
        'C:\\Vault',
        path.win32
      );
      expect(rel).toBeNull();
    });

    it('rejects path on a different drive', () => {
      const rel = toVaultRelativePath(
        'D:\\Vault\\note.md',
        'C:\\Vault',
        path.win32
      );
      expect(rel).toBeNull();
    });
  });

  describe('POSIX paths (path.posix)', () => {
    it('resolves relative path using forward slashes', () => {
      const rel = toVaultRelativePath(
        '/vault/notes/daily/today.md',
        '/vault',
        path.posix
      );
      expect(rel).toBe('notes/daily/today.md');
    });

    it('preserves casing in output', () => {
      const rel = toVaultRelativePath(
        '/vault/Folder/MyNote.MD',
        '/vault',
        path.posix
      );
      expect(rel).toBe('Folder/MyNote.MD');
    });

    it('is case-sensitive for containment on POSIX', () => {
      const rel = toVaultRelativePath(
        '/VAULT/Folder/MyNote.MD',
        '/vault',
        path.posix
      );
      expect(rel).toBeNull();
    });

    it('handles trailing slash on vault root', () => {
      const rel = toVaultRelativePath(
        '/vault/notes/today.md',
        '/vault/',
        path.posix
      );
      expect(rel).toBe('notes/today.md');
    });

    it('handles root / as vault root', () => {
      const rel = toVaultRelativePath(
        '/notes/today.md',
        '/',
        path.posix
      );
      expect(rel).toBe('notes/today.md');
    });

    it('returns empty string for vault root itself', () => {
      const rel = toVaultRelativePath(
        '/vault',
        '/vault',
        path.posix
      );
      expect(rel).toBe('');
    });

    it('rejects path traversal escaping the vault', () => {
      const rel = toVaultRelativePath(
        '/vault/../escape.md',
        '/vault',
        path.posix
      );
      expect(rel).toBeNull();
    });

    it('rejects sibling directory sharing same prefix', () => {
      const rel = toVaultRelativePath(
        '/vault_other/note.md',
        '/vault',
        path.posix
      );
      expect(rel).toBeNull();
    });
  });
});
