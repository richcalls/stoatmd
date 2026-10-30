import type { Vault, VaultEntryDto, VaultFileDto } from "stoatmd/native";

export type FolderNode = {
  id: string;
  name: string;
  path: string;
  /** 相对库根的嵌套深度（根目录为 0）。 */
  depth: number;
};

export type NoteItem = {
  id: string;
  path: string;
  title: string;
  mtimeMs: number;
};

export type LibraryRow =
  | { kind: "folder"; id: string; name: string; depth: number; collapsed: boolean }
  | { kind: "note"; id: string; title: string; depth: number; hint: string };

function parentDir(path: string): string {
  const i = path.lastIndexOf("/");
  return i <= 0 ? "" : path.slice(0, i);
}

/**
 * 统一库内路径：NFC（对齐 macOS NFD 磁盘名）+ `/` 分隔 + 去首尾斜杠。
 * 侧栏选中 id 与 listRecursive 返回的 path 都必须经此再比较。
 */
export function normalizeVaultPath(path: string): string {
  return path
    .normalize("NFC")
    .replace(/\\/g, "/")
    .replace(/^\/+/g, "")
    .replace(/\/+$/g, "");
}

/** 笔记是否属于所选文件夹（根目录 `""` 表示整库）。 */
export function noteBelongsToFolder(notePath: string, folderId: string): boolean {
  const note = normalizeVaultPath(notePath);
  const folder = normalizeVaultPath(folderId);
  if (!folder) return true;
  return note === folder || note.startsWith(folder + "/");
}

