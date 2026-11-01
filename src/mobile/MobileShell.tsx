import { Keyboard, List, Scroll, Text, View, cleanup, computed, keyboardFrame, platform, safeAreaInsets, signal, type JSX, type YNode } from "nsh";
import { Button, Dialog, Input, NavPage, NavStack, TextView, createNavStack } from "nsh/base";
import { InputAccessoryView } from "nsh/mobile";
import { MobileFiles, Vault } from "stoatmd/native";
import { activeStorage, readActiveStorage, writeActiveStorage, storageBusy } from "../storage/state";
import { syncRuntime } from "../sync/runtime";
import { SyncSettings, formatSyncMoment } from "../ui/SyncSettings";
import { providerLabelKey } from "../sync/runtime";
import { Icon, type IconName } from "../ui/Icon";
import { articleModel } from "../ui/articleModel";
import { previewTextStyles } from "../ui/EditorWorkspace";
import { displayBlock, renderMode } from "../ui/documentAppearance";
import { locale, localePref, setLocalePref, t, type LocalePref } from "../ui/i18n";
import { librarySearch } from "../ui/librarySearch";
import { saveLocale } from "../ui/prefs";
import { previewGap, previewModel, resolveAnchor } from "../ui/previewModel";
import { applyTheme, setPaletteOverride } from "../ui/theme";
import { applyEditorFontSize, applyFontSize, editorFontSize, fontSize, lineHeightPx } from "../ui/typography";
import { formatWhen, titleFromName } from "../ui/vaultModel";
import { mobileLibrary, type MobileLibrary } from "./library";
import { flattenTree } from "./libraryTree";
import { MOBILE_THEMES, glass, mobileColors, mobileIsDark, mobileThemeId } from "./palette";
import { syncStatus } from "./syncStatus";

type Route = { kind: "library" } | { kind: "document" };
type Panel = "settings" | "storage" | "outline" | "type" | "actions" | "rename" | "folder" | "move" | "trash" | "erase" | "cloudConflicts" | null;
type Tab = "recent" | "all" | "favorites";

/** 顶栏 / 底栏 / 搜索 / 同步条 / sheet 共用的 Liquid Glass 材质。 */
function glassStyle(radius = 999) {
  const token = glass();
  return {
    backgroundColor: token.fill,
    backdropFilter: "blur(24px) saturate(180%)",
    glassEffect: "regular" as const,
    borderWidth: 0.5,
    borderColor: token.stroke,
    boxShadow: token.shadow,
    borderRadius: radius,
    borderCurve: "continuous" as const,
  };
}

function GlassIconButton(props: { id?: string; icon: IconName; label: string; onPress: () => void; disabled?: boolean; size?: number; tint?: string; spinning?: boolean }) {
  const size = props.size ?? 36;
  return <Button testID={props.id} accessibilityLabel={props.label} disabled={props.disabled} onPress={props.onPress}
    style={{ width: size, height: size, alignItems: "center", justifyContent: "center", opacity: props.disabled ? 0.45 : 1, ...glassStyle(999) }}>
    <View style={props.spinning ? { animationName: "spin", animationDuration: 1100, animationIterationCount: "infinite" } : undefined}>
      <Icon name={props.icon} color={props.tint ?? mobileColors().ink} size={size >= 40 ? 20 : 18} />
    </View>
  </Button>;
}

function GlassPill(props: { id?: string; label: string; onPress: () => void; icon?: IconName; accent?: boolean; disabled?: boolean; testID?: string }) {
  return <Button testID={props.id} accessibilityLabel={props.label} disabled={props.disabled} onPress={props.onPress}
    style={{ height: 36, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 2, opacity: props.disabled ? 0.45 : 1, ...glassStyle(999) }}>
    {props.icon ? <Icon name={props.icon} color={mobileColors().accent} size={18} /> : null}
    <Text style={{ color: props.accent === false ? mobileColors().ink : mobileColors().accent, fontSize: 15, fontWeight: 500, letterSpacing: -0.2 }}>{props.label}</Text>
  </Button>;
}

/** 系统导航栏里的图标项：系统会把相邻项收进同一枚液态玻璃胶囊，自己不再画底。 */
function ToolbarIconButton(props: { id?: string; icon: IconName; label: string; tint?: string; onPress: () => void }) {
  return <Button testID={props.id} accessibilityLabel={props.label} onPress={props.onPress}
    style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
    <Icon name={props.icon} color={props.tint ?? mobileColors().accent} size={21} />
  </Button>;
}

function Action(props: { label: string; onPress: () => void; icon?: IconName; id?: string; disabled?: boolean; selected?: boolean; accessibilityLabel?: string }) {
  const c = mobileColors();
  return <Button testID={props.id} accessibilityLabel={props.accessibilityLabel ?? props.label} disabled={props.disabled}
    onPress={props.onPress} style={{ minHeight: 44, minWidth: 44, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 10, backgroundColor: props.selected ? c.accentSoft : "transparent" }}>
    {props.icon ? <Icon name={props.icon} color={c.accent} size={21} /> : null}
    <Text style={{ color: c.accent, fontSize: 16 }}>{props.label}</Text>
  </Button>;
}

function SectionTitle(props: { top?: number; children?: JSX.Element }) {
  return <Text style={{ marginTop: props.top ?? 24, marginBottom: 7, fontSize: 13, fontWeight: 400, color: mobileColors().ink2 }}>{props.children}</Text>;
}

/** 分组列表的行间细线。绝对定位的细线在 nsh 里不渲染，所以用真实的占位行。 */
function RowDivider(props: { inset?: number }) {
  return <View style={{ height: 1, marginLeft: props.inset ?? 16, backgroundColor: mobileColors().thread }} />;
}

function SettingsRow(props: { id?: string; icon?: IconName; iconBg?: string; title: string; detail?: string; value?: string; onPress?: () => void; disabled?: boolean; last?: boolean }) {
  const c = mobileColors();
  const row = <View style={{ minHeight: 44, paddingHorizontal: 16, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: c.list }}>
    {props.icon ? <View style={{ width: 29, height: 29, borderRadius: 7, borderCurve: "continuous", alignItems: "center", justifyContent: "center", backgroundColor: props.iconBg ?? c.accent }}>
      <Icon name={props.icon} color="#FFFFFF" size={17} />
    </View> : null}
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={{ fontSize: 17, fontWeight: 400, letterSpacing: 0, color: c.ink }}>{props.title}</Text>
      {props.detail ? <Text numberOfLines={1} style={{ marginTop: 2, fontSize: 13, color: c.ink2 }}>{props.detail}</Text> : null}
    </View>
    {props.value ? <Text numberOfLines={1} style={{ maxWidth: 180, textAlign: "right", fontSize: 17, color: c.ink3 }}>{props.value}</Text> : null}
    {props.onPress ? <Icon name="caret-right" color={c.ink3} size={14} /> : null}
  </View>;
  return <View>
    {props.onPress
      ? <Button testID={props.id} disabled={props.disabled} onPress={props.onPress} style={{ opacity: props.disabled ? 0.45 : 1 }}>{row}</Button>
      : <View testID={props.id}>{row}</View>}
    {props.last ? null : <RowDivider inset={props.icon ? 57 : 16} />}
  </View>;
}

/** iOS 设置页的 inset grouped 卡片。 */
function SettingsGroup(props: { children?: JSX.Element }) {
  const c = mobileColors();
  return <View style={{ borderRadius: 12, borderCurve: "continuous", overflow: "hidden", backgroundColor: c.list }}>{props.children}</View>;
}

/** 面板里的操作行：与设置行同一套尺寸。 */
function PanelRow(props: { id?: string; icon: IconName; title: string; detail?: string; destructive?: boolean; disabled?: boolean; selected?: boolean; last?: boolean; onPress: () => void }) {
  const c = mobileColors();
  return <View>
    <Button testID={props.id} disabled={props.disabled} onPress={props.onPress}
      style={{ minHeight: 44, paddingHorizontal: 16, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 12,
        backgroundColor: c.list, opacity: props.disabled ? 0.45 : 1 }}>
      <View style={{ width: 29, height: 29, borderRadius: 7, borderCurve: "continuous", alignItems: "center", justifyContent: "center",
        backgroundColor: props.destructive ? "#FF3B30" : c.accent }}>
        <Icon name={props.icon} color="#FFFFFF" size={17} />
      </View>
      <Text style={{ flex: 1, fontSize: 17, color: props.destructive ? "#FF3B30" : c.ink }}>{props.title}</Text>
      {props.detail ? <Text numberOfLines={1} style={{ maxWidth: 170, textAlign: "right", fontSize: 15, color: c.ink3 }}>{props.detail}</Text> : null}
      {props.selected ? <Icon name="check" color={c.accent} size={18} /> : null}
    </Button>
    {props.last ? null : <RowDivider inset={57} />}
  </View>;
}

