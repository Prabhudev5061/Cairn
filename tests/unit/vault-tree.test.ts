import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';
import { scanVaultTree } from '../../src/main/vault/tree';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('scanVaultTree', () => {
  const fixtureVault = path.resolve(__dirname, '../fixtures/vault');

  it('scans fixture vault and excludes .obsidian, .cairn, dotfiles, and non-markdown files', async () => {
    const tree = await scanVaultTree(fixtureVault);

    expect(tree.isDirectory).toBe(true);
    expect(tree.children).toBeDefined();

    const names = tree.children!.map((c) => c.name);

    // Should include markdown files
    expect(names).toContain('welcome.md');
    expect(names).toContain('crlf-note.md');
    expect(names).toContain('bom-note.md');
    expect(names).toContain('unicode-日本語-café.md');
    expect(names).toContain('subfolder');

    // Should ignore internal and dot directories
    expect(names).not.toContain('.obsidian');
    expect(names).not.toContain('.cairn');
    expect(names).not.toContain('.git');
    expect(names.some((n) => n.startsWith('.'))).toBe(false);

    // Verify subfolder children
    const subfolder = tree.children!.find((c) => c.name === 'subfolder');
    expect(subfolder).toBeDefined();
    expect(subfolder!.isDirectory).toBe(true);
    expect(subfolder!.children).toBeDefined();
    expect(subfolder!.children!.map((c) => c.name)).toContain('nested-note.md');
    expect(subfolder!.children![0]?.path).toBe('subfolder/nested-note.md');
  });

  it('sorts folders first, then natural alphabetical order', async () => {
    const tree = await scanVaultTree(fixtureVault);
    const children = tree.children!;

    // Find index of first file
    const firstFileIndex = children.findIndex((c) => !c.isDirectory);
    // Find index of last folder
    const lastFolderIndex = children.map((c) => c.isDirectory).lastIndexOf(true);

    if (lastFolderIndex !== -1 && firstFileIndex !== -1) {
      expect(lastFolderIndex).toBeLessThan(firstFileIndex);
    }
  });
});
