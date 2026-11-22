import { open, test } from "nsh/test";

// Design-review captures for the macOS shell. Output goes to
// screenshots/design-review/current/; copy to before/ or after/ for comparison.
test("macOS design review: shell in light and dark, all modes", async () => {
  const dir = "screenshots/design-review/current";
  const shots: { name: string; params: Record<string, unknown> }[] = [
    { name: "preview-light", params: { theme: "merino-light", mode: "preview" } },
    { name: "preview-light-inspector", params: { theme: "merino-light", mode: "preview", inspector: true } },
    { name: "split-light", params: { theme: "merino-light", mode: "split" } },
    { name: "edit-light", params: { theme: "merino-light", mode: "edit" } },
    { name: "preview-dark-inspector", params: { theme: "merino-dark", mode: "preview", inspector: true } },
    { name: "empty-light", params: { theme: "merino-light", empty: true } },
    { name: "preview-dark-nosidebar", params: { theme: "catppuccin-mocha", mode: "preview", sidebar: false } },
    { name: "preview-light-nosidebar", params: { theme: "merino-light", mode: "preview", sidebar: false } },
  ];
  try {
    for (const shot of shots) {
      const reader = await open("./DesignReview.harness.tsx", {
        platform: "macos",
        width: 1440,
        height: 960,
        host: { params: shot.params },
      });
      await reader.screenshot(`${dir}/${shot.name}.png`);
    }
  } catch (err) {
    // Screenshot output requires nsh test --target macos; headless test runs skip capture.
    console.log("design-review capture skipped:", String(err));
  }
});
