import { Storage } from "nsh";
import { expect, test } from "nsh/test";
import { Vault } from "stoatmd/native";
import { fixSyncConfigForTest } from "../sync/config";
import type { SyncProvider } from "../sync/provider";
import { syncRuntime } from "../sync/runtime";
import { activateInitialStorage, restoreSharedStorage, storageMigration } from "./runtime";
import { ACTIVE_KEY, activeStorage, readActiveStorage, storageBusy, type Location } from "./state";

const config = { googleClientId: "", googleClientSecret: "", dropboxAppKey: "", dropboxAppSecret: "",
  dropboxRedirectPort: 53682, purchaseRequired: false, configPath: "" };
const target: Location = { kind: "google", account: "me@example.com",
  remote: { id: "root", path: "/Notes", name: "Notes" } };

function fakeProvider(inventory: SyncProvider["inventory"]): SyncProvider {
  return { inventory } as unknown as SyncProvider;
}

async function withProvider<T>(provider: SyncProvider, work: () => Promise<T>): Promise<T> {
  const original = syncRuntime.providerFor;
  syncRuntime.providerFor = async () => provider;
  try { return await work(); } finally { syncRuntime.providerFor = original; }
}

test("iOS 首次连接：目标文件夹不可用时保持未绑定", async () => {
  fixSyncConfigForTest(config);
  await Storage.removeItem(ACTIVE_KEY);
  activeStorage.set(null);
  const provider = fakeProvider(async () => { throw new Error("offline"); });
  let error = "";
  await withProvider(provider, async () => {
    try { await activateInitialStorage(target, async () => {}); }
    catch (err) { error = String(err); }
  });
  expect(error).toContain("offline");
  expect(activeStorage()).toBe(null);
  expect(storageBusy()).toBe(false);
});

test("iOS 首次连接：直接绑定云盘文件夹并下载，不进入迁移", async () => {
  fixSyncConfigForTest(config);
  await Storage.removeItem(ACTIVE_KEY);
  activeStorage.set(null);
  storageMigration.phase.set("idle");
  const provider = fakeProvider(async () => ({ files: [], directories: [] }));
  let activated = "";
  await withProvider(provider, async () => {
    await activateInitialStorage(target, async root => { activated = root; });
  });
  expect(activated).not.toBe("");
  const stored = await Storage.getItem(ACTIVE_KEY);
  const record = JSON.parse(stored!);
  expect(record.root).toBe(activated);
  expect(record.connection.provider).toBe("google");
  expect(record.connection.remotePath).toBe("/Notes");
  expect(record.connection.localRoot).toBe(activated);
  expect(record.cleanup).toBe(null);
  expect(storageMigration.phase()).toBe("idle");
  expect(storageBusy()).toBe(false);
  // Next launch reads the same record and reopens the offline cache directly.
  const restored = await readActiveStorage();
  expect(restored?.root).toBe(activated);
  expect(restored?.connection?.remotePath).toBe("/Notes");
  const reopened = Vault.reopenCache(activated);
  expect(reopened.root).toBe(activated);
  reopened.discardCache();
  await Storage.removeItem(ACTIVE_KEY);
  activeStorage.set(null);
});

test("新设备恢复：按同步来的云盘绑定直接建缓存进库", async () => {
  fixSyncConfigForTest(config);
  await Storage.removeItem(ACTIVE_KEY);
  activeStorage.set(null);
  storageMigration.phase.set("idle");
  const provider = fakeProvider(async () => ({ files: [], directories: [] }));
  let activated = "";
  await withProvider(provider, async () => {
    await restoreSharedStorage({ provider: "dropbox", account: "me@example.com",
      remoteId: "id:root", remotePath: "/Notes", remoteName: "Notes" },
      async root => { activated = root; });
  });
  expect(activated).not.toBe("");
  const record = JSON.parse((await Storage.getItem(ACTIVE_KEY))!);
  expect(record.connection.provider).toBe("dropbox");
  expect(record.connection.account).toBe("me@example.com");
  expect(record.connection.remotePath).toBe("/Notes");
  expect(record.connection.localRoot).toBe(activated);
  const reopened = Vault.reopenCache(activated);
  expect(reopened.root).toBe(activated);
  reopened.discardCache();
  await Storage.removeItem(ACTIVE_KEY);
  activeStorage.set(null);
});
