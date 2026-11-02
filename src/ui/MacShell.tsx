import { uiTextSize, uiLineHeight } from "./typography";
import { Clipboard, Text, View, cleanup, effect, keymap, platform, signal } from "nsh";
import { AlertDialog, Button, Dialog, Input, ResizablePanel, ResizablePanelGroup } from "nsh/base";
import { Menu, Window } from "nsh/desktop";
import { Vault, VaultDialog, type VaultEntryDto } from "stoatmd/native";
import { activeStorage, readActiveStorage, storageBusy } from "../storage/state";
import { syncRuntime } from "../sync/runtime";
import { remoteNotePath } from "../sync/paths";
import { ArticleInspector, type InspectorTab } from "./ArticleInspector";
import { articleModel, type OutlineEntry } from "./articleModel";
import { ConflictDialog } from "./ConflictDialog";
import { EditorWorkspace } from "./EditorWorkspace";
import { findShortcuts, type FindAction, type FindRequest } from "./findShortcuts";
import { Icon } from "./Icon";
import { librarySearch } from "./librarySearch";
import { t } from "./i18n";
import { loadSavedRoot, saveRoot } from "./prefs";
import { scrollEditorToLine, scrollPreviewToIndex } from "./scrollSync";
import type { SettingsTab } from "./SettingsSheet";
import { createSettingsWindow } from "./settingsWindow";
import { Sidebar } from "./Sidebar";
import { colors, statusColor } from "./theme";
import { chromeColors, controlFocusStyle, controlHoverStyle, controlPressStyle } from "./chrome";
import { SIDEBAR_WIDTH, WINDOW_BAR_HEIGHT, WindowBar, type SidebarMode, type ViewMode } from "./Toolbar";
import {
  duplicateNotePath,
  foldersFromEntries,
  nextUntitledPath,
  normalizeVaultPath,
  notesInFolder,
  readNote,
  renamedNotePath,
  titleFromName,
  vaultNameFromRoot,
  type FolderNode,
  type NoteItem,
  type OpenedNote,
} from "./vaultModel";

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
/** 窄窗口下右栏改为覆盖画布，避免挤压正文。 */
const NARROW_OVERLAY = 920;