/** 面板的主操作：系统蓝底白字。 */
function PrimaryButton(props: { id?: string; label: string; disabled?: boolean; onPress: () => void }) {
  const c = mobileColors();
  return <Button testID={props.id} disabled={props.disabled} onPress={props.onPress}
    style={{ height: 46, borderRadius: 12, borderCurve: "continuous", alignItems: "center", justifyContent: "center",
      backgroundColor: c.accent, opacity: props.disabled ? 0.4 : 1 }}>
    <Text style={{ fontSize: 17, fontWeight: 600, color: c.accentInk }}>{props.label}</Text>
  </Button>;
}

/** 同步 accessory：同步中可暂停，暂停可继续，失败可重试；只出现在库页。 */
function SyncAccessory(props: { onPause: () => void; onResume: () => void; onRetry: () => void }) {
  const current = syncStatus(syncRuntime.phase(), syncRuntime.progress(), syncRuntime.error());
  if (!current) return null;
  const c = mobileColors();
  const paused = current.kind === "paused";
  const failed = current.kind === "error";
  const tint = failed ? "#FF3B30" : paused ? "#FF9500" : c.ink2;
  const label = t(current.key, current.params);
  return <View testID={failed ? "mobile-sync-error" : paused ? "mobile-sync-paused" : "mobile-sync-progress"}
    style={{ paddingTop: 4, paddingBottom: 6, gap: 5, borderBottomWidth: 0.5, borderBottomColor: failed ? "rgba(255,59,48,0.35)" : c.thread }}>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 28 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 7, flex: 1, minWidth: 0 }}>
        {failed ? <Icon name="arrows-clockwise" color="#FF3B30" size={15} />
          : paused ? <Icon name="pause" color="#FF9500" size={15} />
          : <View style={{ animationName: "spin", animationDuration: 1100, animationIterationCount: "infinite" }}><Icon name="sync" color={c.ink2} size={15} /></View>}
        <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: 500, letterSpacing: -0.15, color: tint }}>{label}</Text>
      </View>
      <GlassIconButton size={30} icon={failed ? "arrows-clockwise" : paused ? "play" : "pause"}
        label={failed ? t("sync.error.retry") : paused ? t("mobile.resume") : t("mobile.pause")}
        tint={failed ? "#FF3B30" : c.accent}
        onPress={failed ? props.onRetry : paused ? props.onResume : props.onPause} />
    </View>
    <View style={{ height: 2.5, borderRadius: 999, overflow: "hidden", backgroundColor: "rgba(44,42,38,0.08)" }}>
      <View style={{ height: 2.5, width: `${failed ? Math.max(current.percent, 25) : current.percent}%`, borderRadius: 999,
        backgroundColor: failed ? "rgba(255,59,48,0.55)" : paused ? "#FF9500" : c.accent }} />
    </View>
  </View>;
}

/** 下拉浅度刷新：只有指示与进度，没有提示文案。 */
function PullIndicator(props: { percent: number }) {
  const c = mobileColors();
  return <View testID="mobile-pull-refresh" style={{ height: 52, alignItems: "center", justifyContent: "center", gap: 8 }}>
    <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: c.thread, borderTopColor: c.accent,
      animationName: "spin", animationDuration: 850, animationIterationCount: "infinite" }} />
    <View style={{ width: 72, height: 3, borderRadius: 999, overflow: "hidden", backgroundColor: "rgba(44,42,38,0.08)" }}>
      <View style={{ width: `${props.percent}%`, height: 3, borderRadius: 999, backgroundColor: c.accent }} />
    </View>
  </View>;
}

export function MobileShell(props: { library?: MobileLibrary; nativeChrome?: boolean; initialTab?: Tab } = {}) {
  setPaletteOverride(mobileColors);
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
  return <View testID="mobile-shell" style={{ flex: 1, backgroundColor: mobileColors().paper }}>
    <Each of={library() ? [library()!] : []} key={model => model}>{model => <MobileApp library={model()} connected={!props.library} nativeChrome={props.nativeChrome !== false} initialTab={props.initialTab} onStorageActivated={activate} />}</Each>
    {!library() ? <ConnectPage loading={loading()} error={startupError()} onRetry={() => { void load(); }} onStorageActivated={activate} /> : null}
  </View>;
}

/** 首启：选云盘 → 选远程文件夹，没有本地库与迁移步骤。 */
function ConnectPage(props: { loading: boolean; error: string; onRetry: () => void; onStorageActivated: (root: string) => Promise<void> }) {
  const c = mobileColors();
  const bottom = safeAreaInsets();
  return <Scroll testID="mobile-connect" style={{ flex: 1, backgroundColor: c.paper }}
    contentStyle={{ paddingTop: bottom().top + 24, paddingHorizontal: 20, paddingBottom: 28 + bottom().bottom }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 24 }}>
      <View style={{ width: 36, height: 36, borderRadius: 9, borderCurve: "continuous", alignItems: "center", justifyContent: "center", backgroundColor: c.accent }}>
        <Icon name="notebook" color={c.accentInk} size={21} />
      </View>
      <Text style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4, color: c.ink }}>StoatMD</Text>
    </View>
    <Text style={{ fontSize: 34, fontWeight: 700, letterSpacing: 0, lineHeight: 41, color: c.ink }}>{t("mobile.connectTitle")}</Text>
    <Text style={{ marginTop: 10, marginBottom: 30, fontSize: 17, lineHeight: 24, color: c.ink2 }}>{t("mobile.paidCloud")}</Text>
    {props.loading ? <Text style={{ fontSize: 17, color: c.ink2 }}>{t("mobile.loading")}</Text> : props.error ?
      <View style={{ gap: 12 }}><Text style={{ fontSize: 17, color: c.ink }}>{props.error}</Text><Action label={t("sync.error.retry")} onPress={props.onRetry} /></View> :
      <SyncSettings cloudOnly mobile onBeforeMigration={async () => {}} onStorageActivated={props.onStorageActivated} />}
    <Text style={{ marginTop: 28, textAlign: "center", fontSize: 13, color: c.ink3 }}><Text style={{ fontWeight: 600, color: c.ink2 }}>StoatMD</Text> · {t("mobile.brandTagline")}</Text>
  </Scroll>;
}

