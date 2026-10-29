import { expect, open, test } from "nsh/test";

test("Mac 壳挂载后可见产品名", async () => {
  const app = await open("./App.tsx");
  expect(app.shows("text:StoatMD")).toBe(true);
});
