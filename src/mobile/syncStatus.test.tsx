import { expect, test } from "nsh/test";
import { syncStatus } from "./syncStatus";

test("同步进度：未拿到总数时显示准备中，不除零", () => {
  const status = syncStatus("syncing", { done: 0, total: 0 }, null);
  expect(status?.kind).toBe("progress");
  expect(status?.key).toBe("mobile.syncPreparing");
  expect(status?.percent).toBe(0);
});

test("同步进度：下载中显示 done/total 与百分比，越界计数被夹紧", () => {
  const status = syncStatus("syncing", { done: 3, total: 10 }, null);
  expect(status?.key).toBe("mobile.syncProgress");
  expect(status?.params).toEqual({ done: 3, total: 10 });
  expect(status?.percent).toBe(30);

  const clamped = syncStatus("syncing", { done: 12, total: 10 }, null);
  expect(clamped?.params).toEqual({ done: 10, total: 10 });
  expect(clamped?.percent).toBe(100);
});

test("同步状态：网络与授权错误映射到可读文案，其他归为通用错误", () => {
  expect(syncStatus("offline", { done: 0, total: 0 }, { kind: "network", message: "x" })?.key)
    .toBe("sync.error.network");
  expect(syncStatus("error", { done: 0, total: 0 }, { kind: "auth", message: "x" })?.key)
    .toBe("sync.error.auth");
  expect(syncStatus("error", { done: 0, total: 0 }, { kind: "config", message: "x" })?.key)
    .toBe("sync.error.config");
  expect(syncStatus("error", { done: 0, total: 0 }, { kind: "unknown", message: "x" })?.key)
    .toBe("sync.error.generic");
});

test("同步状态：暂停时保留进度，继续后从同一个位置恢复", () => {
  const status = syncStatus("paused", { done: 3, total: 10 }, null);
  expect(status?.kind).toBe("paused");
  expect(status?.key).toBe("mobile.syncPaused");
  expect(status?.params).toEqual({ done: 3, total: 10 });
  expect(status?.percent).toBe(30);
});

test("同步状态：已同步或没有错误时不出横幅", () => {
  expect(syncStatus("synced", { done: 1, total: 1 }, null)).toBe(null);
  expect(syncStatus("error", { done: 0, total: 0 }, null)).toBe(null);
});
