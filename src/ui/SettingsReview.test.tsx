import { open, test } from "nsh/test";

// Design-review captures for the settings window. Output goes to
// screenshots/design-review/current/; copy to before/ or after/ for comparison.
test("macOS settings review: font tab in light and dark", async () => {
  const dir = "screenshots/design-review/current";
  const shots: { name: string; params: Record<string, unknown> }[] = [
    { name: "settings-font-light", params: { tab: "font", locale: "en", theme: "merino-light" } },
    { name: "settings-font-dark", params: { tab: "font", locale: "en", theme: "merino-dark" } },
  ];
  try {
    for (const shot of shots) {
      const reader = await open("./SettingsSheet.harness.tsx", {
        platform: "macos",
        width: 760,
        height: 600,
        host: { params: shot.params },
      });
      await reader.screenshot(`${dir}/${shot.name}.png`);
    }
  } catch (err) {
    // Screenshot output requires nsh test --target macos; headless test runs skip capture.
    console.log("settings-review capture skipped:", String(err));
  }
});
