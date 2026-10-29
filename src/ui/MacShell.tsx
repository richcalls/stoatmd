import { View, signal } from "nsh";
import { Window } from "nsh/desktop";
import { EditorWorkspace } from "./EditorWorkspace";
import { t } from "./i18n";
import { FOLDERS, noteById, notesInFolder, type FolderId } from "./mockData";
import { NoteList } from "./NoteList";
import { SettingsSheet, type SettingsTab } from "./SettingsSheet";
import { Sidebar } from "./Sidebar";
import { colors } from "./theme";
import { Toolbar, type ViewMode } from "./Toolbar";

Window.setTitle("StoatMD");
Window.setTitleBar("hidden", 44);

/** Mac 三栏壳：左文件夹 / 中列表 / 右编辑预览。 */
export function MacShell() {
  const sidebarOpen = signal(true);
  const listOpen = signal(true);
  const mode = signal<ViewMode>("split");
  const folderId = signal<FolderId>("writing");
  const selectedNoteId = signal("n1");
  const query = signal("");
  const draft = signal(noteById("n1")?.body ?? "");
  const settingsOpen = signal(false);
  const settingsTab = signal<SettingsTab>("appearance");

  const selectFolder = (id: FolderId) => {
    folderId.set(id);
    const first = notesInFolder(id)[0];
    if (first) {
      selectedNoteId.set(first.id);
      draft.set(first.body);
    }
  };

  const selectNote = (id: string) => {
    selectedNoteId.set(id);
    const n = noteById(id);
    if (n) draft.set(n.body);
  };

  const openSettings = (tab: SettingsTab) => {
    settingsTab.set(tab);
    settingsOpen.set(true);
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors().paper,
        flexDirection: "column",
      }}
    >
      <Toolbar
        sidebarOpen={sidebarOpen()}
        listOpen={listOpen()}
        mode={mode()}
        onToggleSidebar={() => sidebarOpen.update((v) => !v)}
        onToggleList={() => listOpen.update((v) => !v)}
        onMode={(m) => mode.set(m)}
        onFont={() => openSettings("font")}
        onSettings={() => openSettings("appearance")}
      />

      <View style={{ flex: 1, flexDirection: "row" }}>
        <If when={sidebarOpen()}>
          <View style={{ width: 168, minWidth: 168 }}>
            <Sidebar selected={folderId()} onSelect={selectFolder} />
          </View>
        </If>

        <If when={listOpen()}>
          <View style={{ width: 260, minWidth: 220 }}>
            <NoteList
              folderId={folderId()}
              folderLabel={t(FOLDERS.find((f) => f.id === folderId())!.labelKey)}
              selectedNoteId={selectedNoteId()}
              onSelectNote={selectNote}
              query={query()}
              onQuery={(q) => query.set(q)}
            />
          </View>
        </If>

        <View style={{ flex: 1, minWidth: 320 }}>
          <EditorWorkspace
            fileName={`${noteById(selectedNoteId())?.title ?? "untitled"}.md`}
            source={draft()}
            onChange={(value) => draft.set(value)}
            mode={mode()}
          />
        </View>
      </View>

      <SettingsSheet
        open={settingsOpen()}
        tab={settingsTab()}
        onTab={(tab) => settingsTab.set(tab)}
        onClose={() => settingsOpen.set(false)}
      />
    </View>
  );
}
