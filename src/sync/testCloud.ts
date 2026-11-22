import { Storage } from "nsh";
import { Vault } from "stoatmd/native";
import { ACTIVE_KEY } from "../storage/state";
import { fixSyncConfigForTest } from "./config";
import { RemoteConflictError, SyncError, type SyncProvider } from "./provider";
import { syncRuntime, type SyncConnection } from "./runtime";
import type { RemoteFile } from "./types";

const config = {
  googleClientId: "",
  googleClientSecret: "",
  dropboxAppKey: "",
  dropboxAppSecret: "",
  dropboxRedirectPort: 53682,
  purchaseRequired: false,
  configPath: "",
};

const CONNECTED_AT = 6262;
const BASE_KEY = `storage.base.${CONNECTED_AT}`;
export const enc = (text: string) => new TextEncoder().encode(text);
export const dec = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

type Stored = { id: string; rev: number; content: Uint8Array };

/** 内存云盘：rev 条件更新与真实网盘一致；可注入「写进去了但回执丢了」和延迟。 */
export function memoryCloud() {
  const files = new Map<string, Stored>();
  const directories = new Set<string>();
  /** 同时在路上的上传数；>1 说明推送 / 全量同步没串行。 */
  const inflight = { now: 0, max: 0 };
  const hooks = {
    /** 返回 true 表示这次上传写进云端后，回执超时丢失。 */
    loseReceipt: (_path: string) => false,
    /** 写入云端之前；抛错表示请求没送达。 */
    beforeWrite: (_path: string): void => {},
    /** 云端已写入、回执还没回来的那段时间。 */
    afterWrite: async (_path: string) => {},
    /** 下载正文之前。 */
    beforeDownload: async (_path: string) => {},
    /** 删除请求到达云端之前。 */
    beforeRemove: (_path: string): void => {},
  };
  const calls = { inventory: 0, uploads: 0, ensureDirectory: [] as string[] };
  const meta = (path: string, f: Stored): RemoteFile =>
    ({ path, id: f.id, rev: String(f.rev), mtimeMs: 0, size: f.content.length });
  const api = {
    id: "google",
    account: "me@example.com",
    inventory: async () => {
      calls.inventory += 1;
      return { files: Array.from(files, ([path, f]) => meta(path, f)), directories: [...directories] };
    },
    ensureDirectory: async (_root: unknown, path: string) => {
      calls.ensureDirectory.push(path);
      directories.add(path);
    },
    downloadBytes: async (file: RemoteFile) => {
      await hooks.beforeDownload(file.path);
      const f = files.get(file.path);
      if (!f) throw new SyncError("notFound", "gone");
      return f.content;
    },
    uploadBytes: async (_root: unknown, path: string, content: Uint8Array,
      options: { existing: RemoteFile | null }) => {
      calls.uploads += 1;
      inflight.max = Math.max(inflight.max, ++inflight.now);
      try {
        await Promise.resolve();
        hooks.beforeWrite(path);
        const cur = files.get(path);
        if (options.existing) {
          if (!cur || String(cur.rev) !== options.existing.rev) throw new RemoteConflictError("rev", path);
        } else if (cur) {
          throw new RemoteConflictError("exists", path);
        }
        const next: Stored = { id: cur?.id ?? `id-${path}`, rev: (cur?.rev ?? 0) + 1, content };
        files.set(path, next);
        await hooks.afterWrite(path);
        if (hooks.loseReceipt(path)) throw new SyncError("network", "request timed out");
        return meta(path, next);
      } finally {
        inflight.now -= 1;
      }
    },
    remove: async (file: RemoteFile) => {
      hooks.beforeRemove(file.path);
      const cur = files.get(file.path);
      if (cur && String(cur.rev) !== file.rev) throw new RemoteConflictError("rev", file.path);
      files.delete(file.path);
    },
  } as unknown as SyncProvider;
  /** Drive 的 version 会因元数据（查看、分享、索引）自增，正文不变。 */
  const bumpRev = (path: string) => { const f = files.get(path)!; f.rev += 1; };
  const text = (path: string) => { const f = files.get(path); return f ? dec(f.content) : null; };
  /** 别的设备改了云端正文。 */
  const put = (path: string, text: string) => {
    const cur = files.get(path);
    files.set(path, { id: cur?.id ?? `id-${path}`, rev: (cur?.rev ?? 0) + 1, content: enc(text) });
  };
  return { api, hooks, bumpRev, text, put, files, directories, inflight, calls };
}

export async function storedPending(path: string): Promise<string[]> {
  const raw = await Storage.getItem(BASE_KEY);
  return raw ? JSON.parse(raw).pending?.[path] ?? [] : [];
}

export async function setup() {
  fixSyncConfigForTest(config);
  await Storage.removeItem(ACTIVE_KEY);
  await Storage.removeItem(BASE_KEY);
  await Storage.removeItem(`storage.lastAt.${CONNECTED_AT}`);
  const vault = Vault.createCache();
  const connection: SyncConnection = {
    provider: "google",
    account: "me@example.com",
    remoteId: "root",
    remotePath: "/Notes",
    remoteName: "Notes",
    localRoot: vault.root,
    connectedAt: CONNECTED_AT,
  };
  await syncRuntime.activate(vault.root, connection, null);
  const cloud = memoryCloud();
  const original = syncRuntime.providerFor;
  syncRuntime.providerFor = async () => cloud.api;
  return {
    vault,
    cloud,
    restore: async () => {
      syncRuntime.providerFor = original;
      vault.discardCache();
      await Storage.removeItem(ACTIVE_KEY);
      await Storage.removeItem(BASE_KEY);
      await Storage.removeItem(`storage.lastAt.${CONNECTED_AT}`);
    },
  };
}

export function edit(vault: Vault, path: string, text: string) {
  vault.write(path, text, vault.mtime(path));
}
