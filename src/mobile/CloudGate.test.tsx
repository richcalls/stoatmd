import { expect, open, test } from "nsh/test";

const phone = { platform: "ios" as const, width: 390, height: 844, locale: "zh-CN" };

test("iOS paid app starts with its two included cloud providers", async () => {
  const app = await open("./CloudGate.harness.tsx", phone);
  await app.waitFor("id:storage-location-google");
  expect(app.shows("id:storage-location-dropbox")).toBe(true);
  expect(app.shows("id:storage-location-local")).toBe(false);
  expect(app.shows("id:mobile-new-note")).toBe(false);
  expect(app.shows("id:mobile-import")).toBe(false);
  expect(app.texts().some(text => text.includes("Pro"))).toBe(false);
  await app.press("id:storage-location-google");
  await app.waitFor("text:缺少云盘客户端配置。请先补齐开发者配置再试。");
  expect(app.shows("id:mobile-connect")).toBe(true);
  expect(app.shows("id:sync-paywall")).toBe(false);
});

test("iOS keeps legacy local records behind the cloud connection screen", async () => {
  const app = await open("./CloudGate.harness.tsx", { ...phone, storage: {
    "storage.active": JSON.stringify({ version: 1, root: "/legacy/local", connection: null, cleanup: null }),
  } });
  await app.waitFor("id:storage-location-google");
  expect(app.shows("id:mobile-new-note")).toBe(false);
  expect(app.shows("id:storage-location-local")).toBe(false);
});
