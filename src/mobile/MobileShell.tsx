import { Keyboard, List, Scroll, Text, View, cleanup, computed, keyboardFrame, safeAreaInsets, signal, type YNode, type JSX } from "nsh";
import { Button, Dialog, Input, NavPage, NavStack, TextView, createNavStack } from "nsh/base";
import { InputAccessoryView } from "nsh/mobile";
import { MobileFiles, Vault } from "stoatmd/native";
import { activeStorage, readActiveStorage, writeActiveStorage, storageBusy } from "../storage/state";
import { syncRuntime } from "../sync/runtime";
import { SyncSettings } from "../ui/SyncSettings";
import { providerLabelKey } from "../sync/runtime";
import { Icon, type IconName } from "../ui/Icon";
import { articleModel } from "../ui/articleModel";
import { previewTextStyles } from "../ui/EditorWorkspace";
import { displayBlock, renderMode } from "../ui/documentAppearance";
import { locale, localePref, setLocalePref, t, type LocalePref } from "../ui/i18n";
import { librarySearch } from "../ui/librarySearch";
import { saveLocale } from "../ui/prefs";
import { previewGap, previewModel, resolveAnchor } from "../ui/previewModel";
import { THEMES, applyTheme, colors, isDarkTheme, themeId } from "../ui/theme";
import { applyEditorFontSize, applyFontSize, editorFontSize, fontSize, lineHeightPx } from "../ui/typography";
import { formatWhen, notesInFolder, titleFromName } from "../ui/vaultModel";
import { mobileLibrary, type MobileLibrary } from "./library";
import { syncStatus } from "./syncStatus";

type Route = { kind: "library"; folder: string } | { kind: "document" };
type Panel = "settings" | "outline" | "type" | "actions" | "rename" | "folder" | "move" | "trash" | "erase" | "cloudConflicts" | null;

function Action(props: { label: string; onPress: () => void; icon?: IconName; id?: string; disabled?: boolean; selected?: boolean; accessibilityLabel?: string }) {
  return <Button testID={props.id} accessibilityLabel={props.accessibilityLabel ?? props.label} disabled={props.disabled}
    onPress={props.onPress} style={{ minHeight: 44, minWidth: 44, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 10, backgroundColor: props.selected ? colors().accentSoft : "transparent" }}>
    {props.icon ? <Icon name={props.icon} color={colors().accent} size={21} /> : null}
    <Text style={{ color: colors().accent, fontSize: 16 }}>{props.label}</Text>
  </Button>;
}

/** 同步进行中显示进度，失败时给出原因和重试；同步完成后不占空间。 */
function SyncBanner(props: { onRetry: () => void }) {
  const current = syncStatus(syncRuntime.phase(), syncRuntime.progress(), syncRuntime.error());
  if (!current) return null;
  if (current.kind === "error") {
    return <View testID="mobile-sync-error" style={{ padding: 14, gap: 8, backgroundColor: colors().accentSoft }}>
      <Text style={{ color: colors().ink }}>{t(current.key)}</Text>
      <Action label={t("sync.error.retry")} onPress={props.onRetry} />
    </View>;
  }
  return <View testID="mobile-sync-progress" style={{ paddingHorizontal: 22, paddingBottom: 10, gap: 6 }}>
    <Text style={{ color: colors().ink3 }}>{t(current.key, current.params)}</Text>
    <View style={{ height: 4, borderRadius: 2, backgroundColor: colors().thread }}>
      <View style={{ height: 4, width: `${current.percent}%`, borderRadius: 2, backgroundColor: colors().accent }} />
    </View>
  </View>;
}

