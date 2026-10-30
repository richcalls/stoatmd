import { expect, test } from "nsh/test";
import {
  foldersFromEntries,
  libraryRows,
  normalizeVaultPath,
  noteBelongsToFolder,
  notesInFolder,
  type FolderNode,
  type NoteItem,
} from "./vaultModel";

test("normalizeVaultPath：反斜杠与首尾斜杠归一，并做 NFC", () => {
  const nfd = "价格".normalize("NFD");
  const nfc = "价格".normalize("NFC");
  expect(normalizeVaultPath(`\\${nfd}\\a.md\\`)).toBe(`${nfc}/a.md`);
});

test("noteBelongsToFolder：根目录收全部；子目录做 NFC 前缀匹配", () => {
  const nfdFolder = "Clippings".normalize("NFD"); // ASCII 无差异，但走同一路径
  expect(noteBelongsToFolder("Clippings/万字教程.md", "")).toBe(true);
  expect(noteBelongsToFolder("Clippings/万字教程.md", "Clippings")).toBe(true);
  expect(noteBelongsToFolder("Clippings/万字教程.md", nfdFolder)).toBe(true);
  expect(noteBelongsToFolder("other/a.md", "Clippings")).toBe(false);

  const nfd = "价格行为学".normalize("NFD");
  const nfc = "价格行为学".normalize("NFC");
  expect(nfd !== nfc || nfd === nfc).toBe(true); // 允许平台上两者相同
  expect(noteBelongsToFolder(`${nfd}/note.md`, nfc)).toBe(true);
  expect(noteBelongsToFolder(`${nfc}/note.md`, nfd)).toBe(true);
});

test("notesInFolder：从全库条目筛 Clippings，根目录列出全部笔记", () => {
  const entries = [
    { path: "Clippings", name: "Clippings", isDir: true, mtimeMs: 1, size: 0 },
    { path: "Clippings/万字教程.md", name: "万字教程.md", isDir: false, mtimeMs: 3, size: 10 },
    { path: "Template", name: "Template", isDir: true, mtimeMs: 1, size: 0 },
    { path: "root.md", name: "root.md", isDir: false, mtimeMs: 2, size: 10 },
  ];

  const folders = foldersFromEntries(entries);
  expect(folders.some((f) => f.id === "Clippings")).toBe(true);

  const inClippings = notesInFolder(entries, "Clippings");
  expect(inClippings.map((n) => n.path)).toEqual(["Clippings/万字教程.md"]);
  expect(inClippings[0]?.title).toBe("万字教程");

  const atRoot = notesInFolder(entries, "");
  expect(atRoot.map((n) => n.path).sort()).toEqual(
    ["Clippings/万字教程.md", "root.md"].sort(),
  );
});

test("notesInFolder：NFD 文件夹 id 仍能匹配 NFC 笔记路径（复现 Mac 空列表）", () => {
  const nfd = "价格行为学".normalize("NFD");
  const nfc = "价格行为学".normalize("NFC");
  const entries = [
    { path: nfc, name: nfc, isDir: true, mtimeMs: 1, size: 0 },
    { path: `${nfc}/note.md`, name: "note.md", isDir: false, mtimeMs: 2, size: 10 },
  ];
  const notes = notesInFolder(entries, nfd);
  expect(notes.length).toBe(1);
  expect(notes[0]?.path).toBe(`${nfc}/note.md`);
});

const TREE_FOLDERS: FolderNode[] = [
  { id: "", name: "", path: "", depth: 0 },
  { id: "Diary", name: "日记", path: "Diary", depth: 1 },
  { id: "Projects", name: "项目", path: "Projects", depth: 1 },
  { id: "Projects/Stoat", name: "水獭", path: "Projects/Stoat", depth: 2 },
];

const TREE_NOTES: NoteItem[] = [
  { id: "Diary/今天.md", path: "Diary/今天.md", title: "今天", mtimeMs: 1 },
  { id: "Projects/Stoat/计划.md", path: "Projects/Stoat/计划.md", title: "计划", mtimeMs: 2 },
  { id: "root.md", path: "root.md", title: "根级笔记", mtimeMs: 3 },
];

test("libraryRows：文件夹在前、笔记嵌套，根目录笔记深度为 0", () => {
  const rows = libraryRows(TREE_FOLDERS, TREE_NOTES, [], "");
  expect(rows.map((r) => `${r.kind}:${r.id}:${r.depth}`)).toEqual([
    "folder:Diary:0",
    "note:Diary/今天.md:1",
    "folder:Projects:0",
    "folder:Projects/Stoat:1",
    "note:Projects/Stoat/计划.md:2",
    "note:root.md:0",
  ]);
});

test("libraryRows：折叠文件夹会隐藏子孙，其他分支不受影响", () => {
  const rows = libraryRows(TREE_FOLDERS, TREE_NOTES, ["Projects"], "");
  expect(rows.some((r) => r.id === "Projects/Stoat")).toBe(false);
  expect(rows.some((r) => r.id === "Diary/今天.md")).toBe(true);
  const folder = rows.find((r) => r.kind === "folder" && r.id === "Projects");
  expect(folder && folder.kind === "folder" && folder.collapsed).toBe(true);
});

test("libraryRows：搜索忽略折叠，平铺匹配笔记并带父文件夹名", () => {
  const rows = libraryRows(TREE_FOLDERS, TREE_NOTES, ["Projects"], "计划", "我的库");
  expect(rows).toEqual([
    { kind: "note", id: "Projects/Stoat/计划.md", title: "计划", depth: 0, hint: "水獭" },
  ]);

  const rootHit = libraryRows(TREE_FOLDERS, TREE_NOTES, [], "根级", "我的库");
  expect(rootHit[0]?.kind === "note" && rootHit[0].hint).toBe("我的库");
});
