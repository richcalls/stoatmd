import { expect, test } from "nsh/test";
import { isTransientSyncError, shownSyncFailure, syncErrorKey } from "./errorText";

test("syncErrorKey：限流 / 5xx / 超时与断网分开成可读文案", () => {
  expect(syncErrorKey({ kind: "network", message: "HTTP 429" })).toBe("sync.error.rateLimited");
  expect(syncErrorKey({ kind: "network", message: "HTTP 503" })).toBe("sync.error.remote");
  expect(syncErrorKey({ kind: "network", message: "request timed out" })).toBe("sync.error.remote");
  expect(syncErrorKey({ kind: "network", message: "offline" })).toBe("sync.error.network");
  expect(syncErrorKey({ kind: "auth", message: "HTTP 401" })).toBe("sync.error.auth");
  expect(syncErrorKey({ kind: "config", message: "missing" })).toBe("sync.error.config");
  expect(syncErrorKey({ kind: "unknown", message: "boom" })).toBe("sync.error.generic");
});

test("isTransientSyncError：network 与 unknown 视为瞬时", () => {
  expect(isTransientSyncError({ kind: "network", message: "x" })).toBe(true);
  expect(isTransientSyncError({ kind: "unknown", message: "x" })).toBe(true);
  expect(isTransientSyncError({ kind: "auth", message: "x" })).toBe(false);
  expect(isTransientSyncError({ kind: "config", message: "x" })).toBe(false);
});

test("shownSyncFailure：瞬时错误未达阈值时隐藏，非瞬时立即显示", () => {
  const network = { kind: "network" as const, message: "x" };
  const auth = { kind: "auth" as const, message: "x" };
  expect(shownSyncFailure(network, 0, 3)).toBe(null);
  expect(shownSyncFailure(network, 2, 3)).toBe(null);
  expect(shownSyncFailure(network, 3, 3)).toEqual(network);
  expect(shownSyncFailure(auth, 0, 3)).toEqual(auth);
  expect(shownSyncFailure(null, 5, 3)).toBe(null);
});
