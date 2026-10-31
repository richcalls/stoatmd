import { expect, test } from "nsh/test";
import { fetchWithTimeout, type FetchLike } from "./provider";

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
