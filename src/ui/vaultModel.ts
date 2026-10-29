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
  /** 相对当前所选文件夹的展示路径（用于嵌套笔记副标题）。 */
  relativePath?: string;
};

/** 把递归扫描到的目录变成侧栏节点（按路径排序）；始终带「根目录」。 */
export function foldersFromEntries(entries: VaultEntryDto[]): FolderNode[] {
  const dirs = entries
    .filter((e) => e.isDir)
    .map((e) => ({
      id: e.path,
      name: e.name,
      path: e.path,
      depth: e.path.split("/").filter(Boolean).length,
    }))
    .sort((a, b) => a.path.localeCompare(b.path, undefined, { sensitivity: "base" }));
  return [{ id: "", name: "", path: "", depth: 0 }, ...dirs];
}

/** 当前目录（含嵌套子目录）下的 `.md` 笔记。 */
export function notesFromEntries(entries: VaultEntryDto[], folderId = ""): NoteItem[] {
  return entries
    .filter((e) => !e.isDir)
    .map((e) => {
      const relative =
        folderId && e.path.startsWith(folderId + "/")
          ? e.path.slice(folderId.length + 1)
          : e.path;
      return {
        id: e.path,
        path: e.path,
        title: titleFromName(e.name),
        mtimeMs: e.mtimeMs,
        relativePath: relative.includes("/") ? relative : undefined,
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs || a.path.localeCompare(b.path));
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
  const names = new Set(
    existing
      .filter((n) => {
        if (!dir) return !n.path.includes("/");
        const parent = n.path.slice(0, Math.max(0, n.path.lastIndexOf("/")));
        return parent === dir;
      })
      .map((n) => n.path.split("/").pop()!.toLowerCase()),
  );
  let i = 1;
  while (true) {
    const file = i === 1 ? "untitled.md" : `untitled-${i}.md`;
    if (!names.has(file.toLowerCase())) {
      return dir ? `${dir}/${file}` : file;
    }
    i += 1;
  }
}

export function formatWhen(mtimeMs: number, locale: string): string {
  if (!mtimeMs) return "";
  const d = new Date(mtimeMs);
  const now = new Date();
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
    path,
    content: file.content,
    mtimeMs: file.mtimeMs,
    dirty: false,
  };
}
