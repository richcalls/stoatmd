import { expect, test } from "nsh/test";
import { parsePortableConnection } from "./portable";

test("portable connection：只接受完整的云盘绑定，根目录的空 id / path 合法", () => {
  const record = { provider: "google", account: "me@example.com", remoteId: "root", remotePath: "/Notes", remoteName: "Notes" };
  expect(parsePortableConnection(JSON.stringify(record))).toEqual(record);
  expect(parsePortableConnection(null)).toBe(null);
  expect(parsePortableConnection("")).toBe(null);
  expect(parsePortableConnection("not json")).toBe(null);
  // 本地库不能跨设备恢复：只认两家云盘。
  expect(parsePortableConnection(JSON.stringify({ provider: "local", remoteId: "x", remotePath: "", remoteName: "" }))).toBe(null);
  // 云盘根目录的 id / path 就是空串。
  expect(parsePortableConnection(JSON.stringify({ provider: "dropbox", account: null, remoteId: "", remotePath: "", remoteName: "" })))
    .toEqual({ provider: "dropbox", account: null, remoteId: "", remotePath: "", remoteName: "" });
});
