import { Text, View, cleanup, effect, platform, signal } from "nsh";
import { AlertDialog } from "nsh/base";
import { Menu, Window } from "nsh/desktop";
import { Vault, VaultDialog } from "stoatmd/native";
import { EditorWorkspace } from "./EditorWorkspace";
import { t } from "./i18n";
import { NoteList } from "./NoteList";
import { loadSavedRoot, saveRoot } from "./prefs";
import { SettingsSheet, type SettingsTab } from "./SettingsSheet";
import { Sidebar } from "./Sidebar";
import { colors } from "./theme";
import { Toolbar, type ViewMode } from "./Toolbar";
import {
  foldersFromEntries,
  nextUntitledPath,
  notesFromEntries,
  readNote,
  titleFromName,
  type FolderNode,
  type NoteItem,
  type OpenedNote,
} from "./vaultModel";

Window.setTitle("StoatMD");
Window.setTitleBar("hidden", 44);

const AUTOSAVE_MS = 700;
const POLL_MS = 1500;

/** Mac 三栏壳：Vault 真文件 + 自动保存 + 冲突提示。 */
export function MacShell() {
  const sidebarOpen = signal(true);
  const listOpen = signal(true);
  const mode = signal<ViewMode>("split");
  const vault = signal<Vault | null>(null);
  const vaultRoot = signal<string | null>(null);
  const folders = signal<FolderNode[]>([]);
  const notes = signal<NoteItem[]>([]);
  const folderId = signal("");
  const selectedNoteId = signal("");
  const query = signal("");
  const opened = signal<OpenedNote | null>(null);
  const draft = signal("");
  const status = signal("");
  const bootstrapped = signal(false);
  const settingsOpen = signal(false);
  const settingsTab = signal<SettingsTab>("appearance");
  const conflictOpen = signal(false);

  const refreshTree = (v: Vault, keepFolder?: string) => {
    const entries = v.list("");
    const nextFolders = foldersFromEntries(entries);
    folders.set(nextFolders);
    const preferred = keepFolder ?? folderId();
    const exists = nextFolders.some((f) => f.id === preferred);
    const nextFolder = exists ? preferred : "";
    folderId.set(nextFolder);
    refreshNotes(v, nextFolder, selectedNoteId());
  };

  const refreshNotes = (v: Vault, dir: string, keepNote?: string) => {
    const entries = v.list(dir);
    const nextNotes = notesFromEntries(entries);
    notes.set(nextNotes);
    const preferred = keepNote ?? selectedNoteId();
    const hit = nextNotes.find((n) => n.id === preferred);
    if (hit) {
      selectedNoteId.set(hit.id);
    } else if (nextNotes[0]) {
      void openNote(v, nextNotes[0].id);
    } else {
      selectedNoteId.set("");
      opened.set(null);
      draft.set("");
    }
  };

  const openNote = async (v: Vault, path: string) => {
    await flushSave();
    try {
      const note = await readNote(v, path);
      opened.set(note);
      draft.set(note.content);
      selectedNoteId.set(path);
      status.set("");
    } catch (err) {
      status.set(String(err));
    }
  };

  const openVaultAt = async (root: string) => {
    try {
      const v = Vault.open(root);
      vault.set(v);
      vaultRoot.set(v.root);
      await saveRoot(v.root);
      Window.setTitle(`StoatMD — ${v.root}`);
      folderId.set("");
      selectedNoteId.set("");
      opened.set(null);
      draft.set("");
      refreshTree(v, "");
      status.set("");
    } catch (err) {
      status.set(String(err));
    }
  };

  const pickAndOpen = async () => {
    try {
      const picked = await VaultDialog.pickFolder();
      if (picked) await openVaultAt(picked);
    } catch (err) {
      status.set(String(err));
    }
  };

  const selectFolder = (id: string) => {
    const v = vault();
    if (!v) return;
    folderId.set(id);
    refreshNotes(v, id);
  };

  const selectNote = (id: string) => {
    const v = vault();
    if (!v) return;
    void openNote(v, id);
  };

  const createNote = async () => {
    const v = vault();
    if (!v) return;
    await flushSave();
    const path = nextUntitledPath(folderId(), notes());
    const body = `# ${titleFromName(path.split("/").pop() || "untitled")}\n\n`;
    try {
      v.create(path, body);
      refreshNotes(v, folderId(), path);
      await openNote(v, path);
    } catch (err) {
      status.set(String(err));
    }
  };

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let saving = false;

  const flushSave = async () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    await doSave();
  };

  const doSave = async () => {
    const v = vault();
    const cur = opened();
    if (!v || !cur || !cur.dirty || saving) return;
    saving = true;
    status.set(t("vault.saving"));
    try {
      const result = v.write(cur.path, draft(), cur.mtimeMs);
      if (result.conflict) {
        await handleConflict(v, cur.path);
      } else {
        opened.set({
          path: cur.path,
          content: draft(),
          mtimeMs: result.mtimeMs,
          dirty: false,
        });
        status.set(t("vault.saved"));
        refreshNotes(v, folderId(), cur.path);
      }
    } catch (err) {
      status.set(String(err));
    } finally {
      saving = false;
    }
  };

  const handleConflict = async (v: Vault, path: string) => {
    if (conflictOpen()) return;
    conflictOpen.set(true);
    try {
      const action = await AlertDialog.show({
        title: t("vault.conflict.title"),
        description: t("vault.conflict.description"),
        actions: [
          { id: "keep", label: t("vault.conflict.keep") },
          { id: "reload", label: t("vault.conflict.reload"), role: "destructive" },
        ],
      });
      if (action === "keep") {
        const result = v.write(path, draft(), null);
        if (result.ok) {
          opened.set({
            path,
            content: draft(),
            mtimeMs: result.mtimeMs,
            dirty: false,
          });
          status.set(t("vault.saved"));
          refreshNotes(v, folderId(), path);
        }
      } else if (action === "reload") {
        await openNote(v, path);
        status.set(t("vault.reloaded"));
      }
    } finally {
      conflictOpen.set(false);
    }
  };

  const onDraftChange = (value: string) => {
    draft.set(value);
    const cur = opened();
    if (!cur) return;
    opened.set({ ...cur, dirty: true });
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void doSave();
    }, AUTOSAVE_MS);
  };

  // 启动：恢复上次库根
  effect(() => {
    if (bootstrapped()) return;
    bootstrapped.set(true);
    void (async () => {
      const saved = await loadSavedRoot();
      if (saved) {
        try {
          await openVaultAt(saved);
        } catch {
          // 路径失效则等待用户重选
        }
      }
    })();
  });

  // 应用菜单：打开库
  effect(() => {
    const mac = platform.os === "macos";
    Menu.setApplicationMenu([
      mac && {
        label: "StoatMD",
        submenu: [
          { role: "about" },
          { type: "separator" },
          { role: "hide" },
          { role: "hideOthers" },
          { type: "separator" },
          { role: "quit" },
        ],
      },
      {
        label: t("menu.file"),
        submenu: [
          {
            label: t("vault.open"),
            shortcut: "mod+o",
            onSelect: () => {
              void pickAndOpen();
            },
          },
          {
            label: t("note.new"),
            shortcut: "mod+n",
            onSelect: () => {
              void createNote();
            },
          },
          !mac && { type: "separator" },
          !mac && { role: "quit", label: t("menu.quit") },
        ],
      },
      {
        label: t("menu.edit"),
        submenu: [
          { role: "undo" },
          { role: "redo" },
          { type: "separator" },
          { role: "cut" },
          { role: "copy" },
          { role: "paste" },
          { role: "selectAll" },
        ],
      },
    ]);
  });

  // 外部改文件：轮询监视事件
  effect(() => {
    const id = setInterval(() => {
      const v = vault();
      const cur = opened();
      if (!v || !cur || conflictOpen()) return;
      const changes = v.pollChanges();
      const hit = changes.some(
        (c) => c.path === cur.path || c.path === "" || cur.path.startsWith(c.path + "/"),
      );
      if (!hit) return;
      try {
        const diskMtime = v.mtime(cur.path);
        if (diskMtime === cur.mtimeMs) return;
        if (cur.dirty) {
          void handleConflict(v, cur.path);
        } else {
          void openNote(v, cur.path).then(() => {
            status.set(t("vault.reloaded"));
            refreshTree(v, folderId());
          });
        }
      } catch {
        refreshTree(v, folderId());
      }
    }, POLL_MS);
    cleanup(() => {
      clearInterval(id);
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
    });
  });

  const openSettings = (tab: SettingsTab) => {
    settingsTab.set(tab);
    settingsOpen.set(true);
  };

  const folderLabel = () => {
    const id = folderId();
    if (!id) return t("vault.rootFolder");
    return folders().find((f) => f.id === id)?.name ?? id;
  };

  const fileName = () => {
    const cur = opened();
    if (!cur) return "—";
    return cur.path.split("/").pop() ?? cur.path;
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

      <If when={!vault()}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: 24,
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: "600", color: colors().ink }}>
            {t("app.name")}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors().ink2,
              textAlign: "center",
              maxWidth: 360,
              lineHeight: 22,
            }}
          >
            {t("vault.empty.hint")}
          </Text>
          <View
            role="button"
            onPress={() => {
              void pickAndOpen();
            }}
            style={{
              marginTop: 8,
              paddingHorizontal: 16,
              height: 36,
              borderRadius: 8,
              backgroundColor: colors().accent,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "560", color: "#FFFFFF" }}>
              {t("vault.open")}
            </Text>
          </View>
          <If when={!!status()}>
            <Text style={{ fontSize: 12, color: colors().ink3, marginTop: 8 }}>{status()}</Text>
          </If>
        </View>
      </If>

      <If when={!!vault()}>
        <View style={{ flex: 1, flexDirection: "row" }}>
          <If when={sidebarOpen()}>
            <View style={{ width: 168, minWidth: 168 }}>
              <Sidebar
                folders={folders()}
                selected={folderId()}
                onSelect={selectFolder}
                onOpenVault={() => {
                  void pickAndOpen();
                }}
                vaultRoot={vaultRoot()}
              />
            </View>
          </If>

          <If when={listOpen()}>
            <View style={{ width: 260, minWidth: 220 }}>
              <NoteList
                folderLabel={folderLabel()}
                notes={notes()}
                selectedNoteId={selectedNoteId()}
                onSelectNote={selectNote}
                onNewNote={() => {
                  void createNote();
                }}
                query={query()}
                onQuery={(q) => query.set(q)}
                disabled={!vault()}
              />
            </View>
          </If>

          <View style={{ flex: 1, minWidth: 320, flexDirection: "column" }}>
            <If when={!!opened()}>
              <EditorWorkspace
                fileName={fileName()}
                source={draft()}
                onChange={onDraftChange}
                mode={mode()}
              />
            </If>
            <If when={!opened()}>
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors().editor,
                }}
              >
                <Text style={{ fontSize: 13, color: colors().ink3 }}>{t("note.empty")}</Text>
              </View>
            </If>
            <If when={!!status()}>
              <Text
                style={{
                  fontSize: 11,
                  color: colors().ink3,
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderTopWidth: 1,
                  borderTopColor: colors().thread,
                }}
              >
                {status()}
              </Text>
            </If>
          </View>
        </View>
      </If>

      <SettingsSheet
        open={settingsOpen()}
        tab={settingsTab()}
        onTab={(tab) => settingsTab.set(tab)}
        onClose={() => settingsOpen.set(false)}
        vaultRoot={vaultRoot()}
        onOpenVault={() => {
          void pickAndOpen();
        }}
      />
    </View>
  );
}
