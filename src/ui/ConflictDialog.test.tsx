import { expect, open, test } from "nsh/test";

const desktop = { width: 1000, height: 720, locale: "zh-CN" };

test("冲突：双改文件给出三种选择，删除类冲突不提供「两边都留」", async () => {
  const app = await open("./ConflictDialog.harness.tsx", desktop);
  expect(app.shows("id:conflict-dialog")).toBe(true);
  expect(app.shows("id:conflict-a.md-keepLocal")).toBe(true);
  expect(app.shows("id:conflict-a.md-keepRemote")).toBe(true);
  expect(app.shows("id:conflict-a.md-keepBoth")).toBe(true);

  expect(app.shows("id:conflict-b.md-keepLocal")).toBe(true);
  expect(app.shows("id:conflict-b.md-keepRemote")).toBe(true);
  expect(app.shows("id:conflict-b.md-keepBoth")).toBe(false);

  expect(app.shows("id:conflict-apply-local")).toBe(true);
  expect(app.shows("id:conflict-apply-both")).toBe(true);
  expect(app.texts()).toContain("两端都改过");
  expect(app.texts()).toContain("本地改过、云端已删");
});

test("冲突：可关闭对话框", async () => {
  const app = await open("./ConflictDialog.harness.tsx", desktop);
  await app.press("id:conflict-close");
  expect(app.texts()).toContain("closed");
});
