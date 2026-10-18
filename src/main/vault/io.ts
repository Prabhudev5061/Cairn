import { randomUUID } from 'crypto';
import { existsSync, promises as fs } from 'fs';
import path from 'path';
import { shell } from 'electron';
import { FileMetadata } from '@shared/types';

export interface ReadNoteResult {
  content: string;
  metadata: FileMetadata;
}

export interface WriteNoteResult {
  written: boolean;
}

/**
 * Reads a markdown note from disk, detecting UTF-8 BOM and newline format (CRLF vs LF).
 * Returns the decoded content without BOM, alongside format metadata for byte-for-byte preservation.
 */
export async function readNote(fullPath: string): Promise<ReadNoteResult> {
  const buffer = await fs.readFile(fullPath);
  const hasBom =
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf;

  const contentBuffer = hasBom ? buffer.subarray(3) : buffer;
  const content = contentBuffer.toString('utf8');

  // Detect CRLF vs LF. If CRLF is present anywhere, preserve CRLF; otherwise default to LF.
  const eol: '\r\n' | '\n' = content.includes('\r\n') ? '\r\n' : '\n';

  return {
    content,
    metadata: {
      hasBom,
      eol
    }
  };
}

/**
 * Atomically writes a markdown note to disk:
 * 1. Skips writing if content and format metadata match the file on disk (no-op write).
 * 2. Re-encodes newlines to match the specified or existing EOL format.
 * 3. Prepends UTF-8 BOM if required.
 * 4. Writes to a temporary file in the same directory, then renames it atomically over the target.
 */
export async function writeNoteAtomic(
  fullPath: string,
  content: string,
  metadata?: FileMetadata
): Promise<WriteNoteResult> {
  // Check if file already exists on disk to detect no-op write
  if (existsSync(fullPath)) {
    try {
      const existing = await readNote(fullPath);
      const targetEol = metadata?.eol ?? existing.metadata.eol;
      const targetBom = metadata?.hasBom ?? existing.metadata.hasBom;

      if (
        existing.content === content &&
        existing.metadata.hasBom === targetBom &&
        existing.metadata.eol === targetEol
      ) {
        return { written: false };
      }
    } catch {
      // If reading fails for any reason, proceed with writing
    }
  }

  const targetEol = metadata?.eol ?? '\n';
  const targetBom = metadata?.hasBom ?? false;

  // Re-encode newlines
  const normalized = content.replace(/\r?\n/g, targetEol);
  const contentBuffer = Buffer.from(normalized, 'utf8');

  const finalBuffer = targetBom
    ? Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), contentBuffer])
    : contentBuffer;

  const dir = path.dirname(fullPath);
  await fs.mkdir(dir, { recursive: true });

  const tmpPath = path.join(dir, `.cairn-tmp-${Date.now()}-${randomUUID()}`);

  try {
    await fs.writeFile(tmpPath, finalBuffer);
    await fs.rename(tmpPath, fullPath);
    return { written: true };
  } catch (error) {
    if (existsSync(tmpPath)) {
      await fs.unlink(tmpPath).catch(() => {});
    }
    throw error;
  }
}

/**
 * Creates a new note file atomically. Throws an error if the note already exists.
 */
export async function createNote(fullPath: string): Promise<{ path: string }> {
  if (existsSync(fullPath)) {
    throw new Error(`Note already exists: ${fullPath}`);
  }

  const dir = path.dirname(fullPath);
  await fs.mkdir(dir, { recursive: true });

  await writeNoteAtomic(fullPath, '', { hasBom: false, eol: '\n' });
  return { path: fullPath };
}

/**
 * Atomically renames a note or folder on disk.
 */
export async function renameNote(
  oldFullPath: string,
  newFullPath: string
): Promise<{ path: string }> {
  if (!existsSync(oldFullPath)) {
    throw new Error(`Source does not exist: ${oldFullPath}`);
  }

  const newDir = path.dirname(newFullPath);
  await fs.mkdir(newDir, { recursive: true });

  await fs.rename(oldFullPath, newFullPath);
  return { path: newFullPath };
}

/**
 * Safely deletes a note by moving it to the system trash.
 */
export async function deleteNote(fullPath: string): Promise<void> {
  if (!existsSync(fullPath)) {
    return;
  }

  if (shell && typeof shell.trashItem === 'function') {
    await shell.trashItem(fullPath);
  } else {
    // Fallback for non-GUI / unit test environments
    await fs.rm(fullPath, { recursive: true, force: true });
  }
}
