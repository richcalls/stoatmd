import { expect, open, test } from "nsh/test";

test("全文搜索：过期请求晚到时保留最新结果，清空词后清空结果", async () => {
  const app = await open("./librarySearch.harness.tsx");
  await app.press("id:query-first");
  await app.waitUntil(() => app.texts().includes("requests:1"));
  await app.press("id:query-second");
  await app.waitUntil(() => app.texts().includes("requests:2"));
  await app.press("id:resolve-latest");
  await app.waitUntil(() => app.texts().includes("hits:new.md"));
  await app.press("id:resolve-first");
  expect(app.texts()).toContain("hits:new.md");
  expect(app.texts()).toContain("pending:false");
  await app.press("id:query-clear");
  expect(app.texts()).toContain("hits:");
});

test("全文搜索：换库忽略旧结果，目录变更重搜，失败状态结束等待并可重试", async () => {
  const app = await open("./librarySearch.harness.tsx");
  await app.press("id:query-first");
  await app.waitUntil(() => app.texts().includes("requests:1"));
  await app.press("id:switch-vault");
  await app.waitUntil(() => app.texts().includes("requests:2"));
  await app.press("id:resolve-first");
  expect(app.texts()).toContain("hits:");
  expect(app.texts()).toContain("pending:true");
  await app.press("id:reject-latest");
  await app.waitUntil(() => app.texts().some((text) => text.includes("error:Error: read failed")));
  expect(app.texts()).toContain("pending:false");
  await app.press("id:revision");
  await app.waitUntil(() => app.texts().includes("requests:3"));
  expect(app.texts()).toContain("error:");
  await app.press("id:resolve-latest");
  await app.waitUntil(() => app.texts().includes("hits:new.md"));
});
