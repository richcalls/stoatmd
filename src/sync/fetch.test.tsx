import { expect, test } from "nsh/test";
import { SyncError, fetchWithTimeout, readBodyBytes, readBodyText, type FetchLike } from "./provider";

test("网络请求超时：挂起的请求在超时后以可读错误结束", async () => {
  const hang: FetchLike = (_input, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    });

  let error = "";
  try {
    await fetchWithTimeout(hang, "https://example.com/slow", undefined, 20);
  } catch (err) {
    error = String(err);
  }
  expect(error).toContain("timed out");
});

test("网络请求超时：正常返回的响应不受影响", async () => {
  const fast: FetchLike = async () => new Response("ok", { status: 200 });
  const response = await fetchWithTimeout(fast, "https://example.com/fast", undefined, 1000);
  expect(await response.text()).toBe("ok");
});

test("响应正文超时：下载正文卡住时以 network 错误结束", async () => {
  const response = {
    arrayBuffer: () => new Promise<ArrayBuffer>(() => {}),
  } as unknown as Response;

  let error: unknown = null;
  try {
    await readBodyBytes(response, 20);
  } catch (err) {
    error = err;
  }
  expect(error instanceof SyncError).toBe(true);
  expect((error as SyncError).kind).toBe("network");
  expect((error as Error).message).toContain("timed out");
});

test("响应正文超时：正文正常返回时原样读出", async () => {
  const response = {
    arrayBuffer: async () => new TextEncoder().encode("hi").buffer,
    text: async () => "hello",
  } as unknown as Response;

  expect(Array.from(await readBodyBytes(response, 1000))).toEqual([104, 105]);
  expect(await readBodyText(response, 1000)).toBe("hello");
});
