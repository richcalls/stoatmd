import { Text, View, mount, signal } from "nsh";
import type { SyncPhase } from "../sync/runtime";
import { Sidebar } from "./Sidebar";
import type { FolderNode, NoteItem } from "./vaultModel";

const FOLDERS: FolderNode[] = [
  { id: "", name: "", path: "", depth: 0 },
  { id: "Diary", name: "日记", path: "Diary", depth: 1 },
  { id: "Projects", name: "项目", path: "Projects", depth: 1 },
  { id: "Projects/Stoat", name: "水獭", path: "Projects/Stoat", depth: 2 },
];

const LATER: NoteItem[] = [
  { id: "Diary/今天.md", path: "Diary/今天.md", title: "今天", mtimeMs: 1 },
  { id: "Projects/Stoat/计划.md", path: "Projects/Stoat/计划.md", title: "计划", mtimeMs: 2 },
  { id: "root.md", path: "root.md", title: "根级笔记", mtimeMs: 3 },
];

/** 文件树、搜索、折叠与同步脚标的最小挂载入口。 */
function Harness() {
  const notes = signal<NoteItem[]>([]);
  const collapsed = signal<string[]>([]);
  const query = signal("");
  const selected = signal("");
  const folder = signal("");
  const syncOpen = signal(false);
  const newNote = signal(false);
  const menuNote = signal("");
  const phase = signal<SyncPhase>("off");
  const conflicts = signal(0);
  return (
    <View style={{ flex: 1, flexDirection: "column" }}>
      <View style={{ height: 420, width: 260 }}>
        <Sidebar
          folders={FOLDERS}
          notes={notes()}
          selectedNoteId={selected()}
          folderId={folder()}
          collapsed={collapsed()}
          query={query()}
          onQuery={(q) => query.set(q)}
          onSelectNote={(id) => selected.set(id)}
          onSelectFolder={(id) => folder.set(id)}
          onToggleFolder={(id) =>
            collapsed.update((ids) =>
              ids.includes(id) ? ids.filter((v) => v !== id) : [...ids, id],
            )
          }
          onNoteMenu={(id) => menuNote.set(id)}
          onOpenVault={() => {}}
          onNewNote={() => newNote.set(true)}
          onSync={() => syncOpen.set(true)}
          vaultRoot="/notes/我的库"
          syncPhase={phase()}
          syncConflictCount={conflicts()}
        />
      </View>
      <View role="button" testID="feed" onPress={() => notes.set(LATER)}>
        <Text>feed</Text>
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
      <Text testID="folder-value">{folder()}</Text>
      <Text testID="sync-value">{syncOpen() ? "sync-open" : "sync-closed"}</Text>
      <Text testID="new-value">{newNote() ? "new-open" : "new-closed"}</Text>
      <Text testID="menu-value">{menuNote()}</Text>
    </View>
  );
}

mount(Harness);
