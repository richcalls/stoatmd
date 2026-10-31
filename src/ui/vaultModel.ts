import type { Vault, VaultEntryDto, VaultFileDto } from "stoatmd/native";

import { intlTag, translate, type Locale } from "./i18n";

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
  contentMatches: readonly string[] = [],
  currentNote?: { path: string; content: string },
): LibraryRow[] {
  const folderMap = new Map<string, FolderNode>();
  for (const f of folders) folderMap.set(normalizeVaultPath(f.id), f);
  if (!folderMap.has("")) {
    folderMap.set("", { id: "", name: "", path: "", depth: 0 });
  }

  const q = query.trim().normalize("NFC").toLowerCase();
  if (q) {
    const matches = new Set(contentMatches.map(normalizeVaultPath));
    // 当前编辑正文优先，搜索随预览更新，覆盖自动保存前的增删。
    if (currentNote) {
      const path = normalizeVaultPath(currentNote.path);
      matches.delete(path);
      if (currentNote.content.normalize("NFC").toLowerCase().includes(q)) matches.add(path);
    }
    return notes
      .filter(
        (n) => n.title.normalize("NFC").toLowerCase().includes(q)
          || n.path.normalize("NFC").toLowerCase().includes(q)
          || matches.has(normalizeVaultPath(n.id)),
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

function noteExtension(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".markdown")) return name.slice(-9);
  if (lower.endsWith(".md")) return name.slice(-3);
  return ".md";
}

export type RenameResult =
  | { ok: true; path: string }
  | { ok: false; error: "empty" | "invalid" };

/** 校验重命名输入并返回新的库内路径；省略扩展名时沿用原笔记的扩展名。 */
export function renamedNotePath(from: string, input: string): RenameResult {
  const source = normalizeVaultPath(from);
  const name = source.split("/").pop() ?? source;
  const raw = input.trim();
  if (!raw) return { ok: false, error: "empty" };
  if (
    raw === "." ||
    raw === ".." ||
    raw.startsWith(".") ||
    raw.includes("/") ||
    raw.includes("\\") ||
    raw.includes("\0")
  ) {
    return { ok: false, error: "invalid" };
  }
  const ext = noteExtension(name);
  const next = /\.(md|markdown)$/i.test(raw) ? raw : raw + ext;
  const dir = parentDir(source);
  return { ok: true, path: normalizeVaultPath(dir ? `${dir}/${next}` : next) };
}

/** 生成同一目录下不冲突的副本路径（大小写不敏感，冲突时递增序号）。 */
export function duplicateNotePath(
  source: string,
  existing: string[],
  suffix: string,
): string {
  const src = normalizeVaultPath(source);
  const name = src.split("/").pop() ?? src;
  const ext = noteExtension(name);
  const stem = name.slice(0, name.length - ext.length);
  const base = `${stem} ${suffix.trim() || "copy"}`;
  const dir = parentDir(src);
  const taken = new Set(existing.map((path) => normalizeVaultPath(path).toLowerCase()));
  let candidate = `${base}${ext}`;
  let i = 2;
  while (taken.has((dir ? `${dir}/${candidate}` : candidate).toLowerCase())) {
    candidate = `${base} ${i}${ext}`;
    i += 1;
  }
  return dir ? `${dir}/${candidate}` : candidate;
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

export function formatWhen(mtimeMs: number, locale: Locale): string {
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

function formatWhenUncached(mtimeMs: number, locale: Locale, now: Date): string {
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

  const tag = intlTag(locale);
  const time = d.toLocaleTimeString(tag, {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (sameDay) {
    return translate(locale, "time.today", { time });
  }
  if (isYesterday) {
    return translate(locale, "time.yesterday", { time });
  }
  return d.toLocaleDateString(tag, {
    month: "short",
    day: "numeric",
  });
}

export type OpenedNote = {
  path: string;
  content: string;
  mtimeMs: number;
  createdMs: number;
  dirty: boolean;
};

export async function readNote(vault: Vault, path: string): Promise<OpenedNote> {
  const file: VaultFileDto = vault.read(path);
  return {
    path: normalizeVaultPath(path),
    content: file.content,
    mtimeMs: file.mtimeMs,
    createdMs: file.createdMs,
    dirty: false,
  };
}

/** 库根显示名（路径最后一段）；为空时由调用方给本地化占位。 */
export function vaultNameFromRoot(root: string | null): string {
  return (root ?? "").split(/[\\/]/).filter(Boolean).pop() ?? "";
}

/** 文件时间（日期 + 时间）；未知（0）返回空串。 */
export function formatDateTime(ms: number, locale: Locale): string {
  if (!ms) return "";
  const date = new Date(ms);
  const tag = intlTag(locale);
  const day = date.toLocaleDateString(tag, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const time = date.toLocaleTimeString(tag, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day} ${time}`;
}
