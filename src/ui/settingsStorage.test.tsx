import { expect, open, test } from "nsh/test";

test("设置通信：主窗口迁移并激活新库，响应返回完整状态，保留原文件", async () => {
  const app = await open("./SettingsStorage.harness.tsx");
  await app.press("id:start");
  await app.waitUntil(() => app.texts().includes("succeeded:false:true:# saved note"));
  const active = JSON.parse(app.storage()["storage.active"]!);
  expect(active.cleanup).toBe(null);
  expect(active.connection).toBe(null);
  await app.press("id:dispose");
});

test("设置通信：主窗口保存失败保持原绑定，响应携带错误并释放锁", async () => {
  const app = await open("./SettingsStorage.harness.tsx", { storage: { "test.unsaved": "true" } });
  const original = app.storage()["storage.active"];
  await app.press("id:start");
  await app.waitUntil(() => app.texts().includes("failed:false:false:# saved note"));
  expect(app.storage()["storage.active"]).toBe(original);
  expect(app.texts().some(text => text.includes('"error":"storage.error.unsaved"'))).toBe(true);
  await app.press("id:dispose");
});
