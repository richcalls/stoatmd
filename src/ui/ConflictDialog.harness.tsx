import { Text, View, mount, signal } from "nsh";
import { syncRuntime } from "../sync/runtime";
import type { ConflictItem } from "../sync/types";
import { ConflictDialog } from "./ConflictDialog";

const bothModified: ConflictItem = {
  path: "a.md",
  kind: "bothModified",
  base: null,
  local: { path: "a.md", mtimeMs: 1_760_000_000_000, size: 12, hash: "aaa" },
  remote: { path: "a.md", id: "r1", rev: "9", mtimeMs: 1_760_000_100_000, size: 14 },
  localHash: "aaa",
  remoteHash: "bbb",
};

const remoteDeleted: ConflictItem = {
  path: "b.md",
  kind: "remoteDeletedLocalModified",
  base: null,
  local: { path: "b.md", mtimeMs: 1_760_000_000_000, size: 8, hash: "ccc" },
  remote: null,
  localHash: "ccc",
  remoteHash: null,
};

syncRuntime.conflicts.set([bothModified, remoteDeleted]);

function Harness() {
  const open = signal(true);
  const resolved = signal(false);
  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Text testID="dialog-open">{open() ? "open" : "closed"}</Text>
      <Text testID="resolved">{resolved() ? "resolved" : "pending"}</Text>
      <ConflictDialog
        open={open()}
        onClose={() => open.set(false)}
        onResolved={() => resolved.set(true)}
      />
    </View>
  );
}

mount(Harness);
