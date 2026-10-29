import { Text, View, mount, signal } from "nsh";
import type { SyncPhase } from "../sync/runtime";
import { Sidebar } from "./Sidebar";
import type { FolderNode } from "./vaultModel";

const FOLDERS: FolderNode[] = [
  { id: "", name: "", path: "", depth: 0 },
  { id: "Diary", name: "日记", path: "Diary", depth: 0 },
];

/** 侧栏折叠与同步入口的最小挂载入口。 */
function Harness() {
  const rail = signal(false);
  const selected = signal("");
  const syncOpen = signal(false);
  const phase = signal<SyncPhase>("off");
  const conflicts = signal(0);
  return (
    <View style={{ flex: 1, flexDirection: "column" }}>
      <View style={{ height: 360, width: rail() ? 48 : 200 }}>
        <Sidebar
          folders={FOLDERS}
          selected={selected()}
          onSelect={(id) => selected.set(id)}
          onOpenVault={() => {}}
          onSync={() => syncOpen.set(true)}
          vaultRoot="/vault"
          rail={rail()}
          syncPhase={phase()}
          syncConflictCount={conflicts()}
        />
      </View>
      <View role="button" testID="toggle-rail" onPress={() => rail.update((v) => !v)}>
        <Text>toggle</Text>
      </View>
      <View role="button" testID="phase-synced" onPress={() => phase.set("synced")}>
        <Text>synced</Text>
      </View>
      <View
        role="button"
        testID="phase-conflict"
        onPress={() => {
          phase.set("conflict");
          conflicts.set(2);
        }}
      >
        <Text>conflict</Text>
      </View>
      <View role="button" testID="phase-offline" onPress={() => phase.set("offline")}>
        <Text>offline</Text>
      </View>
      <Text testID="selected-value">{selected()}</Text>
      <Text testID="sync-value">{syncOpen() ? "sync-open" : "sync-closed"}</Text>
    </View>
  );
}

mount(Harness);
