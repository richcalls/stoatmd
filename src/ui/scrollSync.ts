import type { EditorRef } from "nsh/base";
import type { ScrollEvent, YNode } from "nsh";

/** 编辑区行高：隐藏探针与可见编辑器必须一致。 */
export const EDITOR_LINE_HEIGHT = 24;

type Mode = "edit" | "split" | "preview";

/**
 * 编辑区没有滚动事件，只能逐帧读 `scrollOffset()`；
 * 预览的 `onScroll` 是原生回调。两侧都换算成「可滚动比例」互相驱动，
 * 并用回环窗口把程序化滚动引发的回声过滤掉。
 */
const S = {
  mode: "edit" as Mode,
  editor: null as EditorRef | null,
  hidden: null as EditorRef | null,
  preview: null as YNode | null,
  editorContentH: 0,
  editorViewH: 0,
  editorY: 0,
  previewContentH: 0,
  previewViewH: 0,
  previewY: 0,
  hiddenViewH: 1,
  /** 正在驱动的一方：编辑器被用户滚动时为 "editor"，预览被用户滚动时为 "preview"。 */
  driver: null as "editor" | "preview" | null,
  editorTarget: -1,
  editorTargetAt: 0,
  previewTarget: -1,
  previewTargetAt: 0,
  lastPreviewEventAt: 0,
  hotUntil: 0,
  hovered: false,
  focused: false,
  measureTimer: 0,
  measureTries: 0,
  pollInFlight: false,
  pollQueued: false,
  loopStarted: false,
  /** 轻推窗口：窗口内且偏移贴近 nudgeY 的事件是程序化滚动。 */
  nudgeUntil: 0,
  nudgeY: 0,
  nudgeId: 0,
  frames: 0,
  polls: 0,
  lastMoveAt: 0,
  moveGaps: [] as number[],
  drives: 0,
  moves: 0,
};

const ECHO_MS = 200;
const ECHO_PX = 2;
const NUDGE_ECHO_PX = 8;
const PREVIEW_DRIVE_MS = 250;
/** setScrollOffset 后原生的夹紧要等下一轮排版，等这么久再读。 */
const MEASURE_SETTLE_MS = 100;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const now = () => Date.now();
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function editorScrollMax(): number {
  if (S.editorContentH <= 0) return 0;
  // 编辑器关掉了 scrollBeyondLastLine：最大偏移 = 内容高 - 视口高
  const viewH = S.editorViewH > 0 ? S.editorViewH : EDITOR_LINE_HEIGHT;
  return Math.max(0, S.editorContentH - viewH);
}

export function previewScrollMax(): number {
  return Math.max(0, S.previewContentH - S.previewViewH);
}

/** 测试读取的快照；生产代码不调用，保持零开销。 */
export function scrollSyncSnapshot() {
  return {
    editorY: S.editorY,
    previewY: S.previewY,
    editorMax: editorScrollMax(),
    previewMax: previewScrollMax(),
    editorContentH: S.editorContentH,
    previewContentH: S.previewContentH,
    editorViewH: S.editorViewH,
    previewViewH: S.previewViewH,
    frames: S.frames,
    polls: S.polls,
    driver: S.driver,
    moveHz: moveHz(),
    drives: S.drives,
    moves: S.moves,
  };
}

/** 滚动中两次读到新偏移的间隔中位数换算成频率（≈ 同步刷新率）。 */
function moveHz(): number {
  const gaps = S.moveGaps;
  if (gaps.length === 0) return 0;
  const sorted = [...gaps].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return median > 0 ? Math.round(1000 / median) : 0;
}

export function attachEditor(ref: EditorRef | null) {
  S.editor = ref;
  if (ref) {
    void readEditorOffset();
    ensureLoop();
  }
}

export function attachHiddenEditor(ref: EditorRef | null) {
  S.hidden = ref;
  if (ref && S.mode === "split") scheduleMeasure(30);
}

export function attachPreview(node: YNode | null) {
  // 预览换文时 List 会对同一个节点再回调一次 ref：不能重置进度
  if (S.preview === node) return;
  S.preview = node;
  if (!node) return;
  S.driver = null;
  S.previewY = 0;
  S.previewContentH = 0;
  S.previewViewH = 0;
  // List 只在滚动时上报 contentSize / 视口，轻推一下让原生先报一次布局
  S.nudgeId += 1;
  S.nudgeY = 0;
  S.nudgeUntil = now() + 400;
  node.scrollTo({ y: 1, animated: false });
  setTimeout(() => {
    if (S.preview !== node) return;
    node.scrollTo({ y: 0, animated: false });
  }, 120);
}

