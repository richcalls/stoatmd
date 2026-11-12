import { open, type App, type OpenOptions } from "nsh/test";

/**
 * nsh 0.5 起，`nsh test --target ios` / `android` 下 app 铺满设备屏幕，
 * `width` / `height` 会被拒绝（`ERR_NSH_TEST_UNSUPPORTED`，见 `.nsh/types/nsh/test.d.ts` 的 `open`）。
 * 截图测试既要在无头引擎里按固定视口跑断言，也要能在模拟器上跑出真图：
 * 设备目标下丢掉宽高重新打开即可（打开失败发生在 app 启动之前，重试没有副作用）。
 */
function unsupportedViewport(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  if (code === "ERR_NSH_TEST_UNSUPPORTED") return true;
  return /unsupported on --target/i.test((error as Error | null)?.message ?? "");
}

/** 打开 harness：无头目标用 `options` 的视口尺寸；设备目标忽略宽高。 */
export async function openApp(entry: string, options?: OpenOptions | null): Promise<App> {
  try {
    return await open(entry, options);
  } catch (error) {
    if (!options || (options.width == null && options.height == null) || !unsupportedViewport(error)) {
      throw error;
    }
    const rest: OpenOptions = { ...options };
    delete rest.width;
    delete rest.height;
    return await open(entry, rest);
  }
}
