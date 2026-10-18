import { existsSync, promises as fs, readFileSync } from 'fs';
import path from 'path';
import { getFormatPlugin, isSupportedNotePath } from '@shared/formats/registry';
import { refactorWikilinksInContent } from '@shared/linking/refactor';
import { resolveWikilink } from '@shared/linking/resolver';
import {
  BacklinkItem,
  GraphData,
  NoteIndexEntry,
  SearchResultItem
} from '@shared/linking/types';
import { readNote, writeNoteAtomic } from '../vault/io';
import { resolveInsideVault } from '../vault/paths';

export class VaultIndexer {
  private vaultRoot: string;
  private entries = new Map<string, NoteIndexEntry>();
  private backlinks = new Map<string, BacklinkItem[]>();
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(vaultRoot: string) {
    this.vaultRoot = vaultRoot;
  }

  private getCachePath(): string {
    return path.join(this.vaultRoot, '.cairn', 'index.json');
  }

  /**
   * Initializes or restores the index for the vault.
   */
  public async init(): Promise<void> {
    const cachePath = this.getCachePath();

    if (existsSync(cachePath)) {
      try {
        const raw = await fs.readFile(cachePath, 'utf8');
        const data = JSON.parse(raw) as { entries: NoteIndexEntry[] };
        if (Array.isArray(data.entries)) {
          for (const entry of data.entries) {
            this.entries.set(entry.path, entry);
          }
        }
      } catch {
        // Cache invalid or corrupted; will rescan
      }
    }

    // Always scan to sync any new, modified, or deleted files
    await this.scanVault();
    this.rebuildBacklinks();
    this.scheduleSave();
  }

  /**
   * Scans all markdown files in the vault.
   */
  public async scanVault(): Promise<void> {
    const allRelPaths: string[] = [];

    const walk = async (dir: string, relDir: string): Promise<void> => {
      let files: import('fs').Dirent[];
      try {
        files = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const file of files) {
        const name = file.name;
        if (name.startsWith('.') || name === 'node_modules') continue;

        const fullPath = path.join(dir, name);
        const relPath = relDir ? `${relDir}/${name}` : name;

        if (file.isDirectory()) {
          await walk(fullPath, relPath);
        } else if (file.isFile() && isSupportedNotePath(name)) {
          allRelPaths.push(relPath);
        }
      }
    };

    await walk(this.vaultRoot, '');

    // Remove deleted files from index
    const currentPathSet = new Set(allRelPaths);
    for (const indexedPath of this.entries.keys()) {
      if (!currentPathSet.has(indexedPath)) {
        this.entries.delete(indexedPath);
      }
    }

    // Index or update files
    for (const relPath of allRelPaths) {
      const fullPath = path.join(this.vaultRoot, relPath);
      try {
        const stat = await fs.stat(fullPath);
        const existing = this.entries.get(relPath);

        if (!existing || existing.mtime < stat.mtimeMs) {
          const { content } = await readNote(fullPath);
          this.indexNoteContent(relPath, content, stat.mtimeMs, stat.size);
        }
      } catch {
        // Skip unreadable files
      }
    }
  }

  /**
   * Indexes a single note's content into memory.
   */
  public indexNoteContent(
    relPath: string,
    content: string,
    mtime = Date.now(),
    size = content.length
  ): NoteIndexEntry {
    const plugin = getFormatPlugin(relPath);
    const meta = plugin.parseMetadata(content, relPath);

    const entry: NoteIndexEntry = {
      path: relPath,
      title: meta.title,
      mtime,
      size,
      aliases: meta.aliases,
      tags: meta.tags,
      headings: meta.headings,
      blocks: meta.blocks,
      links: meta.links,
      format: plugin.id
    };

    this.entries.set(relPath, entry);
    return entry;
  }