function MobileApp(props: { library: MobileLibrary; connected: boolean; nativeChrome: boolean; initialTab?: Tab; onStorageActivated: (root: string) => Promise<void> }) {
  const lib = props.library;
  const ios = props.nativeChrome && platform.os === "ios";
  const nav = createNavStack<Route>(lib.note() ? [{ kind: "library" }, { kind: "document" }] : [{ kind: "library" }]);
  const panel = signal<Panel>(null);
  // Keep the native modal mounted when navigating between sheet contents.
  const panelOpen = computed(() => panel() !== null);
  const input = signal("");
  const trashSelection = signal("");
  const operationError = signal("");
  const operationBusy = signal(false);
  const busy = () => operationBusy() || storageBusy();
  const editing = signal(true);
  const tab = signal<Tab>(props.initialTab ?? "recent");
  const selectedFolder = signal("");
  const bottom = safeAreaInsets();
  const running = async (action: () => Promise<unknown>) => {
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
  const newNote = (folder: string) => { void running(async () => {
    if (await lib.createNote(folder)) { editing.set(true); nav.push({ kind: "document" }); }
  }); };
  const openNote = (path: string) => { void running(async () => {
    if (await lib.openNote(path)) { editing.set(false); nav.push({ kind: "document" }); }
  }); };
  const back = () => { void running(async () => {
    if (await lib.flush()) { Keyboard.dismiss(); await lib.refresh(); nav.pop(); }
  }); };
  const docTitle = () => titleFromName(lib.note()?.path.split("/").pop() ?? "");
  const docFolder = () => { const parts = (lib.note()?.path ?? "").split("/"); return parts.length > 1 ? parts[parts.length - 2] : t("mobile.library"); };
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
  const importFile = (folder: string) => { void running(async () => {
    if (!await lib.flush()) return;
    await dismissPanel();
    const file = await MobileFiles.importMarkdown();
    if (file && await lib.importNote(folder, file.name, file.content)) {
      editing.set(false); nav.push({ kind: "document" });
    }
  }); };
  const exportFile = () => { void running(async () => {
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
    if (busy() || reconciling || panel() !== null || syncRuntime.phase() === "paused") return;
    reconciling = true;
    const current = nav.routes()[nav.routes().length - 1];
    void (async () => {
      if (props.connected && Date.now() - lastCloudCheck >= 15_000) {
        lastCloudCheck = Date.now();
        // 同步可能持续很久；不阻塞列表刷新，下载中的笔记会陆续出现。
        void sync().catch(err => lib.error.set(String(err)));
      }
      await (current?.kind === "document" ? lib.reconcile() : lib.refresh());
    })().catch(err => lib.error.set(String(err))).finally(() => { reconciling = false; });
  }, 3000);
  cleanup(() => clearInterval(timer));
  if (props.connected) void sync().catch(err => lib.error.set(String(err)));

  const conflictBanner = () => lib.conflict() ? <View testID="mobile-conflict" style={{ padding: 14, borderRadius: 14, gap: 8, backgroundColor: mobileColors().accentSoft }}>
    <Text style={{ color: mobileColors().ink, fontWeight: 600 }}>{t("vault.conflict.title")}</Text>
    <Text style={{ color: mobileColors().ink2 }}>{t("mobile.conflictHint")}</Text>
    <Action label={t("sync.conflict.keepBoth")} disabled={busy()} onPress={() => { void running(() => lib.copy(t("context.duplicateSuffix"), true)); }} />
    <Action label={t("vault.conflict.reload")} disabled={busy()} onPress={() => { void running(() => lib.reload()); }} />
  </View> : null;
  const errorBanner = () => operationError() || lib.error() ? <View testID="mobile-error" style={{ padding: 14, borderRadius: 14, backgroundColor: mobileColors().accentSoft }}>
    <Text selectable style={{ color: mobileColors().ink }}>{operationError() || lib.error()}</Text>
    <Action label={t("sync.error.retry")} onPress={() => { void running(async () => { await lib.flush(); await lib.refresh(); }); }} />
  </View> : null;

  const saveHint = () => lib.conflict() ? t("vault.conflict.title") : lib.error() ? t("mobile.saveFailed")
    : lib.saving() || lib.dirty() ? t("vault.saving") : t("vault.saved");

  const docNav = () => <View style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 20, paddingTop: bottom().top, paddingHorizontal: 14, paddingBottom: 8 }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 }}>
      <View style={{ flexGrow: 0, flexShrink: 0, minWidth: 72, flexDirection: "row" }}>
        <GlassPill id="mobile-back" label={docFolder()} icon="arrow-left" onPress={back} />
      </View>
      <View style={{ flex: 1, minWidth: 0, alignItems: "center", gap: 1 }}>
        <Text numberOfLines={1} style={{ width: "100%", textAlign: "center", fontSize: 15, fontWeight: 600, letterSpacing: -0.3, color: mobileColors().ink }}>{docTitle()}</Text>
        {editing() ? <Text testID="mobile-save-status" style={{ fontSize: 11, fontWeight: 500, color: mobileColors().ink3 }}>{saveHint()}</Text> : null}
      </View>
      <View style={{ flexGrow: 0, flexShrink: 0, minWidth: 72, flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
        {editing()
          ? <GlassIconButton id="mobile-read" icon="book" label={t("mobile.read")} tint={mobileColors().accent} size={40} onPress={() => { Keyboard.dismiss(); editing.set(false); void lib.flush(); }} />
          : <GlassPill id="mobile-edit" label={t("mobile.edit")} onPress={() => { editing.set(true); }} />}
        <GlassIconButton id="mobile-actions" icon="more" label={t("mobile.actions")} size={40} onPress={() => show("actions")} />
      </View>
    </View>
  </View>;

  // 系统导航栏的右侧：次级入口（更多）在左，主操作（完成 / 编辑）贴右。
  const docToolbar = () => <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
    <ToolbarIconButton id="mobile-actions" icon="more" label={t("mobile.actions")} tint={mobileColors().accent} onPress={() => show("actions")} />
    {editing()
      ? <Button testID="mobile-read" accessibilityLabel={t("common.done")}
        onPress={() => { Keyboard.dismiss(); editing.set(false); void lib.flush(); }}
        style={{ height: 44, paddingHorizontal: 8, justifyContent: "center" }}>
        <Text style={{ fontSize: 17, fontWeight: 600, color: mobileColors().accent }}>{t("common.done")}</Text>
      </Button>
      : <Button testID="mobile-edit" accessibilityLabel={t("mobile.edit")} onPress={() => editing.set(true)}
        style={{ height: 44, paddingHorizontal: 8, justifyContent: "center" }}>
        <Text style={{ fontSize: 17, fontWeight: 500, color: mobileColors().accent }}>{t("mobile.edit")}</Text>
      </Button>}
  </View>;

  const moveFolders = () => [{ path: "", name: t("mobile.library") }, ...lib.entries().filter(entry => entry.isDir)];

  return <View style={{ flex: 1, backgroundColor: mobileColors().paper }}>
    <NavStack state={nav} testID="mobile-navigation" style={{ flex: 1 }}>
      {(route) => route.kind === "library" ? <NavPage testID="mobile-library-page"
        headerVisible={ios} title={ios ? t("mobile.library") : undefined}
        header={ios ? undefined : <LibraryNav connected={props.connected} statusVisible={!!syncStatus(syncRuntime.phase(), syncRuntime.progress(), syncRuntime.error())} onSettings={() => { Keyboard.dismiss(); show("settings"); }}
          onSync={() => { void sync().catch(err => lib.error.set(String(err))); }}
          onPause={() => syncRuntime.pauseSync()} onResume={() => syncRuntime.resumeSync()}
          onRetry={() => { void sync().catch(err => lib.error.set(String(err))); }} />}
        headerLeft={ios ? <NativeSettingsButton onPress={() => show("settings")} /> : undefined}
        headerRight={ios ? <Button testID="mobile-new-note" accessibilityLabel={t("note.new")} disabled={busy()}
          onPress={() => newNote(selectedFolder())} style={{ width: 1, height: 1, opacity: 0 }}><Text> </Text></Button> : undefined}
        {...(ios ? { ios: { headerRightSystemItem: "compose" as const } } : {})}
        statusBar={{ foreground: mobileIsDark() ? "light" : "dark" }} style={{ backgroundColor: mobileColors().paper }}>
        <LibraryPage library={lib} connected={props.connected} busy={busy()} ios={ios}
          onOpen={openNote} onSync={sync} onSettings={() => show("settings")}
          tab={tab} onTab={next => tab.set(next)} folder={selectedFolder} onFolder={path => selectedFolder.set(path)}
          onNewNote={newNote} onNewFolder={() => { selectedFolder.set(""); input.set(""); show("folder"); }}
          error={errorBanner()} conflict={conflictBanner()} />
      </NavPage> : <NavPage testID="mobile-document-page" headerVisible={ios}
        title={ios ? docTitle() : undefined} headerBackVisible={ios} headerTransparent={false}
        headerRight={ios ? docToolbar() : undefined}
        popOnBack={ios} popOnSwipe={ios}
        onBackPress={() => { if (ios) { Keyboard.dismiss(); void lib.flush(); } else back(); }}
        onDismiss={() => { void running(async () => { await lib.flush(); await lib.refresh(); }); }}
        statusBar={{ foreground: mobileIsDark() ? "light" : "dark" }} style={{ backgroundColor: mobileColors().editor }}>
        <View style={{ flex: 1, paddingBottom: keyboardFrame().height }}>
          {!ios ? docNav() : null}
          {lib.recovered() ? <View testID="mobile-recovered" style={{ marginTop: ios ? 8 : 52 + bottom().top, padding: 12, backgroundColor: mobileColors().accentSoft }}><Text style={{ color: mobileColors().ink }}>{t("mobile.recovered")}</Text></View> : null}
          {conflictBanner()}
          {errorBanner()}
          {editing() ? <Input ref={(node) => { editor = node; selected = { start: 0, end: 0 }; }}
            testID="mobile-source" readonly={busy()} value={lib.note()?.content ?? ""} multiline autoCorrect={false} autoCapitalize="none"
            placeholder={t("mobile.writeHint")} onChange={lib.edit} onSelectionChange={range => { selected = range; }}
            ios={{ inputAccessoryViewID: "markdown-tools", keyboardAppearance: mobileIsDark() ? "dark" : "light" }}
            style={{ flex: 1, paddingTop: ios ? 12 : 66 + bottom().top, paddingHorizontal: 18, paddingBottom: 8, color: mobileColors().ink, backgroundColor: mobileColors().editor,
              fontFamily: "monospace", fontSize: editorFontSize(), lineHeight: Math.round(editorFontSize() * 1.75) }} /> :
            <View style={{ flex: 1 }}>
              <List ref={node => { reader = node; }} testID="mobile-preview" each={model().blocks} estimatedItemSize={model().estimatedItemSize}
                contentStyle={{ paddingHorizontal: 24, paddingTop: ios ? 10 : 70 + bottom().top, paddingBottom: 104 + bottom().bottom }} style={{ flex: 1, backgroundColor: mobileColors().preview }}>
                {(block, index) => <View style={{ paddingTop: previewGap(index() > 0 ? model().blocks[index() - 1] : undefined, block(), fontSize() / 15) }}>
                  <TextView document={{ blocks: [displayBlock(block(), renderMode())] }} selectable links="open" onLinkPress={event => onLink(event.url)} styles={readerStyles()} />
                </View>}
              </List>
              <ReaderDock content={lib.note()?.content ?? ""} bottom={bottom().bottom}
                onOutline={() => show("outline")} onType={() => show("type")} />
            </View>}
          <InputAccessoryView nativeID="markdown-tools" style={{ backgroundColor: mobileColors().paper }}>
            <View style={{ paddingHorizontal: 12, paddingTop: 4, paddingBottom: 8 }}>
              <View style={{ height: 46, paddingHorizontal: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 2, ...glassStyle(16) }}>
                <FormatButton label="H1" accessibilityLabel={t("mobile.tool.heading")} onPress={() => insert("# ")} />
                <FormatButton label="B" accessibilityLabel={t("mobile.tool.bold")} onPress={() => insert("**", "**")} bold />
                <FormatButton icon="list-tree" accessibilityLabel={t("mobile.tool.list")} onPress={() => insert("- ")} />
                <FormatButton label="❞" accessibilityLabel={t("mobile.tool.quote")} onPress={() => insert("> ")} />
                <FormatButton icon="cloud" accessibilityLabel={t("mobile.tool.link")} onPress={() => insert("[", "](https://)")} />
                <FormatButton icon="code" accessibilityLabel={t("mobile.tool.code")} onPress={() => insert("`", "`")} />
                <FormatButton icon="caret-down" accessibilityLabel={t("common.done")} onPress={() => { Keyboard.dismiss(); void lib.flush(); }} />
              </View>
            </View>
          </InputAccessoryView>
        </View>
      </NavPage>}
    </NavStack>
    <Dialog open={panelOpen()} presentation="pageSheet" onOpenChange={open => { if (!open) closePanel(); }}
      style={{ flex: 1, backgroundColor: mobileColors().paper }} statusBar={{ foreground: mobileIsDark() ? "light" : "dark" }}>
      <View style={{ flex: 1, backgroundColor: mobileColors().paper }}>
        {platform.os === "ios" ? <View pointerEvents="none" style={{ position: "absolute", top: 5, left: "50%", marginLeft: -18, width: 36, height: 5, borderRadius: 2.5,
          backgroundColor: mobileIsDark() ? "rgba(235, 235, 245, 0.28)" : "rgba(60, 60, 67, 0.28)", zIndex: 5 }} /> : null}
        <View style={{ paddingTop: platform.os === "ios" ? 18 : bottom().top + 4, minHeight: 62, paddingHorizontal: 8, flexDirection: "row", alignItems: "center" }}>
          <Text numberOfLines={1} style={{ position: "absolute", left: 72, right: 72, textAlign: "center", color: mobileColors().ink, fontSize: 17, fontWeight: 600 }}>
            {panel() === "settings" ? t("settings.title")
            : panel() === "storage" ? t("mobile.storageLocation") : panel() === "outline" ? t("inspector.outline") : panel() === "type" ? t("settings.font.size")
            : panel() === "folder" ? t("mobile.newFolder") : panel() === "rename" ? t("rename.title") : panel() === "move" ? t("mobile.move")
            : panel() === "cloudConflicts" ? t("sync.manageConflicts") : panel() === "trash" || panel() === "erase" ? t("mobile.trash")
            : panel() === "actions" ? t("mobile.actions") : docTitle()}
          </Text>
          <Button testID="mobile-panel-done" disabled={busy()} accessibilityLabel={t("common.done")} onPress={closePanel}
            style={{ marginLeft: "auto", height: 44, paddingHorizontal: 12, justifyContent: "center", opacity: busy() ? 0.45 : 1 }}>
            <Text style={{ color: mobileColors().accent, fontSize: 17, fontWeight: 600 }}>{t("common.done")}</Text>
          </Button>
        </View>
        {errorBanner()}
        <Scroll style={{ flex: 1 }} contentStyle={{ padding: 16, paddingTop: 8, paddingBottom: 32 + bottom().bottom, gap: 16 }} keyboardDismissMode="on-drag">
          {panel() === "cloudConflicts" ? <View style={{ gap: 20 }}>
            {!syncRuntime.conflicts().length ? <Text style={{ color: mobileColors().ink2 }}>{t("sync.synced")}</Text> : null}
            {syncRuntime.conflicts().map(item => <View style={{ gap: 8 }}>
              <Text style={{ color: mobileColors().ink }}>{item.path}</Text>
              {(["keepLocal", "keepRemote", "keepBoth"] as const).map(choice => <ChoiceRow label={t(`sync.conflict.${choice}`)}
                detail={t(`mobile.conflict.${choice}Hint`)} icon={choice === "keepLocal" ? "device" : choice === "keepRemote" ? "cloud" : "split"}
                disabled={busy()} onPress={() => { void running(async () => {
                  if (!await lib.flush()) return;
                  await syncRuntime.resolveConflict(item, choice);
                  await lib.reconcile();
                  if (!syncRuntime.conflicts().length) await sync();
                }); }} />)}
            </View>)}
          </View> : panel() === "settings" ? <MobileSettings connected={props.connected}
              onImport={() => importFile(selectedFolder())} onTrash={() => { void running(async () => { await lib.loadTrash(); show("trash"); }); }}
              onStorage={() => show("storage")} onSync={() => { void running(sync); }} onConflicts={() => show("cloudConflicts")} />
            : panel() === "storage" ? <View style={{ gap: 20 }}>
              {props.connected ? <SyncSettings cloudOnly mobile vaultRoot={activeStorage()?.root}
                onBeforeMigration={async () => { if (!await lib.flush()) throw new Error(t("mobile.saveFailed")); }}
                onStorageActivated={props.onStorageActivated} onSyncNow={() => { void running(sync); }}
                onManageConflicts={() => show("cloudConflicts")} /> : null}
              <SectionTitle>{t("settings.sync")}</SectionTitle>
              <SettingsGroup>
                <SettingsRow icon="cloud" title={t("mobile.syncIncluded")} value={syncRuntime.connection()?.account ?? ""} last />
              </SettingsGroup>
            </View> : panel() === "move" ? <SettingsGroup>
              {moveFolders().map((folder, index) =>
                <PanelRow id={`mobile-move-to-${folder.path || "root"}`} icon="folder" title={folder.path || folder.name}
                  selected={selectedFolder() === folder.path}
                  disabled={busy()} last={index === moveFolders().length - 1}
                  onPress={() => { void running(async () => { if (await lib.move(folder.path)) closePanel(); }); }} />)}
            </SettingsGroup> : panel() === "trash" ? <View style={{ gap: 20 }}>
              {!lib.recycled().length ? <View style={{ paddingTop: 96, alignItems: "center", gap: 12 }}>
                <View style={{ width: 52, height: 52, borderRadius: 16, borderCurve: "continuous", alignItems: "center", justifyContent: "center",
                  backgroundColor: mobileColors().list, borderWidth: 0.5, borderColor: mobileColors().thread }}>
                  <Icon name="x" color={mobileColors().ink3} size={22} />
                </View>
                <Text style={{ fontSize: 15, color: mobileColors().ink2 }}>{t("mobile.trashEmpty")}</Text>
              </View> : null}
              {lib.recycled().map(item => <View style={{ gap: 8 }}>
                <View style={{ paddingHorizontal: 4, gap: 2 }}>
                  <Text numberOfLines={1} style={{ fontSize: 17, color: mobileColors().ink }}>{item.original}</Text>
                  <Text style={{ fontSize: 13, color: mobileColors().ink3 }}>{formatWhen(item.deletedAt, locale())}</Text>
                </View>
                <SettingsGroup>
                  <PanelRow id={`mobile-restore-${item.original}`} icon="arrows-clockwise" title={t("mobile.restore")} disabled={busy()} onPress={() => { void running(() => lib.restore(item.path, t("context.duplicateSuffix"))); }} />
                  <PanelRow id={`mobile-erase-${item.original}`} icon="x" title={t("mobile.erase")} destructive last disabled={busy()} onPress={() => { trashSelection.set(item.path); show("erase"); }} />
                </SettingsGroup>
              </View>)}
            </View> : panel() === "erase" ? <View style={{ gap: 20 }}>
              <View style={{ paddingHorizontal: 4, gap: 6 }}>
                <Text style={{ fontSize: 17, lineHeight: 24, color: mobileColors().ink }}>{t("mobile.eraseHint")}</Text>
                <Text numberOfLines={1} style={{ fontSize: 15, color: mobileColors().ink2 }}>{lib.recycled().find(item => item.path === trashSelection())?.original}</Text>
              </View>
              <SettingsGroup>
                <PanelRow id="mobile-erase-confirm" icon="x" title={t("mobile.erase")} destructive last disabled={busy()} onPress={() => { void running(async () => { await lib.removePermanently(trashSelection()); show("trash"); }); }} />
              </SettingsGroup>
              <Button onPress={() => show("trash")} style={{ height: 46, borderRadius: 12, borderCurve: "continuous", alignItems: "center", justifyContent: "center", backgroundColor: mobileColors().list }}>
                <Text style={{ fontSize: 17, color: mobileColors().accent }}>{t("common.cancel")}</Text>
              </Button>
            </View> : panel() === "type" ? <TypeSettings /> : panel() === "outline" ?
            <View>{articleModel(lib.note()?.content ?? "").headings.length ? <SettingsGroup>
              {articleModel(lib.note()?.content ?? "").headings.map((h, index) =>
                <View>
                  <Button testID={`mobile-heading-${h.id}`} onPress={() => { closePanel(); goToBlock(h.blockIndex); }}
                    style={{ minHeight: 44, paddingHorizontal: 16, paddingLeft: 16 + (h.level - 1) * 16, justifyContent: "center", backgroundColor: mobileColors().list }}>
                    <Text numberOfLines={1} style={{ color: mobileColors().ink, fontSize: 17 }}>{h.text}</Text>
                  </Button>
                  {index === articleModel(lib.note()?.content ?? "").headings.length - 1 ? null : <RowDivider inset={16 + (h.level - 1) * 16} />}
                </View>)}
            </SettingsGroup> : <Text style={{ paddingVertical: 32, textAlign: "center", fontSize: 15, color: mobileColors().ink2 }}>{t("inspector.outline.empty")}</Text>}</View> :
            panel() === "rename" || panel() === "folder" ? <View style={{ gap: 16 }}>
              <SettingsGroup>
                <View style={{ backgroundColor: mobileColors().list, paddingHorizontal: 16, paddingVertical: 12 }}>
                  <Input testID="mobile-name" value={input()} onChange={value => input.set(value)}
                    returnKeyType="done" onSubmit={event => { input.set(event.text); Keyboard.dismiss(); }}
                    placeholder={t("rename.label")} autoCorrect={false} autoCapitalize="none"
                    style={{ minHeight: 24, fontSize: 17, color: mobileColors().ink }} />
                </View>
              </SettingsGroup>
              <PrimaryButton id="mobile-name-confirm" disabled={busy() || !input().trim()} label={panel() === "folder" ? t("mobile.create") : t("rename.confirm")} onPress={() => { void running(async () => {
                if (panel() === "folder") { await lib.createFolder(selectedFolder(), input()); tab.set("all"); closePanel(); }
                else if (await lib.renameNote(input())) closePanel();
              }); }} />
            </View> : panel() === "actions" ? <View style={{ gap: 16 }}>
              <Text numberOfLines={1} style={{ paddingHorizontal: 4, fontSize: 13, color: mobileColors().ink3 }}>{lib.note()?.path}</Text>
              <SettingsGroup>
                <PanelRow id="mobile-rename" icon="pencil" title={t("rename.title")} onPress={() => { input.set(docTitle()); show("rename"); }} />
                <PanelRow id="mobile-duplicate" icon="file-text" title={t("context.duplicate")} disabled={busy()} onPress={() => { void running(async () => { if (await lib.copy(t("context.duplicateSuffix"))) closePanel(); }); }} />
                <PanelRow id="mobile-move" icon="folder" title={t("mobile.move")} disabled={busy()} onPress={() => { void running(async () => { await lib.refresh(); show("move"); }); }} />
                <PanelRow id="mobile-export" icon="cloud" title={t("mobile.export")} disabled={busy()} last onPress={exportFile} />
              </SettingsGroup>
              <SettingsGroup>
                <PanelRow id="mobile-recycle" icon="x" title={t("mobile.recycle")} destructive disabled={busy()} onPress={() => { void running(async () => { if (await lib.recycle()) { await dismissPanel(); nav.pop(); } }); }} />
              </SettingsGroup>
              <Text style={{ textAlign: "center", fontSize: 13, color: mobileColors().ink3 }}>{t("info.chars")}: {articleModel(lib.note()?.content ?? "").stats.chars}</Text>
            </View> : null}
        </Scroll>
      </View>
    </Dialog>
  </View>;
}


const TAB_ITEMS = [
  { id: "recent", icon: "clock", key: "mobile.recent" },
  { id: "all", icon: "folder", key: "mobile.all" },
  { id: "favorites", icon: "star", key: "mobile.favorites" },
] as const satisfies readonly { id: Tab; icon: IconName; key: string }[];

/**
 * 悬浮的 Liquid Glass 标签栏。系统的 UITabBar 在页面里会额外铺一层全宽材质，
 * 滚动时看起来像一块遮罩；这里用同尺寸的玻璃胶囊，内容从下面穿过，没有那层底。
 */
function FloatingTabBar(props: { tab: () => Tab; onTab: (next: Tab) => void }) {
  const c = mobileColors();
  const bottom = safeAreaInsets();
  return <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center",
    paddingBottom: Math.max(8, bottom().bottom - 12) }}>
    <View style={{ width: 276, height: 53, flexDirection: "row", alignItems: "stretch", overflow: "hidden", ...glassStyle(26.5) }}>
      {TAB_ITEMS.map(item => {
        const active = props.tab() === item.id;
        return <Button testID={`mobile-tab-${item.id}`} accessibilityLabel={t(item.key)}
          onPress={() => { Keyboard.dismiss(); props.onTab(item.id); }}
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <View style={{ alignItems: "center", gap: 2, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, borderCurve: "continuous",
            backgroundColor: active ? (mobileIsDark() ? "rgba(255, 255, 255, 0.10)" : "rgba(0, 0, 0, 0.05)") : "transparent" }}>
            <Icon name={item.icon} color={active ? c.accent : c.ink3} size={22} />
            <Text style={{ fontSize: 10, fontWeight: 500, letterSpacing: 0, color: active ? c.accent : c.ink3 }}>{t(item.key)}</Text>
          </View>
        </Button>;
      })}
    </View>
  </View>;
}

