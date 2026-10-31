import { Storage, Text, View, mount, signal } from "nsh";
import { Button } from "nsh/base";
import { Vault } from "stoatmd/native";
import { fixSyncConfigForTest } from "../sync/config";
import { syncRuntime } from "../sync/runtime";
import { storageBusy } from "../storage/state";
import { createSettingsRequestHandler } from "./settingsWindow";
import { unwrapSettingsSync, type SettingsSyncResult } from "./settingsSync";
import type { SettingsState } from "./settingsState";

async function main() {
  fixSyncConfigForTest({ googleClientId: "", googleClientSecret: "", dropboxAppKey: "", dropboxAppSecret: "",
    dropboxRedirectPort: 53682, purchaseRequired: true, configPath: "" });
  const source = Vault.createCache(), target = Vault.createCache();
  source.createBytes("note.md", new TextEncoder().encode("# saved note"));
  source.createBytes("asset.bin", new Uint8Array([0, 128, 255]));
  await syncRuntime.activate(source.root, null, null);
  const fail = await Storage.getItem("test.unsaved") === "true";
  function Harness() {
    const root = signal<string | null>(source.root), result = signal(""), snapshot = signal("");
    const handler = createSettingsRequestHandler({ vaultRoot: root,
      onBeforeMigration: async () => { if (fail) throw new Error("storage.error.unsaved"); },
      onStorageActivated: async path => { root.set(path); },
      onOpenVault: () => {}, onSyncNow: () => {}, onManageConflicts: () => {},
    }, () => "sync");
    const start = async () => {
      const prepare = await handler.execute({ kind: "storage", method: "prepare", target: { kind: "local", root: target.root } });
      unwrapSettingsSync(prepare as SettingsSyncResult);
      const value = await handler.execute({ kind: "storage", method: "migrate", keepOriginal: true });
      const state = unwrapSettingsSync(value as SettingsSyncResult) as SettingsState;
      snapshot.set(JSON.stringify(state.storage));
      result.set(`${state.storage.phase}:${storageBusy()}:${root() === target.root}:${source.read("note.md").content}`);
    };
    return <View>
      <Button testID="start" onPress={() => { void start(); }}><Text>start</Text></Button>
      <Text testID="result">{result()}</Text><Text testID="snapshot">{snapshot()}</Text>
      <Button testID="dispose" onPress={() => { source.discardCache(); target.discardCache(); }}><Text>dispose</Text></Button>
    </View>;
  }
  mount(Harness);
}
void main();