/** 把递归扫描到的目录变成侧栏节点（按路径排序）；始终带「根目录」。 */
export function foldersFromEntries(entries: VaultEntryDto[]): FolderNode[] {
  const dirs = entries
    .filter((e) => e.isDir === true)
    .map((e) => {
      const path = normalizeVaultPath(e.path);
      return {
        id: path,
        name: e.name.normalize("NFC"),
        path,
        depth: path.split("/").filter(Boolean).length,
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path, undefined, { sensitivity: "base" }));
  return [{ id: "", name: "", path: "", depth: 0 }, ...dirs];
}

/**
 * 文件树行：子文件夹在前、笔记在后；折叠的文件夹跳过其子孙。
 * 有搜索词时忽略折叠，直接平铺匹配的笔记，并带上所在文件夹名。
 */
export function libraryRows(
  folders: FolderNode[],
  notes: NoteItem[],
  collapsed: string[],
  query: string,
  rootName = "",
): LibraryRow[] {
  const folderMap = new Map<string, FolderNode>();
  for (const f of folders) folderMap.set(normalizeVaultPath(f.id), f);
  if (!folderMap.has("")) {
    folderMap.set("", { id: "", name: "", path: "", depth: 0 });
  }

  const q = query.trim().toLowerCase();
  if (q) {
    return notes
      .filter(
        (n) => n.title.toLowerCase().includes(q) || n.path.toLowerCase().includes(q),
      )
      .map((n) => ({
        kind: "note" as const,
        id: n.id,
        title: n.title,
        depth: 0,
        hint: folderMap.get(parentDir(normalizeVaultPath(n.id)))?.name || rootName,
      }));
  }

  const children = new Map<string, FolderNode[]>();
  const notesByParent = new Map<string, NoteItem[]>();
  for (const id of folderMap.keys()) {
    children.set(id, []);
    notesByParent.set(id, []);
  }
  for (const f of folderMap.values()) {
    if (!f.id) continue;
    const siblings = children.get(parentDir(f.id)) ?? children.get("")!;
    siblings.push(f);
  }
  for (const siblings of children.values()) {
    siblings.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }
  for (const n of notes) {
    const files = notesByParent.get(parentDir(n.id)) ?? notesByParent.get("")!;
    files.push(n);
  }

  const closed = new Set(collapsed.map(normalizeVaultPath));
  const rows: LibraryRow[] = [];
  const walk = (id: string, depth: number) => {
    for (const f of children.get(id) ?? []) {
      rows.push({ kind: "folder", id: f.id, name: f.name, depth, collapsed: closed.has(f.id) });
      if (!closed.has(f.id)) walk(f.id, depth + 1);
    }
    for (const n of notesByParent.get(id) ?? []) {
      rows.push({ kind: "note", id: n.id, title: n.title, depth, hint: "" });
    }
  };
  walk("", 0);
  return rows;
}

/**
 * 从全库递归条目中筛出当前文件夹（含嵌套）下的 `.md`。
 * 不依赖 listRecursive(子目录) 的路径解析，避免 NFD/分隔符导致空列表。
 */
export function notesInFolder(entries: VaultEntryDto[], folderId = ""): NoteItem[] {
  const folder = normalizeVaultPath(folderId);
  return entries
    .filter((e) => e.isDir !== true)
    .filter((e) => noteBelongsToFolder(e.path, folder))
    .map((e) => {
      const path = normalizeVaultPath(e.path);
      return {
        id: path,
        path,
        title: titleFromName(e.name.normalize("NFC")),
        mtimeMs: e.mtimeMs,
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs || a.path.localeCompare(b.path));
}

/** @deprecated 使用 notesInFolder；保留别名以免外部调用方断裂。 */
export function notesFromEntries(entries: VaultEntryDto[], folderId = ""): NoteItem[] {
  return notesInFolder(entries, folderId);
}

export function titleFromName(name: string): string {
  return name.replace(/\.(md|markdown)$/i, "") || name;
}

export function titleFromContent(content: string, fallback: string): string {
  const line = content.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  const heading = line.replace(/^#+\s*/, "").trim();
  return heading || fallback;
}

/** 在目录内生成不冲突的新文件名。 */
export function nextUntitledPath(dir: string, existing: NoteItem[]): string {
  const folder = normalizeVaultPath(dir);
  const names = new Set(
    existing
      .filter((n) => {
        const parent = normalizeVaultPath(
          n.path.slice(0, Math.max(0, n.path.lastIndexOf("/"))),
        );
        return parent === folder;
      })
      .map((n) => n.path.split("/").pop()!.toLowerCase()),
  );
  let i = 1;
  while (true) {
    const file = i === 1 ? "untitled.md" : `untitled-${i}.md`;
    if (!names.has(file.toLowerCase())) {
      return folder ? `${folder}/${file}` : file;
    }
    i += 1;
  }
}

const whenCache = new Map<string, string>();
let whenCacheDay = "";

export function formatWhen(mtimeMs: number, locale: string): string {
  if (!mtimeMs) return "";
  const now = new Date();
  // 列表滚动时每行都会调用：按「日期 + 语言 + mtime」缓存，跨天后整体失效
  const day = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  if (day !== whenCacheDay) {
    whenCacheDay = day;
    whenCache.clear();
  }
  const key = `${locale}|${mtimeMs}`;
  const cached = whenCache.get(key);
  if (cached !== undefined) return cached;
  const formatted = formatWhenUncached(mtimeMs, locale, now);
  if (whenCache.size >= 2048) whenCache.clear();
  whenCache.set(key, formatted);
  return formatted;
}

function formatWhenUncached(mtimeMs: number, locale: string, now: Date): string {
  const d = new Date(mtimeMs);
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();

  const time = d.toLocaleTimeString(locale === "en" ? "en-US" : "zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (sameDay) {
    return locale === "en" ? `Today ${time}` : `今天 ${time}`;
  }
  if (isYesterday) {
    return locale === "en" ? `Yesterday ${time}` : `昨天 ${time}`;
  }
  return d.toLocaleDateString(locale === "en" ? "en-US" : "zh-CN", {
    month: "short",
    day: "numeric",
  });
}

export type OpenedNote = {
  path: string;
  content: string;
  mtimeMs: number;
  dirty: boolean;
};

export async function readNote(vault: Vault, path: string): Promise<OpenedNote> {
  const file: VaultFileDto = vault.read(path);
  return {
    path: normalizeVaultPath(path),
    content: file.content,
    mtimeMs: file.mtimeMs,
    dirty: false,
  };
}
