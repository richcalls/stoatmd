/**
 * 主题切换：浅色 / 深色 单击无缝切换，写入 localStorage。
 */
const KEY = "stoatmd.theme";
type Pref = "light" | "dark";

const root = document.documentElement;
const toggleBtn = document.querySelector<HTMLButtonElement>("#themeToggleBtn");
const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
const media = window.matchMedia("(prefers-color-scheme: dark)");

function read(): Pref {
  try {
    const value = localStorage.getItem(KEY);
    if (value === "light" || value === "dark") return value;
  } catch {}
  return media.matches ? "dark" : "light";
}

function apply(theme: Pref, persist = false) {
  root.dataset.theme = theme;

  if (persist) {
    try {
      localStorage.setItem(KEY, theme);
    } catch {}
  }

  if (meta) {
    meta.content = theme === "dark" ? "#121311" : "#fbfbf8";
  }
}

// 初始化
apply(read());

// 监听系统深浅色偏好变更（仅在用户未显式设置时跟随）
media.addEventListener("change", (e) => {
  try {
    if (!localStorage.getItem(KEY)) {
      apply(e.matches ? "dark" : "light");
    }
  } catch {}
});

// 单击按钮直接切换
toggleBtn?.addEventListener("click", () => {
  const current = root.dataset.theme === "dark" ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  apply(next, true);
});

