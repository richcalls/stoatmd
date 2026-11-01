import { expect, test } from "nsh/test";
import type { VaultEntryDto } from "stoatmd/native";
import { flattenTree } from "./libraryTree";

function entry(path: string, isDir = false, mtimeMs = 0): VaultEntryDto {
  const name = path.split("/").pop()!;
  return { path, name, isDir, size: 0, mtimeMs };
}

const entries: VaultEntryDto[] = [
  entry("笔记.md", false, 30),
  entry("随笔", true),
  entry("随笔/写作.md", false, 20),
  entry("随笔/散步.md", false, 10),
  entry("随笔/草稿", true),
  entry("随笔/草稿/未命名.md", false, 5),
  entry("产品", true),
  entry("产品/一个轻盈的笔记本.md", false, 8),
  entry(".stoatmd-trash", true),
  entry(".stoatmd-trash/旧笔记.md", false, 1),
];

test("全部 Tab：默认只展开根层，文件夹排在文件前，文件夹显示直属笔记数", () => {
  const rows = flattenTree(entries, new Set());
  expect(rows.map(row => `${row.kind}:${row.path}@${row.depth}`)).toEqual([
    "folder:产品@0",
    "folder:随笔@0",
    "note:笔记.md@0",
  ]);
  expect(rows.find(row => row.path === "随笔")?.count).toBe(2);
});

test("全部 Tab：展开文件夹后按层级插入子项，隐藏目录不出现", () => {
  const rows = flattenTree(entries, new Set(["随笔"]));
  expect(rows.map(row => `${row.path}@${row.depth}`)).toEqual([
    "产品@0",
    "随笔@0",
    "随笔/草稿@1",
    "随笔/写作.md@1",
    "随笔/散步.md@1",
    "笔记.md@0",
  ]);
  expect(rows.some(row => row.path.startsWith(".stoatmd-trash"))).toBe(false);
});

test("全部 Tab：展开嵌套文件夹时继续缩进", () => {
  const rows = flattenTree(entries, new Set(["随笔", "随笔/草稿"]));
  expect(rows.map(row => `${row.path}@${row.depth}`)).toEqual([
    "产品@0",
    "随笔@0",
    "随笔/草稿@1",
    "随笔/草稿/未命名.md@2",
    "随笔/写作.md@1",
    "随笔/散步.md@1",
    "笔记.md@0",
  ]);
});
