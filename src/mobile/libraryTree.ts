import type { VaultEntryDto } from "stoatmd/native";
import { titleFromName } from "../ui/vaultModel";

export type TreeRow = {
  key: string;
  kind: "folder" | "note";
  path: string;
  name: string;
  title: string;
  depth: number;
  /** 文件夹直属的 Markdown 笔记数。 */
  count: number;
  mtimeMs: number;
  /** 文件夹是否展开。 */
  expanded: boolean;
};

type Node = {
  entry: VaultEntryDto;
  children: Node[];
};

const isNote = (entry: VaultEntryDto) => !entry.isDir && /\.(md|markdown)$/i.test(entry.name);

/** 隐藏目录（回收站、.obsidian 等）不进入文件树。 */
const visible = (entry: VaultEntryDto) => !entry.path.split("/").some(part => part.startsWith("."));

function build(entries: VaultEntryDto[]): Node[] {
  const byPath = new Map<string, Node>();
  for (const entry of entries) {
    if (!visible(entry) || (!entry.isDir && !isNote(entry))) continue;
    byPath.set(entry.path, { entry, children: [] });
  }
  const roots: Node[] = [];
  const sorted = Array.from(byPath.values()).sort((a, b) =>
    a.entry.path.localeCompare(b.entry.path, undefined, { numeric: true }));
  for (const node of sorted) {
    const parent = node.entry.path.includes("/")
      ? byPath.get(node.entry.path.split("/").slice(0, -1).join("/"))
      : undefined;
    (parent?.children ?? roots).push(node);
  }
  return roots;
}

function compare(a: Node, b: Node): number {
  if (a.entry.isDir !== b.entry.isDir) return a.entry.isDir ? -1 : 1;
  return a.entry.name.localeCompare(b.entry.name, undefined, { numeric: true, sensitivity: "base" });
}

/** 「全部」Tab 的可嵌套文件树；只展开 `expanded` 里的文件夹。 */
export function flattenTree(entries: VaultEntryDto[], expanded: ReadonlySet<string>): TreeRow[] {
  const rows: TreeRow[] = [];
  const walk = (nodes: Node[], depth: number) => {
    for (const node of nodes.slice().sort(compare)) {
      const entry = node.entry;
      if (entry.isDir) {
        const count = node.children.filter(child => !child.entry.isDir).length;
        const open = expanded.has(entry.path);
        rows.push({
          key: `folder:${entry.path}`,
          kind: "folder",
          path: entry.path,
          name: entry.name,
          title: entry.name,
          depth,
          count,
          mtimeMs: entry.mtimeMs,
          expanded: open,
        });
        if (open) walk(node.children, depth + 1);
      } else {
        rows.push({
          key: `note:${entry.path}`,
          kind: "note",
          path: entry.path,
          name: entry.name,
          title: titleFromName(entry.name.normalize("NFC")),
          depth,
          count: 0,
          mtimeMs: entry.mtimeMs,
          expanded: false,
        });
      }
    }
  };
  walk(build(entries), 0);
  return rows;
}
