import { expect, test } from "nsh/test";
import { syncRuntime } from "./runtime";
import { dec, edit, enc, setup } from "./testCloud";

const read = (vault: { readBytes(path: string): ArrayLike<number> }, path: string) =>
  dec(new Uint8Array(vault.readBytes(path)));

test("冲突处理：本地删了、云端改了，选保留本地会按云端当前版本删掉云端", async () => {
  const { vault, cloud, restore } = await setup();
  try {
    vault.createBytes("a.md", enc("v1"));
    await syncRuntime.syncNow();
    vault.delete("a.md");
    cloud.put("a.md", "phone");

    const result = await syncRuntime.syncNow();
    expect(result?.conflicts.map((c) => c.kind)).toEqual(["localDeletedRemoteModified"]);
    await syncRuntime.resolveConflict(result!.conflicts[0]!, "keepLocal");

    expect(cloud.text("a.md")).toBe(null);
    expect(syncRuntime.conflicts().length).toBe(0);
    expect((await syncRuntime.syncNow())?.conflicts.length).toBe(0);
  } finally {
    await restore();
  }
});

test("冲突不卡住整库：未解决的冲突只挡住它自己的路径", async () => {
  const { vault, cloud, restore } = await setup();
  try {
    vault.createBytes("a.md", enc("a1"));
    vault.createBytes("b.md", enc("b1"));
    await syncRuntime.syncNow();
    edit(vault, "a.md", "a-mac");
    cloud.put("a.md", "a-phone");
    expect((await syncRuntime.syncNow())?.conflicts.length).toBe(1);
    expect(syncRuntime.phase()).toBe("conflict");

    edit(vault, "b.md", "b2");
    const push = await syncRuntime.pushPaths(["a.md", "b.md"]);
    expect(push?.uploaded).toBe(1);
    expect(cloud.text("b.md")).toBe("b2");
    expect(cloud.text("a.md")).toBe("a-phone");
    expect(syncRuntime.phase()).toBe("conflict");

    cloud.put("c.md", "from phone");
    const full = await syncRuntime.syncNow();
    expect(full?.conflicts.map((c) => c.path)).toEqual(["a.md"]);
    expect(read(vault, "c.md")).toBe("from phone");
    expect(read(vault, "a.md")).toBe("a-mac");
    expect(syncRuntime.phase()).toBe("conflict");
  } finally {
    await restore();
  }
});

test("同步途中本地又改了：跳过这一篇，不覆盖、不中断其余文件", async () => {
  const { vault, cloud, restore } = await setup();
  try {
    vault.createBytes("a.md", enc("a1"));
    vault.createBytes("b.md", enc("b1"));
    await syncRuntime.syncNow();
    cloud.put("a.md", "a-phone");
    cloud.put("b.md", "b-phone");
    cloud.hooks.beforeDownload = async (path) => {
      if (path === "a.md") {
        await new Promise((resolve) => setTimeout(resolve, 5));
        edit(vault, "a.md", "a-typing");
      }
    };

    const result = await syncRuntime.syncNow();
    expect(result?.ok).toBe(true);
    expect(read(vault, "a.md")).toBe("a-typing");
    expect(read(vault, "b.md")).toBe("b-phone");
    expect(syncRuntime.phase()).toBe("synced");

    cloud.hooks.beforeDownload = async () => {};
    expect((await syncRuntime.syncNow())?.conflicts.map((c) => c.path)).toEqual(["a.md"]);
  } finally {
    await restore();
  }
});

test("删除云端前云端又被改了：跳过这一篇，其余照常同步", async () => {
  const { vault, cloud, restore } = await setup();
  try {
    vault.createBytes("a.md", enc("a1"));
    vault.createBytes("b.md", enc("b1"));
    await syncRuntime.syncNow();
    vault.delete("a.md");
    cloud.put("b.md", "b-phone");
    cloud.hooks.beforeRemove = (path) => { if (path === "a.md") cloud.put("a.md", "a-phone"); };

    const result = await syncRuntime.syncNow();
    expect(result?.ok).toBe(true);
    expect(cloud.text("a.md")).toBe("a-phone");
    expect(read(vault, "b.md")).toBe("b-phone");

    cloud.hooks.beforeRemove = () => {};
    expect((await syncRuntime.syncNow())?.conflicts.map((c) => c.kind)).toEqual(["localDeletedRemoteModified"]);
  } finally {
    await restore();
  }
});

test("暂停中的同步遇到存储迁移：pause() 不会卡死，之后还能正常同步", async () => {
  const { vault, cloud, restore } = await setup();
  try {
    const names = ["a", "b", "c", "d", "e", "f"];
    for (const name of names) cloud.put(`${name}.md`, name);
    cloud.hooks.beforeDownload = async () => { syncRuntime.pauseSync(); };
    const round = syncRuntime.syncNow();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(syncRuntime.phase()).toBe("paused");

    const drained = await Promise.race([
      syncRuntime.pause().then(() => true),
      new Promise((resolve) => setTimeout(() => resolve(false), 500)),
    ]);
    expect(drained).toBe(true);
    await round;
    expect(syncRuntime.phase() === "paused").toBe(false);

    cloud.hooks.beforeDownload = async () => {};
    const next = await syncRuntime.syncNow();
    expect(next?.ok).toBe(true);
    for (const name of names) expect(read(vault, `${name}.md`)).toBe(name);
  } finally {
    await restore();
  }
});