export function MobileShell(props: { library?: MobileLibrary } = {}) {
  const library = signal<MobileLibrary | null>(null);
  const startupError = signal("");
  const loading = signal(true);
  let alive = true;
  const activate = async (root: string) => {
    const vault = Vault.open(root);
    const model = mobileLibrary(vault);
    await model.refresh();
    try { await model.recover(); } catch (err) { model.error.set(String(err)); }
    if (alive) { syncRuntime.attach(vault); library.set(model); }
  };
  const load = async () => {
    startupError.set("");
    loading.set(true);
    try {
      if (props.library) {
        await props.library.refresh();
        await props.library.recover();
        if (alive) library.set(props.library);
        return;
      }
      const stored = await readActiveStorage();
      // A usable iPhone library always belongs to one supported cloud provider.
      if (stored?.connection && ["google", "dropbox"].includes(stored.connection.provider)) {
        const vault = Vault.reopenCache(stored.root);
        if (vault.root !== stored.root) await writeActiveStorage({ ...stored, root: vault.root,
          connection: { ...stored.connection, localRoot: vault.root } });
        await syncRuntime.load();
        await activate(vault.root);
      }
    } catch (err) { if (alive) startupError.set(String(err)); }
    finally { if (alive) loading.set(false); }
  };
  void load();
  cleanup(() => { alive = false; });
  return <View testID="mobile-shell" style={{ flex: 1, backgroundColor: colors().paper }}>
    <Each of={library() ? [library()!] : []} key={model => model}>{model => <MobileApp library={model()} connected={!props.library} onStorageActivated={activate} />}</Each>
    {!library() ?
      <Scroll testID="mobile-connect" style={{ flex: 1 }} contentStyle={{ padding: 28, paddingTop: 80, gap: 24 }}>
        <Text style={{ fontSize: 30, color: colors().ink }}>StoatMD</Text>
        <Text style={{ fontSize: 21, color: colors().ink }}>{t("mobile.connectTitle")}</Text>
        <Text style={{ color: colors().ink2 }}>{t("mobile.paidCloud")}</Text>
        {loading() ? <Text style={{ color: colors().ink2 }}>{t("mobile.loading")}</Text> : startupError() ?
          <View style={{ gap: 12 }}><Text style={{ color: colors().ink }}>{startupError()}</Text><Action label={t("sync.error.retry")} onPress={() => { void load(); }} /></View> :
          <SyncSettings cloudOnly onBeforeMigration={async () => {}} onStorageActivated={activate} />}
      </Scroll> : null}
  </View>;
}

