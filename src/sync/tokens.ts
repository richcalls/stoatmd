import type { SyncConfigDto } from "stoatmd/native";
import {
  authorizeProvider,
  refreshTokenBundle,
  type OAuthDeps,
  type TokenBundle,
} from "./oauth";
import { SyncError } from "./provider";
import type { ProviderId } from "./types";

export type TokenStore = {
  load(provider: ProviderId): Promise<TokenBundle | null>;
  save(provider: ProviderId, bundle: TokenBundle): Promise<void>;
  clear(provider: ProviderId): Promise<void>;
};

/** 测试与无钥匙串环境的会话内存储（不落盘）。 */
export class MemoryTokenStore implements TokenStore {
  private readonly bundles = new Map<ProviderId, TokenBundle>();

  async load(provider: ProviderId): Promise<TokenBundle | null> {
    return this.bundles.get(provider) ?? null;
  }

  async save(provider: ProviderId, bundle: TokenBundle): Promise<void> {
    this.bundles.set(provider, bundle);
  }

  async clear(provider: ProviderId): Promise<void> {
    this.bundles.delete(provider);
  }
}

/** 一次同步连接内的令牌生命周期：恢复、续期、断开。 */
export class TokenSession {
  private bundle: TokenBundle | null = null;
  private loaded = false;
  private refreshing: Promise<TokenBundle> | null = null;

  constructor(
    readonly provider: ProviderId,
    private readonly config: SyncConfigDto,
    private readonly deps: OAuthDeps,
    private readonly store: TokenStore,
  ) {}

  get account(): string | null {
    return this.bundle?.account ?? null;
  }

  async restore(): Promise<TokenBundle | null> {
    if (this.loaded) return this.bundle;
    const stored = await this.store.load(this.provider);
    this.bundle = validBundle(stored) ? stored : null;
    this.loaded = true;
    return this.bundle;
  }

  /** 浏览器授权；成功后立即写入令牌存储。 */
  async connect(expectedAccount?: string | null): Promise<TokenBundle> {
    const bundle = await authorizeProvider(this.provider, this.config, this.deps);
    if (expectedAccount && bundle.account !== expectedAccount) throw new SyncError("auth", "storage.error.account");
    this.bundle = bundle;
    this.loaded = true;
    await this.store.save(this.provider, bundle);
    return bundle;
  }

  async accessToken(): Promise<string> {
    await this.restore();
    if (!this.bundle) throw new SyncError("auth", "not connected");
    const now = this.deps.now();
    if (this.bundle.expiresAt > now + 60_000) return this.bundle.accessToken;
    if (!this.refreshing) {
      this.refreshing = this.doRefresh();
    }
    try {
      const bundle = await this.refreshing;
      return bundle.accessToken;
    } finally {
      this.refreshing = null;
    }
  }

  async disconnect(): Promise<void> {
    this.bundle = null;
    this.loaded = true;
    this.refreshing = null;
    await this.store.clear(this.provider);
  }

  private async doRefresh(): Promise<TokenBundle> {
    try {
      const next = await refreshTokenBundle(this.provider, this.config, this.bundle!, this.deps);
      this.bundle = next;
      await this.store.save(this.provider, next);
      return next;
    } catch (err) {
      if (err instanceof SyncError && err.kind === "auth") {
        await this.disconnect();
      }
      throw err;
    }
  }
}

function validBundle(bundle: TokenBundle | null): bundle is TokenBundle {
  return (
    !!bundle &&
    typeof bundle.accessToken === "string" &&
    bundle.accessToken.length > 0 &&
    typeof bundle.refreshToken === "string" &&
    typeof bundle.expiresAt === "number"
  );
}