test("全量同步：删云端文件不再重列一遍云端；只给云端缺的目录建目录", async () => {
  const { vault, cloud, restore } = await setup();
  try {
    vault.ensureDir("notes");
    vault.createBytes("notes/a.md", enc("a"));
    await syncRuntime.syncNow();
    expect(cloud.calls.ensureDirectory).toEqual(["notes"]);

    vault.delete("notes/a.md");
    cloud.calls.inventory = 0;
    cloud.calls.ensureDirectory = [];
    const result = await syncRuntime.syncNow();
    expect(result?.deletedRemote).toBe(1);
    expect(cloud.calls.inventory).toBe(1);
    expect(cloud.calls.ensureDirectory).toEqual([]);
  } finally {
    await restore();
  }
});

test("推送：正文和锚点一样时不重复上传", async () => {
  const { vault, cloud, restore } = await setup();
  try {
    vault.createBytes("a.md", enc("same"));
    await syncRuntime.syncNow();
    edit(vault, "a.md", "same");
    cloud.calls.uploads = 0;

    const result = await syncRuntime.pushPaths(["a.md"]);
    expect(result?.ok).toBe(true);
    expect(cloud.calls.uploads).toBe(0);
    expect((await syncRuntime.syncNow())?.uploaded).toBe(0);
  } finally {
    await restore();
  }
});

test("暂停只管这一轮：最后一步之后才暂停，下一轮不会卡住", async () => {
  const { vault, cloud, restore } = await setup();
  try {
    cloud.put("a.md", "a");
    cloud.hooks.beforeDownload = async () => { syncRuntime.pauseSync(); };
    expect((await syncRuntime.syncNow())?.ok).toBe(true);

    cloud.hooks.beforeDownload = async () => {};
    cloud.put("b.md", "b");
    const next = await Promise.race([
      syncRuntime.syncNow(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
    ]);
    expect(next?.ok).toBe(true);
    expect(read(vault, "b.md")).toBe("b");
  } finally {
    await restore();
  }
});

test("进度：有冲突时进度条也能走满", async () => {
  const { vault, cloud, restore } = await setup();
  try {
    vault.createBytes("a.md", enc("a1"));
    await syncRuntime.syncNow();
    edit(vault, "a.md", "mac");
    cloud.put("a.md", "phone");
    cloud.put("b.md", "b");

    await syncRuntime.syncNow();
    const progress = syncRuntime.progress();
    expect(progress.done).toBe(progress.total);
  } finally {
    await restore();
  }
});

test("云端重名的项只跳过自己：不删本机副本、不上传、其余文件照常同步", async () => {
  const { vault, cloud, restore } = await setup();
  try {
    vault.createBytes("a.md", enc("a1"));
    vault.ensureDir("docs");
    vault.createBytes("docs/b.md", enc("b1"));
    vault.createBytes("c.md", enc("c1"));
    expect((await syncRuntime.syncNow())?.ok).toBe(true);

    // 云端随后出现了同名的 a.md 和同名的 docs 文件夹：清单把它们报告为跳过。
    cloud.skipped.push({ path: "a.md", reason: "duplicate" }, { path: "docs", reason: "duplicate" });
    edit(vault, "a.md", "a-mac");
    edit(vault, "docs/b.md", "b-mac");
    edit(vault, "c.md", "c2");

    const result = await syncRuntime.syncNow();
    expect(result?.ok).toBe(true);
    expect(result?.skipped).toEqual([
      { path: "a.md", reason: "duplicate" },
      { path: "docs", reason: "duplicate" },
    ]);
    expect(syncRuntime.phase()).toBe("synced");
    // 被跳过的路径不被当成「云端已删除」：本机副本还在，云端那份也没被本机覆盖。
    expect(read(vault, "a.md")).toBe("a-mac");
    expect(read(vault, "docs/b.md")).toBe("b-mac");
    expect(cloud.text("a.md")).toBe("a1");
    expect(cloud.text("docs/b.md")).toBe("b1");
    // 其余文件照常。
    expect(cloud.text("c.md")).toBe("c2");

    // 保存后的单文件推送也绕开这些路径。
    edit(vault, "a.md", "a-mac-2");
    const push = await syncRuntime.pushPaths(["a.md", "c.md"]);
    expect(push?.ok).toBe(true);
    expect(cloud.text("a.md")).toBe("a1");

    // 用户在云端把重名改掉后，下一轮恢复正常，本机改动照常上传。
    cloud.skipped.length = 0;
    expect((await syncRuntime.syncNow())?.skipped).toEqual([]);
    expect(syncRuntime.skipped()).toEqual([]);
    expect(cloud.text("a.md")).toBe("a-mac-2");
    expect(cloud.text("docs/b.md")).toBe("b-mac");
  } finally {
    await restore();
  }
});
