import { existsSync, realpathSync } from 'fs';
import path from 'path';

function normalizeForComparison(p: string): string {
  const resolved = path.resolve(p);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function isInside(parent: string, child: string): boolean {
  const normParent = normalizeForComparison(parent);
  const normChild = normalizeForComparison(child);
  if (normParent === normChild) {
    return true;
  }
  return normChild.startsWith(normParent.endsWith(path.sep) ? normParent : normParent + path.sep);
}

const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

/**
 * Resolves a vault-relative path against the vault root and strictly validates
 * that it does not escape the vault root, including via directory traversal or symlinks.
 *
 * @throws Error if the path escapes the vault root.
 */
export function resolveInsideVault(vaultRoot: string, relativePath: string): string {
  if (!vaultRoot || typeof vaultRoot !== 'string') {
    throw new Error('Vault root path is required');
  }

  // Reject paths containing null bytes
  if (relativePath.includes('\0')) {
    throw new Error('Path contains invalid characters');
  }

  // Canonicalize to Unicode NFC normalization
  const normalizedPath = relativePath.normalize('NFC');

  // Reject Windows reserved device names (e.g. CON, PRN, AUX, NUL, COM1, LPT1)
  const segments = normalizedPath.split(/[\\/]/);
  for (const segment of segments) {
    if (WINDOWS_RESERVED_NAMES.test(segment.trim())) {
      throw new Error(`Reserved device name rejected: ${segment}`);
    }
  }

  // Canonicalize vault root
  if (!existsSync(vaultRoot)) {
    throw new Error(`Vault root does not exist: ${vaultRoot}`);
  }
  const realVaultRoot = realpathSync(vaultRoot);

  // Normalize forward/backward slashes
  const target = path.resolve(realVaultRoot, normalizedPath);

  // Syntactic containment check first
  if (!isInside(realVaultRoot, target)) {
    throw new Error(`Path traversal escape rejected: ${relativePath}`);
  }

  // Semantic symlink escape check:
  // If the target exists, check its realpath.
  if (existsSync(target)) {
    const realTarget = realpathSync(target);
    if (!isInside(realVaultRoot, realTarget)) {
      throw new Error(`Symlink escape rejected: ${relativePath} points outside vault`);
    }
    return target;
  }

  // If target does not exist yet (e.g. creating a new note),
  // walk up to find the closest existing ancestor directory and verify its realpath.
  let current = path.dirname(target);
  while (!existsSync(current) && current !== path.dirname(current)) {
    current = path.dirname(current);
  }

  if (existsSync(current)) {
    const realAncestor = realpathSync(current);
    if (!isInside(realVaultRoot, realAncestor)) {
      throw new Error(`Parent symlink escape rejected: ${relativePath} points outside vault`);
    }
  }

  return target;
}
