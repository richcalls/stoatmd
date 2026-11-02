import { Storage } from "nsh";
import { expect, test } from "nsh/test";
import { Vault } from "stoatmd/native";
import { ACTIVE_KEY } from "../storage/state";
import { fixSyncConfigForTest } from "./config";
import { sha256Hex } from "./hash";
import { RemoteConflictError, type SyncProvider } from "./provider";
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

const CONNECTED_AT = 4242;
const BASE_KEY = `storage.base.${CONNECTED_AT}`;

function connectionFor(root: string): SyncConnection {
  return {
    provider: "google",
    account: "me@example.com",
    remoteId: "root",
    remotePath: "/Notes",
    remoteName: "Notes",
    localRoot: root,
    connectedAt: CONNECTED_AT,
  };
}

type Calls = {
  inventories: number;
  uploads: { path: string; existing: RemoteFile | null }[];
  removals: { path: string; id: string; rev: string }[];
};

function fakeProvider(calls: Calls, failure: () => Error | null = () => null): SyncProvider {
  return {
    id: "google",
    account: "me@example.com",
    inventory: async () => {
      calls.inventories += 1;
      return { files: [] as RemoteFile[], directories: [] as string[] };
    },
    remove: async (file: RemoteFile) => {
      calls.removals.push({ path: file.path, id: file.id, rev: file.rev });
      const error = failure();
      if (error) throw error;
    },
    uploadBytes: async (
      _root: unknown,
      path: string,
      content: Uint8Array,
      options: { existing: RemoteFile | null },
    ) => {
      calls.uploads.push({ path, existing: options.existing });
      const error = failure();
      if (error) throw error;
      return {
        path,
        id: options.existing?.id ?? `id-${path}`,
        rev: String(Number(options.existing?.rev ?? 0) + 1),
        mtimeMs: 0,
        size: content.length,
      };
    },
  } as unknown as SyncProvider;
}

async function setup(calls: Calls, failure?: () => Error | null) {
  fixSyncConfigForTest(config);
  await Storage.removeItem(ACTIVE_KEY);
  await Storage.removeItem(BASE_KEY);
  await Storage.removeItem(`storage.lastAt.${CONNECTED_AT}`);
  const vault = Vault.createCache();
  await syncRuntime.activate(vault.root, connectionFor(vault.root), null);
  const original = syncRuntime.providerFor;
  syncRuntime.providerFor = async () => fakeProvider(calls, failure);
  return {
    vault,
    restore: async () => {
      syncRuntime.providerFor = original;
      vault.discardCache();
      await Storage.removeItem(ACTIVE_KEY);
      await Storage.removeItem(BASE_KEY);
      await Storage.removeItem(`storage.lastAt.${CONNECTED_AT}`);
    },
  };
}

async function baseEntry(path: string) {
  const raw = await Storage.getItem(BASE_KEY);
  return raw ? JSON.parse(raw).entries[path] : undefined;
}

test("单文件推送：新文件直接上传，不列远端目录，并写入锚点", async () => {
  const calls: Calls = { inventories: 0, uploads: [], removals: [] };
  const { vault, restore } = await setup(calls);
  try {
    vault.createBytes("a.md", new TextEncoder().encode("hello"));
    const result = await syncRuntime.pushPaths(["a.md"]);

    expect(result?.uploaded).toBe(1);
    expect(calls.inventories).toBe(0);
    expect(calls.uploads.map((row) => row.path)).toEqual(["a.md"]);
    expect(calls.uploads[0]?.existing).toBe(null);

    const entry = await baseEntry("a.md");
    expect(entry.remoteId).toBe("id-a.md");
    expect(entry.remoteRev).toBe("1");
    expect(entry.hash).toBe(sha256Hex("hello"));
    expect(syncRuntime.phase()).toBe("synced");
  } finally {
    await restore();
  }
});

test("单文件推送：再次保存用锚点 rev 条件更新，仍然不列目录", async () => {
  const calls: Calls = { inventories: 0, uploads: [], removals: [] };
  const { vault, restore } = await setup(calls);
  try {
    vault.createBytes("a.md", new TextEncoder().encode("hello"));
    await syncRuntime.pushPaths(["a.md"]);
    vault.write("a.md", "hello again", vault.mtime("a.md"));

    const result = await syncRuntime.pushPaths(["a.md"]);

    expect(result?.uploaded).toBe(1);
    expect(calls.inventories).toBe(0);
    expect(calls.uploads[1]?.existing?.id).toBe("id-a.md");
    expect(calls.uploads[1]?.existing?.rev).toBe("1");
    expect((await baseEntry("a.md")).remoteRev).toBe("2");
  } finally {
    await restore();
  }
});