function MobileApp(props: { library: MobileLibrary; connected: boolean; onStorageActivated: (root: string) => Promise<void> }) {
  const lib = props.library;
  const nav = createNavStack<Route>(lib.note() ? [{ kind: "library", folder: "" }, { kind: "document" }] : [{ kind: "library", folder: "" }]);
  const panel = signal<Panel>(null);
  // Keep the native modal mounted when navigating between sheet contents.
  const panelOpen = computed(() => panel() !== null);
  const input = signal("");
  const trashSelection = signal("");
  const operationError = signal("");
  const operationBusy = signal(false);
  const busy = () => operationBusy() || storageBusy();
  const editing = signal(true);
  const bottom = safeAreaInsets();
  const activeFolder = () => {
    const routes = nav.routes();
    for (let i = routes.length - 1; i >= 0; i--) if (routes[i].kind === "library") return (routes[i] as { folder: string }).folder;
    return "";
  };
  const run = async (action: () => Promise<unknown>) => {
    if (busy()) return;
    operationBusy.set(true);
    operationError.set("");
    try { await action(); }
    catch (err) {
      const message = String(err).replace(/^Error: /, "");
      operationError.set((message.startsWith("rename.error.") || message.startsWith("mobile.file.")) ? t(message) : message);
    } finally { operationBusy.set(false); }
  };
  const show = (next: Panel) => { Keyboard.dismiss(); operationError.set(""); panel.set(next); };
  const newNote = () => { void run(async () => {
    if (await lib.createNote(activeFolder())) { editing.set(true); nav.push({ kind: "document" }); }
  }); };
  const openNote = (path: string) => { void run(async () => {
    if (await lib.openNote(path)) { editing.set(false); nav.push({ kind: "document" }); }
  }); };
  const back = () => { void run(async () => {
    if (await lib.flush()) { Keyboard.dismiss(); await lib.refresh(); nav.pop(); }
  }); };
  const docTitle = () => titleFromName(lib.note()?.path.split("/").pop() ?? "");
  const header = () => ({ backgroundColor: colors().paper, color: colors().ink, tintColor: colors().accent });
  let reader: YNode | null = null;
  let editor: YNode | null = null;
  let selected = { start: 0, end: 0 };
  const insert = (before: string, after = "") => {
    const text = lib.note()?.content ?? "";
    const start = Math.min(selected.start, text.length);
    const end = Math.max(start, Math.min(selected.end, text.length));
    lib.edit(text.slice(0, start) + before + text.slice(start, end) + after + text.slice(end));
    editor?.focus();
    editor?.setSelection(start + before.length, end + before.length);
  };
  const model = () => previewModel(lib.note()?.content ?? "", { fontSize: fontSize(), lineHeight: lineHeightPx() });
  const goToBlock = (index: number) => { reader?.scrollToIndex({ index, animated: true, viewPosition: 0 }); };
  const onLink = (url: string) => {
    const index = resolveAnchor(model().anchors, url);
    if (index !== undefined) goToBlock(index);
  };
  // Refresh the list when returning from a document. File writes themselves
  // begin on every input event, without a debounce waiting for backgrounding.
  const closePanel = () => { Keyboard.dismiss(); panel.set(null); };
  const dismissPanel = async () => { closePanel(); await MobileFiles.waitForDialogDismissal(); };
  const importFile = () => { void run(async () => {
    if (!await lib.flush()) return;
    const folder = activeFolder();
    await dismissPanel();
    const file = await MobileFiles.importMarkdown();
    if (file && await lib.importNote(folder, file.name, file.content)) {
      editing.set(false); nav.push({ kind: "document" });
    }
  }); };
  const exportFile = () => { void run(async () => {
    if (!await lib.flush() || !lib.note()) return;
    const current = lib.note()!;
    await dismissPanel();
    await MobileFiles.exportMarkdown(current.path.split("/").pop()!, current.content);
  }); };
  const sync = async () => {
    if (!props.connected || !await lib.flush()) return;
    await syncRuntime.syncNow();
    await lib.reconcile();
  };
  let reconciling = false;
  let lastCloudCheck = 0;
  const timer = setInterval(() => {
    if (busy() || reconciling || panel() !== null) return;
    reconciling = true;
    const current = nav.routes()[nav.routes().length - 1];
    void (async () => {
      if (props.connected && Date.now() - lastCloudCheck >= 15_000) {
        lastCloudCheck = Date.now();
        await sync();
      }
      await (current?.kind === "document" ? lib.reconcile() : lib.refresh());
    })().catch(err => lib.error.set(String(err))).finally(() => { reconciling = false; });
  }, 3000);
  cleanup(() => clearInterval(timer));
  if (props.connected) void sync().catch(err => lib.error.set(String(err)));

  const conflictBanner = () => lib.conflict() ? <View testID="mobile-conflict" style={{ padding: 14, backgroundColor: colors().accentSoft, gap: 8 }}>
    <Text style={{ color: colors().ink, fontWeight: 600 }}>{t("vault.conflict.title")}</Text>
    <Text style={{ color: colors().ink2 }}>{t("mobile.conflictHint")}</Text>
    <Action label={t("sync.conflict.keepBoth")} disabled={busy()} onPress={() => { void run(() => lib.copy(t("context.duplicateSuffix"), true)); }} />
    <Action label={t("vault.conflict.reload")} disabled={busy()} onPress={() => { void run(() => lib.reload()); }} />
  </View> : null;
  const errorBanner = () => operationError() || lib.error() ? <View testID="mobile-error" style={{ padding: 14, backgroundColor: colors().accentSoft }}>
    <Text selectable style={{ color: colors().ink }}>{operationError() || lib.error()}</Text>
    <Action label={t("sync.error.retry")} onPress={() => { void run(async () => { await lib.flush(); await lib.refresh(); }); }} />
  </View> : null;

  return <View style={{ flex: 1 }}>
    <NavStack state={nav} testID="mobile-navigation" style={{ flex: 1 }}>
      {(route) => route.kind === "library" ? <NavPage title={route.folder.split("/").pop() || "StoatMD"}
        headerBackTitle={t("mobile.library")} headerStyle={header()} statusBar={{ foreground: isDarkTheme() ? "light" : "dark" }}
        headerRight={<Action id="mobile-settings" icon="gear" label={t("settings.title")} onPress={() => show("settings")} />}
        style={{ backgroundColor: colors().paper, paddingBottom: panel() === null ? keyboardFrame().height : 0 }}>
        <LibraryPage library={lib} folder={route.folder} onOpen={openNote} busy={busy()}
          onFolder={(folder) => nav.push({ kind: "library", folder })} />
        {errorBanner()}
        {props.connected ? <SyncBanner onRetry={() => { void run(sync); }} /> : null}
        {props.connected ? <Text testID="mobile-sync-status" style={{ color: colors().ink3, paddingHorizontal: 22, paddingBottom: 8 }}>{t(`sync.${syncRuntime.phase() === "offline" ? "offline" : syncRuntime.phase() === "syncing" ? "syncing" : syncRuntime.phase() === "conflict" ? "manageConflicts" : syncRuntime.phase() === "error" ? "error.generic" : "synced"}`)}</Text> : null}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors().thread, paddingHorizontal: 10, paddingBottom: bottom().bottom }}>
          <Action id="mobile-new-folder" icon="folder" label={t("mobile.newFolder")} disabled={busy()} onPress={() => { input.set(""); show("folder"); }} />
          <Action id="mobile-new-note" icon="plus" label={t("note.new")} disabled={busy()} onPress={newNote} />
        </View>
      </NavPage> : <NavPage title={docTitle()} headerStyle={header()} headerBackTitle={t("mobile.library")}
        popOnBack={!lib.dirty() && !lib.saving() && !lib.conflict() && !busy()} onBackPress={() => { if (lib.dirty() || lib.saving() || lib.conflict() || busy()) back(); }}
        onDismiss={() => { void run(() => lib.refresh()); }}
        headerRight={<Action id="mobile-actions" label={t("mobile.actions")} onPress={() => show("actions")} />}
        statusBar={{ foreground: isDarkTheme() ? "light" : "dark" }} style={{ backgroundColor: colors().paper, paddingBottom: panel() === null ? keyboardFrame().height : 0 }}>
        <View style={{ flexDirection: "row", justifyContent: "center", padding: 8, gap: 4 }}>
          <Action id="mobile-edit" selected={editing()} icon="pencil" label={t("mobile.edit")} onPress={() => { editing.set(true); }} />
          <Action id="mobile-read" selected={!editing()} icon="book" label={t("mobile.read")} onPress={() => { Keyboard.dismiss(); editing.set(false); void lib.flush(); }} />
        </View>
        {lib.recovered() ? <View testID="mobile-recovered" style={{ padding: 12, backgroundColor: colors().accentSoft }}><Text style={{ color: colors().ink }}>{t("mobile.recovered")}</Text></View> : null}
        {conflictBanner()}
        {errorBanner()}
        {editing() ? <Input ref={(node) => { editor = node; selected = { start: 0, end: 0 }; }}
          testID="mobile-source" readonly={busy()} value={lib.note()?.content ?? ""} multiline autoCorrect={false} autoCapitalize="none"
          placeholder={t("mobile.writeHint")} onChange={lib.edit} onSelectionChange={range => { selected = range; }}
          ios={{ inputAccessoryViewID: "markdown-tools", keyboardAppearance: isDarkTheme() ? "dark" : "light" }}
          style={{ flex: 1, padding: 22, color: colors().ink, backgroundColor: colors().editor, fontFamily: "monospace", fontSize: editorFontSize(), lineHeight: Math.round(editorFontSize() * 1.65) }} /> :
          <List ref={node => { reader = node; }} testID="mobile-preview" each={model().blocks} estimatedItemSize={model().estimatedItemSize}
            contentStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 36 }} style={{ flex: 1, backgroundColor: colors().preview }}>
            {(block, index) => <View style={{ paddingTop: previewGap(index() > 0 ? model().blocks[index() - 1] : undefined, block(), fontSize() / 15) }}>
              <TextView document={{ blocks: [displayBlock(block(), renderMode())] }} selectable links="open" onLinkPress={event => onLink(event.url)} styles={previewTextStyles()} />
            </View>}
          </List>}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors().thread, paddingHorizontal: 8, paddingBottom: keyboardFrame().height ? 0 : bottom().bottom }}>
          <Action id="mobile-outline" icon="list-tree" label={t("inspector.outline")} onPress={() => { editing.set(false); show("outline"); }} />
          <Text testID="mobile-save-status" style={{ fontSize: 12, color: colors().ink3 }}>{lib.conflict() ? t("vault.conflict.title") : lib.error() ? t("mobile.saveFailed") : lib.saving() || lib.dirty() ? t("vault.saving") : t("vault.saved")}</Text>
          <Action id="mobile-type" icon="text-t" label={t("settings.font.size")} onPress={() => show("type")} />
        </View>
        <InputAccessoryView nativeID="markdown-tools" style={{ backgroundColor: colors().paper }}>
          <View style={{ flexDirection: "row", justifyContent: "space-around", borderTopWidth: 1, borderTopColor: colors().thread }}>
            <Action accessibilityLabel={t("mobile.tool.heading")} label="#" onPress={() => insert("# ")} />
            <Action accessibilityLabel={t("mobile.tool.bold")} label="B" onPress={() => insert("**", "**")} />
            <Action accessibilityLabel={t("mobile.tool.list")} label="•" onPress={() => insert("- ")} />
            <Action accessibilityLabel={t("mobile.tool.quote")} label="❯" onPress={() => insert("> ")} />
            <Action accessibilityLabel={t("mobile.tool.link")} label="[]" onPress={() => insert("[", "](https://)")} />
            <Action accessibilityLabel={t("mobile.tool.code")} label="`" onPress={() => insert("`", "`")} />
            <Action label={t("common.done")} onPress={() => { Keyboard.dismiss(); void lib.flush(); }} />
          </View>
        </InputAccessoryView>
      </NavPage>}
    </NavStack>
    <Dialog open={panelOpen()} presentation="pageSheet" onOpenChange={open => { if (!open) closePanel(); }}
      style={{ flex: 1, backgroundColor: colors().paper }} statusBar={{ foreground: isDarkTheme() ? "light" : "dark" }}>
      <View style={{ flex: 1, paddingTop: 16, paddingBottom: bottom().bottom }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20 }}>
          <Text style={{ color: colors().ink, fontSize: 23, fontWeight: 600 }}>{panel() === "settings" ? t("settings.title") : panel() === "outline" ? t("inspector.outline") : panel() === "type" ? t("settings.font.size") : panel() === "folder" ? t("mobile.newFolder") : panel() === "rename" ? t("rename.title") : panel() === "move" ? t("mobile.move") : panel() === "cloudConflicts" ? t("sync.manageConflicts") : panel() === "trash" || panel() === "erase" ? t("mobile.trash") : docTitle()}</Text>
          <Action id="mobile-panel-done" disabled={busy()} label={t("common.done")} onPress={closePanel} />
        </View>
        {errorBanner()}
        <Scroll style={{ flex: 1 }} contentStyle={{ padding: 20, gap: 16 }} keyboardDismissMode="on-drag">
          {panel() === "cloudConflicts" ? <View style={{ gap: 20 }}>
            {!syncRuntime.conflicts().length ? <Text style={{ color: colors().ink2 }}>{t("sync.synced")}</Text> : null}
            {syncRuntime.conflicts().map(item => <View style={{ gap: 8 }}>
              <Text style={{ color: colors().ink }}>{item.path}</Text>
              {(["keepLocal", "keepRemote", "keepBoth"] as const).map(choice => <Action label={t(`sync.conflict.${choice}`)} disabled={busy()} onPress={() => { void run(async () => {
                if (!await lib.flush()) return;
                await syncRuntime.resolveConflict(item, choice);
                await lib.reconcile();
                if (!syncRuntime.conflicts().length) await sync();
              }); }} />)}
            </View>)}
          </View> : panel() === "settings" ? <View style={{ gap: 20 }}>
            <Action id="mobile-import" label={t("mobile.import")} disabled={busy()} onPress={importFile} />
            <Action id="mobile-trash" label={t("mobile.trash")} disabled={busy()} onPress={() => { void run(async () => { await lib.loadTrash(); show("trash"); }); }} />
            {props.connected ? <SyncSettings cloudOnly vaultRoot={activeStorage()?.root}
              onBeforeMigration={async () => { if (!await lib.flush()) throw new Error(t("mobile.saveFailed")); }}
              onStorageActivated={props.onStorageActivated} onSyncNow={() => { void run(sync); }}
              onManageConflicts={() => show("cloudConflicts")} /> : null}
            <MobileSettings />
          </View> : panel() === "move" ? <View style={{ gap: 8 }}>
            {[{ path: "", name: t("mobile.library") }, ...lib.entries().filter(e => e.isDir)].map(folder =>
              <Action id={`mobile-move-to-${folder.path || "root"}`} label={folder.path || folder.name} disabled={busy()} onPress={() => { void run(async () => { if (await lib.move(folder.path)) closePanel(); }); }} />)}
          </View> : panel() === "trash" ? <View style={{ gap: 18 }}>
            {!lib.recycled().length ? <Text style={{ color: colors().ink2 }}>{t("mobile.trashEmpty")}</Text> : null}
            {lib.recycled().map(item => <View style={{ gap: 6, borderBottomWidth: 1, borderBottomColor: colors().thread, paddingBottom: 12 }}>
              <Text style={{ color: colors().ink }}>{item.original}</Text>
              <Text style={{ color: colors().ink3 }}>{formatWhen(item.deletedAt, locale())}</Text>
              <Action id={`mobile-restore-${item.original}`} label={t("mobile.restore")} disabled={busy()} onPress={() => { void run(() => lib.restore(item.path, t("context.duplicateSuffix"))); }} />
              <Action id={`mobile-erase-${item.original}`} label={t("mobile.erase")} disabled={busy()} onPress={() => { trashSelection.set(item.path); show("erase"); }} />
            </View>)}
          </View> : panel() === "erase" ? <View style={{ gap: 16 }}>
            <Text style={{ color: colors().ink }}>{t("mobile.eraseHint")}</Text>
            <Text style={{ color: colors().ink2 }}>{lib.recycled().find(item => item.path === trashSelection())?.original}</Text>
            <Action id="mobile-erase-confirm" label={t("mobile.erase")} disabled={busy()} onPress={() => { void run(async () => { await lib.removePermanently(trashSelection()); show("trash"); }); }} />
            <Action label={t("common.cancel")} onPress={() => show("trash")} />
          </View> : panel() === "type" ? <TypeSettings /> : panel() === "outline" ?
            <View>{articleModel(lib.note()?.content ?? "").headings.length ? articleModel(lib.note()?.content ?? "").headings.map(h =>
              <Button testID={`mobile-heading-${h.id}`} onPress={() => { closePanel(); goToBlock(h.blockIndex); }} style={{ minHeight: 48, paddingVertical: 12, paddingLeft: (h.level - 1) * 12 }}>
                <Text style={{ color: colors().ink, fontSize: 17 }}>{h.text}</Text>
              </Button>) : <Text style={{ color: colors().ink2 }}>{t("inspector.outline.empty")}</Text>}</View> :
            panel() === "rename" || panel() === "folder" ? <View style={{ gap: 18 }}>
              <Input testID="mobile-name" value={input()} onChange={value => input.set(value)}
                returnKeyType="done" onSubmit={event => { input.set(event.text); Keyboard.dismiss(); }}
                placeholder={t("rename.label")} autoCorrect={false} autoCapitalize="none" style={{ minHeight: 48, padding: 12, borderWidth: 1, borderColor: colors().thread, borderRadius: 10, fontSize: 17, color: colors().ink }} />
              <Action id="mobile-name-confirm" disabled={busy() || !input().trim()} label={panel() === "folder" ? t("mobile.create") : t("rename.confirm")} onPress={() => { void run(async () => {
                if (panel() === "folder") { await lib.createFolder(activeFolder(), input()); closePanel(); }
                else if (await lib.renameNote(input())) closePanel();
              }); }} />
            </View> : panel() === "actions" ? <View style={{ gap: 10 }}>
              <Text style={{ color: colors().ink3 }}>{lib.note()?.path}</Text>
              <Action id="mobile-rename" label={t("rename.title")} onPress={() => { input.set(docTitle()); show("rename"); }} />
              <Action id="mobile-duplicate" label={t("context.duplicate")} disabled={busy()} onPress={() => { void run(async () => { if (await lib.copy(t("context.duplicateSuffix"))) closePanel(); }); }} />
              <Action id="mobile-move" label={t("mobile.move")} disabled={busy()} onPress={() => { void run(async () => { await lib.refresh(); show("move"); }); }} />
              <Action id="mobile-export" label={t("mobile.export")} disabled={busy()} onPress={exportFile} />
              <Action id="mobile-recycle" label={t("mobile.recycle")} disabled={busy()} onPress={() => { void run(async () => { if (await lib.recycle()) { await dismissPanel(); nav.pop(); } }); }} />
              <Text style={{ color: colors().ink2 }}>{t("info.chars")}: {articleModel(lib.note()?.content ?? "").stats.chars}</Text>
            </View> : null}
        </Scroll>
      </View>
    </Dialog>
  </View>;
}

