import { Storage, cleanup, mount } from "nsh";
import { TokenVault, Vault } from "stoatmd/native";
import { MobileShell } from "./MobileShell";
import { syncRuntime } from "../sync/runtime";
import type { SyncProvider } from "../sync/provider";
import { fixSyncConfigForTest } from "../sync/config";
import { restoreLocale } from "../ui/i18n";

// 回归夹具：模拟新设备首次启动——本机没有 active storage，钥匙串里有另一台设备同步来的绑定；
// 进库后从云端下载 12 篇（inventory 1.5s，每篇 200ms），观察进度条是否出现。
const record = JSON.stringify({ provider: "google", account: "me@example.com",
  remoteId: "root", remotePath: "/Notes", remoteName: "Notes" });
const native = TokenVault as unknown as {
  get(key: string): string | null;
  set(key: string, value: string): void;
  delete(key: string): void;
};
const originalGet = native.get;
native.get = (key: string) => key === "state.connection" ? record : originalGet.call(TokenVault, key);
native.set = () => {};
native.delete = () => {};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const files = Array.from({ length: 12 }, (_, index) => ({
  path: `note-${index}.md`, id: `id-${index}`, rev: "1", mtimeMs: Date.now(), size: 10,
}));
const provider = {
  inventory: async () => { await wait(1500); return { files, directories: [] }; },
  downloadBytes: async (file: { path: string }) => {
    await wait(200);
    return new TextEncoder().encode(`# ${file.path}\n`);
  },
  ensureDirectory: async () => {},
  uploadBytes: async () => ({ id: "x", rev: "1" }),
  remove: async () => {},
} as unknown as SyncProvider;
syncRuntime.providerFor = async () => provider;
fixSyncConfigForTest({ googleClientId: "", googleClientSecret: "", dropboxAppKey: "", dropboxAppSecret: "",
  dropboxRedirectPort: 53682, purchaseRequired: false, configPath: "" });

let cacheRoot: string | null = null;
void Promise.all([restoreLocale(), Storage.removeItem("storage.active")]).then(() => {
  mount(() => {
    cleanup(() => { try { if (cacheRoot) Vault.reopenCache(cacheRoot).discardCache(); } catch { /* ignore */ } });
    return <MobileShell />;
  });
});
void (async () => {
  // 记下 restore 建出来的缓存根，测试结束清掉。
  for (let index = 0; index < 100; index += 1) {
    const raw = await Storage.getItem("storage.active");
    if (raw) { cacheRoot = (JSON.parse(raw) as { root: string }).root; return; }
    await wait(50);
  }
})();