test("单文件推送：远端版本已变时不覆盖，交回全量同步", async () => {
  const calls: Calls = { inventories: 0, uploads: [], removals: [] };
  let fail = false;
  const { vault, restore } = await setup(calls, () =>
    fail ? new RemoteConflictError("remote changed", "a.md") : null,
  );
  try {
    vault.createBytes("a.md", new TextEncoder().encode("hello"));
    await syncRuntime.pushPaths(["a.md"]);
    fail = true;
    vault.write("a.md", "local edit", vault.mtime("a.md"));

    const result = await syncRuntime.pushPaths(["a.md"]);

    expect(result?.needsFullSync).toBe(true);
    expect(result?.uploaded).toBe(0);
    expect(calls.inventories).toBe(0);
    expect((await baseEntry("a.md")).remoteRev).toBe("1");
    expect(syncRuntime.phase()).toBe("synced");
  } finally {
    await restore();
  }
});

test("单文件推送：本地文件已删除时交回全量同步", async () => {
  const calls: Calls = { inventories: 0, uploads: [], removals: [] };
  const { vault, restore } = await setup(calls);
  try {
    vault.createBytes("gone.md", new TextEncoder().encode("bye"));
    await syncRuntime.pushPaths(["gone.md"]);
    vault.delete("gone.md");

    const result = await syncRuntime.pushPaths(["gone.md"]);

    expect(result?.needsFullSync).toBe(true);
    expect(calls.uploads.length).toBe(1);
    expect(calls.inventories).toBe(0);
  } finally {
    await restore();
  }
});

test("单文件推送：冲突未解决时不写入云端", async () => {
  const calls: Calls = { inventories: 0, uploads: [], removals: [] };
  const { vault, restore } = await setup(calls);
  try {
    syncRuntime.phase.set("conflict");
    vault.createBytes("a.md", new TextEncoder().encode("hello"));

    const result = await syncRuntime.pushPaths(["a.md"]);

    expect(result).toBe(null);
    expect(calls.uploads.length).toBe(0);
    expect(syncRuntime.phase()).toBe("conflict");
  } finally {
    syncRuntime.phase.set("synced");
    await restore();
  }
});

test("删除推送：用锚点删远端并清掉锚点，不列目录", async () => {
  const calls: Calls = { inventories: 0, uploads: [], removals: [] };
  const { vault, restore } = await setup(calls);
  try {
    vault.createBytes("a.md", new TextEncoder().encode("hello"));
    await syncRuntime.pushPaths(["a.md"]);
    vault.delete("a.md");

    const result = await syncRuntime.pushDeletions(["a.md"]);

    expect(result?.deletedRemote).toBe(1);
    expect(calls.removals).toEqual([{ path: "a.md", id: "id-a.md", rev: "1" }]);
    expect(calls.inventories).toBe(0);
    expect(await baseEntry("a.md")).toBe(undefined);
    expect(syncRuntime.phase()).toBe("synced");
  } finally {
    await restore();
  }
});

test("删除推送：从没同步过的路径不访问云端", async () => {
  const calls: Calls = { inventories: 0, uploads: [], removals: [] };
  const { restore } = await setup(calls);
  try {
    const result = await syncRuntime.pushDeletions(["never.md"]);

    expect(result?.deletedRemote).toBe(0);
    expect(calls.removals.length).toBe(0);
  } finally {
    await restore();
  }
});

test("删除推送：云端也被改过时留锚点交回全量同步", async () => {
  const calls: Calls = { inventories: 0, uploads: [], removals: [] };
  let fail = false;
  const { vault, restore } = await setup(calls, () =>
    fail ? new RemoteConflictError("remote changed", "a.md") : null,
  );
  try {
    vault.createBytes("a.md", new TextEncoder().encode("hello"));
    await syncRuntime.pushPaths(["a.md"]);
    fail = true;

    const result = await syncRuntime.pushDeletions(["a.md"]);

    expect(result?.needsFullSync).toBe(true);
    expect(result?.deletedRemote).toBe(0);
    expect((await baseEntry("a.md")).remoteRev).toBe("1");
  } finally {
    await restore();
  }
});

test("后台静默推送失败不写全局错误，也不改同步状态", async () => {
  const calls: Calls = { inventories: 0, uploads: [], removals: [] };
  const { vault, restore } = await setup(calls, () => new Error("offline"));
  try {
    vault.createBytes("a.md", new TextEncoder().encode("hello"));

    const result = await syncRuntime.pushPaths(["a.md"], true);

    expect(result?.ok).toBe(false);
    expect(syncRuntime.error()).toBe(null);
    expect(syncRuntime.phase()).toBe("synced");
  } finally {
    await restore();
  }
});
