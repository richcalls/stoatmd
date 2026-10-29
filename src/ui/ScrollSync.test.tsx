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

  // 编辑区每一次位移都要在同一帧驱动预览，一次不漏
  expect(moves).toBeGreaterThan(5);
  expect(drives).toBeGreaterThanOrEqual(Math.floor(moves * 0.95));

  expect(after.e).toBeGreaterThan(200);
  expect(after.p).toBeGreaterThan(0);
  expect(Math.abs(after.e / after.em - after.p / after.pm)).toBeLessThan(0.02);

  await app.scroll("id:pane-preview", 700);
  await app.wait(350);
  const afterPreview = snap(app);
  console.log("after preview scroll", JSON.stringify(afterPreview));
  expect(afterPreview.p).toBeGreaterThan(after.p + 100);
  expect(afterPreview.e).toBeGreaterThan(after.e + 100);
  expect(Math.abs(afterPreview.e / afterPreview.em - afterPreview.p / afterPreview.pm)).toBeLessThan(0.02);
});

test("ScrollSync：滚到底部两侧都应停住且不再回弹", async () => {
  const app = await open("./ScrollSync.harness.tsx", { width: 1200, height: 800, platform: "macos" });
  await app.wait(600);
  await app.press("id:to-bottom");
  await app.wait(600);
  const bottom = snap(app);
  console.log("editor bottom", JSON.stringify(bottom));
  expect(bottom.p).toBeGreaterThan(bottom.pm - 5);
  expect(bottom.e).toBeGreaterThan(bottom.em - 5);

  const settled = snap(app);
  await app.wait(400);
  const later = snap(app);
  console.log("settled", JSON.stringify(settled), "later", JSON.stringify(later));
  expect(Math.abs(later.e - settled.e)).toBeLessThan(3);
  expect(Math.abs(later.p - settled.p)).toBeLessThan(3);

  await app.press("id:to-top");
  await app.wait(500);
  const top = snap(app);
  console.log("preview top", JSON.stringify(top));
  expect(top.p).toBeLessThan(5);
  expect(top.e).toBeLessThan(5);
});

test("ScrollSync：预览追加内容后应保留滚动位置并更新内容高度", async () => {
  const app = await open("./ScrollSync.harness.tsx", { width: 1200, height: 800, platform: "macos" });
  await app.wait(600);
  await app.press("id:to-bottom");
  await app.wait(700);
  const before = snap(app);
  expect(before.p).toBeGreaterThan(before.pm - 5);

  await app.press("id:append");
  await app.wait(900);
  const after = snap(app);
  console.log("after append", JSON.stringify(after));
  // 不应被重置回顶部；两侧按新的内容高度重新对齐
  expect(after.p).toBeGreaterThan(500);
  expect(Math.abs(after.pc - before.pc)).toBeGreaterThan(20);
  const ratioE = after.e / after.em;
  const ratioP = after.p / after.pm;
  expect(Math.abs(ratioE - ratioP)).toBeLessThan(0.02);
});
