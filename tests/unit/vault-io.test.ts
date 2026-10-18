import { existsSync, promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createNote, deleteNote, readNote, renameNote, writeNoteAtomic } from '../../src/main/vault/io';
import { resolveInsideVault } from '../../src/main/vault/paths';

describe('vault I/O', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cairn-io-test-'));
  });

  afterEach(async () => {
    if (existsSync(tempDir)) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('readNote & writeNoteAtomic', () => {
    it('detects LF line endings and preserves LF on write', async () => {
      const notePath = path.join(tempDir, 'lf-test.md');
      await fs.writeFile(notePath, '# Heading\nLine 2\nLine 3\n', 'utf8');

      const read = await readNote(notePath);
      expect(read.metadata.eol).toBe('\n');
      expect(read.metadata.hasBom).toBe(false);
      expect(read.content).toBe('# Heading\nLine 2\nLine 3\n');

      // Edit content and write
      const newContent = '# Heading\nEdited line 2\nLine 3\n';
      const writeResult = await writeNoteAtomic(notePath, newContent, read.metadata);
      expect(writeResult.written).toBe(true);

      const rawBuffer = await fs.readFile(notePath);
      expect(rawBuffer.includes(Buffer.from('\r\n'))).toBe(false);
      expect(rawBuffer.toString('utf8')).toBe(newContent);
    });

    it('detects CRLF line endings and preserves CRLF on write', async () => {
      const notePath = path.join(tempDir, 'crlf-test.md');
      await fs.writeFile(notePath, '# Heading\r\nLine 2\r\nLine 3\r\n', 'utf8');

      const read = await readNote(notePath);
      expect(read.metadata.eol).toBe('\r\n');
      expect(read.metadata.hasBom).toBe(false);

      // Edit content (using standard \n in editor string) and write with CRLF metadata
      const newContent = '# Heading\nEdited line 2\nLine 3\n';
      const writeResult = await writeNoteAtomic(notePath, newContent, read.metadata);
      expect(writeResult.written).toBe(true);

      const rawBuffer = await fs.readFile(notePath);
      expect(rawBuffer.includes(Buffer.from('\r\n'))).toBe(true);
      expect(rawBuffer.toString('utf8')).toBe('# Heading\r\nEdited line 2\r\nLine 3\r\n');
    });

    it('detects UTF-8 BOM and preserves BOM on write', async () => {
      const notePath = path.join(tempDir, 'bom-test.md');
      const bomBuffer = Buffer.concat([
        Buffer.from([0xef, 0xbb, 0xbf]),
        Buffer.from('# BOM Heading\nLine 2\n', 'utf8')
      ]);
      await fs.writeFile(notePath, bomBuffer);

      const read = await readNote(notePath);
      expect(read.metadata.hasBom).toBe(true);
      expect(read.content).toBe('# BOM Heading\nLine 2\n');

      const newContent = '# BOM Heading\nEdited Line 2\n';
      const writeResult = await writeNoteAtomic(notePath, newContent, read.metadata);
      expect(writeResult.written).toBe(true);

      const rawBuffer = await fs.readFile(notePath);
      expect(rawBuffer[0]).toBe(0xef);
      expect(rawBuffer[1]).toBe(0xbb);
      expect(rawBuffer[2]).toBe(0xbf);
      expect(rawBuffer.subarray(3).toString('utf8')).toBe(newContent);
    });

    it('skips writing if content is unchanged (no-op write)', async () => {
      const notePath = path.join(tempDir, 'noop-test.md');
      const initialContent = '# No-op\nSame text\n';
      await fs.writeFile(notePath, initialContent, 'utf8');

      const read = await readNote(notePath);
      const writeResult = await writeNoteAtomic(notePath, initialContent, read.metadata);
      expect(writeResult.written).toBe(false);
    });

    it('creates temp file and renames cleanly without leaving leftovers', async () => {
      const notePath = path.join(tempDir, 'atomic-test.md');
      await writeNoteAtomic(notePath, '# Atomic\nContent\n');

      const files = await fs.readdir(tempDir);
      expect(files).toContain('atomic-test.md');
      const tempFiles = files.filter((f) => f.startsWith('.cairn-tmp-'));
      expect(tempFiles.length).toBe(0);
    });
  });

  describe('createNote, renameNote, deleteNote', () => {
    it('creates a new empty note', async () => {
      const notePath = path.join(tempDir, 'new-note.md');
      const res = await createNote(notePath);
      expect(res.path).toBe(notePath);
      expect(existsSync(notePath)).toBe(true);
      const content = await fs.readFile(notePath, 'utf8');
      expect(content).toBe('');
    });

    it('throws error when creating an already existing note', async () => {
      const notePath = path.join(tempDir, 'exists.md');
      await fs.writeFile(notePath, 'content', 'utf8');
      await expect(createNote(notePath)).rejects.toThrow('Note already exists');
    });

    it('renames a note on disk', async () => {
      const oldPath = path.join(tempDir, 'old-name.md');
      const newPath = path.join(tempDir, 'new-name.md');
      await fs.writeFile(oldPath, 'note content', 'utf8');

      const res = await renameNote(oldPath, newPath);
      expect(res.path).toBe(newPath);
      expect(existsSync(oldPath)).toBe(false);
      expect(existsSync(newPath)).toBe(true);
    });

    it('deletes a note from disk', async () => {
      const notePath = path.join(tempDir, 'delete-me.md');
      await fs.writeFile(notePath, 'content', 'utf8');
      expect(existsSync(notePath)).toBe(true);

      await deleteNote(notePath);
      expect(existsSync(notePath)).toBe(false);
    });
  });

  describe('resolveInsideVault', () => {
    it('resolves valid relative paths inside the vault', () => {
      const resolved = resolveInsideVault(tempDir, 'folder/note.md');
      expect(resolved).toBe(path.resolve(tempDir, 'folder/note.md'));
    });

    it('rejects directory traversal escaping vault root', () => {
      expect(() => resolveInsideVault(tempDir, '../outside.md')).toThrow(
        /Path traversal escape rejected/
      );
    });

    it('rejects paths containing null bytes', () => {
      expect(() => resolveInsideVault(tempDir, 'bad\0path.md')).toThrow(
        /Path contains invalid characters/
      );
    });
  });
});
