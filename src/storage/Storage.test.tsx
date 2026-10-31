import { expect, open, test } from "nsh/test";
const desktop = { width: 900, height: 820, theme: "light" as const, locale: "zh-CN" };

test("存储集成：默认保留原数据，迁移二进制文件，单记录持久化并恢复新位置", async () => {
  const app = await open("./Storage.harness.tsx", desktop);
  await app.press("id:storage-start");
  await app.waitFor("id:storage-done");
  expect(app.texts()).toContain("![image](assets/image.png):0,255,128");
  const active = JSON.parse(app.storage()["storage.active"]!);
  expect(active.connection).toBe(null);
  expect(active.cleanup).toBe(null);
  expect(app.storage()["sync.connection"]).toBe(undefined);
  await app.press("id:fixture-reload");
  await app.waitUntil(() => app.texts().includes("restored-target"));
  await app.press("id:fixture-dispose");
  expect(app.texts().some(text => text === "disposed:![image](assets/image.png):true")).toBe(true);
});

test("存储集成：保存失败保持原绑定，迁移结束解除编辑锁", async () => {
  const app = await open("./Storage.harness.tsx", { ...desktop, storage: { "test.unsaved": "true" } });
  const initial = app.storage()["storage.active"];
  await app.press("id:storage-start");
  await app.waitFor("id:storage-migration-error");
  expect(app.storage()["storage.active"]).toBe(initial);
  expect(app.texts()).toContain("failed:false");
  await app.press("id:fixture-dispose");
});

test("存储集成：变化的原文件保留，清理记录恢复后可重试或保留", async () => {
  const app = await open("./Storage.harness.tsx", { ...desktop, storage: { "test.cleanup": "true" } });
  await app.press("id:storage-keep-original");
  await app.press("id:storage-start");
  await app.waitFor("id:storage-done");
  const active = JSON.parse(app.storage()["storage.active"]!);
  expect(active.cleanup.receipts.map((r: { source: { path: string } }) => r.source.path)).toEqual(["note.md"]);
  await app.press("id:fixture-reload");
  await app.waitUntil(() => app.texts().includes("restored-target"));
  await app.press("id:storage-cleanup-retry");
  await app.waitFor("id:storage-cleanup-keep");
  expect(JSON.parse(app.storage()["storage.active"]!).root).toBe(active.root);
  await app.press("id:storage-cleanup-keep");
  await app.waitUntil(() => JSON.parse(app.storage()["storage.active"]!).cleanup === null);
  await app.press("id:fixture-dispose");
  expect(app.texts()).toContain("disposed:edited original:true");
});
