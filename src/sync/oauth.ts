import type { SyncConfigDto } from "stoatmd/native";
import { credentialsFor } from "./config";
import { codeChallenge, createCodeVerifier, randomState } from "./hash";
import { SyncError, type FetchLike } from "./provider";
import type { ProviderId } from "./types";

export type TokenBundle = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  account: string | null;
};

export type AuthorizeFn = (
  urlTemplate: string,
  state: string,
  port: number | null,
) => Promise<{ code: string; state: string; redirectUri: string }>;

export type OAuthDeps = {
  authorize: AuthorizeFn;
  fetch: FetchLike;
  now: () => number;
};

type ProviderOAuth = {
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  extraAuthParams: Record<string, string>;
  account: (accessToken: string, fetchImpl: FetchLike) => Promise<string | null>;
};

const GOOGLE: ProviderOAuth = {
  authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  scopes: ["https://www.googleapis.com/auth/drive"],
  extraAuthParams: { access_type: "offline", prompt: "consent" },
  account: async (accessToken, fetchImpl) => {
    const response = await fetchImpl(
      "https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress)",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as {
      user?: { displayName?: string; emailAddress?: string };
    };
    return data.user?.emailAddress || data.user?.displayName || null;
  },
};

const DROPBOX: ProviderOAuth = {
  authorizeUrl: "https://www.dropbox.com/oauth2/authorize",
  tokenUrl: "https://api.dropboxapi.com/oauth2/token",
  scopes: [
    "files.content.read",
    "files.content.write",
    "files.metadata.read",
    "files.metadata.write",
  ],
  extraAuthParams: { token_access_type: "offline" },
  account: async (accessToken, fetchImpl) => {
    const response = await fetchImpl("https://api.dropboxapi.com/2/users/get_current_account", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: "null",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      email?: string;
      name?: { display_name?: string };
    };
    return data.email || data.name?.display_name || null;
  },
};

function meta(provider: ProviderId): ProviderOAuth {
  return provider === "google" ? GOOGLE : DROPBOX;
}

/** 授权页地址；`redirect_uri` 留给原生层替换成实际 loopback 端口。 */
export function buildAuthorizeUrl(
  provider: ProviderId,
  config: SyncConfigDto,
  challenge: string,
  state: string,
): string | null {
  const creds = credentialsFor(provider, config);
  if (!creds) return null;
  const info = meta(provider);
  const url = new URL(info.authorizeUrl);
  url.searchParams.set("client_id", creds.clientId);
  url.searchParams.set("redirect_uri", "__REDIRECT__");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", info.scopes.join(" "));
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", state);
  for (const [key, value] of Object.entries(info.extraAuthParams)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

/**
 * 浏览器授权 + 换取 token。调用方负责持久化返回值（钥匙串）。
 * 未配置客户端凭据时抛 `config` 错误，UI 显示开发者提示。
 */
export async function authorizeProvider(
  provider: ProviderId,
  config: SyncConfigDto,
  deps: OAuthDeps,
): Promise<TokenBundle> {
  const creds = credentialsFor(provider, config);
  if (!creds) {
    throw new SyncError("config", "missing OAuth client credentials", provider);
  }
  const verifier = createCodeVerifier();
  const state = randomState();
  const url = buildAuthorizeUrl(provider, config, codeChallenge(verifier), state);
  if (!url) {
    throw new SyncError("config", "missing OAuth client credentials", provider);
  }
  const result = await deps.authorize(url, state, creds.redirectPort);
  if (result.state !== state) {
    throw new SyncError("auth", "OAuth state mismatch");
  }
  const token = await requestToken(
    meta(provider).tokenUrl,
    {
      grant_type: "authorization_code",
      code: result.code,
      redirect_uri: result.redirectUri,
      code_verifier: verifier,
      client_id: creds.clientId,
      ...(creds.clientSecret ? { client_secret: creds.clientSecret } : {}),
    },
    deps,
  );
  const bundle: TokenBundle = {
    accessToken: String(token.access_token ?? ""),
    refreshToken: String(token.refresh_token ?? ""),
    expiresAt: deps.now() + expiresInMs(token),
    account: null,
  };
  if (!bundle.accessToken) {
    throw new SyncError("auth", "OAuth token response has no access token");
  }
  bundle.account = await meta(provider)
    .account(bundle.accessToken, deps.fetch)
    .catch(() => null);
  return bundle;
}

/** 用 refresh token 续期；失败时抛 `auth`。 */
export async function refreshTokenBundle(
  provider: ProviderId,
  config: SyncConfigDto,
  bundle: TokenBundle,
  deps: OAuthDeps,
): Promise<TokenBundle> {
  const creds = credentialsFor(provider, config);
  if (!creds) throw new SyncError("config", "missing OAuth client credentials", provider);
  if (!bundle.refreshToken) throw new SyncError("auth", "no refresh token");
  const token = await requestToken(
    meta(provider).tokenUrl,
    {
      grant_type: "refresh_token",
      refresh_token: bundle.refreshToken,
      client_id: creds.clientId,
      ...(creds.clientSecret ? { client_secret: creds.clientSecret } : {}),
    },
    deps,
  );
  const accessToken = String(token.access_token ?? "");
  if (!accessToken) throw new SyncError("auth", "token refresh returned no access token");
  return {
    ...bundle,
    accessToken,
    refreshToken: token.refresh_token ? String(token.refresh_token) : bundle.refreshToken,
    expiresAt: deps.now() + expiresInMs(token),
  };
}

function expiresInMs(token: Record<string, unknown>): number {
  const seconds = Number(token.expires_in ?? 3600);
  return (Number.isFinite(seconds) && seconds > 0 ? seconds : 3600) * 1000;
}

async function requestToken(
  url: string,
  params: Record<string, string>,
  deps: OAuthDeps,
): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await deps.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params).toString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new SyncError("network", message);
  }
  const text = await response.text();
  if (!response.ok) {
    let detail = text;
    try {
      const parsed = JSON.parse(text) as { error?: string; error_description?: string };
      detail = parsed.error_description || parsed.error || text;
    } catch {
      // 保留原始文本
    }
    throw new SyncError(response.status === 400 || response.status === 401 ? "auth" : "unknown", detail);
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new SyncError("unknown", "invalid token response");
  }
}
