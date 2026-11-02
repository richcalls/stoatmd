/**
 * 主题切换：默认跟随系统，手动选择写入 localStorage。
 * 首屏防闪烁由 BaseLayout 里的内联脚本负责；这里负责菜单与状态同步。
 */
const KEY = "stoatmd.theme";
type Pref = "system" | "light" | "dark";

const root = document.documentElement;
const picker = document.querySelector<HTMLDetailsElement>("#themePicker");
const current = picker?.querySelector<HTMLElement>("[data-theme-current]");
const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
const media = window.matchMedia("(prefers-color-scheme: dark)");

function isPref(value: string | null): value is Pref {
  return value === "system" || value === "light" || value === "dark";
}

function read(): Pref {
  try {
    const value = localStorage.getItem(KEY);
    return isPref(value) ? value : "system";
  } catch {
    return "system";
  }
}

function effective(pref: Pref): "light" | "dark" {
  return pref === "system" ? (media.matches ? "dark" : "light") : pref;
}

function apply(pref: Pref, persist = false) {
  if (pref === "system") root.removeAttribute("data-theme");
  else root.dataset.theme = pref;

  if (persist) {
    try {
      localStorage.setItem(KEY, pref);
    } catch {
      /* ignore */
    }
  }

  const label = picker
    ?.querySelector<HTMLElement>(`[data-theme-pref="${pref}"]`)
    ?.textContent?.trim();
  if (current && label) current.textContent = label;

  picker
    ?.querySelectorAll<HTMLElement>("[data-theme-pref]")
    .forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.themePref === pref),
      ),
    );

  if (meta)
    meta.content = effective(pref) === "dark" ? "#121311" : "#fbfbf8";
}

apply(read());

media.addEventListener("change", () => {
  if (read() === "system") apply("system");
});

picker
  ?.querySelectorAll<HTMLElement>("[data-theme-pref]")
  .forEach((button) => {
    button.addEventListener("click", () => {
      apply(button.dataset.themePref as Pref, true);
      picker.open = false;
    });
  });

document.addEventListener("click", (event) => {
  if (
    picker?.open &&
    event.target instanceof Node &&
    !picker.contains(event.target)
  )
    picker.open = false;
});

picker?.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    picker.open = false;
    picker.querySelector("summary")?.focus();
  }
});
