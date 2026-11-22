import { expect, test } from "nsh/test";
import { sha256Bytes } from "./hash";
import { SyncError } from "./provider";
import { syncRuntime } from "./runtime";
import { dec, edit, enc, setup, storedPending } from "./testCloud";

// 只在一台设备上写，也不该被告知冲突。这里用内存云盘复现几条真实路径。

test("假冲突：保存后推送回执超时，继续写，下一轮同步只上传不报冲突", async () => {
  const { vault, cloud, restore } = await setup();
  try {
    vault.createBytes("a.md", enc("v1"));
    expect((await syncRuntime.syncNow())?.ok).toBe(true);

    edit(vault, "a.md", "v2");
    cloud.hooks.loseReceipt = () => true;
    const push = await syncRuntime.pushPaths(["a.md"], true);
    expect(push?.ok).toBe(false);
    expect(cloud.text("a.md")).toBe("v2");

    cloud.hooks.loseReceipt = () => false;
    edit(vault, "a.md", "v3");
    const result = await syncRuntime.syncNow();
    expect(result?.conflicts.length).toBe(0);
    expect(result?.ok).toBe(true);
    expect(cloud.text("a.md")).toBe("v3");
  } finally {
    await restore();
  }
});

test("假冲突：新建笔记首次上传回执超时，继续写，不报冲突", async () => {
  const { vault, cloud, restore } = await setup();
  try {
    vault.createBytes("new.md", enc("draft"));
    cloud.hooks.loseReceipt = () => true;
    await syncRuntime.pushPaths(["new.md"], true);
    expect(cloud.text("new.md")).toBe("draft");

    cloud.hooks.loseReceipt = () => false;
    edit(vault, "new.md", "draft + more");
    const result = await syncRuntime.syncNow();
    expect(result?.conflicts.length).toBe(0);
    expect(cloud.text("new.md")).toBe("draft + more");
  } finally {
    await restore();
  }
});

test("假冲突：云端 rev 自增、正文没变，本地有新改动 → 直接上传", async () => {
  const { vault, cloud, restore } = await setup();
  try {
    vault.createBytes("a.md", enc("v1"));
    await syncRuntime.syncNow();
    cloud.bumpRev("a.md");
    edit(vault, "a.md", "v2");

    const result = await syncRuntime.syncNow();
    expect(result?.conflicts.length).toBe(0);
    expect(cloud.text("a.md")).toBe("v2");
  } finally {
    await restore();
  }
});

test("假冲突：云端 rev 自增、正文没变，本地也没改 → 不重写本地文件", async () => {
  const { vault, cloud, restore } = await setup();
  try {
    vault.createBytes("a.md", enc("v1"));
    await syncRuntime.syncNow();
    const before = vault.mtime("a.md");
    cloud.bumpRev("a.md");
    await new Promise((resolve) => setTimeout(resolve, 20));

    const result = await syncRuntime.syncNow();
    expect(result?.changedLocal).toEqual([]);
    // 正在编辑器里打开的笔记 mtime 不能被同步改掉，否则下次保存误报外部修改。
    expect(vault.mtime("a.md")).toBe(before);
  } finally {
    await restore();
  }
});

test("假冲突：全量同步等正在进行的推送落定，再列云端", async () => {
  const { vault, cloud, restore } = await setup();
  try {
    vault.createBytes("a.md", enc("v1"));
    await syncRuntime.syncNow();
    edit(vault, "a.md", "v2");

    let release: () => void = () => {};
    cloud.hooks.afterWrite = () => new Promise<void>((resolve) => { release = resolve; });
    const push = syncRuntime.pushPaths(["a.md"], true);
    await new Promise((resolve) => setTimeout(resolve, 10));
    cloud.hooks.afterWrite = async () => {};
    // 推送还在路上，用户继续打字（同样长度，mtime 是唯一线索）。
    edit(vault, "a.md", "v3");
    const full = syncRuntime.syncNow();
    // 让全量同步先跑到列云端那一步，再放回执。
    await new Promise((resolve) => setTimeout(resolve, 20));
    release();

    expect((await push)?.ok).toBe(true);
    const result = await full;
    expect(result?.conflicts.length).toBe(0);
    expect(cloud.text("a.md")).toBe("v3");
  } finally {
    await restore();
  }
});

test("假冲突：本地删除、云端只是 rev 自增 → 删掉云端，不报冲突", async () => {
  const { vault, cloud, restore } = await setup();
  try {
    vault.createBytes("a.md", enc("v1"));
    await syncRuntime.syncNow();
    cloud.bumpRev("a.md");
    vault.delete("a.md");

    const result = await syncRuntime.syncNow();
    expect(result?.conflicts.length).toBe(0);
    expect(cloud.text("a.md")).toBe(null);
  } finally {
    await restore();
  }
});

