import { Storage } from "nsh";
import { expect, test } from "nsh/test";
import { Vault } from "stoatmd/native";
import { ACTIVE_KEY } from "../storage/state";
import { fixSyncConfigForTest } from "./config";
import { SyncError, type SyncProvider } from "./provider";
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

const CONNECTED_AT = 5151;
const BASE_KEY = `storage.base.${CONNECTED_AT}`;

function remote(path: string): RemoteFile {
  return { path, id: `id-${path}`, rev: "1", mtimeMs: 0, size: 2 };
}

function fakeProvider(
  files: RemoteFile[],
  options: { failOn?: string; onDownload?: (path: string) => Promise<void> } = {},
) {
  const downloads: string[] = [];
  const api = {
    id: "google",
    account: "me@example.com",
    inventory: async () => ({ files, directories: [] }),
    downloadBytes: async (file: RemoteFile) => {
      downloads.push(file.path);
      await options.onDownload?.(file.path);
      if (file.path === options.failOn) throw new SyncError("network", "response body timed out");
      return new TextEncoder().encode(file.path);
    },
  } as unknown as SyncProvider;
  return { api, downloads };
}

async function setup() {
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
  const original = syncRuntime.providerFor;
  return {
    vault,
    setProvider: (provider: SyncProvider) => {
      syncRuntime.providerFor = async () => provider;
    },
    restore: async () => {
      syncRuntime.providerFor = original;
      vault.discardCache();
      await Storage.removeItem(ACTIVE_KEY);
      await Storage.removeItem(BASE_KEY);
      await Storage.removeItem(`storage.lastAt.${CONNECTED_AT}`);
    },
  };
}

async function savedEntries(): Promise<string[]> {
  const raw = await Storage.getItem(BASE_KEY);
  return raw ? Object.keys(JSON.parse(raw).entries).sort() : [];
}

test("全量同步中断后保留已下载锚点，重试只补剩下的文件", async () => {
  const files = [remote("a.md"), remote("b.md"), remote("c.md")];
  const { setProvider, restore } = await setup();
  try {
    const first = fakeProvider(files, { failOn: "c.md" });
    setProvider(first.api);
    const result = await syncRuntime.syncNow();

    expect(result?.ok).toBe(false);
    expect(first.downloads).toEqual(["a.md", "b.md", "c.md"]);
    expect(await savedEntries()).toEqual(["a.md", "b.md"]);

    const second = fakeProvider(files);
    setProvider(second.api);
    const retry = await syncRuntime.syncNow();

    expect(retry?.ok).toBe(true);
    expect(second.downloads).toEqual(["c.md"]);
  } finally {
    await restore();
  }
});

test("全量同步每 10 个文件把锚点落盘一次", async () => {
  const files = Array.from({ length: 25 }, (_, index) => remote(`note-${index}.md`));
  const { setProvider, restore } = await setup();
  const seen: number[] = [];
  try {
    const { api } = fakeProvider(files, {
      onDownload: async () => { seen.push((await savedEntries()).length); },
    });
    setProvider(api);
    const result = await syncRuntime.syncNow();

    expect(result?.ok).toBe(true);
    // 下载是并发的，只要求同步途中已经落过盘，且不是逐篇都写。
    expect(seen.some((count) => count >= 10)).toBe(true);
    expect(new Set(seen).size < seen.length).toBe(true);
    expect((await savedEntries()).length).toBe(25);
  } finally {
    await restore();
  }
});
