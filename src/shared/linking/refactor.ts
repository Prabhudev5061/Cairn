import { parseWikilinks } from './parser';

/**
 * Updates all references to oldTarget with newTarget in document content.
 * Preserves aliases, subpaths/headings, embeds, line endings, and byte-for-byte text.
 *
 * @param content The raw note content to refactor
 * @param oldTarget The note title or path being renamed (e.g. "Old Name" or "subfolder/old-note")
 * @param newTarget The new note title or path (e.g. "New Name" or "subfolder/new-note")
 */
export function refactorWikilinksInContent(
  content: string,
  oldTarget: string,
  newTarget: string
): { updated: boolean; newContent: string } {
  // Extract all wikilinks
  const links = parseWikilinks(content);
  if (links.length === 0) {
    return { updated: false, newContent: content };
  }

  // Normalize comparison strings
  const oldBare = oldTarget.replace(/\.md$/i, '').trim();
  const newBare = newTarget.replace(/\.md$/i, '').trim();
  const oldTitle = oldBare.split('/').pop() || oldBare;
  const newTitle = newBare.split('/').pop() || newBare;

  // Process links from right to left (descending offsets) so replacement indices stay valid
  const sortedLinks = [...links].sort((a, b) => b.from - a.from);
  let updated = false;
  let result = content;

  for (const link of sortedLinks) {
    const linkTarget = link.target.trim();
    const linkTargetBare = linkTarget.replace(/\.md$/i, '');
    const linkTitle = linkTargetBare.split('/').pop() || linkTargetBare;

    const matchesExactPath = linkTargetBare.toLowerCase() === oldBare.toLowerCase();
    const matchesTitleOnly = !linkTarget.includes('/') && linkTitle.toLowerCase() === oldTitle.toLowerCase();

    if (matchesExactPath || matchesTitleOnly) {
      // Determine what the new target string inside the brackets should look like:
      // If the original link used a directory path (e.g. [[folder/old]]), keep the directory with newTitle or newBare.
      let replacementTarget: string;
      if (linkTarget.includes('/') && newBare.includes('/')) {
        replacementTarget = newBare;
      } else if (linkTarget.includes('/')) {
        const dir = linkTarget.slice(0, linkTarget.lastIndexOf('/'));
        replacementTarget = `${dir}/${newTitle}`;
      } else {
        replacementTarget = newTitle;
      }

      // Reconstruct link: ![[target#subpath|alias]]
      const prefix = link.isEmbed ? '![' : '[';
      let reconstructed = `${prefix}[${replacementTarget}`;
      if (link.subpath) {
        reconstructed += link.subpathType === 'block' ? `#^${link.subpath}` : `#${link.subpath}`;
      }
      if (link.alias !== null) {
        reconstructed += `|${link.alias}`;
      }
      reconstructed += ']]';

      result = result.slice(0, link.from) + reconstructed + result.slice(link.to);
      updated = true;
    }
  }

  return { updated, newContent: result };
}
