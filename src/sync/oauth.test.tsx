import { expect, test } from "nsh/test";
import type { SyncConfigDto } from "stoatmd/native";
import {
  authorizeProvider,
  buildAuthorizeUrl,
  refreshTokenBundle,
  type OAuthDeps,
  type TokenBundle,
} from "./oauth";
import { SyncError, type FetchLike } from "./provider";
import { MemoryTokenStore, TokenSession } from "./tokens";

const NOW = 1_700_000_000_000;

function config(overrides: Partial<SyncConfigDto> = {}): SyncConfigDto {
  return {
    googleClientId: "google-id",
    googleClientSecret: "google-secret",
    dropboxAppKey: "dropbox-key",
    dropboxAppSecret: "",
    dropboxRedirectPort: 53682,
    purchaseRequired: false,
    configPath: "/tmp/sync.json",
    ...overrides,
  };
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("OAuth：授权 URL 带 PKCE、state、scope 与 redirect 占位符", () => {
  const cfg = config();
  const url = buildAuthorizeUrl("google", cfg, "challenge-123", "state-456");
  expect(url).not.toBe(null);
  const parsed = new URL(url!);
  expect(parsed.searchParams.get("client_id")).toBe("google-id");
  expect(parsed.searchParams.get("redirect_uri")).toBe("__REDIRECT__");
  expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
  expect(parsed.searchParams.get("code_challenge")).toBe("challenge-123");
  expect(parsed.searchParams.get("state")).toBe("state-456");
  expect(parsed.searchParams.get("scope")).toBe("https://www.googleapis.com/auth/drive");
  expect(parsed.searchParams.get("access_type")).toBe("offline");

  const dropbox = new URL(buildAuthorizeUrl("dropbox", cfg, "c", "s")!);
  expect(dropbox.searchParams.get("token_access_type")).toBe("offline");
  expect(dropbox.searchParams.get("client_id")).toBe("dropbox-key");
});

test("OAuth：缺客户端凭据时明确报 config 错，不打开浏览器", async () => {
  let opened = false;
  const deps: OAuthDeps = {
    authorize: async () => {
      opened = true;
      return { code: "x", state: "x", redirectUri: "x" };
    },
    fetch: async () => jsonResponse({}),
    now: () => NOW,
  };
  let error: unknown = null;
  try {
    await authorizeProvider("google", config({ googleClientId: "" }), deps);
  } catch (err) {
    error = err;
  }
  expect(opened).toBe(false);
  expect(error instanceof SyncError).toBe(true);
  expect((error as SyncError).kind).toBe("config");
});

test("OAuth：授权码换 token 并取账号标识（Google）", async () => {
  let capturedUrl = "";
  let capturedState = "";
  let capturedPort: number | null | undefined;
  let tokenBody = "";
  const fetchImpl: FetchLike = async (input, init) => {
    const url = String(input);
    if (url.includes("oauth2.googleapis.com/token")) {
      tokenBody = String(init?.body ?? "");
      return jsonResponse({
        access_token: "access-1",
        refresh_token: "refresh-1",
        expires_in: 3600,
        token_type: "Bearer",
      });
    }
    if (url.includes("/about")) {
      return jsonResponse({ user: { emailAddress: "me@example.com" } });
    }
    return jsonResponse({}, 404);
  };
  const deps: OAuthDeps = {
    authorize: async (url, state, port) => {
      capturedUrl = url;
      capturedState = state;
      capturedPort = port;
      return {
        code: "auth-code",
        state,
        redirectUri: "http://127.0.0.1:5000/callback",
      };
    },
    fetch: fetchImpl,
    now: () => NOW,
  };
  const bundle = await authorizeProvider("google", config(), deps);
  expect(capturedPort).toBe(null);
  expect(capturedUrl).toContain("__REDIRECT__");
  expect(capturedState.length > 10).toBe(true);
  expect(bundle.accessToken).toBe("access-1");
  expect(bundle.refreshToken).toBe("refresh-1");
  expect(bundle.expiresAt).toBe(NOW + 3_600_000);
  expect(bundle.account).toBe("me@example.com");
  const params = new URLSearchParams(tokenBody);
  expect(params.get("grant_type")).toBe("authorization_code");
  expect(params.get("code")).toBe("auth-code");
  expect(params.get("redirect_uri")).toBe("http://127.0.0.1:5000/callback");
  expect(params.get("client_secret")).toBe("google-secret");
  expect((params.get("code_verifier") ?? "").length > 20).toBe(true);
});

test("OAuth：Dropbox 固定回调端口并可选 secret", async () => {
  let port: number | null | undefined;
  let body = "";
  const deps: OAuthDeps = {
    authorize: async (_url, state, p) => {
      port = p;
      return { code: "code", state, redirectUri: "http://127.0.0.1:53682/callback" };
    },
    fetch: async (input, init) => {
      const url = String(input);
      if (url.includes("oauth2/token")) {
        body = String(init?.body ?? "");
        return jsonResponse({ access_token: "dbx", refresh_token: "r", expires_in: 14400 });
      }
      if (url.includes("get_current_account")) return jsonResponse({ email: "dbx@example.com" });
      return jsonResponse({}, 404);
    },
    now: () => NOW,
  };
  const bundle = await authorizeProvider("dropbox", config(), deps);
  expect(port).toBe(53682);
  expect(bundle.account).toBe("dbx@example.com");
  const params = new URLSearchParams(body);
  expect(params.get("client_id")).toBe("dropbox-key");
  expect(params.get("client_secret")).toBe(null);
});

test("OAuth：refresh token 续期保留轮换后的 refresh token", async () => {
  let body = "";
  const deps: OAuthDeps = {
    authorize: async () => {
      throw new Error("unused");
    },
    fetch: async (_input, init) => {
      body = String(init?.body ?? "");
      return jsonResponse({
        access_token: "access-2",
        refresh_token: "refresh-2",
        expires_in: 60,
      });
    },
    now: () => NOW,
  };
  const before: TokenBundle = {
    accessToken: "access-1",
    refreshToken: "refresh-1",
    expiresAt: NOW,
    account: "a@example.com",
  };
  const after = await refreshTokenBundle("google", config(), before, deps);
  expect(after.accessToken).toBe("access-2");
  expect(after.refreshToken).toBe("refresh-2");
  expect(after.account).toBe("a@example.com");
  expect(after.expiresAt).toBe(NOW + 60_000);
  expect(new URLSearchParams(body).get("grant_type")).toBe("refresh_token");
});

test("TokenSession：过期前自动续期；refresh 被拒后清空令牌", async () => {
  const store = new MemoryTokenStore();
  let fail = false;
  const deps: OAuthDeps = {
    authorize: async () => {
      throw new Error("unused");
    },
    fetch: async () => {
      if (fail) {
        return jsonResponse({ error: "invalid_grant", error_description: "expired" }, 400);
      }
      return jsonResponse({ access_token: "fresh", expires_in: 3600 });
    },
    now: () => NOW,
  };
  await store.save("google", {
    accessToken: "stale",
    refreshToken: "refresh",
    expiresAt: NOW + 1000,
    account: "me",
  });
  const session = new TokenSession("google", config(), deps, store);
  expect(await session.accessToken()).toBe("fresh");
  expect((await store.load("google"))?.accessToken).toBe("fresh");

  fail = true;
  await store.save("google", {
    accessToken: "stale",
    refreshToken: "refresh",
    expiresAt: NOW + 1000,
    account: "me",
  });
  const expired = new TokenSession("google", config(), deps, store);
  let error: unknown = null;
  try {
    await expired.accessToken();
  } catch (err) {
    error = err;
  }
  expect(error instanceof SyncError).toBe(true);
  expect((error as SyncError).kind).toBe("auth");
  expect(await store.load("google")).toBe(null);
});
