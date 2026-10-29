import { Text, View, cleanup, effect, platform, signal } from "nsh";
import { AlertDialog } from "nsh/base";
import { Menu, Window } from "nsh/desktop";
import { Vault, VaultDialog, type VaultEntryDto } from "stoatmd/native";
import { syncRuntime } from "../sync/runtime";
import { ConflictDialog } from "./ConflictDialog";
import { EditorWorkspace } from "./EditorWorkspace";
import { t } from "./i18n";
import { NoteList } from "./NoteList";
import { loadSavedRoot, saveRoot } from "./prefs";
import { SettingsSheet, type SettingsTab } from "./SettingsSheet";
import { Sidebar } from "./Sidebar";
import { colors } from "./theme";
import { TitleBar, WorkspaceToolbar, type SidebarMode, type ViewMode } from "./Toolbar";
import {
  foldersFromEntries,
  nextUntitledPath,
  normalizeVaultPath,
  notesInFolder,
  readNote,
  titleFromName,
  type FolderNode,
  type NoteItem,
  type OpenedNote,
} from "./vaultModel";

Window.setTitle("StoatMD");
Window.setTitleBar("hidden", 52);

const AUTOSAVE_MS = 700;
const PREVIEW_MS = 250;
const POLL_MS = 1500;
/** 自己写入后这段时间内的 watcher 事件不算外部改动。 */
const SELF_WRITE_MS = 4000;
/** 保存后延迟推送到云端，避开连续输入。 */
const SYNC_AFTER_SAVE_MS = 2500;
/** 定时拉取云端变化；冲突未处理时暂停，等用户选择。 */
const SYNC_PULL_MS = 90_000;
const SYNC_START_DELAY_MS = 1200;