test("真冲突：别的设备改了云端正文，仍然交给用户选", async () => {
  const { vault, cloud, restore } = await setup();
  try {
    vault.createBytes("a.md", enc("v1"));
    await syncRuntime.syncNow();
    const f = cloud.files.get("a.md")!;
    cloud.files.set("a.md", { ...f, rev: f.rev + 1, content: enc("from phone") });
    edit(vault, "a.md", "from mac");

    const result = await syncRuntime.syncNow();
    expect(result?.conflicts.length).toBe(1);
    expect(cloud.text("a.md")).toBe("from phone");
    expect(dec(new Uint8Array(vault.readBytes("a.md")))).toBe("from mac");
  } finally {
    await restore();
  }
});

test("串行：两次推送和一次全量同步同时排队，同一时刻只有一个上传在路上", async () => {
  const { vault, cloud, restore } = await setup();
  try {
    vault.createBytes("a.md", enc("v1"));
    vault.createBytes("b.md", enc("b1"));
    await syncRuntime.syncNow();
    edit(vault, "a.md", "v2");
    edit(vault, "b.md", "b2");

    let release: () => void = () => {};
    cloud.hooks.afterWrite = () => new Promise<void>((resolve) => { release = resolve; });
    const first = syncRuntime.pushPaths(["a.md"], true);
    await new Promise((resolve) => setTimeout(resolve, 10));
    // 之后的每次上传都在路上停几毫秒，交错的话 inflight 会 >1。
    cloud.hooks.afterWrite = () => new Promise<void>((resolve) => setTimeout(resolve, 5));
    const second = syncRuntime.pushPaths(["a.md"], true);
    const third = syncRuntime.pushPaths(["b.md"], true);
    const full = syncRuntime.syncNow();
    release();

    const results = await Promise.all([first, second, third, full]);
    expect(cloud.inflight.max).toBe(1);
    expect(results.every((r) => !r || r.conflicts.length === 0)).toBe(true);
    expect(results.every((r) => !r?.needsFullSync)).toBe(true);
    expect(cloud.text("a.md")).toBe("v2");
    expect(cloud.text("b.md")).toBe("b2");
  } finally {
    await restore();
  }
});

test("pending：全量同步上传前就落盘，被杀后重启仍认得自己的版本", async () => {
  const { vault, cloud, restore } = await setup();
  try {
    vault.createBytes("a.md", enc("v1"));
    await syncRuntime.syncNow();
    edit(vault, "a.md", "v2");

    let seen: string[] = [];
    cloud.hooks.afterWrite = async () => { seen = await storedPending("a.md"); };
    await syncRuntime.syncNow();
    expect(seen).toEqual([sha256Bytes(enc("v2"))]);
  } finally {
    await restore();
  }
});

test("pending：上传被云端以 rev 冲突拒绝时清掉，不把没落地的正文当成自己的", async () => {
  const { vault, cloud, restore } = await setup();
  try {
    vault.createBytes("a.md", enc("v1"));
    await syncRuntime.syncNow();
    const f = cloud.files.get("a.md")!;
    cloud.files.set("a.md", { ...f, rev: f.rev + 1, content: enc("phone") });
    edit(vault, "a.md", "mac");

    const push = await syncRuntime.pushPaths(["a.md"], true);
    expect(push?.needsFullSync).toBe(true);
    expect(await storedPending("a.md")).toEqual([]);
  } finally {
    await restore();
  }
});

test("pending：超时已落地后再推同一份正文被拒，不能把先前那次的记录一起撤掉", async () => {
  const { vault, cloud, restore } = await setup();
  try {
    vault.createBytes("a.md", enc("v1"));
    await syncRuntime.syncNow();
    edit(vault, "a.md", "v2");

    cloud.hooks.loseReceipt = () => true;
    await syncRuntime.pushPaths(["a.md"], true);
    cloud.hooks.loseReceipt = () => false;
    // 同一份正文再推一次：锚点 rev 是旧的，被云端拒绝。
    const retry = await syncRuntime.pushPaths(["a.md"], true);
    expect(retry?.needsFullSync).toBe(true);

    edit(vault, "a.md", "v3");
    const result = await syncRuntime.syncNow();
    expect(result?.conflicts.length).toBe(0);
    expect(cloud.text("a.md")).toBe("v3");
  } finally {
    await restore();
  }
});

test("pending：全量同步中途断网，没轮到的文件不留 pending", async () => {
  const { vault, cloud, restore } = await setup();
  try {
    vault.createBytes("a.md", enc("a1"));
    vault.createBytes("b.md", enc("b1"));
    await syncRuntime.syncNow();
    edit(vault, "a.md", "a2");
    edit(vault, "b.md", "b2");

    // a.md 先上传（路径排序），请求没写进云端就断网。
    cloud.hooks.beforeWrite = () => { throw new SyncError("network", "offline"); };
    const result = await syncRuntime.syncNow();
    expect(result?.ok).toBe(false);
    expect(await storedPending("b.md")).toEqual([]);
  } finally {
    await restore();
  }
});