  /**
   * Rebuilds the global backlinks map across all indexed entries.
   */
  public rebuildBacklinks(): void {
    this.backlinks.clear();
    const allPaths = Array.from(this.entries.keys());

    for (const sourceEntry of this.entries.values()) {
      const lines = this.getNoteLines(sourceEntry.path);

      for (const link of sourceEntry.links) {
        const resolved = resolveWikilink(link, sourceEntry.path, allPaths, this.entries);
        if (resolved.exists && resolved.resolvedPath) {
          const targetPath = resolved.resolvedPath;
          let list = this.backlinks.get(targetPath);
          if (!list) {
            list = [];
            this.backlinks.set(targetPath, list);
          }

          // Calculate line number and surrounding snippet
          const lineNum = this.findLineNumber(sourceEntry.path, link.from);
          const snippet = (lines && lines[lineNum - 1]?.trim()) || link.raw;

          list.push({
            sourcePath: sourceEntry.path,
            targetPath,
            line: lineNum,
            snippet,
            alias: link.alias,
            subpath: link.subpath
          });
        }
      }
    }
  }

  private cachedLines = new Map<string, string[]>();

  private getNoteLines(relPath: string): string[] | null {
    if (this.cachedLines.has(relPath)) {
      return this.cachedLines.get(relPath) || null;
    }
    try {
      const fullPath = path.join(this.vaultRoot, relPath);
      if (!existsSync(fullPath)) return null;
      // In-memory read
      const content = readFileSync(fullPath, 'utf8');
      const lines = content.split(/\r?\n/);
      this.cachedLines.set(relPath, lines);
      return lines;
    } catch {
      return null;
    }
  }