/** 库页导航栏左侧的设置入口：交给系统放在导航栏里，尺寸随系统。 */
function NativeSettingsButton(props: { onPress: () => void }) {
  return <Button testID="mobile-settings" accessibilityLabel={t("settings.title")} onPress={() => { Keyboard.dismiss(); props.onPress(); }}
    style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
    <Icon name="gear" color={mobileColors().accent} size={20} />
  </Button>;
}


function LibraryPage(props: {
  library: MobileLibrary;
  connected: boolean;
  busy: boolean;
  ios: boolean;
  onOpen: (path: string) => void;
  onSync: () => Promise<void>;
  onSettings: () => void;
  tab: () => Tab;
  onTab: (next: Tab) => void;
  folder: () => string;
  onFolder: (path: string) => void;
  onNewNote: (folder: string) => void;
  onNewFolder: () => void;
  error?: JSX.Element;
  conflict?: JSX.Element;
}) {
  const lib = props.library;
  const c = mobileColors();
  const bottom = safeAreaInsets();
  const query = signal("");
  const expanded = signal<Set<string>>(new Set());
  const pulling = signal(false);
  const search = librarySearch(() => lib.vault, query, lib.entries);
  const allNotes = () => lib.entries().filter(e => !e.isDir && /\.(md|markdown)$/i.test(e.name))
    .map(e => ({ path: e.path, title: titleFromName(e.name.normalize("NFC")), mtimeMs: e.mtimeMs }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs || a.path.localeCompare(b.path));
  const q = () => query().trim().normalize("NFC").toLowerCase();
  const results = () => {
    const text = q();
    if (!text) return [];
    const known = new Map(allNotes().map(note => [note.path, note] as const));
    const paths = new Set<string>();
    for (const note of allNotes()) if (note.title.toLowerCase().includes(text) || note.path.toLowerCase().includes(text)) paths.add(note.path);
    for (const path of search.matches()) paths.add(path);
    return Array.from(paths).map(path => known.get(path)).filter(Boolean) as ReturnType<typeof allNotes>;
  };
  const tree = () => flattenTree(lib.entries(), expanded());
  const toggleFolder = (path: string) => {
    props.onFolder(props.folder() === path ? "" : path);
    expanded.update(current => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  };
  // The compose button creates in the folder selected in 全部; 最近修改 has no folder.
  const composeFolder = () => props.tab() === "all" ? props.folder() : "";
  const newNote = () => props.onNewNote(composeFolder());
  const refresh = async () => {
    if (pulling() || !props.connected) return;
    pulling.set(true);
    try { await props.onSync(); } finally { pulling.set(false); }
  };
  const percent = () => {
    const progress = syncRuntime.progress();
    return progress.total > 0 ? Math.round(progress.done / progress.total * 100) : 0;
  };
  const notPulling = () => pulling();
  const statusVisible = () => !pulling() && !!syncStatus(syncRuntime.phase(), syncRuntime.progress(), syncRuntime.error());
  const searchField = () => <View style={{ height: 36, marginBottom: 10, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 7,
    borderRadius: 10, borderCurve: "continuous", backgroundColor: c.searchBg }}>
    <Icon name="magnifying-glass" color={c.ink3} size={16} />
    <Input testID="mobile-search" value={query()} onChange={value => query.set(value)} placeholder={t("search.placeholder")} returnKeyType="search"
      onSubmit={event => { query.set(event.text); Keyboard.dismiss(); }}
      style={{ flex: 1, height: 36, paddingRight: query() ? 2 : 8, fontSize: 16, color: c.ink }} />
    {query() ? <Button testID="mobile-search-clear" accessibilityLabel={t("search.empty")} onPress={() => { query.set(""); Keyboard.dismiss(); }}
      style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}>
      <Icon name="x" color={c.ink3} size={14} />
    </Button> : null}
  </View>;

  return <View style={{ flex: 1, backgroundColor: c.paper }}>
    <View style={{ flex: 1 }}>
      <Scroll testID="mobile-library-list" style={{ flex: 1 }} onRefresh={refresh} refreshing={pulling()}
        refreshIndicator={{ height: 52 }} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled"
        contentStyle={{ paddingTop: props.ios ? 8 : (statusVisible() ? 100 : 58) + bottom().top, paddingHorizontal: 16, paddingBottom: props.ios ? 100 + bottom().bottom : 108 + bottom().bottom }}>
        {!props.ios && notPulling() ? <PullIndicator percent={percent()} /> : null}
        {props.ios && statusVisible() ? <View style={{ marginBottom: 8 }}><SyncAccessory onPause={() => syncRuntime.pauseSync()} onResume={() => syncRuntime.resumeSync()}
          onRetry={() => { void props.onSync().catch(err => lib.error.set(String(err))); }} /></View> : null}
        {props.ios ? searchField() : null}
        {q() ? <Text testID="mobile-search-meta" style={{ paddingHorizontal: 4, paddingBottom: 4, fontSize: 12, fontWeight: 500, color: c.ink3 }}>{t("mobile.searchResult", { n: results().length })}</Text> : null}
        {props.ios ? null : <View style={{ flexDirection: "row", marginBottom: 2, borderBottomWidth: 0.5, borderBottomColor: c.thread, paddingHorizontal: 2 }}>
          {([["recent", "mobile.recent"], ["all", "mobile.all"], ["favorites", "mobile.favorites"]] as const).map(([id, key]) => {
            const active = props.tab() === id;
            return <Button testID={`mobile-tab-${id}`} onPress={() => { Keyboard.dismiss(); props.onTab(id); }}
              style={{ height: 36, paddingHorizontal: 11, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 13, fontWeight: active ? 600 : 500, letterSpacing: -0.2, color: active ? c.ink : c.ink3 }}>{t(key)}</Text>
              {active ? <View style={{ position: "absolute", left: 8, right: 8, bottom: 0, height: 2, borderTopLeftRadius: 2, borderTopRightRadius: 2, backgroundColor: c.accent }} /> : null}
            </Button>;
          })}
        </View>}
      {props.error}
      {props.conflict}

      {q() ? <View>
        <View style={props.ios ? { borderRadius: 12, borderCurve: "continuous", overflow: "hidden", backgroundColor: c.list } : undefined}>
          {results().map(note => noteRow(note, props.onOpen, props.ios))}
        </View>
        {!results().length && !search.pending() ? <Text style={{ paddingVertical: 40, textAlign: "center", color: c.ink3, fontSize: 15 }}>{t("search.empty")}</Text> : null}
        {search.pending() ? <Text style={{ paddingVertical: 20, textAlign: "center", color: c.ink3 }}>{t("mobile.searching")}</Text> : null}
      </View> : props.tab() === "recent" ? <View>
        <View style={{ paddingTop: 16, paddingBottom: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: 400, color: c.ink2 }}>{t("mobile.recentGroup")}</Text>
        </View>
        <View style={props.ios ? { borderRadius: 12, borderCurve: "continuous", overflow: "hidden", backgroundColor: c.list } : undefined}>
          {allNotes().slice(0, 40).map(note => noteRow(note, props.onOpen, props.ios))}
        </View>
        {!allNotes().length ? emptyNotes() : null}
      </View> : props.tab() === "all" ? <View style={{ paddingTop: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4, paddingBottom: 6 }}>
          <Text style={{ fontSize: 12.5, fontWeight: 500, color: c.ink2 }}>{props.connected ? t(providerLabelKey(syncRuntime.connection()?.provider ?? "google")) : t("mobile.library")}</Text>
          <Text style={{ color: c.ink3, opacity: 0.7 }}>/</Text>
          <Text style={{ fontSize: 12.5, fontWeight: 600, color: c.ink }}>{syncRuntime.connection()?.remoteName || "StoatMD"}</Text>
        </View>
        <View style={props.ios ? { borderRadius: 12, borderCurve: "continuous", overflow: "hidden", backgroundColor: c.list } : undefined}>
        {tree().map(row => row.kind === "folder" ? <Button testID={`mobile-folder-${row.path}`} disabled={props.busy}
          onPress={() => { Keyboard.dismiss(); toggleFolder(row.path); }}
          style={{ minHeight: props.ios ? 48 : 40, paddingHorizontal: props.ios ? 12 : undefined, paddingLeft: row.depth * 18 + (props.ios ? 12 : 0), paddingRight: 10, flexDirection: "row", alignItems: "center", gap: 8,
            backgroundColor: props.ios ? c.list : "transparent", borderBottomWidth: props.ios ? 0.5 : 0, borderBottomColor: c.thread }}>
          <View style={{ width: 22, height: 22, alignItems: "center", justifyContent: "center" }}>
            <Icon name={row.expanded ? "caret-down" : "caret-right"} color={c.ink3} size={14} />
          </View>
          <View style={{ width: 26, height: 26, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: c.accentSoft }}>
            <Icon name="folder" color={c.accent} size={14} />
          </View>
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 16, fontWeight: 500, letterSpacing: 0, color: c.ink }}>{row.name}</Text>
          <Text style={{ fontSize: 15, color: c.ink3 }}>{row.count}</Text>
        </Button> : <Button testID={`mobile-note-${row.path}`} disabled={props.busy}
          onPress={() => { Keyboard.dismiss(); props.onOpen(row.path); }}
          style={{ minHeight: props.ios ? 48 : 40, paddingHorizontal: props.ios ? 12 : undefined, paddingLeft: row.depth * 18 + (props.ios ? 12 : 0), paddingRight: 10, flexDirection: "row", alignItems: "center", gap: 8,
            backgroundColor: props.ios ? c.list : "transparent", borderBottomWidth: props.ios ? 0.5 : 0, borderBottomColor: c.thread }}>
          <View style={{ width: 22, height: 22 }} />
          <View style={{ width: 26, height: 26, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: c.searchBg }}>
            <Icon name="file-text" color={c.ink2} size={14} />
          </View>
          <Text numberOfLines={1} style={{ flex: 1, fontFamily: props.ios ? undefined : "monospace", fontSize: props.ios ? 17 : 13, fontWeight: 400, color: c.ink }}>{props.ios ? row.title : row.name}</Text>
          <Text style={{ fontSize: props.ios ? 15 : 11.5, color: c.ink3 }}>{formatWhen(row.mtimeMs, locale())}</Text>
        </Button>)}
        </View>
        {props.ios ? <Button testID="mobile-new-folder" accessibilityLabel={t("mobile.newFolder")} disabled={props.busy} onPress={props.onNewFolder}
          style={{ marginTop: 14, minHeight: 44, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10,
            backgroundColor: c.list, borderRadius: 12, borderCurve: "continuous", opacity: props.busy ? 0.45 : 1 }}>
          <Icon name="folder-plus" color={c.accent} size={18} />
          <Text style={{ fontSize: 17, color: c.accent }}>{t("mobile.newFolder")}</Text>
        </Button> : null}
      </View> : <View>
        <View testID="mobile-favorites-soon" style={{ marginTop: 2, marginBottom: 4, paddingVertical: 10, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14,
          backgroundColor: c.list, borderWidth: 0.5, borderColor: c.thread }}>
          <View style={{ height: 22, paddingHorizontal: 9, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: c.accentSoft }}>
            <Text style={{ fontSize: 11, fontWeight: 600, color: c.accent }}>{t("mobile.favoritesSoon")}</Text>
          </View>
          <Text style={{ flex: 1, fontSize: 12.5, fontWeight: 500, lineHeight: 17, color: c.ink2 }}>{t("mobile.favoritesHint")}</Text>
        </View>
        <View style={{ minHeight: 260, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 28, paddingVertical: 24 }}>
          <View style={{ width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: c.list, borderWidth: 0.5, borderColor: c.thread }}>
            <Icon name="star" color={c.accent} size={24} />
          </View>
          <Text style={{ marginTop: 6, fontSize: 17, fontWeight: 600, letterSpacing: -0.35, color: c.ink }}>{t("mobile.favoritesEmpty")}</Text>
          <Text style={{ maxWidth: 260, textAlign: "center", fontSize: 13.5, lineHeight: 20, fontWeight: 500, color: c.ink2 }}>{t("mobile.favoritesEmptyHint")}</Text>
          <View style={{ marginTop: 4, height: 24, paddingHorizontal: 11, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: c.accentSoft }}>
            <Text style={{ fontSize: 12, fontWeight: 600, color: c.accent }}>{t("mobile.favoritesSoon")}</Text>
          </View>
        </View>
      </View>}
    </Scroll>

    </View>

    {props.ios ? <FloatingTabBar tab={props.tab} onTab={props.onTab} /> : null}

    {props.ios ? null : <View style={{ position: "absolute", left: 0, right: 0, bottom: keyboardFrame().height, paddingHorizontal: 20, paddingBottom: keyboardFrame().height ? 8 : 12 + bottom().bottom, flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Button testID="mobile-new-folder" accessibilityLabel={t("mobile.newFolder")} disabled={props.busy} onPress={props.onNewFolder}
        style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center", ...glassStyle(16) }}>
        <Icon name="folder-plus" color={c.ink} size={20} />
      </Button>
      <View style={{ flex: 1, minWidth: 0, height: 48, paddingLeft: 16, flexDirection: "row", alignItems: "center", gap: 8, ...glassStyle(999) }}>
        <Icon name="magnifying-glass" color={c.ink3} size={16} />
        <Input testID="mobile-search" value={query()} onChange={value => query.set(value)} placeholder={t("search.placeholder")} returnKeyType="search"
          onSubmit={event => { query.set(event.text); Keyboard.dismiss(); }}
          style={{ flex: 1, height: 48, paddingRight: query() ? 4 : 16, fontSize: 16, color: c.ink }} />
        {query() ? <Button testID="mobile-search-clear" accessibilityLabel={t("search.empty")} onPress={() => { query.set(""); Keyboard.dismiss(); }}
          style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
          <Icon name="x" color={c.ink3} size={14} />
        </Button> : null}
      </View>
      <Button testID="mobile-new-note" accessibilityLabel={t("note.new")} disabled={props.busy} onPress={newNote}
        style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center", ...glassStyle(16), backgroundColor: c.accentSoft }}>
        <Icon name="compose" color={c.accent} size={20} />
      </Button>
    </View>}
  </View>;
}

function LibraryNav(props: { connected: boolean; statusVisible: boolean; onSettings: () => void; onSync: () => void; onPause: () => void; onResume: () => void; onRetry: () => void }) {
  const c = mobileColors();
  const inset = safeAreaInsets();
  return <View style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 20, paddingTop: inset().top, paddingHorizontal: 16, paddingBottom: 8 }}>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, minHeight: 44 }}>
      <Text style={{ paddingLeft: 2, fontSize: 28, fontWeight: 700, letterSpacing: -0.72, color: c.ink }}>{t("mobile.library")}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {props.connected ? <GlassIconButton id="mobile-sync" icon="sync" label={t("sync.syncNow")}
          spinning={syncRuntime.phase() === "syncing"} tint={c.ink} onPress={props.onSync} /> : null}
        <GlassIconButton id="mobile-settings" icon="gear" label={t("settings.title")} tint={c.ink} onPress={props.onSettings} />
      </View>
    </View>
    {props.statusVisible ? <SyncAccessory onPause={props.onPause} onResume={props.onResume} onRetry={props.onRetry} /> : null}
  </View>;
}

