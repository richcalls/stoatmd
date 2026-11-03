import { expect, test } from "nsh/test";
import { libraryPath, remoteNotePath } from "./paths";

test("云盘路径：复制 Google Drive 路径时不暴露本地缓存目录", () => {
  expect(remoteNotePath("google", "/StoatMD", "日记/今天.md")).toBe("Google Drive/StoatMD/日记/今天.md");
  expect(remoteNotePath("dropbox", "/Notes", "a.md")).toBe("Dropbox/Notes/a.md");
});

test("sync paths: only the root StoatMD JSON config joins hidden-file allowlist", () => {
  expect(libraryPath(".stoatmd.json")).toBe(true);
  expect(libraryPath(".stoatmd/draft.json")).toBe(false);
  expect(libraryPath("folder/.stoatmd.json")).toBe(false);
  expect(libraryPath(".other-config.json")).toBe(false);
});