/** Mac 三栏壳：Vault 真文件 + 自动保存 + 冲突提示。 */
export function MacShell() {
  const sidebarMode = signal<SidebarMode>("expanded");
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
  /** 打开笔记时的正文，作为 Editor 的 value；键入期间不再回灌。 */
  const draft = signal("");
  /** 延迟同步给 Markdown 预览的正文，避免每次按键重排整篇。 */
  const previewDraft = signal("");
  const status = signal("");
  const bootstrapped = signal(false);
  const settingsOpen = signal(false);
  const settingsTab = signal<SettingsTab>("appearance");
  const conflictOpen = signal(false);
  const syncConflictOpen = signal(false);
  /** 取消过期的异步 openNote，避免清空列表后旧请求又写回正文。 */
  let openGen = 0;
  /** 编辑器里的最新正文（不等信号）；自动保存与预览都以它为准。 */
  let liveText = "";
  /** 自己写入过的文件，忽略随后 watcher 报回的变更。 */
  const selfWrites = new Map<string, number>();
  let syncTimer: ReturnType<typeof setTimeout> | null = null;

  const refreshTree = (v: Vault, keepFolder?: string) => {
    try {
      // 始终全库递归一次，再在 TS 侧过滤（避开子路径 resolve / NFD 不一致）
      const entries = v.listRecursive("");
      const nextFolders = foldersFromEntries(entries);
      folders.set(nextFolders);
      const preferred = normalizeVaultPath(keepFolder ?? folderId());
      const exists = !preferred || nextFolders.some((f) => f.id === preferred);
      const nextFolder = exists ? preferred : "";
      folderId.set(nextFolder);
      applyNotes(entries, nextFolder, selectedNoteId(), v);
    } catch (err) {
      status.set(String(err));
    }
  };

  const refreshNotes = (v: Vault, dir: string, keepNote?: string) => {
    try {
      const entries = v.listRecursive("");
      applyNotes(entries, dir, keepNote ?? selectedNoteId(), v);
    } catch (err) {
      status.set(String(err));
    }
  };

  const clearEditor = () => {
    // 当前文件夹无笔记：取消进行中的 open，并清空编辑区
    openGen += 1;
    selectedNoteId.set("");
    opened.set(null);
    liveText = "";
    draft.set("");
    cancelPreview();
    previewDraft.set("");
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
  };

  const applyNotes = (entries: VaultEntryDto[], dir: string, keepNote: string, v: Vault) => {
    const nextNotes = notesInFolder(entries, dir);
    notes.set(nextNotes);
    const preferred = normalizeVaultPath(keepNote);
    const hit = nextNotes.find((n) => n.id === preferred);
    if (hit) {
      selectedNoteId.set(hit.id);
      return;
    }
    if (nextNotes[0]) {
      void openNote(v, nextNotes[0].id);
      return;
    }
    clearEditor();
  };

  const openNote = async (v: Vault, path: string, skipFlush = false) => {
    const gen = ++openGen;
    // 冲突时选「重新加载」即丢弃本地改动：跳过 flush，也避免等外层 doSave 持有的 saving 造成死锁
    if (!skipFlush) await flushSave();
    if (gen !== openGen) return;
    try {
      const note = await readNote(v, path);
      if (gen !== openGen) return;
      liveText = note.content;
      cancelPreview();
      opened.set(note);
      draft.set(note.content);
      previewDraft.set(note.content);
      selectedNoteId.set(note.path);
      status.set("");
    } catch (err) {
      if (gen !== openGen) return;
      status.set(String(err));
    }
  };

  let previewTimer: ReturnType<typeof setTimeout> | null = null;

  const cancelPreview = () => {
    if (previewTimer) {
      clearTimeout(previewTimer);
      previewTimer = null;
    }
  };

  const schedulePreview = () => {
    cancelPreview();
    previewTimer = setTimeout(() => {
      previewTimer = null;
      previewDraft.set(liveText);
    }, PREVIEW_MS);
  };

  const flushPreview = () => {
    cancelPreview();
    previewDraft.set(liveText);
  };

  const markSelfWrite = (path: string) => {
    selfWrites.set(normalizeVaultPath(path), Date.now() + SELF_WRITE_MS);
  };

  /** 云端删除的当前笔记不再重新打开；让 refreshTree 自己切换或清空。 */
  const stillOnCur = (v: Vault, path: string): boolean => {
    if (opened()?.path !== path) return false;
    try {
      v.mtime(path);
      return true;
    } catch {
      return false;
    }
  };

  const runSync = async () => {
    const v = vault();
    if (!v || !syncRuntime.isAttached()) return;
    if (syncRuntime.phase() === "conflict") return;
    await flushSave();
    const result = await syncRuntime.syncNow();
    if (!result) return;
    if (result.conflicts.length > 0) syncConflictOpen.set(true);
    if (result.changedLocal.length > 0) {
      const cur = opened();
      for (const path of result.changedLocal) markSelfWrite(path);
      refreshTree(v, folderId());
      if (cur && result.changedLocal.includes(cur.path) && stillOnCur(v, cur.path)) {
        await openNote(v, cur.path, true);
        status.set(t("vault.reloaded"));
      }
    }
  };

  const scheduleSyncPush = () => {
    if (!syncRuntime.isAttached()) return;
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      syncTimer = null;
      void runSync();
    }, SYNC_AFTER_SAVE_MS);
  };

  /** 保存后只改这一篇的 mtime 并重排，不再全库扫描。 */
  const patchNoteMtime = (path: string, mtimeMs: number) => {
    const id = normalizeVaultPath(path);
    let hit = false;
    const next = notes().map((n) => {
      if (n.id !== id) return n;
      hit = true;
      return { ...n, mtimeMs };
    });
    if (!hit) return;
    next.sort((a, b) => b.mtimeMs - a.mtimeMs || a.path.localeCompare(b.path));
    notes.set(next);
  };

  const openVaultAt = async (root: string) => {
    await flushSave();
    try {
      const v = Vault.open(root);
      vault.set(v);
      vaultRoot.set(v.root);
      await saveRoot(v.root);
      Window.setTitle(`StoatMD — ${v.root}`);
      folderId.set("");
      selectedNoteId.set("");
      opened.set(null);
      liveText = "";
      draft.set("");
      cancelPreview();
      previewDraft.set("");
      selfWrites.clear();
      refreshTree(v, "");
      status.set("");
      syncRuntime.attach(v);
      setTimeout(() => {
        if (vault() === v) void runSync();
      }, SYNC_START_DELAY_MS);
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

  const selectFolder = async (id: string) => {
    const v = vault();
    if (!v) return;
    const next = normalizeVaultPath(id);
    // 切到空文件夹时 applyNotes 会直接 clearEditor：先落盘，避免吞掉未保存输入
    await flushSave();
    folderId.set(next);
    refreshNotes(v, next);
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

  const scheduleSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      void doSave();
    }, AUTOSAVE_MS);
  };

  const flushSave = async () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    // 等正在进行的写盘落定，再补存一次（避免切笔记时丢掉最后几个字）
    while (saving) {
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
    }
    await doSave();
  };

  const doSave = async () => {
    const v = vault();
    const cur = opened();
    if (!v || !cur || !cur.dirty || saving) return;
    saving = true;
    const content = liveText;
    status.set(t("vault.saving"));
    try {
      const result = v.write(cur.path, content, cur.mtimeMs);
      if (result.conflict) {
        await handleConflict(v, cur.path);
      } else {
        markSelfWrite(cur.path);
        patchNoteMtime(cur.path, result.mtimeMs);
        status.set(t("vault.saved"));
        scheduleSyncPush();
        // 写盘期间可能已经切到别的笔记：只更新仍打开的那篇
        if (opened()?.path === cur.path) {
          const stillDirty = liveText !== content;
          opened.set({
            path: cur.path,
            content: liveText,
            mtimeMs: result.mtimeMs,
            dirty: stillDirty,
          });
          if (stillDirty) scheduleSave();
        }
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
        const content = liveText;
        const result = v.write(path, content, null);
        if (result.ok) {
          markSelfWrite(path);
          patchNoteMtime(path, result.mtimeMs);
          status.set(t("vault.saved"));
          if (opened()?.path === path) {
            const stillDirty = liveText !== content;
            opened.set({
              path,
              content: liveText,
              mtimeMs: result.mtimeMs,
              dirty: stillDirty,
            });
            if (stillDirty) scheduleSave();
          }
        }
      } else if (action === "reload") {
        await openNote(v, path, true);
        status.set(t("vault.reloaded"));
      }
    } finally {
      conflictOpen.set(false);
    }
  };

  const onDraftChange = (value: string) => {
    liveText = value;
    const cur = opened();
    if (!cur) return;
    if (!cur.dirty) opened.set({ ...cur, dirty: true });
    scheduleSave();
    schedulePreview();
  };

  const changeMode = (m: ViewMode) => {
    // 切换模式会重建编辑区：先把最新正文同步过去，预览也立即跟上
    if (liveText !== draft()) draft.set(liveText);
    flushPreview();
    mode.set(m);
  };

  const cycleSidebar = () => {
    sidebarMode.update((current) =>
      current === "expanded" ? "rail" : current === "rail" ? "hidden" : "expanded",
    );
  };

  const openSettings = (tab: SettingsTab) => {
    settingsTab.set(tab);
    settingsOpen.set(true);
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
      } else {
        syncRuntime.attach(null);
      }
    })();
  });

  // 应用菜单：文件 / 视图 / 编辑；语言切换后随 t() 重建
  effect(() => {
    const mac = platform.os === "macos";
    const settingsItem = {
      label: t("menu.settings"),
      shortcut: "mod+,",
      onSelect: () => openSettings("appearance"),
    };
    Menu.setApplicationMenu([
      mac && {
        label: "StoatMD",
        submenu: [
          { role: "about" },
          { type: "separator" },
          settingsItem,
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
          !mac && settingsItem,
          !mac && { type: "separator" },
          !mac && { role: "quit", label: t("menu.quit") },
        ],
      },
      {
        label: t("menu.view"),
        submenu: [
          { label: t("menu.view.sidebar"), shortcut: "mod+b", onSelect: cycleSidebar },
          {
            label: t("menu.view.list"),
            shortcut: "mod+shift+b",
            onSelect: () => listOpen.update((open) => !open),
          },
          { type: "separator" },
          {
            label: t("mode.edit"),
            shortcut: "mod+1",
            onSelect: () => changeMode("edit"),
          },
          {
            label: t("mode.split"),
            shortcut: "mod+2",
            onSelect: () => changeMode("split"),
          },
          {
            label: t("mode.preview"),
            shortcut: "mod+3",
            onSelect: () => changeMode("preview"),
          },
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

  // 外部改文件：轮询递归监视事件（含子目录）
  effect(() => {
    const id = setInterval(() => {
      const v = vault();
      if (!v || conflictOpen() || syncRuntime.phase() === "syncing") return;
      const changes = v.pollChanges();
      if (changes.length === 0) return;
      const now = Date.now();
      for (const [path, until] of selfWrites) {
        if (until <= now) selfWrites.delete(path);
      }
      // 自己刚保存的写入不算外部改动：否则每次自动保存都要全库重扫
      const foreign = changes.filter((c) => {
        const until = selfWrites.get(normalizeVaultPath(c.path));
        return !(until && until > now);
      });
      if (foreign.length === 0) return;
      const cur = opened();
      const folder = folderId();
      const touchesCurrent =
        !!cur &&
        foreign.some(
          (c) =>
            c.path === cur.path ||
            c.path === "" ||
            cur.path.startsWith(c.path + "/") ||
            c.path.startsWith(cur.path),
        );
      // 外部变更才刷新树/列表，保证嵌套目录新增可见
      refreshTree(v, folder);
      if (!cur || !touchesCurrent) return;
      try {
        const diskMtime = v.mtime(cur.path);
        if (diskMtime === cur.mtimeMs) return;
        if (cur.dirty) {
          void handleConflict(v, cur.path);
        } else {
          void openNote(v, cur.path).then(() => {
            status.set(t("vault.reloaded"));
          });
        }
      } catch {
        // 当前文件可能已被删：树已刷新
      }
    }, POLL_MS);
    cleanup(() => {
      clearInterval(id);
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      if (syncTimer) {
        clearTimeout(syncTimer);
        syncTimer = null;
      }
      cancelPreview();
    });
  });

  // 定时拉取云端变化（保存后另有防抖推送）
  effect(() => {
    const id = setInterval(() => {
      if (!syncRuntime.isAttached()) return;
      if (syncRuntime.phase() === "conflict" || syncRuntime.phase() === "syncing") return;
      void runSync();
    }, SYNC_PULL_MS);
    cleanup(() => clearInterval(id));
  });

  const folderLabel = () => {
    const id = normalizeVaultPath(folderId());
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
      <TitleBar />

      <If when={!vault()}>
        <View style={{ flex: 1, flexDirection: "column" }}>
          <WorkspaceToolbar
            minimal
            mode={mode()}
            onMode={changeMode}
            sidebarMode={sidebarMode()}
            listOpen={listOpen()}
            onCycleSidebar={cycleSidebar}
            onToggleList={() => listOpen.update((v) => !v)}
            onFont={() => openSettings("font")}
            onSettings={() => openSettings("appearance")}
          />
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
        </View>
      </If>

      <If when={!!vault()}>
        <View style={{ flex: 1, flexDirection: "row" }}>
          <If when={sidebarMode() !== "hidden"}>
            <View
              style={{
                width: sidebarMode() === "rail" ? 48 : 200,
                minWidth: sidebarMode() === "rail" ? 48 : 200,
              }}
            >
              <Sidebar
                folders={folders()}
                selected={folderId()}
                onSelect={selectFolder}
                onOpenVault={() => {
                  void pickAndOpen();
                }}
                onSync={() => {
                  if (syncRuntime.conflicts().length > 0) {
                    syncConflictOpen.set(true);
                  } else {
                    openSettings("sync");
                  }
                }}
                vaultRoot={vaultRoot()}
                rail={sidebarMode() === "rail"}
                syncPhase={syncRuntime.phase()}
                syncConflictCount={syncRuntime.conflicts().length}
              />
            </View>
          </If>

          <If when={listOpen()}>
            <View style={{ width: 280, minWidth: 240 }}>
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
            <WorkspaceToolbar
              mode={mode()}
              onMode={changeMode}
              sidebarMode={sidebarMode()}
              listOpen={listOpen()}
              onCycleSidebar={cycleSidebar}
              onToggleList={() => listOpen.update((v) => !v)}
              onFont={() => openSettings("font")}
              onSettings={() => openSettings("appearance")}
            />
            <If when={!!opened()}>
              <EditorWorkspace
                fileName={fileName()}
                source={draft()}
                preview={previewDraft()}
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
        onSyncNow={() => {
          void runSync();
        }}
        onManageConflicts={() => syncConflictOpen.set(true)}
      />

      <ConflictDialog
        open={syncConflictOpen()}
        onClose={() => syncConflictOpen.set(false)}
        onResolved={() => {
          void runSync();
        }}
      />
    </View>
  );
}
