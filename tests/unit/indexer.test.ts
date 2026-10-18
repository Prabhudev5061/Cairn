import { existsSync, promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { VaultIndexer } from '../../src/main/indexer/indexer';

describe('VaultIndexer Service', () => {
  it('indexes vault notes, frontmatter, links, and builds backlinks', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cairn-index-test-'));

    try {
      // Create notes
      await fs.writeFile(
        path.join(tempDir, 'note-a.md'),
        '# Note A\nThis note links to [[note-b]] and [[note-c|Alias C]].\n#tag1'
      );

      await fs.writeFile(
        path.join(tempDir, 'note-b.md'),
        '---\naliases: [B-Note]\n---\n# Note B\nContent of B.'
      );

      await fs.mkdir(path.join(tempDir, 'sub'), { recursive: true });
      await fs.writeFile(
        path.join(tempDir, 'sub', 'note-c.md'),
        '# Note C\nLinks to [[B-Note]].'
      );

      const indexer = new VaultIndexer(tempDir);
      await indexer.init();

      const entries = indexer.getAllEntries();
      expect(entries.length).toBe(3);

      // Verify Note A entry
      const noteA = entries.find((e) => e.path === 'note-a.md');
      expect(noteA).toBeDefined();
      expect(noteA?.title).toBe('note-a');
      expect(noteA?.headings[0]?.text).toBe('Note A');
      expect(noteA?.links.length).toBe(2);

      // Verify Backlinks for Note B
      const backlinksB = indexer.getBacklinks('note-b.md');
      expect(backlinksB.length).toBe(2); // From note-a.md via [[note-b]], and from sub/note-c.md via alias [[B-Note]]
      expect(backlinksB.map((b) => b.sourcePath)).toContain('note-a.md');
      expect(backlinksB.map((b) => b.sourcePath)).toContain('sub/note-c.md');

      // Verify Backlinks for Note C
      const backlinksC = indexer.getBacklinks('sub/note-c.md');
      expect(backlinksC.length).toBe(1);
      expect(backlinksC[0]?.sourcePath).toBe('note-a.md');
      expect(backlinksC[0]?.snippet).toContain('[[note-c|Alias C]]');

      // Verify Search
      const searchResults = indexer.search('content of b');
      expect(searchResults.length).toBe(1);
      expect(searchResults[0]?.path).toBe('note-b.md');

      // Verify Graph Data
      const graph = indexer.getGraphData();
      expect(graph.nodes.length).toBe(3);
      expect(graph.links.length).toBe(3);

      indexer.dispose();
    } finally {
      if (existsSync(tempDir)) {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    }
  });

  it('refactors links across notes when a note is renamed', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cairn-refactor-test-'));

    try {
      await fs.writeFile(
        path.join(tempDir, 'source.md'),
        'See [[target]] and [[target|Custom Label]] and [[target#Heading]].'
      );
      await fs.writeFile(path.join(tempDir, 'target.md'), '# Target\n# Heading\nContent');

      const indexer = new VaultIndexer(tempDir);
      await indexer.init();

      const result = await indexer.refactorNoteRename('target.md', 'renamed-target.md');
      expect(result.updatedFilesCount).toBe(1);

      // Check updated content on disk
      const sourceContent = await fs.readFile(path.join(tempDir, 'source.md'), 'utf8');
      expect(sourceContent).toContain('[[renamed-target]]');
      expect(sourceContent).toContain('[[renamed-target|Custom Label]]');
      expect(sourceContent).toContain('[[renamed-target#Heading]]');
      expect(sourceContent).not.toContain('[[target]]');

      indexer.dispose();
    } finally {
      if (existsSync(tempDir)) {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    }
  });
});
