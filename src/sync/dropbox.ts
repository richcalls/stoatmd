import {
  RemoteConflictError,
  SyncError,
  networkError,
  providerStatusError,
  type FetchLike,
  type RemoteDir,
  type SyncProvider,
} from "./provider";
import {
  baseName,
  dirName,
  isMarkdownName,
  joinPath,
  normalizeSyncPath,
  relativeToRoot,
  usableName,
} from "./paths";
import type { TokenSession } from "./tokens";
import type { ProviderId, RemoteFile } from "./types";

type DropboxEntry = {
  ".tag": string;
  name?: string;
  id?: string;
  rev?: string;
  size?: number;
  path_display?: string;
  path_lower?: string;
  server_modified?: string;
};

type DropboxList = {
  entries?: DropboxEntry[];
  cursor?: string;
  has_more?: boolean;
};

type DropboxMetadata = {
  ".tag"?: string;
  id?: string;
  name?: string;
  rev?: string;
  size?: number;
  path_lower?: string;
  path_display?: string;
  server_modified?: string;
};

/** Dropbox v2：按绝对路径定位，`rev` 用于上传冲突检测。 */
export class DropboxProvider implements SyncProvider {
  readonly id: ProviderId = "dropbox";
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
    const entries = await this.listFolder(root.id, true);
    const out: RemoteFile[] = [];
    const seen = new Set<string>();
    for (const entry of entries) {
      if (entry[".tag"] !== "file") continue;
      const name = entry.name ?? baseName(entry.path_display ?? "");
      if (!isMarkdownName(name)) continue;
      if (!entry.path_display) continue;
      const relative = relativeToRoot(root.id, entry.path_display);
      if (relative === null) continue;
      const path = normalizeSyncPath(relative);
      if (!path) continue;
      if (seen.has(path)) {
        throw new SyncError("ambiguous", `duplicate remote path: ${path}`);
      }
      seen.add(path);
      out.push({
        path,
        id: entry.id ?? entry.path_lower ?? entry.path_display,
        rev: entry.rev ?? "",
        mtimeMs: entry.server_modified ? Date.parse(entry.server_modified) : 0,
        size: Number(entry.size ?? 0),
      });
    }
    return out;
  }

  async listFolders(_root: RemoteDir, dir: RemoteDir): Promise<RemoteDir[]> {
    const entries = await this.listFolder(dir.id, false);
    return entries
      .filter((entry) => entry[".tag"] === "folder" && entry.name && usableName(entry.name))
      .map((entry) => ({
        id: entry.path_display ?? joinDropboxPath(dir.id, entry.name!),
        path: joinPath(dir.path, entry.name!),
        name: entry.name!,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async createFolder(root: RemoteDir, parent: RemoteDir, name: string): Promise<RemoteDir> {
    if (!usableName(name)) throw new SyncError("ambiguous", `unsupported folder name: ${name}`);
    const path = joinPath(parent.path, name);
    const absolute = joinDropboxPath(parent.id, name);
    const created = await this.createFolderRaw(absolute);
    const id = created.path_display ?? absolute;
    this.folderCache.set(path, id);
    return { id, path, name };
  }

  async download(file: RemoteFile): Promise<string> {
    const response = await this.request(
      "https://content.dropboxapi.com/2/files/download",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "Dropbox-API-Arg": apiArgHeader({ path: file.id }),
        },
      },
    );
    const body = await response.text();
    if (!response.ok) throw dropboxError(response.status, body);
    return body;
  }

  async upload(
    root: RemoteDir,
    path: string,
    content: string,
    options: { existing: RemoteFile | null },
  ): Promise<RemoteFile> {
    const existing = options.existing;
    const absolute = joinDropboxPath(root.id, path);
    await this.ensureFolderPath(root, dirName(path));
    const mode = existing
      ? { ".tag": "update", update: existing.rev }
      : { ".tag": "add" };
    const response = await this.request(
      "https://content.dropboxapi.com/2/files/upload",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "Dropbox-API-Arg": apiArgHeader({
            path: absolute,
            mode,
            autorename: false,
            mute: true,
          }),
        },
        body: content,
      },
    );
    const body = await response.text();
    if (!response.ok) {
      const error = dropboxError(response.status, body);
      if (response.status === 409) throw new RemoteConflictError("remote file changed", path);
      throw error;
    }
    const metadata = JSON.parse(body) as DropboxMetadata;
    return toRemote(path, metadata);
  }

  async remove(file: RemoteFile): Promise<void> {
    const response = await this.request("https://api.dropboxapi.com/2/files/delete_v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: file.id }),
    });
    const body = await response.text();
    if (response.ok) return;
    if (response.status === 409 && body.includes("path_lookup/not_found")) return;
    throw dropboxError(response.status, body);
  }

  private async listFolder(path: string, recursive: boolean): Promise<DropboxEntry[]> {
    const out: DropboxEntry[] = [];
    let body: Record<string, unknown> = {
      path,
      recursive,
      include_deleted: false,
      limit: 2000,
    };
    let url = "https://api.dropboxapi.com/2/files/list_folder";
    while (true) {
      const page = await this.postJson<DropboxList>(url, body);
      out.push(...(page.entries ?? []));
      if (!page.has_more || !page.cursor) break;
      url = "https://api.dropboxapi.com/2/files/list_folder/continue";
      body = { cursor: page.cursor };
    }
    return out;
  }

  private async ensureFolderPath(root: RemoteDir, relDir: string): Promise<void> {
    const dir = normalizeSyncPath(relDir);
    if (!dir) return;
    const cached = this.folderCache.get(dir);
    if (cached) return;
    let prefix = "";
    for (const segment of dir.split("/")) {
      if (!usableName(segment)) {
        throw new SyncError("ambiguous", `unsupported folder name: ${segment}`);
      }
      prefix = joinPath(prefix, segment);
      const hit = this.folderCache.get(prefix);
      if (hit) continue;
      const absolute = joinDropboxPath(root.id, prefix);
      const created = await this.createFolderRaw(absolute);
      this.folderCache.set(prefix, created.path_display ?? absolute);
    }
  }

  private async createFolderRaw(path: string): Promise<DropboxMetadata> {
    const response = await this.request("https://api.dropboxapi.com/2/files/create_folder_v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, autorename: false }),
    });
    const body = await response.text();
    if (response.ok) {
      const parsed = JSON.parse(body) as { metadata?: DropboxMetadata };
      return parsed.metadata ?? {};
    }
    if (response.status === 409) {
      const meta = await this.metadata(path);
      if (meta?.[".tag"] === "folder") return meta;
      throw new RemoteConflictError("remote path is not a folder", path);
    }
    throw dropboxError(response.status, body);
  }

  private async metadata(path: string): Promise<DropboxMetadata | null> {
    const response = await this.request("https://api.dropboxapi.com/2/files/get_metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    const body = await response.text();
    if (response.status === 409 && body.includes("not_found")) return null;
    if (!response.ok) throw dropboxError(response.status, body);
    return JSON.parse(body) as DropboxMetadata;
  }

  private async postJson<T>(url: string, body: unknown): Promise<T> {
    const response = await this.request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    if (!response.ok) throw dropboxError(response.status, text);
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new SyncError("unknown", "invalid JSON from Dropbox");
    }
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    const token = await this.tokens.accessToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      ...(init.headers as Record<string, string> | undefined),
    };
    try {
      return await this.fetchImpl(url, { ...init, headers });
    } catch (err) {
      networkError(err);
    }
  }
}

/** HTTP 头只允许 ByteString：非 ASCII 文件名需在 JSON 里转成 \uXXXX。 */
function apiArgHeader(value: unknown): string {
  return JSON.stringify(value).replace(
    /[\u007f-\uffff]/g,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

function joinDropboxPath(root: string, rel: string): string {
  const base = root === "/" ? "" : root.replace(/\/+$/g, "");
  const child = normalizeSyncPath(rel);
  return `${base}/${child}`;
}

function dropboxError(status: number, body: string): SyncError {
  if (status === 409) {
    return new RemoteConflictError("dropbox conflict", body);
  }
  return providerStatusError(status, body);
}

function toRemote(path: string, metadata: DropboxMetadata): RemoteFile {
  return {
    path,
    id: metadata.id ?? metadata.path_lower ?? metadata.path_display ?? path,
    rev: metadata.rev ?? "",
    mtimeMs: metadata.server_modified ? Date.parse(metadata.server_modified) : 0,
    size: Number(metadata.size ?? 0),
  };
}
