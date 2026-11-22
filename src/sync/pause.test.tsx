import { Storage } from "nsh";
import { expect, test } from "nsh/test";
import { Vault } from "stoatmd/native";
import { ACTIVE_KEY } from "../storage/state";
import { fixSyncConfigForTest } from "./config";
import { type SyncProvider } from "./provider";
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

const CONNECTED_AT = 6161;

function remote(path: string): RemoteFile {
  return { path, id: `id-${path}`, rev: "1", mtimeMs: 0, size: 2 };
}

async function waitFor(check: () => boolean, timeoutMs = 2000) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error("timeout");
    await new Promise(resolve => setTimeout(resolve, 5));
  }
}

test("全量同步可以暂停，暂停后停在动作之间，继续时从原位置恢复", async () => {
  fixSyncConfigForTest(config);
  await Storage.removeItem(ACTIVE_KEY);
  await Storage.removeItem(`storage.base.${CONNECTED_AT}`);
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

  const files = Array.from({ length: 10 }, (_, index) => remote(`note-${index}.md`));
  const downloads: string[] = [];
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let started!: () => void;
  const firstStarted = new Promise<void>(resolve => { started = resolve; });
  const provider = {
    id: "google",
    account: "me@example.com",
    inventory: async () => ({ files, directories: [] }),
    downloadBytes: async (file: RemoteFile) => {
      downloads.push(file.path);
      started();
      await gate;
      return new TextEncoder().encode(file.path);
    },
  } as unknown as SyncProvider;
  const original = syncRuntime.providerFor;
  syncRuntime.providerFor = async () => provider;
  try {
    const running = syncRuntime.syncNow();
    await firstStarted;
    syncRuntime.pauseSync();
    expect(syncRuntime.phase()).toBe("paused");

    // 已经在路上的几篇（并发下载）做完，之后不再领新的。
    release();
    await waitFor(() => syncRuntime.progress().done > 0 && syncRuntime.progress().done === downloads.length);
    await new Promise(resolve => setTimeout(resolve, 30));
    const inFlight = downloads.length;
    expect(inFlight < files.length).toBe(true);
    expect(syncRuntime.progress().done).toBe(inFlight);
    expect(syncRuntime.phase()).toBe("paused");

    syncRuntime.resumeSync();
    const result = await running;
    expect(result?.ok).toBe(true);
    expect(downloads.slice().sort()).toEqual(files.map(file => file.path).sort());
  } finally {
    syncRuntime.providerFor = original;
    vault.discardCache();
    await Storage.removeItem(ACTIVE_KEY);
    await Storage.removeItem(`storage.base.${CONNECTED_AT}`);
    await Storage.removeItem(`storage.lastAt.${CONNECTED_AT}`);
  }
});
