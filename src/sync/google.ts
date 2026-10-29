import {
  RemoteConflictError,
  SyncError,
  networkError,
  providerStatusError,
  type FetchLike,
  type RemoteDir,
  type SyncProvider,
} from "./provider";
import { baseName, dirName, isMarkdownName, joinPath, normalizeSyncPath, usableName } from "./paths";
import type { TokenSession } from "./tokens";
import type { ProviderId, RemoteFile } from "./types";

const FOLDER_MIME = "application/vnd.google-apps.folder";
const FILE_FIELDS = "id,name,mimeType,version,modifiedTime,size";

type GoogleItem = {
  id: string;
  name: string;
  mimeType: string;
  version?: string;
  modifiedTime?: string;
  size?: string;
};

type GoogleList = { files?: GoogleItem[]; nextPageToken?: string };

/** Google Drive v3：目录即文件夹，按 parent id 递归。 */
export class GoogleDriveProvider implements SyncProvider {
  readonly id: ProviderId = "google";
  readonly account: string | null;
  private readonly folderCache = new Map<string, string>();

  constructor(
    private readonly tokens: TokenSession,
    private readonly fetchImpl: FetchLike,
    account: string | null,
  ) {
    this.account = account;
  }

  async listFiles(root: RemoteDir): Promise<RemoteFile[]> {
    const out: RemoteFile[] = [];
    const seen = new Set<string>();
    await this.walk(root, root.id, "", out, seen);
    return out;
  }

  async listFolders(_root: RemoteDir, dir: RemoteDir): Promise<RemoteDir[]> {
    const items = await this.children(dir.id);
    return items
      .filter((item) => item.mimeType === FOLDER_MIME && usableName(item.name))
      .map((item) => ({
        id: item.id,
        path: joinPath(dir.path, item.name),
        name: item.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async createFolder(root: RemoteDir, parent: RemoteDir, name: string): Promise<RemoteDir> {
    if (!usableName(name)) throw new SyncError("ambiguous", `unsupported folder name: ${name}`);
    const kids = await this.children(parent.id);
    const existing = kids.find((item) => item.mimeType === FOLDER_MIME && item.name === name);
    const id = existing ? existing.id : (await this.createFolderRaw(parent.id, name)).id;
    const path = joinPath(parent.path, name);
    this.folderCache.set(path, id);
    return { id, path, name };
  }

  async download(file: RemoteFile): Promise<string> {
    const url =
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`;
    return this.text(url);
  }

  async upload(
    root: RemoteDir,
    path: string,
    content: string,
    options: { existing: RemoteFile | null },
  ): Promise<RemoteFile> {
    const existing = options.existing;
    if (existing) {
      const current = await this.json<GoogleItem>(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(existing.id)}` +
          `?fields=${encodeURIComponent("id,version,modifiedTime,size")}`,
      );
      if (revOf(current) !== existing.rev) {
        throw new RemoteConflictError("remote file changed before upload", path);
      }
      const updated = await this.json<GoogleItem>(
        `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(existing.id)}` +
          `?uploadType=media&fields=${encodeURIComponent(FILE_FIELDS)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "text/markdown; charset=utf-8" },
          body: content,
        },
      );
      return toRemote(path, updated);
    }

    const name = baseName(path);
    if (!usableName(name)) throw new SyncError("ambiguous", `unsupported file name: ${name}`);
    const parentId = await this.ensureFolderPath(root, dirName(path));
    const siblings = await this.children(parentId);
    if (siblings.some((item) => item.name === name)) {
      throw new RemoteConflictError("remote path appeared before upload", path);
    }
    const created = await this.createFile(parentId, name, content);
    return toRemote(path, created);
  }

  async remove(file: RemoteFile): Promise<void> {
    const response = await this.request(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?fields=id`,
      { method: "PATCH", body: JSON.stringify({ trashed: true }) },
      "application/json",
    );
    if (response.status === 404) return;
    if (!response.ok) throw providerStatusError(response.status, await response.text());
  }

  private async walk(
    root: RemoteDir,
    folderId: string,
    prefix: string,
    out: RemoteFile[],
    seen: Set<string>,
  ): Promise<void> {
    this.folderCache.set(prefix, folderId);
    for (const item of await this.children(folderId)) {
      if (!usableName(item.name)) {
        if (item.mimeType === FOLDER_MIME) {
          throw new SyncError("ambiguous", `unsupported remote folder name: ${item.name}`);
        }
        continue;
      }
      if (item.mimeType === FOLDER_MIME) {
        await this.walk(root, item.id, joinPath(prefix, item.name), out, seen);
        continue;
      }
      if (item.mimeType.startsWith("application/vnd.google-apps.")) continue;
      if (!isMarkdownName(item.name)) continue;
      const path = joinPath(prefix, item.name);
      if (seen.has(path)) {
        throw new SyncError("ambiguous", `duplicate remote path: ${path}`);
      }
      seen.add(path);
      out.push(toRemote(path, item));
    }
  }

  private async children(folderId: string): Promise<GoogleItem[]> {
    const out: GoogleItem[] = [];
    let pageToken: string | undefined;
    do {
      const url = new URL("https://www.googleapis.com/drive/v3/files");
      url.searchParams.set("q", `'${folderId}' in parents and trashed=false`);
      url.searchParams.set("fields", `nextPageToken,files(${FILE_FIELDS})`);
      url.searchParams.set("pageSize", "1000");
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const page = await this.json<GoogleList>(url);
      out.push(...(page.files ?? []));
      pageToken = page.nextPageToken || undefined;
    } while (pageToken);
    return out;
  }

  private async ensureFolderPath(root: RemoteDir, relDir: string): Promise<string> {
    const dir = normalizeSyncPath(relDir);
    if (!dir) return root.id;
    const cached = this.folderCache.get(dir);
    if (cached) return cached;
    let parentId = root.id;
    let prefix = "";
    for (const segment of dir.split("/")) {
      if (!usableName(segment)) {
        throw new SyncError("ambiguous", `unsupported folder name: ${segment}`);
      }
      prefix = joinPath(prefix, segment);
      const hit = this.folderCache.get(prefix);
      if (hit) {
        parentId = hit;
        continue;
      }
      const kids = await this.children(parentId);
      const existing = kids.find(
        (item) => item.mimeType === FOLDER_MIME && item.name === segment,
      );
      parentId = existing ? existing.id : (await this.createFolderRaw(parentId, segment)).id;
      this.folderCache.set(prefix, parentId);
    }
    return parentId;
  }

  private async createFolderRaw(parentId: string, name: string): Promise<GoogleItem> {
    return this.json<GoogleItem>(
      `https://www.googleapis.com/drive/v3/files?fields=${encodeURIComponent(FILE_FIELDS)}`,
      {
        method: "POST",
        body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] }),
      },
      "application/json",
    );
  }

