import { expect, open, test } from "nsh/test";

test("Mac 壳挂载后可见产品名与打开库入口", async () => {
  const app = await open("./App.tsx");
  expect(app.shows("text:StoatMD")).toBe(true);
  expect(app.shows("text:打开文件夹…")).toBe(true);
});

test("顶栏可打开设置，并可点完成关闭", async () => {
  const app = await open("./App.tsx", { width: 1280, height: 800 });
  await app.press("id:toolbar-settings");
  expect(app.shows("text:主题")).toBe(true);
  expect(app.shows("text:完成")).toBe(true);
  await app.press("text:完成");
  expect(app.shows("text:打开文件夹…")).toBe(true);
});