function noteRow(note: { path: string; title: string; mtimeMs: number }, onOpen: (path: string) => void, ios = false) {
  const c = mobileColors();
  return <Button testID={`mobile-note-${note.path}`} onPress={() => { Keyboard.dismiss(); onOpen(note.path); }}
    style={{ minHeight: ios ? 70 : 58, paddingVertical: ios ? 12 : 10, paddingHorizontal: ios ? 16 : 4, gap: ios ? 4 : 3,
      backgroundColor: ios ? c.list : "transparent", borderBottomWidth: 0.5, borderBottomColor: c.thread }}>
    <Text numberOfLines={1} style={{ fontSize: ios ? 17 : 16, fontWeight: ios ? 600 : 590, letterSpacing: ios ? -0.2 : -0.25, color: c.ink }}>{note.title}</Text>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Text numberOfLines={1} style={{ flex: 1, fontSize: ios ? 15 : 12, color: c.ink2 }}>{note.path.includes("/") ? note.path.split("/").slice(0, -1).join("/") : t("mobile.library")}</Text>
      <Text style={{ fontSize: ios ? 15 : 11, color: c.ink3 }}>{formatWhen(note.mtimeMs, locale())}</Text>
    </View>
  </Button>;
}

function emptyNotes() {
  const c = mobileColors();
  return <View style={{ paddingVertical: 60, gap: 14, alignItems: "center" }}>
    <Icon name="notebook" color={c.accent} size={38} />
    <Text style={{ color: c.ink, fontSize: 20 }}>{t("note.empty")}</Text>
    <Text style={{ color: c.ink3, textAlign: "center", fontSize: 15 }}>{t("mobile.emptyHint")}</Text>
  </View>;
}

