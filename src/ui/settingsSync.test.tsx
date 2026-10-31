import { expect, test } from "nsh/test";
import { SyncError } from "../sync/provider";
import { settingsSyncResult, unwrapSettingsSync, type SettingsSyncResult } from "./settingsSync";

test("独立设置：同步错误跨 JSON 通道保留分类、消息和详情", async () => {
  for (const kind of ["config", "auth", "network"] as const) {
    const result = await settingsSyncResult(async () => { throw new SyncError(kind, "connect failed", "provider detail"); });
    const received = JSON.parse(JSON.stringify(result)) as SettingsSyncResult;
    let caught: unknown;
    try { unwrapSettingsSync(received); } catch (error) { caught = error; }
    expect(caught instanceof SyncError).toBe(true);
    expect((caught as SyncError).kind).toBe(kind);
    expect((caught as SyncError).message).toBe("connect failed");
    expect((caught as SyncError).detail).toBe("provider detail");
  }
});

test("独立设置：同步结果保留目录数据，普通异常归为 unknown", async () => {
  const folders = [{ id: "/Notes", path: "/Notes", name: "Notes" }];
  expect(unwrapSettingsSync(await settingsSyncResult(async () => folders))).toEqual(folders);
  expect(unwrapSettingsSync(await settingsSyncResult(async () => undefined))).toBe(null);
  expect(await settingsSyncResult(async () => { throw new Error("failed"); })).toEqual({
    ok: false, error: { kind: "unknown", message: "failed", detail: null },
  });
});
