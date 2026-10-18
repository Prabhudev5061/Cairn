import path from 'path';

/**
 * Converts an absolute or relative path to a vault-relative path using forward slashes.
 *
 * Case-insensitivity for containment checks is only used on Windows.
 * Case in the relative portion of targetPath is strictly preserved in the output.
 *
 * Returns null if targetPath escapes the vault or is outside the vault.
 * Returns empty string '' if targetPath points directly to vaultRoot.
 */
export function toVaultRelativePath(
  targetPath: string,
  vaultRoot: string,
  pathImpl: Pick<typeof path, 'resolve' | 'sep'> = path
): string | null {
  const isWindows = pathImpl.sep === '\\';
  const resolvedTarget = pathImpl.resolve(targetPath);
  const resolvedVault = pathImpl.resolve(vaultRoot);

  if (isWindows) {
    const lowerVault = resolvedVault.toLowerCase();
    const lowerTarget = resolvedTarget.toLowerCase();

    if (lowerTarget === lowerVault) {
      return '';
    }

    const vaultPrefix = lowerVault.endsWith('\\') ? lowerVault : lowerVault + '\\';
    if (!lowerTarget.startsWith(vaultPrefix)) {
      return null;
    }

    const relativePortion = resolvedTarget.slice(vaultPrefix.length);
    return relativePortion.split('\\').join('/');
  }

  // POSIX (case-sensitive)
  if (resolvedTarget === resolvedVault) {
    return '';
  }

  const vaultPrefix = resolvedVault.endsWith('/') ? resolvedVault : resolvedVault + '/';
  if (!resolvedTarget.startsWith(vaultPrefix)) {
    return null;
  }

  return resolvedTarget.slice(vaultPrefix.length);
}