  private findLineNumber(relPath: string, offset: number): number {
    const lines = this.getNoteLines(relPath);
    if (!lines) return 1;

    let current = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineLen = (lines[i]?.length ?? 0) + 1;
      if (current + lineLen > offset) {
        return i + 1;
      }
      current += lineLen;
    }
    return lines.length || 1;
  }

  /**
   * Updates an individual note when modified externally or internally.
   */
  public async handleFileUpdate(relPath: string): Promise<void> {
    const fullPath = path.join(this.vaultRoot, relPath);
    this.cachedLines.delete(relPath);
    try {
      if (existsSync(fullPath)) {
        const stat = await fs.stat(fullPath);
        const { content } = await readNote(fullPath);
        this.indexNoteContent(relPath, content, stat.mtimeMs, stat.size);
      } else {
        this.entries.delete(relPath);
      }
      this.rebuildBacklinks();
      this.scheduleSave();
    } catch {
      // Ignore read errors
    }
  }

  /**
   * Handles note deletion.
   */
  public handleFileDelete(relPath: string): void {
    this.cachedLines.delete(relPath);
    this.entries.delete(relPath);
    this.rebuildBacklinks();
    this.scheduleSave();
  }

  /**
   * Refactors all incoming wikilinks when a note is renamed.
   */
  public async refactorNoteRename(
    oldRelPath: string,
    newRelPath: string
  ): Promise<{ updatedFilesCount: number }> {
    const oldTitle = oldRelPath.split('/').pop()?.replace(/\.md$/i, '') || '';
    const newTitle = newRelPath.split('/').pop()?.replace(/\.md$/i, '') || '';

    let updatedFilesCount = 0;

    // Scan all notes in the vault for links pointing to oldTitle or oldRelPath
    for (const [sourceRelPath] of this.entries.entries()) {
      if (sourceRelPath === oldRelPath) continue;

      const sourceFullPath = resolveInsideVault(this.vaultRoot, sourceRelPath);
      if (!existsSync(sourceFullPath)) continue;

      const { content, metadata } = await readNote(sourceFullPath);
      const { updated, newContent } = refactorWikilinksInContent(content, oldTitle, newTitle);

      if (updated) {
        await writeNoteAtomic(sourceFullPath, newContent, metadata);
        this.indexNoteContent(sourceRelPath, newContent);
        this.cachedLines.delete(sourceRelPath);
        updatedFilesCount++;
      }
    }

    // Update the renamed note's entry
    const existing = this.entries.get(oldRelPath);
    if (existing) {
      this.entries.delete(oldRelPath);
      existing.path = newRelPath;
      existing.title = newTitle;
      this.entries.set(newRelPath, existing);
    }

    this.rebuildBacklinks();
    this.scheduleSave();

    return { updatedFilesCount };
  }

  /**
   * Retrieves all backlinks pointing to a given note.
   */
  public getBacklinks(targetPath: string): BacklinkItem[] {
    return this.backlinks.get(targetPath) || [];
  }

  /**
   * Searches note contents and titles.
   */
  public search(query: string): SearchResultItem[] {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];

    const results: SearchResultItem[] = [];

    for (const [relPath, entry] of this.entries.entries()) {
      const lines = this.getNoteLines(relPath);
      if (!lines) continue;

      const matches: SearchResultItem['matches'] = [];

      // Check title match
      if (entry.title.toLowerCase().includes(trimmed)) {
        matches.push({
          line: 1,
          snippet: entry.title,
          matchIndex: entry.title.toLowerCase().indexOf(trimmed),
          length: trimmed.length
        });
      }

      // Check content lines
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] || '';
        const lineLower = line.toLowerCase();
        let idx = lineLower.indexOf(trimmed);
        while (idx >= 0) {
          matches.push({
            line: i + 1,
            snippet: line.trim(),
            matchIndex: idx,
            length: trimmed.length
          });
          idx = lineLower.indexOf(trimmed, idx + trimmed.length);
        }
      }

      if (matches.length > 0) {
        results.push({
          path: relPath,
          title: entry.title,
          matches: matches.slice(0, 10) // Limit matches per note
        });
      }
    }

    return results;
  }

  /**
   * Returns complete graph data (nodes & edges) for all notes.
   */
  public getGraphData(): GraphData {
    const allPaths = Array.from(this.entries.keys());
    const linkSet = new Set<string>();
    const links: GraphData['links'] = [];
    const degreeMap = new Map<string, number>();

    for (const relPath of allPaths) {
      degreeMap.set(relPath, 0);
    }

    for (const [relPath, entry] of this.entries.entries()) {
      for (const link of entry.links) {
        const resolved = resolveWikilink(link, relPath, allPaths, this.entries);
        if (resolved.exists && resolved.resolvedPath) {
          const targetPath = resolved.resolvedPath;
          const key = `${relPath}->${targetPath}`;
          if (!linkSet.has(key)) {
            linkSet.add(key);
            links.push({
              source: relPath,
              target: targetPath
            });
            degreeMap.set(relPath, (degreeMap.get(relPath) || 0) + 1);
            degreeMap.set(targetPath, (degreeMap.get(targetPath) || 0) + 1);
          }
        }
      }
    }

    const nodes: GraphData['nodes'] = [];
    for (const [relPath, entry] of this.entries.entries()) {
      const degree = degreeMap.get(relPath) || 0;
      nodes.push({
        id: relPath,
        path: relPath,
        title: entry.title,
        tags: entry.tags || [],
        degree,
        isOrphan: degree === 0,
        val: Math.max(1, degree),
        format: entry.format
      });
    }

    return { nodes, links };
  }

  /**
   * Returns all indexed note metadata entries.
   */
  public getAllEntries(): NoteIndexEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Debounced save to .cairn/index.json cache.
   */
  private scheduleSave(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    this.saveDebounceTimer = setTimeout(() => {
      void this.persistCache();
    }, 500);
  }

  private async persistCache(): Promise<void> {
    try {
      const cairnDir = path.join(this.vaultRoot, '.cairn');
      await fs.mkdir(cairnDir, { recursive: true });
      const cachePath = this.getCachePath();
      const payload = {
        version: 1,
        updatedAt: Date.now(),
        entries: Array.from(this.entries.values())
      };
      await fs.writeFile(cachePath, JSON.stringify(payload, null, 2), 'utf8');
    } catch {
      // Non-critical cache save failure
    }
  }

  public dispose(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }
    this.cachedLines.clear();
    this.entries.clear();
    this.backlinks.clear();
  }
}