function LibraryPage(props: { library: MobileLibrary; folder: string; busy: boolean; onOpen: (path: string) => void; onFolder: (path: string) => void }) {
  const query = signal("");
  const filter = signal<"all" | "recent" | "folders">("all");
  const lib = props.library;
  const search = librarySearch(() => lib.vault, query, lib.entries);
  const notes = () => notesInFolder(lib.entries(), props.folder).filter(note => {
    const q = query().trim().normalize("NFC").toLowerCase();
    return !q || note.path.toLowerCase().includes(q) || search.matches().includes(note.path);
  });
  const folders = () => lib.entries().filter(e => e.isDir && e.path.split("/").slice(0, -1).join("/") === props.folder);
  return <View style={{ flex: 1 }}>
    <View style={{ paddingHorizontal: 22, paddingTop: 18, paddingBottom: 10, gap: 14 }}>
      <Text style={{ color: colors().ink3, fontSize: 12, letterSpacing: 2 }}>STOATMD / {syncRuntime.connection() ? t(providerLabelKey(syncRuntime.connection()!.provider)) : t("mobile.library")}</Text>
      <Text style={{ color: colors().ink, fontSize: 32, fontWeight: 600 }}>{props.folder.split("/").pop() || t("mobile.library")}</Text>
      <Input testID="mobile-search" value={query()} onChange={value => query.set(value)} placeholder={t("search.placeholder")} returnKeyType="search"
        onSubmit={event => { query.set(event.text); Keyboard.dismiss(); }}
        style={{ minHeight: 46, backgroundColor: colors().searchBg, borderRadius: 12, paddingHorizontal: 14, fontSize: 17, color: colors().ink }} />
      <View style={{ flexDirection: "row", gap: 4 }}>
        {(["all", "recent", "folders"] as const).map(id => <Button testID={`mobile-filter-${id}`} onPress={() => filter.set(id)}
          style={{ flex: 1, minHeight: 44, borderRadius: 10, justifyContent: "center", alignItems: "center", backgroundColor: filter() === id ? colors().accentSoft : "transparent" }}>
          <Text style={{ color: filter() === id ? colors().accent : colors().ink2, fontSize: 15 }}>{t(`mobile.${id}`)}</Text>
        </Button>)}
      </View>
      <Text style={{ color: colors().ink3, fontSize: 13 }}>{search.pending() ? t("mobile.searching") : t("sidebar.noteCount", { n: notes().length })}</Text>
      {search.error() ? <Text style={{ color: colors().ink }}>{search.error()}</Text> : null}
    </View>
    <Scroll testID="mobile-library-list" style={{ flex: 1 }} contentStyle={{ paddingHorizontal: 22, paddingBottom: 24 }} keyboardDismissMode="on-drag">
      <View>
        {filter() !== "recent" && !query().trim() ? folders().map(folder => <Button testID={`mobile-folder-${folder.path}`} disabled={props.busy} onPress={() => { Keyboard.dismiss(); props.onFolder(folder.path); }}
          style={{ minHeight: 64, flexDirection: "row", alignItems: "center", gap: 14, borderBottomWidth: 1, borderBottomColor: colors().thread }}>
          <Icon name="folder" size={23} color={colors().accent} /><Text style={{ color: colors().ink, fontSize: 18 }}>{folder.name}</Text>
        </Button>) : null}
        {filter() !== "folders" || query().trim() ? (filter() === "recent" ? notes().slice(0, 20) : notes()).map(note => <Button testID={`mobile-note-${note.path}`} disabled={props.busy} onPress={() => { Keyboard.dismiss(); props.onOpen(note.path); }}
          style={{ minHeight: 88, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors().thread, gap: 7 }}>
          <Text numberOfLines={2} style={{ color: colors().ink, fontSize: 19, fontWeight: 500 }}>{note.title}</Text>
          <Text numberOfLines={1} style={{ color: colors().ink3, fontSize: 13 }}>{formatWhen(note.mtimeMs, locale())} {note.path.includes("/") ? `· ${note.path.split("/").slice(0, -1).join("/")}` : ""}</Text>
        </Button>) : null}
        {!notes().length && (!folders().length || !!query().trim()) ? <View style={{ paddingVertical: 60, gap: 14, alignItems: "center" }}>
          <Icon name="notebook" size={38} color={colors().accent} />
          <Text style={{ color: colors().ink, fontSize: 20 }}>{query().trim() ? t("search.empty") : t("note.empty")}</Text>
          <Text style={{ color: colors().ink3, textAlign: "center", fontSize: 15 }}>{t("mobile.emptyHint")}</Text>
        </View> : null}
      </View>
    </Scroll>
  </View>;
}

