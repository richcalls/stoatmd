import { expect, open, test } from "nsh/test";

const options = { width: 800, height: 600, locale: "zh-CN", platform: "macos" as const };

test("笔记库菜单：点击库名展开，明确选择打开文件夹才触发切换，Esc 可取消", async () => {
  const app = await open("./Sidebar.harness.tsx", options);
  expect(app.shows("id:sidebar-open")).toBe(false);
  await app.press("id:sidebar-vault-menu");
  expect(app.texts()).toContain("/notes/我的库");
  expect(app.shows("id:sidebar-open")).toBe(true);
  expect(app.texts()).toContain("vault-closed");
  await app.keyboard.press("escape");
  expect(app.shows("id:sidebar-open")).toBe(false);
  expect(app.texts()).toContain("vault-closed");
  await app.press("id:sidebar-vault-menu");
  await app.press("id:sidebar-open");
  expect(app.texts()).toContain("vault-open");
  expect(app.shows("id:sidebar-open")).toBe(false);
});

test("笔记库菜单：选择当前库回到根目录，关闭菜单并保留当前笔记", async () => {
  const app = await open("./Sidebar.harness.tsx", options);
  await app.press("id:feed");
  await app.press("text:计划");
  await app.press("label:项目");
  expect(app.texts()).toContain("Projects");
  await app.press("id:sidebar-vault-menu");
  await app.press("id:sidebar-vault-root");
  expect(app.texts().includes("Projects")).toBe(false);
  expect(app.texts()).toContain("Projects/Stoat/计划.md");
  expect(app.shows("id:sidebar-open")).toBe(false);
});

test("文件树：后到的笔记嵌套显示，点击笔记回调路径", async () => {
  const app = await open("./Sidebar.harness.tsx", options);
  expect(app.shows("text:我的库")).toBe(true);
  expect(app.shows("text:日记")).toBe(true);
  expect(app.shows("text:今天")).toBe(false);

  await app.press("id:feed");
  expect(app.shows("text:今天")).toBe(true);
  expect(app.shows("text:计划")).toBe(true);
  expect(app.shows("text:根级笔记")).toBe(true);

  await app.press("text:计划");
  expect(app.texts()).toContain("Projects/Stoat/计划.md");
});

test("文件树：点文件夹可折叠/展开，并记录新建目标", async () => {
  const app = await open("./Sidebar.harness.tsx", options);
  await app.press("id:feed");

  await app.press("label:项目");
  expect(app.shows("text:水獭")).toBe(false);
  expect(app.shows("text:计划")).toBe(false);
  expect(app.shows("text:今天")).toBe(true);
  expect(app.texts()).toContain("Projects");

  await app.press("label:项目");
  expect(app.shows("text:水獭")).toBe(true);
  expect(app.shows("text:计划")).toBe(true);
});

test("文件树：搜索忽略折叠、平铺结果并带父文件夹名", async () => {
  const app = await open("./Sidebar.harness.tsx", options);
  await app.press("id:feed");
  await app.press("label:项目");
  expect(app.shows("text:计划")).toBe(false);

  await app.type("搜索笔记", "计划");
  expect(app.shows("text:计划")).toBe(true);
  expect(app.shows("label:水獭")).toBe(false);
  expect(app.shows("text:水獭")).toBe(true);
  expect(app.shows("text:今天")).toBe(false);

  await app.press("text:计划");
  expect(app.texts()).toContain("Projects/Stoat/计划.md");
  expect(app.shows("id:sidebar-search")).toBe(true);

  await app.type("id:sidebar-search", "不存在的笔记");
  await app.waitUntil(() => app.shows("text:没有匹配的笔记"));
  expect(app.shows("text:没有匹配的笔记")).toBe(true);
});

test("文件树：右键笔记会带路径触发文件菜单", async () => {
  const app = await open("./Sidebar.harness.tsx", options);
  await app.press("id:feed");
  await app.rightClick("label:计划");
  expect(app.texts()).toContain("Projects/Stoat/计划.md");
});

test("文件树：正文命中补齐标题搜索遗漏，搜索完成后可打开折叠目录里的笔记", async () => {
  const app = await open("./Sidebar.harness.tsx", options);
  await app.press("id:feed");
  await app.press("label:项目");
  await app.type("id:sidebar-search", "读书笔记");
  expect(app.shows("text:没有匹配的笔记")).toBe(false);
  await app.waitUntil(() => app.shows("text:计划"));
  expect(app.shows("text:今天")).toBe(true);
  expect(app.shows("text:根级笔记")).toBe(false);
  await app.press("text:计划");
  expect(app.texts()).toContain("Projects/Stoat/计划.md");
});

test("文件树：新建按钮与底部同步入口可用", async () => {
  const app = await open("./Sidebar.harness.tsx", options);
  await app.press("id:sidebar-new");
  expect(app.texts()).toContain("new-open");

  expect(app.shows("text:未开启同步")).toBe(true);
  await app.press("id:sidebar-sync");
  expect(app.texts()).toContain("sync-open");
});

test("文件树：同步状态随阶段变化（已同步 / 冲突 / 离线）", async () => {
  const app = await open("./Sidebar.harness.tsx", options);
  await app.press("id:phase-synced");
  expect(app.texts()).toContain("已同步");
  await app.press("id:phase-conflict");
  expect(app.texts()).toContain("2 冲突");
  await app.press("id:phase-offline");
  expect(app.texts()).toContain("离线 · 仅本机");
});
