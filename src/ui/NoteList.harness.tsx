import { Text, View, mount, signal } from "nsh";
import { NoteList } from "./NoteList";
import type { NoteItem } from "./vaultModel";

const LATER: NoteItem[] = [
  {
    id: "Clippings/万字教程.md",
    path: "Clippings/万字教程.md",
    title: "万字教程",
    mtimeMs: 1,
  },
  { id: "写作/草稿.md", path: "写作/草稿.md", title: "草稿", mtimeMs: 2 },
  { id: "root.md", path: "root.md", title: "根级笔记", mtimeMs: 3 },
];

/** 供 NoteList 组件测试挂载的最小入口：列表数据晚于组件到达。 */
function Harness() {
  const notes = signal<NoteItem[]>([]);
  const query = signal("");
  const selected = signal("");
  return (
    <View style={{ flex: 1, flexDirection: "column" }}>
      <View style={{ height: 420 }}>
        <NoteList
          folderLabel="根目录"
          notes={notes()}
          selectedNoteId={selected()}
          onSelectNote={(id) => selected.set(id)}
          onNewNote={() => {}}
          query={query()}
          onQuery={(q) => query.set(q)}
        />
      </View>
      <View role="button" testID="feed" onPress={() => notes.set(LATER)}>
        <Text>feed</Text>
      </View>
      <Text testID="selected-value">{selected()}</Text>
    </View>
  );
}

mount(Harness);
