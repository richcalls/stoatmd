import { signal } from "nsh";
import { loadSavedSettingsFrame, saveSettingsFrame } from "./prefs";

export type SettingsWindowFrame = { x: number; y: number };

/** 设置浮窗相对主窗口内容区的位置；null 表示首次打开时居中。 */
export const settingsWindowFrame = signal<SettingsWindowFrame | null>(null);

/** 启动时恢复上次拖到的位置。 */
export async function restoreSettingsWindowFrame(): Promise<void> {
  const saved = await loadSavedSettingsFrame();
  if (saved) settingsWindowFrame.set(saved);
}

/** 拖动中的实时位置（不写盘）。 */
export function moveSettingsWindowFrame(x: number, y: number): void {
  settingsWindowFrame.set({ x: Math.round(x), y: Math.round(y) });
}

/** 拖动结束或关闭时落盘，下次打开回到原处。 */
export function rememberSettingsWindowFrame(): void {
  const frame = settingsWindowFrame();
  if (frame) void saveSettingsFrame(frame.x, frame.y);
}
