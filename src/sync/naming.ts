/** 冲突副本命名按产品定稿：`原名 (云端冲突 yyyy-mm-dd).md`。 */
export function conflictCopyPath(path: string, now: number): string {
  const date = formatDate(now);
  return appendSuffix(path, ` (云端冲突 ${date})`);
}

/** 同名副本已存在时补序号：`… (云端冲突 2026-10-29 2).md`。 */
export function uniqueConflictCopyPath(
  path: string,
  now: number,
  exists: (candidate: string) => boolean,
): string {
  const date = formatDate(now);
  for (let i = 1; i < 1000; i += 1) {
    const suffix = i === 1 ? ` (云端冲突 ${date})` : ` (云端冲突 ${date} ${i})`;
    const candidate = appendSuffix(path, suffix);
    if (!exists(candidate)) return candidate;
  }
  return appendSuffix(path, ` (云端冲突 ${date} ${Date.now()})`);
}

function appendSuffix(path: string, suffix: string): string {
  const slash = path.lastIndexOf("/");
  const dir = slash >= 0 ? path.slice(0, slash + 1) : "";
  const name = slash >= 0 ? path.slice(slash + 1) : path;
  const dot = name.toLowerCase().endsWith(".markdown")
    ? name.length - ".markdown".length
    : name.toLowerCase().endsWith(".md")
      ? name.length - 3
      : name.length;
  return `${dir}${name.slice(0, dot)}${suffix}${name.slice(dot)}`;
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}
