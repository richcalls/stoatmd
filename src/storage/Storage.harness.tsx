import { Storage, Text, View, mount, signal } from "nsh";
import { Button } from "nsh/base";
import { Vault } from "stoatmd/native";
import { fixSyncConfigForTest } from "../sync/config";
import { syncRuntime } from "../sync/runtime";
import { SyncSettings } from "../ui/SyncSettings";
import { prepareMigration, storageMigration } from "./runtime";
import { activeStorage, readActiveStorage, storageBusy } from "./state";

async function main() {
  fixSyncConfigForTest({ googleClientId: "", googleClientSecret: "", dropboxAppKey: "", dropboxAppSecret: "",
    dropboxRedirectPort: 53682, purchaseRequired: true, configPath: "" });
  await syncRuntime.load();
  const source = Vault.createCache(), target = Vault.createCache();
  source.ensureDir("assets/empty");
  source.createBytes("assets/image.png", new Uint8Array([0, 255, 128]));
  source.createBytes("note.md", new TextEncoder().encode("![image](assets/image.png)"));
  await syncRuntime.activate(source.root, null, null);
  await prepareMigration(source.root, { kind: "local", root: target.root });
  const fail = await Storage.getItem("test.unsaved") === "true";
  const changedOriginal = await Storage.getItem("test.cleanup") === "true";
  function Harness() {
    const root = signal(source.root), message = signal("");
    return <View style={{ padding: 20, gap: 12 }}>
      <Text testID="fixture-source">{source.root}</Text>
      <Text testID="fixture-target">{target.root}</Text>
      <Text testID="fixture-active">{root()}</Text>
      <Text testID="fixture-status">{`${storageMigration.phase()}:${storageBusy()}`}</Text>
      <Text testID="fixture-message">{message()}</Text>
      <SyncSettings open vaultRoot={root()}
        onBeforeMigration={async () => { if (fail) throw new Error("storage.error.unsaved"); }}
        onStorageActivated={async path => {
          root.set(path);
          message.set(`${Vault.open(path).read("note.md").content}:${[...Vault.open(path).readBytes("assets/image.png")].join(",")}`);
          if (changedOriginal) source.writeBytes("note.md", new TextEncoder().encode("edited original"));
        }} />
      <Button testID="fixture-reload" onPress={() => { void readActiveStorage().then(value => message.set(value?.root === target.root && value.connection === null ? "restored-target" : "restored-source")); }}><Text>reload</Text></Button>
      <Button testID="fixture-dispose" onPress={() => {
        // Only this harness owns these disposable directories.
        const original = source.read("note.md").content;
        source.discardCache(); target.discardCache();
        message.set(`disposed:${original}:${activeStorage()?.root === target.root}`);
      }}><Text>dispose</Text></Button>
    </View>;
  }
  mount(Harness);
}
void main();