  private async createFile(
    parentId: string,
    name: string,
    content: string,
  ): Promise<GoogleItem> {
    const boundary = `stoatmd-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const metadata = JSON.stringify({ name, parents: [parentId] });
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: text/markdown; charset=UTF-8\r\n\r\n${content}\r\n` +
      `--${boundary}--\r\n`;
    return this.json<GoogleItem>(
      `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart` +
        `&fields=${encodeURIComponent(FILE_FIELDS)}`,
      {
        method: "POST",
        headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
        body,
      },
    );
  }

  private async json<T>(
    url: string | URL,
    init: RequestInit = {},
    contentType?: string,
  ): Promise<T> {
    const response = await this.request(url, init, contentType);
    const text = await response.text();
    if (!response.ok) throw providerStatusError(response.status, text);
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new SyncError("unknown", "invalid JSON from Google Drive");
    }
  }

  private async text(url: string | URL): Promise<string> {
    const response = await this.request(url, {}, undefined);
    const body = await response.text();
    if (!response.ok) throw providerStatusError(response.status, body);
    return body;
  }

  private async request(
    url: string | URL,
    init: RequestInit,
    contentType: string | undefined,
  ): Promise<Response> {
    const token = await this.tokens.accessToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      ...(init.headers as Record<string, string> | undefined),
    };
    if (contentType && !headers["Content-Type"]) headers["Content-Type"] = contentType;
    try {
      return await this.fetchImpl(url, { ...init, headers });
    } catch (err) {
      networkError(err);
    }
  }
}

function revOf(item: GoogleItem): string {
  return String(item.version ?? item.modifiedTime ?? "");
}

function toRemote(path: string, item: GoogleItem): RemoteFile {
  return {
    path,
    id: item.id,
    rev: revOf(item),
    mtimeMs: item.modifiedTime ? Date.parse(item.modifiedTime) : 0,
    size: item.size ? Number(item.size) : 0,
  };
}
