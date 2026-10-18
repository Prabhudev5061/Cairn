/**
 * Google Drive REST API v3 client using standard Node.js fetch.
 * Designed with exponential backoff, rate limiting tolerance, and an in-memory mock driver.
 */

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  md5Checksum?: string;
  modifiedTime: string;
  parents?: string[];
  trashed?: boolean;
}

export interface IDriveClient {
  getUserEmail(token: string): Promise<string>;
  getOrCreateFolder(token: string, folderName: string, parentId?: string): Promise<string>;
  listFiles(token: string, folderId: string): Promise<DriveFileItem[]>;
  uploadFile(token: string, parentId: string, filename: string, content: Buffer, mimeType?: string): Promise<DriveFileItem>;
  updateFile(token: string, fileId: string, content: Buffer, mimeType?: string): Promise<DriveFileItem>;
  downloadFile(token: string, fileId: string): Promise<Buffer>;
  trashFile(token: string, fileId: string): Promise<void>;
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let attempt = 0;
  let delay = 300;

  while (attempt < maxRetries) {
    attempt++;
    try {
      const res = await fetch(url, options);
      if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
        if (attempt === maxRetries) return res;
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      return res;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }

  throw new Error('fetchWithRetry: maximum retry attempts exceeded');
}

export class GoogleDriveApiClient implements IDriveClient {
  private apiBase = 'https://www.googleapis.com/drive/v3';
  private uploadBase = 'https://www.googleapis.com/upload/drive/v3';

  async getUserEmail(token: string): Promise<string> {
    const res = await fetchWithRetry(`${this.apiBase}/about?fields=user(emailAddress,displayName)`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch Google user info (HTTP ${res.status})`);
    }
    const data = (await res.json()) as { user?: { emailAddress?: string } };
    return data.user?.emailAddress || 'google-user@cairn.vault';
  }

  async getOrCreateFolder(token: string, folderName: string, parentId?: string): Promise<string> {
    let q = `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    if (parentId) {
      q += ` and '${parentId}' in parents`;
    }

    const listRes = await fetchWithRetry(`${this.apiBase}/files?q=${encodeURIComponent(q)}&fields=files(id,name)`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (listRes.ok) {
      const listData = (await listRes.json()) as { files?: Array<{ id: string; name: string }> };
      if (listData.files && listData.files.length > 0 && listData.files[0]?.id) {
        return listData.files[0].id;
      }
    }

    // Create folder
    const createBody: { name: string; mimeType: string; parents?: string[] } = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    };
    if (parentId) {
      createBody.parents = [parentId];
    }

    const createRes = await fetchWithRetry(`${this.apiBase}/files?fields=id,name`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(createBody)
    });

    if (!createRes.ok) {
      throw new Error(`Failed to create remote folder "${folderName}" (HTTP ${createRes.status})`);
    }

    const createData = (await createRes.json()) as { id: string };
    return createData.id;
  }

  async listFiles(token: string, folderId: string): Promise<DriveFileItem[]> {
    const results: DriveFileItem[] = [];
    let pageToken: string | null = null;

    do {
      let url = `${this.apiBase}/files?q='${folderId}' in parents and trashed = false&fields=nextPageToken,files(id,name,mimeType,md5Checksum,modifiedTime,parents,trashed)&pageSize=1000`;
      if (pageToken) {
        url += `&pageToken=${encodeURIComponent(pageToken)}`;
      }

      const res = await fetchWithRetry(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error(`Failed to list Google Drive files (HTTP ${res.status})`);
      }

      const data = (await res.json()) as { nextPageToken?: string; files?: DriveFileItem[] };
      if (data.files) {
        results.push(...data.files);
      }
      pageToken = data.nextPageToken || null;
    } while (pageToken);

    return results;
  }

  async uploadFile(
    token: string,
    parentId: string,
    filename: string,
    content: Buffer,
    mimeType = 'text/plain; charset=utf-8'
  ): Promise<DriveFileItem> {
    const boundary = `-------cairn_boundary_${Date.now()}`;
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: filename,
      parents: [parentId],
      mimeType: mimeType.split(';')[0]
    };

    const multipartRequestBody = Buffer.concat([
      Buffer.from(
        `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`
      ),
      Buffer.from(`${delimiter}Content-Type: ${mimeType}\r\n\r\n`),
      content,
      Buffer.from(closeDelimiter)
    ]);

