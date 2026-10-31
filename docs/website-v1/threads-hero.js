/* StoatMD website-v1 · Hero PRO Threads（仅暗色 · ring · ocean） */
(function () {
  const SETTINGS =
    "speed=0.35&spin=0.22&gain=0.8&glow=0.32&threshold=0.72&saturation=0.7&warm=0.4&parallax=0.35&threads=0.85&sheen=0.45&sparkle=0.25&quality=0.55";
  function mount() {
    const host = document.getElementById("heroThreads");
    if (!host || host.querySelector("pro-threads")) return;
    let settings = SETTINGS;
    const t = new URLSearchParams(location.search).get("threadsT");
    if (t && !Number.isNaN(Number(t))) settings += "&t=" + encodeURIComponent(t);
    const el = document.createElement("pro-threads");
    el.setAttribute("scene", "ring");
    el.setAttribute("palette", "ocean");
    el.setAttribute("fps", "30");
    el.setAttribute("settings", settings);
    el.setAttribute("aria-hidden", "true");
    el.style.cssText = "position:absolute;inset:0;width:100%;height:100%;background:#1C1A17";
    host.appendChild(el);
    host.classList.add("is-on");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
