import { expect, test } from "nsh/test";
import { remoteNotePath } from "./paths";

test("云盘路径：复制 Google Drive 路径时不暴露本地缓存目录", () => {
  expect(remoteNotePath("google", "/StoatMD", "日记/今天.md")).toBe("Google Drive/StoatMD/日记/今天.md");
  expect(remoteNotePath("dropbox", "/Notes", "a.md")).toBe("Dropbox/Notes/a.md");
});
