import { expect, open, test } from "nsh/test";

test("Mac 壳挂载后可见产品名与打开库入口", async () => {
  const app = await open("./App.tsx");
  expect(app.shows("text:StoatMD")).toBe(true);
  expect(app.shows("text:打开文件夹…")).toBe(true);
});
