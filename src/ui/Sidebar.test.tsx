import { expect, open, test } from "nsh/test";

const options = { width: 800, height: 600, locale: "zh-CN" };

test("侧栏：图标轨隐藏文字但仍可选中，且保留无障碍标签", async () => {
  const app = await open("./Sidebar.harness.tsx", options);
  expect(app.shows("text:日记")).toBe(true);

  await app.press("id:toggle-rail");
  expect(app.shows("text:日记")).toBe(false);
  expect(app.shows("label:日记")).toBe(true);

  await app.press("label:日记");
  expect(app.texts()).toContain("Diary");
});

test("侧栏：底部同步状态可打开同步设置", async () => {
  const app = await open("./Sidebar.harness.tsx", options);
  expect(app.shows("text:未开启同步")).toBe(true);
  await app.press("id:sidebar-sync");
  expect(app.texts()).toContain("sync-open");
});