function Group(props: { title: string; children?: JSX.Element }) {
  return <View style={{ gap: 12 }}><Text style={{ fontSize: 13, color: colors().ink3 }}>{props.title}</Text>{props.children}</View>;
}
function TypeSettings() {
  return <View style={{ gap: 20 }}>
    {([{ title: "settings.font.reading", value: fontSize, set: applyFontSize }, { title: "settings.font.editorSize", value: editorFontSize, set: applyEditorFontSize }]).map(item =>
      <Group title={t(item.title)}><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Action id={`${item.title}-decrease`} label="A−" disabled={item.value() <= 12} onPress={() => item.set(item.value() - 1)} />
        <Text style={{ color: colors().ink, fontSize: 19 }}>{item.value()}</Text>
        <Action id={`${item.title}-increase`} label="A+" disabled={item.value() >= 24} onPress={() => item.set(item.value() + 1)} />
      </View></Group>)}
  </View>;
}
function MobileSettings() {
  const languages: { id: LocalePref; label: string }[] = [{ id: "system", label: t("settings.locale.system") }, { id: "en", label: "English" }, { id: "zh", label: "简体中文" }, { id: "zh-Hant", label: "繁體中文" }, { id: "ja", label: "日本語" }, { id: "ko", label: "한국어" }, { id: "de", label: "Deutsch" }, { id: "fr", label: "Français" }, { id: "es", label: "Español" }];
  return <View style={{ gap: 28 }}>
    <Group title={t("settings.theme")}><View style={{ gap: 4 }}>{THEMES.map(theme => <Button testID={`mobile-theme-${theme.id}`} onPress={() => applyTheme(theme.id)}
      style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, borderRadius: 9, backgroundColor: themeId() === theme.id ? colors().accentSoft : "transparent" }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: theme.palette.paper, borderWidth: 1, borderColor: theme.palette.ink3 }} />
      <Text style={{ color: colors().ink, fontSize: 17, flex: 1 }}>{theme.name}</Text>
      {themeId() === theme.id ? <Icon name="check" color={colors().accent} /> : null}
    </Button>)}</View></Group>
    <TypeSettings />
    <Group title={t("settings.locale")}><View>{languages.map(language => <Button testID={`mobile-language-${language.id}`} onPress={() => { setLocalePref(language.id); void saveLocale(language.id); }}
      style={{ minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12 }}>
      <Text style={{ color: colors().ink, fontSize: 17 }}>{language.id === "system" ? t("settings.locale.system") : language.label}</Text>
      {localePref() === language.id ? <Icon name="check" color={colors().accent} /> : null}
    </Button>)}</View></Group>
  </View>;
}
