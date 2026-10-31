/* StoatMD website-v1 · theme + language controllers */
(function () {
  const META = window.STOATMD_LANG_META;
  const I18N = window.STOATMD_I18N;
  const SUPPORTED = ["en", "zh", "zh-Hant", "ja", "ko", "de", "fr", "es"];
  const DOC_TITLE = "StoatMD — Buy once · unlock sync";

  function detectBrowserLang() {
    const list = navigator.languages && navigator.languages.length
      ? Array.from(navigator.languages)
      : [navigator.language || "en"];
    for (const raw of list) {
      const l = (raw || "").toLowerCase();
      if (l.startsWith("zh-hant") || l.startsWith("zh-tw") || l.startsWith("zh-hk") || l.startsWith("zh-mo")) return "zh-Hant";
      if (l.startsWith("zh")) return "zh";
      if (l.startsWith("ja")) return "ja";
      if (l.startsWith("ko")) return "ko";
      if (l.startsWith("de")) return "de";
      if (l.startsWith("fr")) return "fr";
      if (l.startsWith("es")) return "es";
      if (l.startsWith("en")) return "en";
    }
    return "en";
  }

  function resolveLang(pref) {
    if (!pref || pref === "system") return detectBrowserLang();
    return SUPPORTED.includes(pref) ? pref : "en";
  }

  function applyLang(pref, { persist, touch } = {}) {
    const prefNorm = pref === "system" ? "system" : (SUPPORTED.includes(pref) ? pref : "en");
    const resolved = resolveLang(prefNorm);
    const dict = I18N[resolved] || I18N.en;
    const meta = META[resolved] || META.en;
    document.documentElement.lang = meta.htmlLang || "en";
    document.title = dict["doc.title"] || DOC_TITLE;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (dict[key] == null) return;
      if (el.dataset.i18nHtml === "1") el.innerHTML = dict[key];
      else el.textContent = dict[key];
    });
    const img = document.querySelector(".hero-shot img");
    if (img && dict["img.alt"]) img.alt = dict["img.alt"];

    const banner = document.getElementById("draftBanner");
    if (banner) {
      const pending = !!(META[resolved] && META[resolved].pending);
      banner.textContent = dict["draft.banner"] || "";
      banner.classList.toggle("show", pending);
    }

    const label = document.getElementById("langBtnLabel");
    if (label) {
      const showKey = prefNorm === "system" ? "system" : resolved;
      label.textContent = (META[showKey] && META[showKey].label) || resolved;
    }
    document.querySelectorAll("#langMenu [data-lang]").forEach((btn) => {
      const code = btn.getAttribute("data-lang");
      const selected = prefNorm === "system" ? code === "system" : code === resolved;
      btn.setAttribute("aria-selected", selected ? "true" : "false");
    });

    try {
      if (persist !== false) localStorage.setItem("stoatmd.langPref", prefNorm);
      if (touch) localStorage.setItem("stoatmd.langTouched", "1");
    } catch (_) {}

    const url = new URL(location.href);
    if (prefNorm === "system") url.searchParams.delete("lang");
    else url.searchParams.set("lang", resolved);
    history.replaceState(null, "", url);

    document.documentElement.dataset.lang = resolved;
    document.documentElement.dataset.langPref = prefNorm;
  }


  const wrap = document.getElementById("langWrap");
  const langBtn = document.getElementById("langBtn");
  const langMenu = document.getElementById("langMenu");
  if (langBtn && wrap) {
    langBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = wrap.classList.toggle("open");
      langBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", () => {
      wrap.classList.remove("open");
      langBtn.setAttribute("aria-expanded", "false");
    });
    if (langMenu) langMenu.addEventListener("click", (e) => e.stopPropagation());
  }
  document.querySelectorAll("#langMenu [data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const code = btn.getAttribute("data-lang");
      applyLang(code, { persist: true, touch: true });
      if (wrap) wrap.classList.remove("open");
      if (langBtn) langBtn.setAttribute("aria-expanded", "false");
    });
  });


  (function init() {
    const params = new URLSearchParams(location.search);
    let langPref = "system";
    const qLang = params.get("lang");
    if (qLang && (qLang === "system" || SUPPORTED.includes(qLang))) {
      langPref = qLang;
    } else {
      try {
        const touched = localStorage.getItem("stoatmd.langTouched");
        const saved = localStorage.getItem("stoatmd.langPref");
        if (touched && saved && (saved === "system" || SUPPORTED.includes(saved))) langPref = saved;
      } catch (_) {}
    }

    document.documentElement.setAttribute("data-theme", "dark");
    applyLang(langPref, { persist: false });
  })();

  window.StoatMDSite = { applyLang, resolveLang, detectBrowserLang };
})();
