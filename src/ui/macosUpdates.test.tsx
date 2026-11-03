import { expect, test } from "nsh/test";
import { checkLatestVersion, compareAppVersions } from "./macosUpdates";

test("macOS update check compares semantic versions including prereleases", () => {
  expect(compareAppVersions("v1.10.0", "1.9.9")).toBe(1);
  expect(compareAppVersions("1.2.0-beta.2", "1.2.0-beta.10")).toBe(-1);
  expect(compareAppVersions("1.2.0", "1.2.0-rc.1")).toBe(1);
  expect(compareAppVersions("1.2.0+14", "v1.2.0+15")).toBe(0);
});

test("macOS update check uses only a newer stable GitHub release", async () => {
  const request = async () => new Response(JSON.stringify({ tag_name: "v1.3.0", prerelease: false }));
  expect(await checkLatestVersion("1.2.0", request as typeof fetch)).toBe("1.3.0");
  expect(await checkLatestVersion("1.3.0", request as typeof fetch)).toBe("current");
});
