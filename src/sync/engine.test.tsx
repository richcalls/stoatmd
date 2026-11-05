import { expect, test } from "nsh/test";
import {
  effectiveLocalHash,
  planSync,
  probeCandidates,
  resolveConflict,
} from "./engine";
import { conflictCopyPath, uniqueConflictCopyPath } from "./naming";
import { emptyBase, planIsQuiet, type BaseEntry, type BaseState, type LocalFile, type RemoteFile } from "./types";

const NOW = new Date(2026, 9, 29, 12, 0, 0).getTime();

function baseOf(entries: BaseEntry[]): BaseState {
  return {
    version: 1,
    savedAt: NOW,
    entries: Object.fromEntries(entries.map((entry) => [entry.path, entry])),
  };
}

function anchor(
  path: string,
  hash = "h1",
  mtime = 1000,
  size = 10,
  rev = "r1",
): BaseEntry {
  return {
    path,
    remoteId: `id-${path}`,
    remoteRev: rev,
    localMtimeMs: mtime,
    localSize: size,
    hash,
  };
}

function local(path: string, hash: string | null = "h1", mtime = 1000, size = 10): LocalFile {
  return { path, hash, mtimeMs: mtime, size };
}

function remote(path: string, rev = "r1", mtime = 2000, size = 10): RemoteFile {
  return { path, id: `id-${path}`, rev, mtimeMs: mtime, size };
}

test("同步引擎：空库没有动作", () => {
  const plan = planSync({ base: emptyBase(), local: [], remote: [] });
  expect(planIsQuiet(plan)).toBe(true);
});

test("同步引擎：新文件按所在侧上传或下载", () => {
  const plan = planSync({
    base: emptyBase(),
    local: [local("本地.md")],
    remote: [remote("云端.md")],
  });
  expect(plan.uploads.map((row) => row.path)).toEqual(["本地.md"]);
  expect(plan.downloads.map((row) => row.path)).toEqual(["云端.md"]);
});

test("同步引擎：锚点未变不产生动作；单边改走单边传输", () => {
  const base = baseOf([anchor("a.md")]);
  expect(planIsQuiet(planSync({ base, local: [local("a.md")], remote: [remote("a.md")] }))).toBe(
    true,
  );
  expect(
    planSync({ base, local: [local("a.md", "h2", 3000)], remote: [remote("a.md")] }).uploads.map(
      (row) => row.path,
    ),
  ).toEqual(["a.md"]);
  expect(
    planSync({ base, local: [local("a.md")], remote: [remote("a.md", "r2")] }).downloads.map(
      (row) => row.path,
    ),
  ).toEqual(["a.md"]);
});

test("同步引擎：两边都改且内容相同则收敛，不传输", () => {
  const base = baseOf([anchor("a.md")]);
  const plan = planSync({
    base,
    local: [local("a.md", "same", 3000)],
    remote: [remote("a.md", "r2")],
    remoteHashes: { "a.md": "same" },
  });
  expect(plan.conflicts.length).toBe(0);
  expect(plan.adopts.map((row) => row.path)).toEqual(["a.md"]);
  expect(plan.uploads.length + plan.downloads.length).toBe(0);
  expect(plan.adopts[0].hash).toBe("same");
});

test("同步引擎：两边都改且不同 → 冲突，绝不自动覆盖", () => {
  const base = baseOf([anchor("a.md")]);
  const plan = planSync({
    base,
    local: [local("a.md", "left", 3000)],
    remote: [remote("a.md", "r2")],
    remoteHashes: { "a.md": "right" },
  });
  expect(plan.uploads.length + plan.downloads.length).toBe(0);
  expect(plan.conflicts.length).toBe(1);
  expect(plan.conflicts[0].kind).toBe("bothModified");
  expect(plan.conflicts[0].localHash).toBe("left");
  expect(plan.conflicts[0].remoteHash).toBe("right");
});