    const res = await fetchWithRetry(
      `${this.uploadBase}/files?uploadType=multipart&fields=id,name,mimeType,md5Checksum,modifiedTime,parents`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': String(multipartRequestBody.length)
        },
        body: multipartRequestBody
      }
    );

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`Failed to upload file "${filename}" to Google Drive (HTTP ${res.status}): ${err}`);
    }

    return (await res.json()) as DriveFileItem;
  }

  async updateFile(
    token: string,
    fileId: string,
    content: Buffer,
    mimeType = 'text/plain; charset=utf-8'
  ): Promise<DriveFileItem> {
    const res = await fetchWithRetry(
      `${this.uploadBase}/files/${fileId}?uploadType=media&fields=id,name,mimeType,md5Checksum,modifiedTime`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': mimeType,
          'Content-Length': String(content.length)
        },
        body: content
      }
    );

    if (!res.ok) {
      throw new Error(`Failed to update file ${fileId} on Google Drive (HTTP ${res.status})`);
    }

    return (await res.json()) as DriveFileItem;
  }

  async downloadFile(token: string, fileId: string): Promise<Buffer> {
    const res = await fetchWithRetry(`${this.apiBase}/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      throw new Error(`Failed to download file ${fileId} from Google Drive (HTTP ${res.status})`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async trashFile(token: string, fileId: string): Promise<void> {
    const res = await fetchWithRetry(`${this.apiBase}/files/${fileId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ trashed: true })
    });

    if (!res.ok) {
      throw new Error(`Failed to trash file ${fileId} on Google Drive (HTTP ${res.status})`);
    }
  }
}

/**
 * In-memory Mock Google Drive Client for offline testing and deterministic CI validation.
 */
export class MockGoogleDriveClient implements IDriveClient {
  private files: Map<string, { item: DriveFileItem; content: Buffer }> = new Map();
  private nextId = 1000;
  public mockUserEmail = 'mock-user@cairn.test';

  async getUserEmail(token: string): Promise<string> {
    void token;
    return this.mockUserEmail;
  }

  async getOrCreateFolder(token: string, folderName: string, parentId?: string): Promise<string> {
    void token;
    for (const [, { item }] of this.files) {
      if (item.name === folderName && item.mimeType === 'application/vnd.google-apps.folder' && !item.trashed) {
        if (!parentId || item.parents?.includes(parentId)) {
          return item.id;
        }
      }
    }
    const id = `folder_${this.nextId++}`;
    this.files.set(id, {
      item: {
        id,
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        modifiedTime: new Date().toISOString(),
        parents: parentId ? [parentId] : []
      },
      content: Buffer.alloc(0)
    });
    return id;
  }

  async listFiles(token: string, folderId: string): Promise<DriveFileItem[]> {
    void token;
    const list: DriveFileItem[] = [];
    for (const [, { item }] of this.files) {
      if (item.parents?.includes(folderId) && !item.trashed) {
        list.push({ ...item });
      }
    }
    return list;
  }

  async uploadFile(
    token: string,
    parentId: string,
    filename: string,
    content: Buffer,
    mimeType = 'text/plain'
  ): Promise<DriveFileItem> {
    void token;
    const id = `file_${this.nextId++}`;
    const crypto = await import('crypto');
    const md5Checksum = crypto.createHash('md5').update(content).digest('hex');
    const item: DriveFileItem = {
      id,
      name: filename,
      mimeType,
      md5Checksum,
      modifiedTime: new Date().toISOString(),
      parents: [parentId]
    };
    this.files.set(id, { item, content: Buffer.from(content) });
    return { ...item };
  }

  async updateFile(
    token: string,
    fileId: string,
    content: Buffer,
    mimeType?: string
  ): Promise<DriveFileItem> {
    void token;
    void mimeType;
    const existing = this.files.get(fileId);
    if (!existing) {
      throw new Error(`File not found: ${fileId}`);
    }
    const crypto = await import('crypto');
    existing.content = Buffer.from(content);
    existing.item.md5Checksum = crypto.createHash('md5').update(content).digest('hex');
    existing.item.modifiedTime = new Date().toISOString();
    return { ...existing.item };
  }

  async downloadFile(token: string, fileId: string): Promise<Buffer> {
    void token;
    const existing = this.files.get(fileId);
    if (!existing) {
      throw new Error(`File not found: ${fileId}`);
    }
    return Buffer.from(existing.content);
  }

  async trashFile(token: string, fileId: string): Promise<void> {
    void token;
    const existing = this.files.get(fileId);
    if (existing) {
      existing.item.trashed = true;
    }
  }

  clear(): void {
    this.files.clear();
  }
}
