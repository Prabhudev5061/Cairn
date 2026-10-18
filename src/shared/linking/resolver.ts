import { stripNoteExtension } from '../formats/registry';
import { NoteIndexEntry, ParsedWikilink } from './types';

export interface ResolveResult {
  /** Resolved vault-relative path with forward slashes, or null if unresolved */
  resolvedPath: string | null;
  /** Whether the link was resolved to an existing file */
  exists: boolean;
  /** Heading or block anchor if present */
  subpath: string | null;
  subpathType: 'heading' | 'block' | null;
}

/**
 * Resolves a wikilink target using Obsidian's case-insensitive shortest-unique-path contract,
 * supporting cross-format notes (.md, .org, .typ, .adoc).
 *
 * @param link The parsed wikilink to resolve
 * @param fromPath The vault-relative path of the note containing the link
 * @param allFiles List of all known vault-relative file paths
 * @param indexMap Optional map of path -> NoteIndexEntry for alias matching
 */
export function resolveWikilink(
  link: ParsedWikilink,
  fromPath: string,
  allFiles: string[],
  indexMap?: Map<string, NoteIndexEntry>
): ResolveResult {
  let target = link.target.trim();

  // 1. Same-file anchor: [[#Heading]] or [[#^block]]
  if (!target) {
    return {
      resolvedPath: fromPath,
      exists: true,
      subpath: link.subpath,
      subpathType: link.subpathType
    };
  }

  // Normalize slashes
  target = target.replace(/\\/g, '/');

  // Strip leading slash if any
  if (target.startsWith('/')) {
    target = target.slice(1);
  }

  const hasExt = /\.[a-zA-Z0-9]+$/.test(target);
  const targetWithExt = hasExt ? target : `${target}.md`;
  const lowerTarget = target.toLowerCase();
  const lowerTargetBare = stripNoteExtension(target).toLowerCase();

  // 2. Direct path match (if target has slashes, e.g. "subfolder/note" or "subfolder/note.org")
  if (target.includes('/')) {
    const directMatch = allFiles.find((f) => {
      const fLower = f.toLowerCase();
      if (hasExt) {
        return fLower === lowerTarget || fLower.endsWith(`/${lowerTarget}`);
      }
      return (
        fLower === `${lowerTarget}.md` ||
        fLower.endsWith(`/${lowerTarget}.md`) ||
        stripNoteExtension(fLower) === lowerTargetBare ||
        stripNoteExtension(fLower).endsWith(`/${lowerTargetBare}`)
      );
    });

    if (directMatch) {
      return {
        resolvedPath: directMatch,
        exists: true,
        subpath: link.subpath,
        subpathType: link.subpathType
      };
    }
  }

  // 3. Exact filename match (case-insensitive) across the vault
  const candidates: string[] = [];
  for (const file of allFiles) {
    const fileName = file.split('/').pop() || '';
    const fileLower = fileName.toLowerCase();
    const fileBare = stripNoteExtension(fileName).toLowerCase();

    if (hasExt) {
      if (fileLower === lowerTarget) {
        candidates.push(file);
      }
    } else {
      if (fileBare === lowerTargetBare || fileLower === `${lowerTarget}.md`) {
        candidates.push(file);
      }
    }
  }

  if (candidates.length === 1 && candidates[0]) {
    return {
      resolvedPath: candidates[0],
      exists: true,
      subpath: link.subpath,
      subpathType: link.subpathType
    };
  }

  if (candidates.length > 1) {
    // Disambiguate:
    // a) Prefer sibling in the same folder as fromPath
    const fromDir = fromPath.includes('/') ? fromPath.slice(0, fromPath.lastIndexOf('/')) : '';
    const siblingMatch = candidates.find((c) => {
      const cDir = c.includes('/') ? c.slice(0, c.lastIndexOf('/')) : '';
      return cDir.toLowerCase() === fromDir.toLowerCase();
    });
    if (siblingMatch) {
      return {
        resolvedPath: siblingMatch,
        exists: true,
        subpath: link.subpath,
        subpathType: link.subpathType
      };
    }

    // b) If link target didn't specify extension and there is a .md candidate, prefer .md
    if (!hasExt) {
      const mdCandidate = candidates.find((c) => c.toLowerCase().endsWith('.md'));
      if (mdCandidate) {
        return {
          resolvedPath: mdCandidate,
          exists: true,
          subpath: link.subpath,
          subpathType: link.subpathType
        };
      }
    }

    // c) Shortest path length (closest to root)
    candidates.sort((a, b) => a.length - b.length || a.localeCompare(b));
    const best = candidates[0];
    if (best) {
      return {
        resolvedPath: best,
        exists: true,
        subpath: link.subpath,
        subpathType: link.subpathType
      };
    }
  }

  // 4. Match note aliases if indexMap is provided
  if (indexMap) {
    for (const [filePath, entry] of indexMap.entries()) {
      for (const alias of entry.aliases) {
        if (alias.toLowerCase() === lowerTargetBare) {
          return {
            resolvedPath: filePath,
            exists: true,
            subpath: link.subpath,
            subpathType: link.subpathType
          };
        }
      }
    }
  }

  // 5. Unresolved link: calculate intended creation path (default sibling or root)
  const defaultDir = fromPath.includes('/') ? fromPath.slice(0, fromPath.lastIndexOf('/')) : '';
  const fallbackPath = defaultDir ? `${defaultDir}/${targetWithExt}` : targetWithExt;

  return {
    resolvedPath: fallbackPath,
    exists: false,
    subpath: link.subpath,
    subpathType: link.subpathType
  };
}
