import { normalizeVaultPath } from "../ui/vaultModel";

/** 同步路径统一成 NFC + POSIX 分隔，并去掉首尾斜杠。 */
export function normalizeSyncPath(path: string): string {
  return normalizeVaultPath(path);
}

export function dirName(path: string): string {
  const normalized = normalizeSyncPath(path);
  const slash = normalized.lastIndexOf("/");
  return slash < 0 ? "" : normalized.slice(0, slash);
}

export function baseName(path: string): string {
  const normalized = normalizeSyncPath(path);
  const slash = normalized.lastIndexOf("/");
  return slash < 0 ? normalized : normalized.slice(slash + 1);
}

export function joinPath(dir: string, name: string): string {
  const left = normalizeSyncPath(dir);
  const right = normalizeSyncPath(name);
  if (!left) return right;
  if (!right) return left;
  return `${left}/${right}`;
}

export function isMarkdownName(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith(".md") || lower.endsWith(".markdown");
}

/** 云端名字直接拼路径前必须排除分隔符与相对段。 */
export function usableName(name: string): boolean {
  if (!name || name === "." || name === "..") return false;
  if (name.includes("/") || name.includes("\\")) return false;
  return !/[\u0000-\u001f\u007f]/.test(name);
}

/** 把绝对路径（Dropbox `/StoatMD/notes/a.md`）转成库内相对路径。 */
export function relativeToRoot(rootPath: string, absolute: string): string | null {
  const root = normalizeSyncPath(rootPath);
  const full = normalizeSyncPath(absolute);
  if (!root) return full;
  if (full === root) return "";
  if (!full.startsWith(root + "/")) return null;
  return full.slice(root.length + 1);
}
