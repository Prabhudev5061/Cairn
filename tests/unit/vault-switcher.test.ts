import { describe, expect, it } from 'vitest';
import {
  BacklinkItem,
  RecentVault,
  formatRelativeTime,
  groupBacklinks,
  isSameVaultPath,
  recordRecentVault,
  removeRecentVaultEntry
} from '../../src/shared/ipc';

describe('Vault Switcher and Recent Vaults Logic', () => {
  it('deduplicates paths case-insensitively on Windows and case-sensitively on Linux', () => {
    // Windows simulation
    expect(isSameVaultPath('C:\\MyVault', 'c:\\myvault', true)).toBe(true);
    expect(isSameVaultPath('C:\\Vault1', 'C:\\Vault2', true)).toBe(false);

    // Linux simulation
    expect(isSameVaultPath('/home/user/vault', '/home/user/Vault', false)).toBe(false);
    expect(isSameVaultPath('/home/user/vault', '/home/user/vault', false)).toBe(true);
  });

  it('records recent vaults, updates timestamp, and deduplicates', () => {
    const t1 = 1000;
    const t2 = 2000;

    let recents: RecentVault[] = [];
    recents = recordRecentVault(recents, 'C:\\VaultA', 'VaultA', t1, true);
    expect(recents).toHaveLength(1);
    expect(recents[0]).toEqual({
      path: expect.any(String),
      name: 'VaultA',
      lastOpened: t1
    });

    // Add another
    recents = recordRecentVault(recents, 'C:\\VaultB', 'VaultB', t2, true);
    expect(recents).toHaveLength(2);
    expect(recents[0]?.name).toBe('VaultB');
    expect(recents[1]?.name).toBe('VaultA');

    // Re-record VaultA with newer timestamp and different case
    const t3 = 3000;
    recents = recordRecentVault(recents, 'c:\\vaulta', 'VaultA', t3, true);
    expect(recents).toHaveLength(2);
    expect(recents[0]?.name).toBe('VaultA');
    expect(recents[0]?.lastOpened).toBe(t3);
    expect(recents[1]?.name).toBe('VaultB');
  });

  it('caps recent vaults list to maximum of 10 items', () => {
    let recents: RecentVault[] = [];
    for (let i = 1; i <= 15; i++) {
      recents = recordRecentVault(recents, `C:\\Vault${i}`, `Vault${i}`, 1000 + i, true);
    }

    expect(recents).toHaveLength(10);
    // Most recent is Vault15
    expect(recents[0]?.name).toBe('Vault15');
    // 10th item is Vault6
    expect(recents[9]?.name).toBe('Vault6');
  });

  it('removes target vault from recents by path', () => {
    const list: RecentVault[] = [
      { path: 'C:\\Vault1', name: 'Vault1', lastOpened: 100 },
      { path: 'C:\\Vault2', name: 'Vault2', lastOpened: 200 },
      { path: 'C:\\Vault3', name: 'Vault3', lastOpened: 300 }
    ];

    const updated = removeRecentVaultEntry(list, 'c:\\vault2', true);
    expect(updated).toHaveLength(2);
    expect(updated.map((v) => v.name)).toEqual(['Vault1', 'Vault3']);
  });

  it('formats relative timestamps accurately', () => {
    const base = 1_000_000_000_000;

    // Just now (<60s)
    expect(formatRelativeTime(base - 10_000, base)).toBe('Just now');
    expect(formatRelativeTime(base - 59_000, base)).toBe('Just now');

    // Minutes (<60m)
    expect(formatRelativeTime(base - 60_000, base)).toBe('1m ago');
    expect(formatRelativeTime(base - 5 * 60_000, base)).toBe('5m ago');
    expect(formatRelativeTime(base - 59 * 60_000, base)).toBe('59m ago');

    // Hours (<24h)
    expect(formatRelativeTime(base - 3600_000, base)).toBe('1h ago');
    expect(formatRelativeTime(base - 12 * 3600_000, base)).toBe('12h ago');

    // Yesterday (<48h)
    expect(formatRelativeTime(base - 25 * 3600_000, base)).toBe('Yesterday');

    // Days (<7d)
    expect(formatRelativeTime(base - 3 * 86400_000, base)).toBe('3d ago');
    expect(formatRelativeTime(base - 6 * 86400_000, base)).toBe('6d ago');

    // Specific date format
    const oldTimestamp = new Date('2024-05-15T12:00:00Z').getTime();
    const futureNow = new Date('2024-06-15T12:00:00Z').getTime();
    expect(formatRelativeTime(oldTimestamp, futureNow)).toBe('2024-05-15');
  });

  it('groups backlinks by source note file and sorts by line number', () => {
    const backlinks: BacklinkItem[] = [
      {
        sourcePath: 'sub/note-z.md',
        targetPath: 'hub.md',
        line: 42,
        snippet: 'Reference 1 in Z',
        alias: null,
        subpath: null
      },
      {
        sourcePath: 'note-a.md',
        targetPath: 'hub.md',
        line: 15,
        snippet: 'Reference 2 in A',
        alias: null,
        subpath: 'heading-2'
      },
      {
        sourcePath: 'note-a.md',
        targetPath: 'hub.md',
        line: 5,
        snippet: 'Reference 1 in A',
        alias: 'Alias',
        subpath: null
      }
    ];

    const groups = groupBacklinks(backlinks);

    expect(groups).toHaveLength(2);
    // note-a before note-z
    expect(groups[0]?.sourceTitle).toBe('note-a');
    expect(groups[0]?.sourcePath).toBe('note-a.md');
    expect(groups[0]?.items).toHaveLength(2);
    // Line 5 before Line 15
    expect(groups[0]?.items[0]?.line).toBe(5);
    expect(groups[0]?.items[1]?.line).toBe(15);

    expect(groups[1]?.sourceTitle).toBe('note-z');
    expect(groups[1]?.sourcePath).toBe('sub/note-z.md');
    expect(groups[1]?.items).toHaveLength(1);
    expect(groups[1]?.items[0]?.line).toBe(42);
  });

  it('handles empty backlinks array gracefully', () => {
    const groups = groupBacklinks([]);
    expect(groups).toEqual([]);
  });
});
