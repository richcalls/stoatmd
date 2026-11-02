import { platform } from "nsh";
import { TokenVault } from "stoatmd/native";
import type { SyncConnection } from "../sync/runtime";
import type { ProviderId } from "../sync/types";

/**
 * 「已绑定的云盘」记录，与 OAuth token 一起放在 iCloud 钥匙串：
 * 同一 Apple ID 下的新设备装好后直接建缓存进库，不用重新授权、也不用再选文件夹。
 */
const KEY = "state.connection";

export type PortableConnection = {
  provider: ProviderId;
  account: string | null;
  remoteId: string;
  remotePath: string;
  remoteName: string;
};

/** 只接受完整的云盘绑定记录；根目录的 id / path 可以是空串。 */
export function parsePortableConnection(raw: string | null): PortableConnection | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PortableConnection>;
    if (!value || (value.provider !== "google" && value.provider !== "dropbox") ||
      typeof value.remoteId !== "string" || typeof value.remotePath !== "string" ||
      typeof value.remoteName !== "string") return null;
    return {
      provider: value.provider,
      account: typeof value.account === "string" ? value.account : null,
      remoteId: value.remoteId,
      remotePath: value.remotePath,
      remoteName: value.remoteName,
    };
  } catch {
    return null;
  }
}

let sharedStorage: boolean | null = null;

/**
 * 只有真正的 iOS 目标才读写同步钥匙串。
 * headless 测试里 `platform.os` 也会报 "ios"，但原生调用会写到开发机钥匙串，
 * 所以再用 TokenVault.isIos() 确认一次。
 */
function sharedStorageAvailable(): boolean {
  if (platform.os !== "ios") return false;
  if (sharedStorage === null) {
    let value = false;
    try { value = TokenVault.isIos(); } catch { value = false; }
    sharedStorage = value;
  }
  return sharedStorage === true;
}

export function readPortableConnection(): PortableConnection | null {
  if (!sharedStorageAvailable()) return null;
  try { return parsePortableConnection(TokenVault.get(KEY)); } catch { return null; }
}

export function writePortableConnection(connection: SyncConnection | null): void {
  if (!sharedStorageAvailable()) return;
  try {
    const next = connection ? JSON.stringify({
      provider: connection.provider,
      account: connection.account,
      remoteId: connection.remoteId,
      remotePath: connection.remotePath,
      remoteName: connection.remoteName,
    } satisfies PortableConnection) : null;
    const current = TokenVault.get(KEY);
    if (next ? next === current : !current) return;
    if (next) TokenVault.set(KEY, next);
    else TokenVault.delete(KEY);
  } catch (err) {
    console.warn("portable connection write failed", err);
  }
}
