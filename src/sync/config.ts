import { SyncConfig, type SyncConfigDto } from "stoatmd/native";
import type { ProviderId } from "./types";

export type ProviderCredentials = {
  clientId: string;
  clientSecret: string;
  /** Dropbox 需固定回调端口；Google 用随机端口。 */
  redirectPort: number | null;
};

let cached: SyncConfigDto | null = null;
let fixed: SyncConfigDto | null = null;

/** 测试 harness 专用：固定配置，避免本机环境变量 / sync.json 左右 UI 测试。 */
export function fixSyncConfigForTest(config: SyncConfigDto | null): void {
  fixed = config;
  cached = config;
}

/** 开发者配置（环境变量 / sync.json），进程内缓存。 */
export function loadSyncConfig(refresh = false): SyncConfigDto {
  if (fixed) return fixed;
  if (!cached || refresh) cached = SyncConfig.load();
  return cached;
}

export function credentialsFor(
  provider: ProviderId,
  config: SyncConfigDto,
): ProviderCredentials | null {
  if (provider === "google") {
    if (!config.googleClientId) return null;
    return {
      clientId: config.googleClientId,
      clientSecret: config.googleClientSecret,
      redirectPort: null,
    };
  }
  if (!config.dropboxAppKey) return null;
  return {
    clientId: config.dropboxAppKey,
    clientSecret: config.dropboxAppSecret,
    redirectPort: config.dropboxRedirectPort > 0 ? config.dropboxRedirectPort : null,
  };
}

/** 缺凭据时给开发者的可执行提示（界面展示环境变量名，不泄漏任何 secret）。 */
export function credentialsHint(provider: ProviderId): string {
  if (provider === "google") {
    return "STOATMD_GOOGLE_CLIENT_ID / STOATMD_GOOGLE_CLIENT_SECRET";
  }
  return "STOATMD_DROPBOX_APP_KEY / STOATMD_DROPBOX_APP_SECRET";
}
