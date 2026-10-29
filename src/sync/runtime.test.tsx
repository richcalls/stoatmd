import { expect, test } from "nsh/test";
import type { Vault } from "stoatmd/native";
import { sha256Hex } from "./hash";
import { buildLocalFiles, utf8Size } from "./runtime";
import { emptyBase } from "./types";

type Entry = {
  path: string;
  name: string;
  isDir: boolean;
  mtimeMs: number;
  size: number;
};

function fakeVault(entries: Entry[], content: (path: string) => string) {
  const state = { reads: [] as string[] };
  const vault = {
    listRecursive: (_dir: string) => entries,
    read: (path: string) => {
      state.reads.push(path);
      return { content: content(path), mtimeMs: 0 };
    },
  } as unknown as Vault;
  return { vault, state };
}

test("buildLocalFiles：mtime+size 未变的文件不读盘，直接用锚点哈希", () => {
  const entries: Entry[] = [
    { path: "a.md", name: "a.md", isDir: false, mtimeMs: 100, size: 3 },
    { path: "dir", name: "dir", isDir: true, mtimeMs: 1, size: 0 },
    { path: "dir/b.md", name: "dir/b.md", isDir: false, mtimeMs: 100, size: 3 },
    { path: "c.md", name: "c.md", isDir: false, mtimeMs: 200, size: 3 },
    { path: "skip.txt", name: "skip.txt", isDir: false, mtimeMs: 1, size: 1 },
  ];
  const { vault, state } = fakeVault(entries, () => "ccc");
  const base = emptyBase();
  base.entries["a.md"] = {
    path: "a.md",
    remoteId: "r1",
    remoteRev: "1",
    localMtimeMs: 100,
    localSize: 3,
    hash: "hash-a",
  };
  base.entries["dir/b.md"] = {
    path: "dir/b.md",
    remoteId: "r2",
    remoteRev: "1",
    localMtimeMs: 100,
    localSize: 3,
    hash: "hash-b",
  };

  const files = buildLocalFiles(vault, base);
  expect(files.map((f) => f.path).sort()).toEqual(["a.md", "c.md", "dir/b.md"]);
  expect(files.find((f) => f.path === "a.md")?.hash).toBe(null);
  expect(files.find((f) => f.path === "dir/b.md")?.hash).toBe(null);
  expect(files.find((f) => f.path === "c.md")?.hash).toBe(sha256Hex("ccc"));
  expect(state.reads).toEqual(["c.md"]);
});

test("buildLocalFiles：内容变了但 mtime 也变时重新哈希", () => {
  const entries: Entry[] = [
    { path: "a.md", name: "a.md", isDir: false, mtimeMs: 300, size: 3 },
  ];
  const { vault, state } = fakeVault(entries, () => "new");
  const base = emptyBase();
  base.entries["a.md"] = {
    path: "a.md",
    remoteId: "r1",
    remoteRev: "1",
    localMtimeMs: 100,
    localSize: 3,
    hash: "old",
  };
  const files = buildLocalFiles(vault, base);
  expect(state.reads).toEqual(["a.md"]);
  expect(files[0]?.hash).toBe(sha256Hex("new"));
});

test("utf8Size：按 UTF-8 字节计数", () => {
  expect(utf8Size("abc")).toBe(3);
  expect(utf8Size("价格")).toBe(6);
  expect(utf8Size("café")).toBe(5);
});