test("同步引擎：无锚点但两侧同路径同内容 → 收敛", () => {
  const plan = planSync({
    base: emptyBase(),
    local: [local("a.md", "same")],
    remote: [remote("a.md")],
    remoteHashes: { "a.md": "same" },
  });
  expect(plan.adopts.length).toBe(1);
  expect(plan.conflicts.length).toBe(0);
});

test("同步引擎：无锚点且同路径不同内容 → 冲突", () => {
  const plan = planSync({
    base: emptyBase(),
    local: [local("a.md", "left")],
    remote: [remote("a.md")],
    remoteHashes: { "a.md": "right" },
  });
  expect(plan.adopts.length).toBe(0);
  expect(plan.conflicts.length).toBe(1);
  expect(plan.conflicts[0].base).toBe(null);
});

test("同步引擎：远端删除、本地未改 → 本地删除；本地改过 → 冲突", () => {
  const base = baseOf([anchor("a.md")]);
  const clean = planSync({ base, local: [local("a.md")], remote: [] });
  expect(clean.localDeletes.map((row) => row.path)).toEqual(["a.md"]);

  const dirty = planSync({ base, local: [local("a.md", "h2", 3000)], remote: [] });
  expect(dirty.localDeletes.length).toBe(0);
  expect(dirty.conflicts[0].kind).toBe("remoteDeletedLocalModified");
});

test("同步引擎：本地删除、远端未改 → 删除云端；远端改过 → 冲突", () => {
  const base = baseOf([anchor("a.md")]);
  const clean = planSync({ base, local: [], remote: [remote("a.md")] });
  expect(clean.remoteDeletes.map((row) => row.path)).toEqual(["a.md"]);

  const dirty = planSync({ base, local: [], remote: [remote("a.md", "r2")] });
  expect(dirty.remoteDeletes.length).toBe(0);
  expect(dirty.conflicts[0].kind).toBe("localDeletedRemoteModified");
});

test("同步引擎：两边都删干净只清锚点", () => {
  const base = baseOf([anchor("a.md")]);
  const plan = planSync({ base, local: [], remote: [] });
  expect(plan.forgets).toEqual(["a.md"]);
  expect(planIsQuiet(plan)).toBe(false);
});

test("同步引擎：只探测真正需要比较内容的路径", () => {
  const base = baseOf([anchor("a.md"), anchor("b.md"), anchor("c.md")]);
  const rows = probeCandidates({
    base,
    local: [
      local("a.md", "left", 3000),
      local("b.md", "h1"),
      local("c.md", null, 1000),
      local("new.md", "n"),
    ],
    remote: [
      remote("a.md", "r2"),
      remote("b.md", "r2"),
      remote("c.md", "r1"),
      remote("extra.md", "r9"),
    ],
  });
  expect(rows.map((row) => row.path)).toEqual(["a.md"]);
});

test("同步引擎：未改文件沿用锚点哈希", () => {
  const base = baseOf([anchor("a.md", "anchor-hash", 1000, 10)]);
  expect(effectiveLocalHash(local("a.md", null, 1000, 10), base.entries["a.md"])).toBe(
    "anchor-hash",
  );
  expect(effectiveLocalHash(local("a.md", null, 2000, 10), base.entries["a.md"])).toBe(null);
});

test("同步引擎：冲突选择映射到动作", () => {
  const both = {
    path: "a.md",
    kind: "bothModified" as const,
    base: anchor("a.md"),
    local: local("a.md", "left", 3000),
    remote: remote("a.md", "r2"),
    localHash: "left",
    remoteHash: "right",
  };
  expect(resolveConflict(both, "keepLocal")).toEqual([{ type: "upload", path: "a.md" }]);
  expect(resolveConflict(both, "keepRemote")).toEqual([
    { type: "download", path: "a.md", copyRemote: false },
  ]);
  expect(resolveConflict(both, "keepBoth")).toEqual([
    { type: "download", path: "a.md", copyRemote: true },
    { type: "upload", path: "a.md" },
  ]);

  const remoteOnly = { ...both, kind: "localDeletedRemoteModified" as const, local: null };
  expect(resolveConflict(remoteOnly, "keepLocal")).toEqual([
    { type: "remoteDelete", path: "a.md" },
  ]);
  expect(resolveConflict(remoteOnly, "keepBoth")).toBe(null);

  const localOnly = { ...both, kind: "remoteDeletedLocalModified" as const, remote: null };
  expect(resolveConflict(localOnly, "keepRemote")).toEqual([
    { type: "localDelete", path: "a.md" },
  ]);
});