/** 预览换文后 List 的内容高度会变且不上报：反复轻推 1px 换来新的 contentSize。 */
export function refreshPreviewMetrics() {
  const preview = S.preview;
  if (!preview || S.mode !== "split") return;
  scheduleMeasure(80);
  const id = ++S.nudgeId;
  const sizeAtStart = S.previewContentH;
  S.nudgeUntil = now() + 900;
  let round = 0;
  const step = () => {
    if (S.nudgeId !== id || S.preview !== preview || S.mode !== "split") return;
    // 贴边时向外的偏移会被夹紧、不产生滚动事件：朝可达方向推
    const from = S.previewY;
    S.nudgeY = from;
    preview.scrollTo({ y: from > 0 ? from - 1 : from + 1, animated: false });
    setTimeout(() => {
      if (S.nudgeId !== id || S.preview !== preview || S.mode !== "split") return;
      preview.scrollTo({ y: from, animated: false });
      round += 1;
      // 数据更新要等下一轮排版才反映到 contentSize：没拿到新尺寸就再推一轮
      if (S.previewContentH === sizeAtStart && round < 3) {
        setTimeout(step, 130);
        return;
      }
      // 预览换文后以编辑区为准重新对齐：内容高度变了，原偏移对应的比例也变了
      setTimeout(() => {
        if (S.nudgeId !== id || S.preview !== preview || S.mode !== "split") return;
        S.driver = "editor";
        drivePreviewFromEditor(S.editorY);
      }, 60);
    }, 50);
  };
  step();
}

/** 把预览跳到某个偏移（大纲跳转等）；随后的 onScroll 会像用户滚动一样带动编辑区。 */
export function scrollPreviewTo(y: number) {
  const preview = S.preview;
  if (!preview) return;
  preview.scrollTo({ y, animated: false });
  if (y < 1e6) return;
  // List 的行高估算在滚动中收敛，内容高度会逐轮变大：补滚到尺寸稳定为止。
  // 贴底时改用相邻 1px 的目标，旧内容高度下的「底」也能产生滚动事件、上报新尺寸。
  let tries = 20;
  let stableH = -1;
  let stable = 0;
  let near = false;
  const retry = () => {
    setTimeout(() => {
      if (S.preview !== preview || S.mode !== "split" || tries <= 0) return;
      tries -= 1;
      const max = previewScrollMax();
      const atBottom = max > 0 && S.previewY >= max - 2;
      const h = Math.round(S.previewContentH);
      stable = atBottom && h === stableH ? stable + 1 : 0;
      stableH = h;
      if (stable >= 4) return;
      if (atBottom) {
        near = !near;
        preview.scrollTo({ y: near ? max - 1 : max, animated: false });
      } else {
        preview.scrollTo({ y: 1e7, animated: false });
      }
      retry();
    }, 120);
  };
  retry();
}

export function setSyncMode(mode: Mode) {
  if (S.mode === mode) return;
  S.mode = mode;
  S.driver = null;
  S.editorTarget = -1;
  S.previewTarget = -1;
  if (mode === "split") {
    ensureLoop();
    scheduleMeasure(30);
  }
  ensureLoop();
}

export function setEditorViewHeight(h: number) {
  if (h > 0 && Math.abs(h - S.editorViewH) > 0.5) S.editorViewH = h;
}

export function setPreviewViewHeight(h: number) {
  if (h > 0 && Math.abs(h - S.previewViewH) > 0.5) S.previewViewH = h;
}

export function setHiddenViewHeight(h: number) {
  if (h > 0) S.hiddenViewH = h;
}

export function markEditorHover(hovered: boolean) {
  S.hovered = hovered;
  if (hovered) S.hotUntil = now() + 400;
}

export function markEditorFocus(focused: boolean) {
  S.focused = focused;
  if (focused) S.hotUntil = now() + 400;
}

/** 预览原生滚动回调：回环过滤后驱动编辑区。 */
export function handlePreviewScroll(e: ScrollEvent) {
  if (S.mode !== "split") return;
  const viewH = e.size.height;
  const contentH = e.contentSize.height;
  if (viewH > 0) S.previewViewH = viewH;
  if (contentH > 0) S.previewContentH = contentH;
  const max = previewScrollMax();
  const y = clamp(e.offset.y, 0, max);
  const t = now();
  // List 的偏移在估算行高收敛时会和指令目标差出几十像素，
  // 所以按「谁在驱动」的时间窗判回声，而不是逐像素比对。
  const nudgeEcho = t < S.nudgeUntil && Math.abs(y - S.nudgeY) <= NUDGE_ECHO_PX;
  const echo =
    nudgeEcho || (S.driver === "editor" && t - S.previewTargetAt <= ECHO_MS);
  S.previewY = y;
  if (echo) {
    // 行高收敛后同一个比例的落点会漂开：按新的 contentSize 再驱动一次
    if (S.driver === "editor" && Math.abs(y - S.previewTarget) > 8) {
      drivePreviewFromEditor(S.editorY);
    }
    return;
  }
  // 用户在轻推窗口里自己滚了：停掉轻推，别把预览拉回旧位置
  if (t < S.nudgeUntil) {
    S.nudgeUntil = 0;
    S.nudgeId += 1;
  }
  S.previewTarget = -1;
  S.driver = "preview";
  S.lastPreviewEventAt = t;
  S.hotUntil = t + 400;
  driveEditorFromPreview(y, max);
}

