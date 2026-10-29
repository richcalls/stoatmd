import type { Vault, VaultEntryDto, VaultFileDto } from "stoatmd/native";

export type FolderNode = {
  id: string;
  name: string;
  path: string;
};

export type NoteItem = {
  id: string;
  path: string;
  title: string;
  mtimeMs: number;
};

/** 把库根下的目录变成侧栏节点；始终带「根目录」。 */
export function foldersFromEntries(entries: VaultEntryDto[]): FolderNode[] {
  const dirs = entries
    .filter((e) => e.isDir)
    .map((e) => ({ id: e.path, name: e.name, path: e.path }));
  return [{ id: "", name: "", path: "" }, ...dirs];
}

/** 当前目录下的 `.md` 笔记。 */
export function notesFromEntries(entries: VaultEntryDto[]): NoteItem[] {
  return entries
    .filter((e) => !e.isDir)
    .map((e) => ({
      id: e.path,
      path: e.path,
      title: titleFromName(e.name),
      mtimeMs: e.mtimeMs,
    }));
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
  const names = new Set(existing.map((n) => n.path.split("/").pop()!.toLowerCase()));
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