test("同步引擎：冲突副本命名带日期且可避让重名", () => {
  expect(conflictCopyPath("notes/a.md", NOW)).toBe("notes/a (云端冲突 2026-10-29).md");
  expect(conflictCopyPath("a.markdown", NOW)).toBe("a (云端冲突 2026-10-29).markdown");
  const taken = new Set(["a (云端冲突 2026-10-29).md"]);
  expect(uniqueConflictCopyPath("a.md", NOW, (p) => taken.has(p))).toBe(
    "a (云端冲突 2026-10-29 2).md",
  );
});

// —— 假冲突回归：只在一台设备上写，也被告知冲突 ——

test("同步引擎：云端 rev 变了但正文仍是锚点内容（Drive version 自增）→ 只上传本地，不报冲突", () => {
  const base = baseOf([anchor("a.md", "h1")]);
  const plan = planSync({
    base,
    local: [local("a.md", "edited", 3000)],
    remote: [remote("a.md", "r2")],
    remoteHashes: { "a.md": "h1" },
  });
  expect(plan.conflicts.length).toBe(0);
  expect(plan.uploads.map((row) => row.path)).toEqual(["a.md"]);
});

test("同步引擎：云端正文是本机上次没收到回执的上传 → 只上传本地，不报冲突", () => {
  const base = baseOf([anchor("a.md", "h1")]);
  base.pending = { "a.md": ["sent-but-timed-out"] };
  const plan = planSync({
    base,
    local: [local("a.md", "typed-more", 3000)],
    remote: [remote("a.md", "r2")],
    remoteHashes: { "a.md": "sent-but-timed-out" },
  });
  expect(plan.conflicts.length).toBe(0);
  expect(plan.uploads.map((row) => row.path)).toEqual(["a.md"]);
});

test("同步引擎：新文件首次上传超时、云端已建好 → 上传本地，不报冲突", () => {
  const base = emptyBase();
  base.pending = { "new.md": ["first-try"] };
  const plan = planSync({
    base,
    local: [local("new.md", "typed-more", 3000)],
    remote: [remote("new.md", "r1")],
    remoteHashes: { "new.md": "first-try" },
  });
  expect(plan.conflicts.length).toBe(0);
  expect(plan.uploads.map((row) => row.path)).toEqual(["new.md"]);
});

test("同步引擎：本地删除、云端只是 rev 自增 → 删除云端，不报冲突", () => {
  const base = baseOf([anchor("a.md", "h1")]);
  const plan = planSync({
    base,
    local: [],
    remote: [remote("a.md", "r2")],
    remoteHashes: { "a.md": "h1" },
  });
  expect(plan.conflicts.length).toBe(0);
  expect(plan.remoteDeletes.map((row) => row.path)).toEqual(["a.md"]);
  expect(plan.remoteDeletes[0].remote?.rev).toBe("r2");
});

test("同步引擎：本地删除、云端 rev 变了也要探测正文", () => {
  const base = baseOf([anchor("a.md")]);
  const rows = probeCandidates({ base, local: [], remote: [remote("a.md", "r2")] });
  expect(rows.map((row) => row.path)).toEqual(["a.md"]);
});

test("同步引擎：云端真的被别处改过，仍然报冲突", () => {
  const base = baseOf([anchor("a.md", "h1")]);
  base.pending = { "a.md": ["mine"] };
  const plan = planSync({
    base,
    local: [local("a.md", "left", 3000)],
    remote: [remote("a.md", "r2")],
    remoteHashes: { "a.md": "someone-else" },
  });
  expect(plan.conflicts.length).toBe(1);
});