/** Mac 两栏壳：左栏文件树 + 内嵌画布（编辑/预览） + 可收起文章栏。 */
export function MacShell() {
  Window.setTitle("StoatMD");
  Window.setTitleBar("hidden", WINDOW_BAR_HEIGHT);
  const sidebarMode = signal<SidebarMode>("expanded");
  const sidebarWidth = signal(SIDEBAR_WIDTH);
  const mode = signal<ViewMode>("split");
  const findRequest = signal<FindRequest>({ id: 0, action: "open" });
  const inspectorOpen = signal(false);
  const inspectorTab = signal<InspectorTab>("outline");
  /** 阅读模式视口顶部块，供目录滚动高亮。 */
  const visibleBlock = signal(0);
  const windowWidth = signal(0);
  const windowHeight = signal(0);
  const vault = signal<Vault | null>(null);
  const vaultRoot = signal<string | null>(null);
  const folders = signal<FolderNode[]>([]);
  const notes = signal<NoteItem[]>([]);
  const folderId = signal("");
  const selectedNoteId = signal("");
  const query = signal("");
  const search = librarySearch(vault, query, notes);
  const collapsed = signal<string[]>([]);
  const opened = signal<OpenedNote | null>(null);
  /** 打开笔记时的正文，作为 Editor 的 value；键入期间不再回灌。 */
  const draft = signal("");
  /** 延迟同步给 Markdown 预览的正文，避免每次按键重排整篇。 */
  const previewDraft = signal("");
  const status = signal("");
  const bootstrapped = signal(false);
  const conflictOpen = signal(false);
  const syncConflictOpen = signal(false);
  /** 正在重命名的笔记（null 时弹窗关闭）。 */
  const renamePath = signal<string | null>(null);
  const renameDraft = signal("");
  /** 重命名错误文案 key；空串表示无错误。 */
  const renameError = signal("");
  /** 取消过期的异步 openNote，避免清空列表后旧请求又写回正文。 */
  let openGen = 0;
  /** 编辑器里的最新正文（不等信号）；自动保存与预览都以它为准。 */
  let liveText = "";
  /** 自己写入过的文件，忽略随后 watcher 报回的变更。 */
  const selfWrites = new Map<string, number>();
  let syncTimer: ReturnType<typeof setTimeout> | null = null;

  /** 文件所在目录（根目录为 `""`）。 */
  const parentOf = (path: string): string => {
    const p = normalizeVaultPath(path);
    const i = p.lastIndexOf("/");
    return i <= 0 ? "" : p.slice(0, i);
  };

  /** 打开/新建笔记后展开它的所有上级文件夹。 */
  const expandAncestors = (path: string) => {
    const chain: string[] = [];
    let dir = parentOf(path);
    while (dir) {
      chain.push(dir);
      dir = parentOf(dir);
    }
    if (chain.length === 0) return;
    collapsed.update((ids) => ids.filter((id) => !chain.includes(id)));
  };

  const toggleFolder = (id: string) => {
    const next = normalizeVaultPath(id);
    if (!next) return;
    collapsed.update((ids) =>
      ids.includes(next) ? ids.filter((v) => v !== next) : [...ids, next],
    );
  };

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
      applyNotes(entries, selectedNoteId(), v);
    } catch (err) {
      status.set(String(err));
    }
  };

  const refreshNotes = (v: Vault, keepNote?: string) => {
    try {
      const entries = v.listRecursive("");
      applyNotes(entries, keepNote ?? selectedNoteId(), v);
    } catch (err) {
      status.set(String(err));
    }
  };

  const clearEditor = () => {
    // 当前文件夹无笔记：取消进行中的 open，并清空编辑区
    openGen += 1;
    selectedNoteId.set("");
    opened.set(null);
    inspectorOpen.set(false);
    visibleBlock.set(0);
    liveText = "";
    draft.set("");
    cancelPreview();
    previewDraft.set("");
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
  };

  const applyNotes = (entries: VaultEntryDto[], keepNote: string, v: Vault) => {
    // 文件树始终展示全库笔记；folderId 只决定新建笔记落在哪个文件夹
    const nextNotes = notesInFolder(entries);
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
      visibleBlock.set(0);
      draft.set(note.content);
      previewDraft.set(note.content);
      selectedNoteId.set(note.path);
      folderId.set(parentOf(note.path));
      expandAncestors(note.path);
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
    if (storageBusy()) return;
    const v = vault();
    if (!v || !syncRuntime.isAttached()) return;
    if (syncRuntime.phase() === "conflict") return;
    await flushSave();
    const result = await syncRuntime.syncNow();
    if (!result || storageBusy() || vault() !== v) return;
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

  // 保存后只推变化的文件；云端版本冲突时交回一次全量同步处理。
  const pendingPush = new Set<string>();
  const scheduleSyncPush = (path: string) => {
    if (!syncRuntime.isAttached()) return;
    pendingPush.add(path);
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      syncTimer = null;
      const paths = Array.from(pendingPush);
      pendingPush.clear();
      void (async () => {
        const result = await syncRuntime.pushPaths(paths);
        if (result?.needsFullSync) await runSync();
      })();
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

  const openVaultAt = async (root: string, failOnError = false) => {
    await flushSave();
    try {
      const v = Vault.open(root);
      vault.set(v);
      vaultRoot.set(v.root);
      await saveRoot(v.root);
      Window.setTitle(`StoatMD — ${syncRuntime.connection()?.remoteName || vaultNameFromRoot(v.root)}`);
      folderId.set("");
      selectedNoteId.set("");
      collapsed.set([]);
      query.set("");
      opened.set(null);
      inspectorOpen.set(false);
      visibleBlock.set(0);
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
      if (failOnError) throw err;
    }
  };

  const pickAndOpen = async () => {
    if (storageBusy()) return;
    if (vaultRoot() || activeStorage()) { openSettings("sync"); return; }
    try {
      const picked = await VaultDialog.pickFolder();
      if (picked) await openVaultAt(picked);
    } catch (err) {
      status.set(String(err));
    }
  };

  const selectFolder = (id: string) => {
    // 文件树始终展示全库：选中文件夹只决定新建笔记的目标位置
    folderId.set(normalizeVaultPath(id));
  };

  const selectNote = (id: string) => {
    if (storageBusy()) return;
    const v = vault();
    if (!v) return;
    void openNote(v, id);
  };

  const createNote = async () => {
    if (storageBusy()) return;
    const v = vault();
    if (!v) return;
    await flushSave();
    const path = nextUntitledPath(folderId(), notes());
    const body = `# ${titleFromName(path.split("/").pop() || "untitled")}\n\n`;
    try {
      v.create(path, body);
      expandAncestors(path);
      refreshNotes(v, path);
      await openNote(v, path);
    } catch (err) {
      status.set(String(err));
    }
  };

  const closeRename = () => {
    renamePath.set(null);
    renameDraft.set("");
    renameError.set("");
  };

  const beginRename = (id: string) => {
    if (storageBusy()) return;
    const path = normalizeVaultPath(id);
    renamePath.set(path);
    renameDraft.set(titleFromName(path.split("/").pop() ?? path));
    renameError.set("");
  };

  const renameErrorKey = (err: unknown): string => {
    const text = String(err);
    if (text.includes("already exists")) return "rename.error.exists";
    if (text.includes("invalid path")) return "rename.error.invalid";
    return "rename.error.failed";
  };

  const confirmRename = async () => {
    if (storageBusy()) return;
    const v = vault();
    const from = renamePath();
    if (!v || !from) return;
    const result = renamedNotePath(from, renameDraft());
    if (!result.ok) {
      renameError.set(
        result.error === "empty" ? "rename.error.empty" : "rename.error.invalid",
      );
      return;
    }
    if (result.path === from) {
      closeRename();
      return;
    }
    await flushSave();
    const wasOpen = opened()?.path === from;
    try {
      v.rename(from, result.path);
      markSelfWrite(from);
      markSelfWrite(result.path);
      if (wasOpen) {
        const cur = opened();
        if (cur) opened.set({ ...cur, path: result.path });
        selectedNoteId.set(result.path);
        folderId.set(parentOf(result.path));
      }
      expandAncestors(result.path);
      refreshTree(v, wasOpen ? result.path : selectedNoteId());
      status.set(t("rename.done"));
      closeRename();
    } catch (err) {
      renameError.set(renameErrorKey(err));
    }
  };

  const duplicateNote = async (v: Vault, id: string) => {
    if (storageBusy()) return;
    await flushSave();
    try {
      const source = v.read(id);
      const target = duplicateNotePath(
        id,
        notes().map((n) => n.id),
        t("context.duplicateSuffix"),
      );
      v.create(target, source.content);
      markSelfWrite(target);
      expandAncestors(target);
      refreshTree(v, selectedNoteId());
      status.set(t("context.duplicated"));
    } catch (err) {
      status.set(String(err));
    }
  };

  const trashNote = async (v: Vault, id: string) => {
    if (storageBusy()) return;
    const path = normalizeVaultPath(id);
    const title =
      notes().find((n) => n.id === path)?.title ??
      titleFromName(path.split("/").pop() ?? path);
    const action = await AlertDialog.show({
      title: t("trash.title"),
      description: t("trash.desc", { name: title }),
      actions: [
        { id: "cancel", label: t("common.cancel"), role: "cancel" },
        { id: "trash", label: t("context.trash"), role: "destructive" },
      ],
    });
    if (action !== "trash" || storageBusy()) return;
    await flushSave();
    try {
      v.trash(path);
      markSelfWrite(path);
      if (opened()?.path === path) clearEditor();
      refreshTree(v, selectedNoteId());
      status.set(t("trash.done"));
    } catch (err) {
      status.set(String(err));
    }
  };

  const copyNotePath = async (v: Vault, id: string, relative: boolean) => {
    try {
      const connection = syncRuntime.connection();
      const cloud = !relative && connection?.localRoot === v.root ? connection : null;
      const text = relative
        ? normalizeVaultPath(id)
        : cloud
          ? remoteNotePath(cloud.provider, cloud.remotePath, id)
          : v.absolute(id);
      await Clipboard.writeText(text);
      status.set(t(relative ? "context.copiedRelative" : cloud ? "context.copiedCloudPath" : "context.copiedPath"));
    } catch (err) {
      status.set(String(err));
    }
  };

  const revealNote = (v: Vault, id: string) => {
    try {
      v.reveal(id);
    } catch (err) {
      status.set(String(err));
    }
  };

  const showNoteMenu = (id: string, at: { x: number; y: number }) => {
    const v = vault();
    if (!v) return;
    const mac = platform.os === "macos";
    const cloud = syncRuntime.connection()?.localRoot === v.root;
    void Menu.popup(
      [
        {
          label: t("context.open"),
          onSelect: () => {
            void openNote(v, id);
          },
        },
        mac && !cloud && { type: "separator" as const },
        // A cloud-backed vault is an app-managed offline cache. Finder cannot
        // reveal its Google Drive/Dropbox path, so do not expose a misleading
        // local-cache action in that menu.
        mac && !cloud && {
          label: t("context.reveal"),
          onSelect: () => revealNote(v, id),
        },
        {
          label: t(cloud ? "context.copyCloudPath" : "context.copyPath"),
          onSelect: () => {
            void copyNotePath(v, id, false);
          },
        },
        {
          label: t("context.copyRelativePath"),
          onSelect: () => {
            void copyNotePath(v, id, true);
          },
        },
        { type: "separator" },
        { label: t("context.rename"), onSelect: () => beginRename(id) },
        {
          label: t("context.duplicate"),
          onSelect: () => {
            void duplicateNote(v, id);
          },
        },
        mac && { type: "separator" as const },
        mac && {
          label: t("context.trash"),
          onSelect: () => {
            void trashNote(v, id);
          },
        },
      ],
      at,
    );
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
        scheduleSyncPush(cur.path);
        // 写盘期间可能已经切到别的笔记：只更新仍打开的那篇
        if (opened()?.path === cur.path) {
          const stillDirty = liveText !== content;
          opened.set({
            ...cur,
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
              createdMs: opened()?.createdMs ?? 0,
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
    if (storageBusy()) return;
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
    sidebarMode.update((current) => (current === "expanded" ? "hidden" : "expanded"));
  };

  const settingsWindow = createSettingsWindow({
    vaultRoot,
    onBeforeMigration: async () => {
      await flushSave();
      if (opened()?.dirty) throw new Error(t("storage.error.unsaved"));
    },
    onStorageActivated: async root => { await openVaultAt(root, true); },
    onOpenVault: () => { Window.orderFront(); void pickAndOpen(); },
    onSyncNow: () => { void runSync(); },
    onManageConflicts: () => { Window.orderFront(); syncConflictOpen.set(true); },
  });
  const openSettings = (tab: SettingsTab) => settingsWindow.open(tab);

  const searchEnabled = () => !!opened() && renamePath() === null
    && !conflictOpen() && !syncConflictOpen();
  const requestFind = (action: FindAction) => {
    if (searchEnabled()) findRequest.update((request) => ({ id: request.id + 1, action }));
  };

  // 启动：恢复上次库根
  effect(() => {
    if (bootstrapped()) return;
    bootstrapped.set(true);
    void (async () => {
      await syncRuntime.load();
      const active = await readActiveStorage();
      const saved = active?.root ?? await loadSavedRoot();
      if (saved) {
        try {
          await openVaultAt(saved);
        } catch {
          // 路径失效则等待用户重选
        }
      } else {
        syncRuntime.attach(null);
      }
    })().catch(err => status.set(String(err)));
  });

  // 应用菜单：文件 / 视图 / 编辑；语言切换后随 t() 重建
  effect(() => {
    const mac = platform.os === "macos";
    const findKeys = findShortcuts();
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
          // Let focused native text controls consume editing shortcuts first.
          // The EditorWorkspace fallback handles the custom Editor surface.
          { role: "undo", shortcut: "mod+z", when: "auto" },
          { role: "redo", shortcut: "mod+shift+z", when: "auto" },
          { type: "separator" },
          { role: "cut", shortcut: "mod+x", when: "auto" },
          { role: "copy", shortcut: "mod+c", when: "auto" },
          { role: "paste", shortcut: "mod+v", when: "auto" },
          { role: "selectAll", shortcut: "mod+a", when: "auto" },
          { type: "separator" },
          { label: t("find.open"), shortcut: findKeys.open, disabled: !searchEnabled(), onSelect: () => requestFind("open") },
          { label: t("find.next"), shortcut: findKeys.next, disabled: !searchEnabled(), onSelect: () => requestFind("next") },
          { label: t("find.previous"), shortcut: findKeys.previous, disabled: !searchEnabled(), onSelect: () => requestFind("previous") },
        ],
      },
    ]);
  });

  // 外部改文件：轮询递归监视事件（含子目录）
  effect(() => {
    const id = setInterval(() => {
      const v = vault();
      if (storageBusy() || !v || conflictOpen() || syncRuntime.phase() === "syncing") return;
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

  const fileName = () => {
    const cur = opened();
    if (!cur) return "—";
    return cur.path.split("/").pop() ?? cur.path;
  };

  const noteTitle = () => (opened() ? titleFromName(fileName()) : "");
  const vaultName = () => syncRuntime.connection()?.remoteName || vaultNameFromRoot(vaultRoot());
  /** 目录与统计共用同一份（防抖后的）正文快照。 */
  const article = () => articleModel(previewDraft());
  const narrow = () => windowWidth() > 0 && windowWidth() < NARROW_OVERLAY;

  const jumpToHeading = (heading: OutlineEntry) => {
    if (!opened()) return;
    if (mode() === "preview") {
      scrollPreviewToIndex(heading.blockIndex);
      return;
    }
    scrollEditorToLine(heading.line);
  };

  // 文章栏打开时 Escape 收起；有弹窗时不抢占，留给弹窗自己处理
  effect(() => {
    if (!inspectorOpen()) return;
    if (renamePath() !== null || conflictOpen() || syncConflictOpen()) return;
    const off = keymap.bind("escape", () => inspectorOpen.set(false));
    cleanup(off);
  });
  // 菜单里的「设置…」在无头/无系统菜单的环境也走这条快捷键
  keymap.bind("mod+,", () => openSettings("appearance"));

  const renderInspector = () => (
    <ArticleInspector
      tab={inspectorTab()}
      onTab={(tab) => inspectorTab.set(tab)}
      onClose={() => inspectorOpen.set(false)}
      mode={mode()}
      model={article()}
      createdMs={opened()?.createdMs ?? 0}
      modifiedMs={opened()?.mtimeMs ?? 0}
      path={opened()?.path ?? ""}
      visibleBlock={visibleBlock()}
      onJump={jumpToHeading}
    />
  );

  return (
    <View
      onLayout={(b) => {
        windowWidth.set(b.size.width);
        windowHeight.set(b.size.height);
      }}
      style={{
        flex: 1,
        backgroundColor: vault() ? colors().sidebar : colors().paper,
        backgroundImage: vault() ? chromeColors().shellFinish : "none",
        flexDirection: "column",
      }}
    >
      <WindowBar
        showSidebarToggle={!!vault()}
        sidebarOpen={sidebarMode() !== "hidden"}
        onToggleSidebar={cycleSidebar}
        vaultName={vault() ? vaultName() : ""}
        title={noteTitle()}
        showModes={!!opened()}
        mode={mode()}
        onMode={changeMode}
      />

      <If when={!vault()}>
        <View style={{ flex: 1, flexDirection: "column" }}>
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              padding: 24,
            }}
          >
          <Text style={{ fontSize: uiTextSize(22), fontWeight: "600", color: colors().ink }}>
            {t("app.name")}
          </Text>
          <Text
            style={{
              fontSize: uiTextSize(14),
              color: colors().ink2,
              textAlign: "center",
              maxWidth: 360,
              lineHeight: uiLineHeight(22),
            }}
          >
            {t("vault.empty.hint")}
          </Text>
          <Button
            accessibilityLabel={t("vault.open")}
            hoverStyle={{ opacity: 0.9 }}
            focusStyle={{ ...controlFocusStyle(), outlineOffset: 2 }}
            activeStyle={{ opacity: 0.75 }}
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
            <Text
              style={{ fontSize: uiTextSize(14), fontWeight: "560", color: colors().accentInk }}
            >
              {t("vault.open")}
            </Text>
          </Button>
          <If when={!!status()}>
            <Text style={{ fontSize: uiTextSize(12), color: colors().ink3, marginTop: 8 }}>{status()}</Text>
          </If>
          </View>
        </View>
      </If>

      <If when={!!vault()}>
        <ResizablePanelGroup
          axis="horizontal"
          style={{ flex: 1, minHeight: 0 }}
          // Canvas edge is the visible divider; keep the resizer hit target visually clear.
          handleStyle={{ width: 1, backgroundColor: "transparent" }}
          handleThumbStyle={{ width: 3, borderRadius: 2, backgroundColor: "transparent" }}
          handleAccessibilityLabel="Adjust sidebar width"
          onResize={(sizes) => {
            const width = sizes[0];
            if (width !== undefined && Number.isFinite(width)) sidebarWidth.set(width);
          }}
        >
          <ResizablePanel
            size={sidebarWidth()}
            minSize={180}
            maxSize={420}
            visible={sidebarMode() !== "hidden"}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Sidebar
                folders={folders()}
                notes={notes()}
                selectedNoteId={selectedNoteId()}
                folderId={folderId()}
                collapsed={collapsed()}
                query={query()}
                contentMatches={search.matches()}
                searchPending={search.pending()}
                searchError={search.error()}
                currentNote={opened() ? { path: opened()!.path, content: previewDraft() } : undefined}
                onQuery={(q) => query.set(q)}
                onSelectNote={selectNote}
                onSelectFolder={selectFolder}
                onToggleFolder={toggleFolder}
                onNoteMenu={showNoteMenu}
                onOpenVault={() => {
                  void pickAndOpen();
                }}
                onNewNote={() => {
                  void createNote();
                }}
                onSync={() => {
                  if (syncRuntime.conflicts().length > 0) {
                    syncConflictOpen.set(true);
                  } else {
                    openSettings("sync");
                  }
                }}
                vaultRoot={syncRuntime.connection() ? null : vaultRoot()}
                syncPhase={syncRuntime.phase()}
                syncConflictCount={syncRuntime.conflicts().length}
              />
            </View>
          </ResizablePanel>

          {/* 工作区左边框兼作分隔线；右、底留白 9px。 */}
          <ResizablePanel minSize={360}>
            <View
              style={{
                flex: 1,
                minWidth: 0,
                paddingLeft: 0,
                paddingRight: 9,
                paddingBottom: 9,
              }}
          >
            <View
              testID="workspace-canvas"
              style={{
                flex: 1,
                minWidth: 0,
                flexDirection: "row",
                overflow: "hidden",
                borderRadius: 10,
                borderWidth: 1,
                borderColor: chromeColors().panelEdge,
                boxShadow: chromeColors().panelShadow,
                backgroundColor: colors().paper,
                position: "relative",
              }}
            >
              <View style={{ flex: 1, minWidth: 0, flexDirection: "column" }}>
                <If when={!!opened()}>
                  <EditorWorkspace
                    readOnly={storageBusy()}
                    source={draft()}
                    preview={previewDraft()}
                    onChange={onDraftChange}
                    mode={mode()}
                    documentId={opened()?.path}
                    findRequest={findRequest()}
                    searchEnabled={searchEnabled()}
                    onRevealEditor={() => changeMode("split")}
                    onVisibleBlock={(index) => visibleBlock.set(index)}
                  />
                </If>
                <If when={!opened()}>
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: uiTextSize(13), color: colors().ink3 }}>{t("note.empty")}</Text>
                  </View>
                </If>
                <If when={!!status()}>
                  <Text
                    style={{
                      fontSize: uiTextSize(11),
                      color: colors().ink3,
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      borderTopWidth: 1,
                      borderTopColor: colors().thread,
                      backgroundColor: colors().paper,
                    }}
                  >
                    {status()}
                  </Text>
                </If>
              </View>

              <If when={!!opened() && inspectorOpen()}>
                <View
                  style={
                    narrow()
                      ? {
                          position: "absolute",
                          top: 0,
                          right: 0,
                          bottom: 0,
                          width: 222,
                          zIndex: 10,
                          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.22)",
                        }
                      : { width: 222, flexShrink: 0 }
                  }
                >
                  {renderInspector()}
                </View>
              </If>

              {/* 目录入口位于正文上方留白内，横排文案兼容各语言。 */}
              <If when={!!opened() && !inspectorOpen()}>
                <Button
                  testID="inspector-peek"
                  accessibilityLabel={t("inspector.open")}
                  tooltip={<Text style={{ fontSize: uiTextSize(12) }}>{t("inspector.openHint")}</Text>}
                  onPress={() => inspectorOpen.set(true)}
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    height: 28,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    paddingHorizontal: 8,
                    borderRadius: 6,
                    backgroundColor: colors().paper,
                  }}
                  hoverStyle={controlHoverStyle()}
                  focusStyle={controlFocusStyle()}
                  activeStyle={controlPressStyle()}
                >
                  <Icon name="list-tree" color={colors().ink3} size={13} />
                  <Text style={{ fontSize: uiTextSize(11), color: colors().ink3 }}>
                    {t("inspector.open")}
                  </Text>
                </Button>
              </If>
            </View>
            </View>
          </ResizablePanel>
        </ResizablePanelGroup>
      </If>

      <If when={renamePath() !== null}>
        <Dialog
          open
          testID="rename-dialog"
          onOpenChange={(open) => {
            if (!open) closeRename();
          }}
          onCancel={closeRename}
          onClose={closeRename}
          closeOnBackdropPress
          closeOnEscape
          animation="fade"
          backdropStyle={{ backgroundColor: "rgba(44,42,38,0.28)" }}
          style={{
            width: 420,
            margin: "auto",
            alignSelf: "center",
            padding: 20,
            gap: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors().thread,
            backgroundColor: colors().paper,
            flexDirection: "column",
          }}
        >
          <Text style={{ fontSize: uiTextSize(16), fontWeight: "650", color: colors().ink }}>
            {t("rename.title")}
          </Text>
          <Text style={{ fontSize: uiTextSize(12.5), color: colors().ink2, lineHeight: uiLineHeight(18) }}>
            {t("rename.desc")}
          </Text>
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: uiTextSize(12), fontWeight: "500", color: colors().ink2 }}>
              {t("rename.label")}
            </Text>
            <Input
              testID="rename-input"
              value={renameDraft()}
              onChange={(text) => {
                renameDraft.set(text);
                if (renameError()) renameError.set("");
              }}
              onSubmit={() => {
                void confirmRename();
              }}
              submitBehavior="submit"
              autoFocus
              style={{
                height: 32,
                paddingHorizontal: 10,
                borderRadius: 7,
                borderWidth: 1,
                borderColor: renameError()
                  ? statusColor("danger")
                  : colors().thread,
                backgroundColor: colors().list,
                fontSize: uiTextSize(13),
                color: colors().ink,
              }}
            />
            <If when={renameError() !== ""}>
              <Text
                testID="rename-error"
                style={{ fontSize: uiTextSize(12), color: statusColor("danger") }}
              >
                {t(renameError())}
              </Text>
            </If>
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 2,
            }}
          >
            <Button
              testID="rename-cancel"
              onPress={closeRename}
              style={{
                height: 30,
                paddingHorizontal: 14,
                borderRadius: 7,
                borderWidth: 1,
                borderColor: colors().thread,
                justifyContent: "center",
              }}
              activeStyle={{ opacity: 0.7 }}
            >
              <Text style={{ fontSize: uiTextSize(13), color: colors().ink2 }}>
                {t("common.cancel")}
              </Text>
            </Button>
            <Button
              testID="rename-confirm"
              onPress={() => {
                void confirmRename();
              }}
              style={{
                height: 30,
                paddingHorizontal: 14,
                borderRadius: 7,
                backgroundColor: colors().accent,
                justifyContent: "center",
              }}
              activeStyle={{ opacity: 0.8 }}
            >
              <Text
                style={{ fontSize: uiTextSize(13), fontWeight: "560", color: colors().accentInk }}
              >
                {t("rename.confirm")}
              </Text>
            </Button>
          </View>
        </Dialog>
      </If>

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
