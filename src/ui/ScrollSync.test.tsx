import { expect, open, test } from "nsh/test";

type Snap = {
  e: number;
  p: number;
  em: number;
  pm: number;
  ec: number;
  pc: number;
  polls: number;
  frames: number;
  driver: string;
  moveHz: number;
  drives: number;
  moves: number;
};

function snap(app: { texts: () => string[] }): Snap {
  const line = app.texts().find((t) => t.startsWith("SYNC")) ?? "";
  const num = (k: string) => Number(new RegExp(`${k}=(-?\\d+)`).exec(line)?.[1] ?? NaN);
  const str = (k: string) => new RegExp(`${k}=(\\w+)`).exec(line)?.[1] ?? "";
  return {
    e: num("e"),
    p: num("p"),
    em: num("em"),
    pm: num("pm"),
    ec: num("ec"),
    pc: num("pc"),
    polls: num("polls"),
    frames: num("frames"),
    driver: str("driver"),
    moveHz: num("moveHz"),
    drives: num("drives"),
    moves: num("mv"),
  };
}

test("ScrollSync：编辑区滚动应带动预览，预览滚动应带动编辑区", async () => {
  const app = await open("./ScrollSync.harness.tsx", { width: 1200, height: 800, platform: "macos" });
  await app.wait(600);
  const start = snap(app);
  console.log("start", JSON.stringify(start));
  expect(start.em).toBeGreaterThan(0);
  expect(start.pm).toBeGreaterThan(0);
  expect(start.ec).toBeGreaterThan(start.em);

  await app.hover("id:pane-editor");
  const t0 = Date.now();
  const before = snap(app);
  await app.scroll("id:pane-editor", 900);
  await app.wait(350);
  const elapsed = Date.now() - t0;
  const after = snap(app);
  const pollHz = Math.round(((after.polls - before.polls) / elapsed) * 1000);
  const frameHz = Math.round(((after.frames - before.frames) / elapsed) * 1000);
  const moves = after.moves - before.moves;
  const drives = after.drives - before.drives;
  console.log("sync rate", { pollHz, frameHz, moveHz: after.moveHz, moves, drives });

  // 编辑区每一次位移都要在同一帧驱动预览，一次不漏（宿主降频时位移次数会变少）
  expect(moves).toBeGreaterThan(0);
  expect(drives).toBeGreaterThanOrEqual(Math.floor(moves * 0.95));

  expect(after.e).toBeGreaterThan(200);
  expect(after.p).toBeGreaterThan(0);
  expect(Math.abs(after.e / after.em - after.p / after.pm)).toBeLessThan(0.02);

  await app.scroll("id:pane-preview", 700);
  await app.waitUntil(() => {
    const s = snap(app);
    return s.p > after.p + 100 && s.e > after.e + 100;
  }, { timeout: 15000 });
  const afterPreview = snap(app);
  console.log("after preview scroll", JSON.stringify(afterPreview));
  expect(Math.abs(afterPreview.e / afterPreview.em - afterPreview.p / afterPreview.pm)).toBeLessThan(0.02);
});

/** 等两侧都真正到底（宿主降频时 List 行高收敛要更久）。 */
async function waitBottom(app: { texts: () => string[]; waitUntil: (fn: () => boolean, o?: { timeout?: number }) => Promise<void> }) {
  await app.waitUntil(() => {
    const s = snap(app);
    return s.pm > 0 && s.p >= s.pm - 5 && s.e >= s.em - 5;
  }, { timeout: 15000 });
}

test("ScrollSync：滚到底部两侧都应停住且不再回弹", async () => {
  const app = await open("./ScrollSync.harness.tsx", { width: 1200, height: 800, platform: "macos" });
  await app.wait(600);
  await app.press("id:to-bottom");
  await waitBottom(app);
  const bottom = snap(app);
  console.log("editor bottom", JSON.stringify(bottom));

  // 等到连续 300ms 偏移不再变化，再验证不回弹
  let last = NaN;
  let stableSince = 0;
  await app.waitUntil(() => {
    const s = snap(app);
    if (Number.isFinite(last) && Math.abs(s.p - last) < 1) {
      if (!stableSince) stableSince = Date.now();
    } else {
      last = s.p;
      stableSince = 0;
    }
    return stableSince > 0 && Date.now() - stableSince > 300;
  }, { timeout: 15000 });
  const settled = snap(app);
  await app.wait(400);
  const later = snap(app);
  console.log("settled", JSON.stringify(settled), "later", JSON.stringify(later));
  expect(Math.abs(later.e - settled.e)).toBeLessThan(3);
  expect(Math.abs(later.p - settled.p)).toBeLessThan(3);

  await app.press("id:to-top");
  await app.waitUntil(() => {
    const s = snap(app);
    return s.p < 5 && s.e < 5;
  }, { timeout: 15000 });
  const top = snap(app);
  console.log("preview top", JSON.stringify(top));
});

test("ScrollSync：预览追加内容后应保留滚动位置并更新内容高度", async () => {
  const app = await open("./ScrollSync.harness.tsx", { width: 1200, height: 800, platform: "macos" });
  await app.wait(600);
  await app.press("id:to-bottom");
  await waitBottom(app);
  const before = snap(app);

  await app.press("id:append");
  await app.waitUntil(() => {
    const s = snap(app);
    if (s.pm <= 0 || s.em <= 0) return false;
    return Math.abs(s.pc - before.pc) > 20 && s.p > 500 && Math.abs(s.p / s.pm - s.e / s.em) < 0.02;
  }, { timeout: 15000 });
  const after = snap(app);
  console.log("after append", JSON.stringify(after));
  expect(after.p).toBeGreaterThan(500);
});
