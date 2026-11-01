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

  const files = [remote("a.md"), remote("b.md"), remote("c.md")];
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
      if (downloads.length === 1) {
        started();
        await gate;
      }
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

    release();
    await waitFor(() => syncRuntime.progress().done === 1);
    expect(downloads).toEqual(["a.md"]);
    expect(syncRuntime.phase()).toBe("paused");

    syncRuntime.resumeSync();
    const result = await running;
    expect(result?.ok).toBe(true);
    expect(downloads).toEqual(["a.md", "b.md", "c.md"]);
  } finally {
    syncRuntime.providerFor = original;
    vault.discardCache();
    await Storage.removeItem(ACTIVE_KEY);
    await Storage.removeItem(`storage.base.${CONNECTED_AT}`);
    await Storage.removeItem(`storage.lastAt.${CONNECTED_AT}`);
  }
});
