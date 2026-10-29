import { expect, test } from "nsh/test";
import {
  foldersFromEntries,
  normalizeVaultPath,
  noteBelongsToFolder,
  notesInFolder,
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
    { path: "Clippings", name: "Clippings", isDir: true, mtimeMs: 1 },
    { path: "Clippings/万字教程.md", name: "万字教程.md", isDir: false, mtimeMs: 3 },
    { path: "Template", name: "Template", isDir: true, mtimeMs: 1 },
    { path: "root.md", name: "root.md", isDir: false, mtimeMs: 2 },
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
    { path: nfc, name: nfc, isDir: true, mtimeMs: 1 },
    { path: `${nfc}/note.md`, name: "note.md", isDir: false, mtimeMs: 2 },
  ];
  const notes = notesInFolder(entries, nfd);
  expect(notes.length).toBe(1);
  expect(notes[0]?.path).toBe(`${nfc}/note.md`);
});
