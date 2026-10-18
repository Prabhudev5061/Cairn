import { promises as fs } from 'fs';
import path from 'path';
import { isSupportedNotePath } from '../../shared/formats/registry';
import { VaultTreeNode } from '@shared/types';

const IGNORED_DIRECTORIES = new Set(['node_modules', '.obsidian', '.cairn', '.git']);

function shouldIgnoreDirectory(name: string): boolean {
  if (name.startsWith('.')) {
    return true;
  }
  return IGNORED_DIRECTORIES.has(name);
}

function shouldIncludeFile(name: string): boolean {
  if (name.startsWith('.')) {
    return false;
  }
  return isSupportedNotePath(name);
}

function compareNodes(a: VaultTreeNode, b: VaultTreeNode): number {
  // Folders first
  if (a.isDirectory && !b.isDirectory) return -1;
  if (!a.isDirectory && b.isDirectory) return 1;

  // Natural alphanumeric sort
  const natural = a.name.localeCompare(b.name, undefined, {
    numeric: true,
    sensitivity: 'base'
  });

  if (natural !== 0) {
    return natural;
  }

  // Fallback for case-variant names (e.g. CaseNote.md vs casenote.md)
  return a.name.localeCompare(b.name);
}

/**
 * Scans a directory recursively and builds a VaultTreeNode hierarchy.
 * Ignores .obsidian, .cairn, .git, node_modules, dotfiles, and non-markdown files.
 * Sorts folders first, followed by files in natural alphabetical order.
 */
export async function scanVaultTree(vaultRoot: string): Promise<VaultTreeNode> {
  const rootName = path.basename(vaultRoot) || 'Vault';

  async function scanDir(dirPath: string, relativeDir: string): Promise<VaultTreeNode[]> {
    let entries: import('fs').Dirent[];
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch {
      return [];
    }

    const nodes: VaultTreeNode[] = [];

    for (const entry of entries) {
      const entryName = entry.name;

      if (entry.isDirectory()) {
        if (shouldIgnoreDirectory(entryName)) {
          continue;
        }

        const childRelPath = relativeDir ? `${relativeDir}/${entryName}` : entryName;
        const childFullPath = path.join(dirPath, entryName);
        const children = await scanDir(childFullPath, childRelPath);

        nodes.push({
          name: entryName,
          path: childRelPath,
          isDirectory: true,
          children
        });
      } else if (entry.isFile()) {
        if (!shouldIncludeFile(entryName)) {
          continue;
        }

        const fileRelPath = relativeDir ? `${relativeDir}/${entryName}` : entryName;
        nodes.push({
          name: entryName,
          path: fileRelPath,
          isDirectory: false
        });
      }
    }

    nodes.sort(compareNodes);
    return nodes;
  }

  const children = await scanDir(vaultRoot, '');
  return {
    name: rootName,
    path: '',
    isDirectory: true,
    children
  };
}