function driveEditorFromPreview(y: number, max: number) {
  const editor = S.editor;
  const emax = editorScrollMax();
  if (!editor || emax <= 0) return;
  const p = max > 0 ? clamp(y / max, 0, 1) : 0;
  const target = p * emax;
  if (Math.abs(target - S.editorY) < 0.5) return;
  S.editorTarget = target;
  S.editorTargetAt = now();
  // 先记下目标：轮询读到的中间值仍会被回环窗口接住
  S.editorY = target;
  editor.setScrollOffset({ x: 0, y: target });
}

function drivePreviewFromEditor(y: number) {
  const preview = S.preview;
  const emax = editorScrollMax();
  const pmax = previewScrollMax();
  if (!preview || emax <= 0 || pmax <= 0) return;
  const p = clamp(y / emax, 0, 1);
  const target = p * pmax;
  if (Math.abs(target - S.previewY) < 0.5) {
    return;
  }
  S.previewTarget = target;
  S.previewTargetAt = now();
  S.previewY = target;
  S.drives += 1;
  preview.scrollTo({ y: target, animated: false });
}

async function readEditorOffset() {
  const editor = S.editor;
  if (!editor) return;
  if (S.pollInFlight) {
    // 这一帧的偏移还没读回来：读完立刻补读，别把这一帧漏掉
    S.pollQueued = true;
    return;
  }
  S.pollInFlight = true;
  S.polls += 1;
  try {
    const p = await editor.scrollOffset();
    handleEditorOffset(p.y);
  } catch {
    // 编辑器尚未布局：下一帧再读
  } finally {
    S.pollInFlight = false;
    if (S.pollQueued) {
      S.pollQueued = false;
      void readEditorOffset();
    }
  }
}

function handleEditorOffset(rawY: number) {
  const y = Math.max(0, rawY);
  const t = now();
  if (Math.abs(y - S.editorY) <= 0.5) return;

  S.moves += 1;
  if (S.lastMoveAt > 0 && t > S.lastMoveAt) {
    S.moveGaps.push(t - S.lastMoveAt);
    if (S.moveGaps.length > 32) S.moveGaps.shift();
  }
  S.lastMoveAt = t;

  const echo =
    S.editorTarget >= 0 &&
    Math.abs(y - S.editorTarget) <= ECHO_PX &&
    t - S.editorTargetAt <= ECHO_MS;
  S.editorY = y;
  if (echo) {
    S.editorTargetAt = t;
    return;
  }
  S.editorTarget = -1;
  // 预览正在被用户拖动：编辑区的变化是上一条指令的滞后回声
  if (S.driver === "preview" && t - S.lastPreviewEventAt < PREVIEW_DRIVE_MS) {
    return;
  }

  S.driver = "editor";
  S.hotUntil = t + 400;
  drivePreviewFromEditor(y);
}

function ensureLoop() {
  if (S.loopStarted) return;
  S.loopStarted = true;
  const tick = () => {
    S.frames += 1;
    const t = now();
    const hot = S.hovered || S.focused || t < S.hotUntil;
    if (S.mode === "split" && S.editor && (hot || S.frames % 15 === 0)) {
      void readEditorOffset();
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function scheduleMeasure(delay: number) {
  if (S.measureTimer) clearTimeout(S.measureTimer);
  S.measureTries = 0;
  S.measureTimer = setTimeout(() => {
    S.measureTimer = 0;
    void measureEditorContent();
  }, delay);
}

/**
 * 隐藏探针（高 1 点）滚到最大值，得到可见编辑器的内容高度：
 * 编辑器最大偏移 = 内容高 - min(视口高, 行高)，正是滚动同步要的换算基准。
 */
async function measureEditorContent() {
  const hidden = S.hidden;
  if (!hidden || S.mode !== "split") return;
  try {
    hidden.setScrollOffset({ x: 0, y: 1e7 });
    // 刚 set 完立刻读会拿到未夹紧的原值，等原生排版完这一轮
    await sleep(MEASURE_SETTLE_MS);
    if (S.hidden !== hidden || S.mode !== "split") return;
    const p = await hidden.scrollOffset();
    // 还没布局出文本时偏移不会被夹紧，原值返回
    if (p.y < 1e6) {
      const contentH = p.y + Math.max(1, Math.min(S.hiddenViewH, EDITOR_LINE_HEIGHT));
      if (contentH >= EDITOR_LINE_HEIGHT) {
        const changed = Math.abs(contentH - S.editorContentH) > 1;
        if (changed) {
          S.editorContentH = contentH;
          // 编辑器高度变了，比例基准跟着变：按新基准把预览对齐回来
          if (S.driver !== "preview") {
            S.driver = "editor";
            drivePreviewFromEditor(S.editorY);
          }
        }
        return;
      }
    }
  } catch {
    // 下面的重试兜底
  }
  // 隐藏编辑器可能还没布局出文本：短时间内重试几次
  if (S.measureTries < 10 && S.mode === "split") {
    S.measureTries += 1;
    S.measureTimer = setTimeout(() => {
      S.measureTimer = 0;
      void measureEditorContent();
    }, 60 + S.measureTries * 40);
  }
}
