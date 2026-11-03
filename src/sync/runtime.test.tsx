import { expect, test } from "nsh/test";
import type { Vault } from "stoatmd/native";
import { sha256Bytes, sha256Hex } from "./hash";
import { assertLocalUnchanged, buildLocalFiles, utf8Size } from "./runtime";
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

test("buildLocalFiles：同步根配置和附件，跳过应用草稿目录", () => {
  const entries: Entry[] = [
    { path: "note.md", name: "note.md", isDir: false, mtimeMs: 10, size: 4 },
    { path: "image.png", name: "image.png", isDir: false, mtimeMs: 11, size: 5 },
    { path: ".stoatmd.json", name: ".stoatmd.json", isDir: false, mtimeMs: 12, size: 2 },
    { path: ".stoatmd", name: ".stoatmd", isDir: true, mtimeMs: 1, size: 0 },
    { path: ".stoatmd/draft.json", name: "draft.json", isDir: false, mtimeMs: 13, size: 5 },
  ];
  const bytes: Record<string, string> = {
    "note.md": "note",
    "image.png": "image",
    ".stoatmd.json": "{}",
    ".stoatmd/draft.json": "draft",
  };
  const vault = {
    inventory: () => entries,
    mtime: (path: string) => entries.find(entry => entry.path === path)?.mtimeMs ?? 0,
    readBytes: (path: string) => new TextEncoder().encode(bytes[path]),
  } as unknown as Vault;

  const files = buildLocalFiles(vault, emptyBase(), true);
  expect(files.map(file => file.path).sort()).toEqual([".stoatmd.json", "image.png", "note.md"]);
  expect(files.find(file => file.path === ".stoatmd.json")?.hash).toBe(sha256Bytes(new TextEncoder().encode("{}")));
});

test("utf8Size：按 UTF-8 字节计数", () => {
  expect(utf8Size("abc")).toBe(3);
  expect(utf8Size("价格")).toBe(6);
  expect(utf8Size("café")).toBe(5);
});

function vaultWithMtime(files: Record<string, number>): Vault {
  return {
    mtime: (path: string) => {
      const mtime = files[path];
      if (mtime === undefined) throw new Error("not found");
      return mtime;
    },
  } as unknown as Vault;
}

test("assertLocalUnchanged：下载新文件前本地突然出现同名文件时报冲突", () => {
  const vault = vaultWithMtime({ "new.md": 5 });
  expect(() => assertLocalUnchanged(vault, "new.md", null)).toThrow("appeared");
});

test("assertLocalUnchanged：本地不存在可安全写入；mtime 变了拒绝覆盖", () => {
  const empty = vaultWithMtime({});
  assertLocalUnchanged(empty, "new.md", null);

  const disk = vaultWithMtime({ "a.md": 2 });
  expect(() =>
    assertLocalUnchanged(disk, "a.md", { path: "a.md", mtimeMs: 1, size: 3, hash: null }),
  ).toThrow("changed");
  assertLocalUnchanged(disk, "a.md", { path: "a.md", mtimeMs: 2, size: 3, hash: null });
});
