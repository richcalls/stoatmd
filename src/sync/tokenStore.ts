import { TokenVault } from "stoatmd/native";
import type { TokenBundle } from "./oauth";
import type { TokenStore } from "./tokens";
import type { ProviderId } from "./types";

/**
 * macOS 登录钥匙串（原生 TokenVault）；读取/写入失败时退回会话内存储。
 * 文档要求 token 不进普通偏好，所以这里绝不写 Storage。
 */
export class KeychainTokenStore implements TokenStore {
  async load(provider: ProviderId): Promise<TokenBundle | null> {
    try {
      const raw = TokenVault.get(provider);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as TokenBundle;
      return parsed && typeof parsed.accessToken === "string" ? parsed : null;
    } catch {
      return null;
    }
  }

  async save(provider: ProviderId, bundle: TokenBundle): Promise<void> {
    try {
      TokenVault.set(provider, JSON.stringify(bundle));
    } catch (err) {
      console.warn("token keychain write failed", err);
    }
  }

  async clear(provider: ProviderId): Promise<void> {
    try {
      TokenVault.delete(provider);
    } catch (err) {
      console.warn("token keychain delete failed", err);
    }
  }
}