function ReaderDock(props: { content: string; bottom: number; onOutline: () => void; onType: () => void }) {
  const c = mobileColors();
  const words = () => articleModel(props.content).stats.chars;
  return <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16,
    paddingBottom: Math.max(8, props.bottom - 10), alignItems: "center" }}>
    <View style={{ width: "100%", height: 50, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", ...glassStyle(25) }}>
      <Button testID="mobile-outline" accessibilityLabel={t("inspector.outline")} onPress={props.onOutline}
        style={{ minWidth: 64, height: 50, paddingHorizontal: 10, justifyContent: "center" }}>
        <Text style={{ fontSize: 17, color: c.accent }}>{t("inspector.outline")}</Text>
      </Button>
      <Text testID="mobile-word-count" style={{ fontSize: 13, fontWeight: 400, color: c.ink3 }}>{t("mobile.words", { n: words() })}</Text>
      <Button testID="mobile-type" accessibilityLabel={t("settings.font.size")} onPress={props.onType}
        style={{ minWidth: 64, height: 50, paddingHorizontal: 10, alignItems: "flex-end", justifyContent: "center" }}>
        <Text style={{ fontSize: 19, fontWeight: 500, color: c.accent }}>A</Text>
      </Button>
    </View>
  </View>;
}

/** 阅读页标题与正文同色（稿：Kami 纸面阅读，不把 H1 染成强调色）。 */
function readerStyles() {
  const c = mobileColors();
  const base = previewTextStyles(c);
  return {
    ...base,
    heading: { ...(base.heading ?? {}), color: c.ink },
    heading1: { ...(base.heading1 ?? {}), color: c.ink },
    heading2: { ...(base.heading2 ?? {}), color: c.ink },
    heading3: { ...(base.heading3 ?? {}), color: c.ink },
  };
}

function FormatButton(props: { label?: string; icon?: IconName; accessibilityLabel: string; onPress: () => void; bold?: boolean }) {
  const c = mobileColors();
  return <Button accessibilityLabel={props.accessibilityLabel} onPress={props.onPress} style={{ flex: 1, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 10 }}>
    {props.icon ? <Icon name={props.icon} color={c.ink} size={17} /> : <Text style={{ fontSize: 14, fontWeight: props.bold ? 700 : 600, color: c.ink }}>{props.label}</Text>}
  </Button>;
}

function ChoiceRow(props: { label: string; detail: string; icon: IconName; onPress: () => void; disabled?: boolean; preferred?: boolean }) {
  const c = mobileColors();
  return <Button disabled={props.disabled} onPress={props.onPress}
    style={{ padding: 12, flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 14, backgroundColor: props.preferred ? c.accentSoft : c.list,
      borderWidth: 0.5, borderColor: props.preferred ? c.accent : c.thread, opacity: props.disabled ? 0.45 : 1 }}>
    <View style={{ width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: c.paper }}>
      <Icon name={props.icon} color={c.accent} size={18} />
    </View>
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={{ fontSize: 14.5, fontWeight: 620, letterSpacing: -0.2, color: c.ink }}>{props.label}</Text>
      <Text style={{ marginTop: 3, fontSize: 12, lineHeight: 17, color: c.ink2 }}>{props.detail}</Text>
    </View>
  </Button>;
}

function TypeSettings() {
  const c = mobileColors();
  const rows = [
    { id: "reading", title: "settings.font.reading", value: fontSize, set: applyFontSize },
    { id: "editor", title: "settings.font.editorSize", value: editorFontSize, set: applyEditorFontSize },
  ];
  return <View>
    {rows.map((item, index) => <View>
      <SectionTitle top={index === 0 ? 2 : 24}>{t(item.title)}</SectionTitle>
      <SettingsGroup>
        <View style={{ height: 48, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", backgroundColor: c.list }}>
          <Button testID={`${item.title}-decrease`} accessibilityLabel="-1" disabled={item.value() <= 12} onPress={() => item.set(item.value() - 1)}
            style={{ width: 52, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: c.paper, opacity: item.value() <= 12 ? 0.35 : 1 }}>
            <Text style={{ fontSize: 17, fontWeight: 500, color: c.accent }}>A−</Text>
          </Button>
          <Text style={{ flex: 1, textAlign: "center", fontSize: 19, fontWeight: 500, color: c.ink }}>{item.value()}</Text>
          <Button testID={`${item.title}-increase`} accessibilityLabel="+1" disabled={item.value() >= 24} onPress={() => item.set(item.value() + 1)}
            style={{ width: 52, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: c.paper, opacity: item.value() >= 24 ? 0.35 : 1 }}>
            <Text style={{ fontSize: 19, fontWeight: 500, color: c.accent }}>A+</Text>
          </Button>
        </View>
      </SettingsGroup>
    </View>)}
    <View style={{ marginTop: 24, paddingHorizontal: 4 }}>
      <Text numberOfLines={3} style={{ width: "100%", fontSize: fontSize(), lineHeight: fontSize() * 1.55, color: c.ink2 }}>
        {t("mobile.typeSample")}
      </Text>
    </View>
  </View>;
}

function ThemeRow(props: { theme: (typeof MOBILE_THEMES)[number]; last?: boolean }) {
  const c = mobileColors();
  const theme = props.theme;
  const active = mobileThemeId() === theme.id;
  return <View>
    <Button testID={`mobile-theme-${theme.id}`} onPress={() => applyTheme(theme.id)}
      style={{ minHeight: 48, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12,
        backgroundColor: c.list }}>
      <View style={{ width: 29, height: 29, borderRadius: 7, borderCurve: "continuous", alignItems: "center", justifyContent: "center",
        backgroundColor: theme.art.paper, borderWidth: 0.5, borderColor: theme.id === "nord" ? "#3A3A3C" : c.thread }}>
        <Text style={{ fontSize: 13, fontWeight: 600, letterSpacing: -0.2, color: theme.art.ink }}>Aa</Text>
      </View>
      <Text style={{ flex: 1, fontSize: 17, color: c.ink }}>{theme.name}</Text>
      {active ? <Icon name="check" color={c.accent} size={18} /> : null}
    </Button>
    {props.last ? null : <RowDivider inset={57} />}
  </View>;
}

function MobileSettings(props: { connected: boolean; onImport: () => void; onTrash: () => void; onStorage: () => void; onSync: () => void; onConflicts: () => void }) {
  const c = mobileColors();
  const connection = () => syncRuntime.connection();
  return <View>
    <SectionTitle top={2}>{t("settings.appearance")}</SectionTitle>
    <SettingsGroup>
      {MOBILE_THEMES.map((theme, index) => <ThemeRow theme={theme} last={index === MOBILE_THEMES.length - 1} />)}
    </SettingsGroup>

    <SectionTitle>{t("mobile.sectionText")}</SectionTitle>
    <SettingsGroup>
      <LanguageRow />
      <FontRow />
    </SettingsGroup>

    <SectionTitle>{t("mobile.storageLocation")}</SectionTitle>
    <SettingsGroup>
      <SettingsRow id="mobile-storage-row" icon="cloud" title={props.connected ? t(providerLabelKey(connection()!.provider)) : t("mobile.notConnected")}
        detail={props.connected ? `${connection()!.remotePath || "/"} · ${t("mobile.offlineReady")}` : t("mobile.connectHint")}
        value={props.connected ? t("storage.inUse") : undefined} last={!props.connected && !syncRuntime.conflicts().length} onPress={props.onStorage} />
      {props.connected ? <SettingsRow id="mobile-sync-now" icon="arrows-clockwise" iconBg="#34C759" title={t("mobile.syncNow")}
        detail={`${t("sync.synced")} · ${formatSyncMoment(syncRuntime.lastSyncAt())}`} last={!syncRuntime.conflicts().length} onPress={props.onSync} /> : null}
      {syncRuntime.conflicts().length ? <SettingsRow id="mobile-conflicts-row" icon="info" iconBg="#FF9500" title={t("sync.manageConflicts")}
        value={String(syncRuntime.conflicts().length)} last onPress={props.onConflicts} /> : null}
    </SettingsGroup>

    <SectionTitle>{t("mobile.sectionData")}</SectionTitle>
    <SettingsGroup>
      <SettingsRow id="mobile-import" icon="file-text" iconBg="#34C759" title={t("mobile.import")} onPress={props.onImport} />
      <SettingsRow id="mobile-trash" icon="x" iconBg="#FF3B30" title={t("mobile.trash")} onPress={props.onTrash} last />
    </SettingsGroup>

    <SectionTitle>StoatMD</SectionTitle>
    <SettingsGroup>
      <SettingsRow icon="cloud" title={t("mobile.paidVersion")} value={t("mobile.syncIncluded")} last />
    </SettingsGroup>
    <Text style={{ marginTop: 24, textAlign: "center", fontSize: 13, lineHeight: 19, color: c.ink3 }}>
      <Text style={{ fontWeight: 600, color: c.ink2 }}>StoatMD</Text> · {t("mobile.brandTagline")}
    </Text>
  </View>;
}

function LanguageRow() {
  const c = mobileColors();
  const open = signal(false);
  const languages: { id: LocalePref; label: string }[] = [{ id: "system", label: t("settings.locale.system") }, { id: "en", label: "English" }, { id: "zh", label: "简体中文" },
    { id: "zh-Hant", label: "繁體中文" }, { id: "ja", label: "日本語" }, { id: "ko", label: "한국어" }, { id: "de", label: "Deutsch" }, { id: "fr", label: "Français" }, { id: "es", label: "Español" }];
  const current = () => languages.find(language => language.id === localePref())?.label ?? t("settings.locale.system");
  return <View>
    <SettingsRow id="mobile-language-toggle" title={t("settings.locale")} value={current()} onPress={() => open.set(!open())} />
    {open() ? languages.map(language => <View>
      <Button testID={`mobile-language-${language.id}`}
        onPress={() => { setLocalePref(language.id); void saveLocale(language.id); open.set(false); }}
        style={{ minHeight: 44, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          backgroundColor: c.list }}>
        <Text style={{ fontSize: 17, color: c.ink }}>{language.label}</Text>
        {localePref() === language.id ? <Icon name="check" color={c.accent} size={18} /> : null}
      </Button>
      <RowDivider />
    </View>) : null}
  </View>;
}

function FontRow() {
  const open = signal(false);
  return <View>
    <SettingsRow id="mobile-text-row" title={t("mobile.typography")} value={`Kami · ${fontSize()} / ${lineHeightRatio()}`} onPress={() => open.set(!open())} />
    {open() ? <View style={{ padding: 16 }}><TypeSettings /></View> : null}
  </View>;
}

function lineHeightRatio(): string {
  return "1.55";
}
