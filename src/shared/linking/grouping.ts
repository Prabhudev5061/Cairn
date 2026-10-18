import { BacklinkItem } from './types';

export interface BacklinkGroup {
  sourcePath: string;
  sourceTitle: string;
  items: BacklinkItem[];
}

/**
 * Groups a flat array of backlink references by source note file,
 * sorted alphabetically by title, with references in each note sorted by line number.
 */
export function groupBacklinks(backlinks: BacklinkItem[]): BacklinkGroup[] {
  const map = new Map<string, BacklinkItem[]>();
  for (const item of backlinks) {
    const list = map.get(item.sourcePath) ?? [];
    list.push(item);
    map.set(item.sourcePath, list);
  }

  const groups: BacklinkGroup[] = [];
  for (const [sourcePath, items] of map.entries()) {
    const fileName = sourcePath.split('/').pop() ?? sourcePath;
    const sourceTitle = fileName.replace(/\.md$/i, '') || fileName;
    items.sort((a, b) => a.line - b.line);
    groups.push({
      sourcePath,
      sourceTitle,
      items
    });
  }

  groups.sort((a, b) => a.sourceTitle.localeCompare(b.sourceTitle));
  return groups;
}
