import { Image, Keyboard, List, Scroll, Text, View, cleanup, computed, createAnimatedValue, effect, keymap, keyboardFrame, platform, safeAreaInsets, signal, windowSize, type JSX, type YNode } from "nsh";
import { Button, Dialog, Input, NavPage, NavStack, TextView, createNavStack } from "nsh/base";
import { InputAccessoryView, TabBar } from "nsh/mobile";
import { MobileFiles, Vault } from "stoatmd/native";
import { activeStorage, readActiveStorage, writeActiveStorage, storageBusy } from "../storage/state";
import { readPortableConnection, writePortableConnection } from "../storage/portable";
import { restoreSharedStorage } from "../storage/runtime";
import { syncRuntime } from "../sync/runtime";
import type { SyncErrorKind } from "../sync/provider";
import { SyncSettings, formatSyncMoment } from "../ui/SyncSettings";
import { providerLabelKey } from "../sync/runtime";
import { Icon, type IconName } from "../ui/Icon";
import { articleModel, noteFormat } from "../ui/articleModel";
import { APP_LOGOS, appLogo, appLogoBusy, appLogoError, logoAsset, selectMobileAppLogo } from "../ui/appLogo";
import { previewTextStyles } from "../ui/EditorWorkspace";
import { applyRenderMode, displayBlock, renderMode } from "../ui/documentAppearance";
import { findShortcuts } from "../ui/findShortcuts";
import { locale, localePref, setLocalePref, t, type LocalePref } from "../ui/i18n";
import { librarySearch } from "../ui/librarySearch";
import { loadSavedFavorites, saveFavorites, saveLocale } from "../ui/prefs";
import { previewGap, previewModel, resolveAnchor } from "../ui/previewModel";
import { applyTheme, setPaletteOverride } from "../ui/theme";
import { LINE_HEIGHT_MAX, LINE_HEIGHT_MIN, LINE_HEIGHT_STEP, applyEditorFontSize, applyFontLineHeight, applyFontSize, editorFontSize, fontLineHeight, fontSize, lineHeightPx } from "../ui/typography";
import { formatDateTime, formatWhen, titleFromName } from "../ui/vaultModel";
import { mobileLibrary, type MobileLibrary } from "./library";
import { flattenTree } from "./libraryTree";
import { imageRelPath, resolveImageSrc, stripImages } from "./readerImages";
import { MOBILE_THEMES, glass, mobileColors, mobileIsDark, mobileThemeId, type MobileTheme } from "./palette";
import { syncStatus } from "./syncStatus";

type Route = { kind: "library" } | { kind: "document" };
type SyncErrorView = { kind: SyncErrorKind; message: string };
/** 自动同步连续失败几次，才把网络错误显示到界面上。 */
const SYNC_ERROR_AFTER = 5;

/**
 * 本地改完（保存 / 新建 / 删除 / 移动）后攒一小会儿再推云端，和 Mac 的
 * `SYNC_AFTER_SAVE_MS` 一致：连续敲字不会每个字符打一次网络。
 * 后台推送是 quiet 的——失败不弹错误，下一次全量同步会补上。
 */
const SYNC_AFTER_SAVE_MS = 2500;
const pendingPush = { saved: new Set<string>(), removed: new Set<string>() };
let pushTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleCloudPush(kind: "saved" | "removed", path: string) {
  if (kind === "saved") pendingPush.saved.add(path);
  else pendingPush.removed.add(path);
  if (pushTimer !== null) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { pushTimer = null; void flushCloudPush(); }, SYNC_AFTER_SAVE_MS);
}
async function flushCloudPush(): Promise<void> {
  const saved = Array.from(pendingPush.saved);
  const removed = Array.from(pendingPush.removed);
  pendingPush.saved.clear();
  pendingPush.removed.clear();
  if (!saved.length && !removed.length) return;
  if (!syncRuntime.connection() || syncRuntime.phase() === "paused") return;
  // 同一路径既改又删，以删除为准。
  const gone = new Set(removed);
  const uploads = saved.filter(path => !gone.has(path));
  try {
    await (removed.length ? syncRuntime.pushDeletions(removed, true) : null);
    await (uploads.length ? syncRuntime.pushPaths(uploads, true) : null);
  } catch { /* 后台推送失败不打断编辑，最多拖到下一次全量同步 */ }
}
type Panel = "settings" | "storage" | "outline" | "type" | "actions" | "info" | "rename" | "folder" | "move" | "trash" | "erase" | "cloudConflicts" | null;
type Tab = "recent" | "all" | "favorites";

/**
 * `NavPage` 的 `ios` 补充项（`headerRightSystemItem`）已实现但没写进 `NavPageProps`，
 * 所以这里补个类型，用**普通属性**传，而不是 `{...{ ios }}` spread：
 * spread 的对象是挂载时算好的一份死值，编辑态切换时系统栏按钮不会跟着从 Edit 变成 Done。
 */
type NavPageProps = Parameters<typeof NavPage>[0];
const NavPageI = NavPage as unknown as (props: NavPageProps & { ios?: { headerRightSystemItem?: "done" | "edit" | "compose" } }) => ReturnType<typeof NavPage>;

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

/** 笔记摘要：去掉 Markdown 记号，取第一行有内容的文字。 */
function noteSnippet(content: string): string {
  const line = content.normalize("NFC")
    .replace(/^---[\s\S]*?---\s*/, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_~>]/g, "")
    .replace(/^\s*[-+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .split("\n")
    .map(text => text.trim())
    .find(Boolean) ?? "";
  return line.length > 90 ? `${line.slice(0, 90)}…` : line;
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
function PanelRow(props: { id?: string; icon: IconName; title: string; detail?: string; destructive?: boolean; accent?: boolean; disabled?: boolean; selected?: boolean; last?: boolean; onPress: () => void }) {
  const c = mobileColors();
  const danger = "#FF3B30";
  return <View>
    <Button testID={props.id} disabled={props.disabled} onPress={props.onPress}
      style={{ minHeight: 44, paddingHorizontal: 16, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 12,
        backgroundColor: c.list, opacity: props.disabled ? 0.45 : 1 }}>
      <View style={{ width: 29, height: 29, borderRadius: 14.5, borderCurve: "continuous", alignItems: "center", justifyContent: "center",
        backgroundColor: props.destructive ? (mobileIsDark() ? "rgba(255, 69, 58, 0.20)" : "rgba(255, 59, 48, 0.12)") : props.accent ? c.accentSoft : c.searchBg }}>
        <Icon name={props.icon} color={props.destructive ? danger : props.accent ? c.accent : c.ink2} size={16} />
      </View>
      <Text style={{ flex: 1, fontSize: 17, color: props.destructive ? danger : c.ink }}>{props.title}</Text>
      {props.detail ? <Text numberOfLines={1} style={{ maxWidth: 170, textAlign: "right", fontSize: 15, color: c.ink3 }}>{props.detail}</Text> : null}
      {props.selected ? <Icon name="check" color={c.accent} size={18} /> : null}
    </Button>
    {props.last ? null : <RowDivider inset={57} />}
  </View>;
}

/** 面板的主操作：分组卡片里的蓝色文字行，和系统表单一致。 */
function PrimaryButton(props: { id?: string; label: string; disabled?: boolean; onPress: () => void }) {
  const c = mobileColors();
  return <SettingsGroup>
    <Button testID={props.id} disabled={props.disabled} onPress={props.onPress}
      style={{ height: 48, alignItems: "center", justifyContent: "center", backgroundColor: c.list, opacity: props.disabled ? 0.4 : 1 }}>
      <Text style={{ fontSize: 17, fontWeight: 400, color: c.accent }}>{props.label}</Text>
    </Button>
  </SettingsGroup>;
}

/** 同步 accessory：同步中可暂停，暂停可继续，失败可重试；只出现在库页。 */
function SyncAccessory(props: { error?: SyncErrorView | null; onPause: () => void; onResume: () => void; onRetry: () => void }) {
  const current = syncStatus(syncRuntime.phase(), syncRuntime.progress(), props.error === undefined ? syncRuntime.error() : props.error);
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

export function MobileShell(props: { library?: MobileLibrary; nativeChrome?: boolean; initialTab?: Tab; /** 截图测试用：底栏是原生 UITabBar，测试点不到「设置」项。 */ settingsTap?: boolean } = {}) {
  setPaletteOverride(mobileColors);
  const library = signal<MobileLibrary | null>(null);
  const startupError = signal("");
  const loading = signal(true);
  let alive = true;
  const activate = async (root: string) => {
    const vault = Vault.open(root);
    const model = mobileLibrary(vault, {
      saved: path => scheduleCloudPush("saved", path),
      removed: path => scheduleCloudPush("removed", path),
    });
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
        else writePortableConnection(stored.connection);
        await syncRuntime.load();
        await activate(vault.root);
        return;
      }
      // 同一 Apple ID 的另一台设备已经绑定过云盘：直接建缓存进库，不再授权或选文件夹。
      const portable = readPortableConnection();
      if (portable) {
        try {
          await restoreSharedStorage(portable, async root => { await activate(root); });
          return;
        } catch (err) {
          console.warn("shared storage restore skipped", err);
        }
      }
    } catch (err) { if (alive) startupError.set(String(err)); }
    finally { if (alive) loading.set(false); }
  };
  void load();
  cleanup(() => { alive = false; });
  return <View testID="mobile-shell" style={{ flex: 1, backgroundColor: mobileColors().paper }}>
    <Each of={library() ? [library()!] : []} key={model => model}>{model => <MobileApp library={model()} connected={!props.library} nativeChrome={props.nativeChrome !== false} initialTab={props.initialTab} settingsTap={props.settingsTap} onStorageActivated={activate} />}</Each>
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

/** 加载失败的图片来源；放在模块级，避免组件重渲染时信号被重置又去重试、来回闪。 */
const failedImages = signal<Record<string, true>>({});

/** 阅读页图片：按原始宽高比铺满正文宽度；onLoad 之前先占位，避免列表高度跳动。 */
function ReaderImage(props: { src: string; alt?: string; width?: number | `${number}%`; height?: number | `${number}%` }) {
  const ratio = signal<number | null>(null);
  const loaded = signal(false);
  if (failedImages()[props.src]) return <ReaderImageNotice alt={props.alt} hint={t("mobile.imageFailed")} testID="mobile-image-failed" />;
  return <View style={{ position: "relative", width: props.width ?? "100%", maxWidth: "100%" }}>
    <Image src={props.src} accessibilityLabel={props.alt} resizeMode="contain"
      onLoad={size => {
        if (size.width > 0 && size.height > 0) ratio.set(size.width / size.height);
        loaded.set(true);
      }}
      onError={() => failedImages.set({ ...failedImages(), [props.src]: true })}
      style={{ width: "100%",
        ...(props.height ? { height: props.height } : ratio() ? { aspectRatio: ratio()! } : { height: 140 }),
        borderRadius: 6, backgroundColor: mobileColors().thread }} />
    {/* 网络图片和刚同步下来的本地图片都要读一会儿；在 onLoad 之前盖一层细转圈，别让读者以为图坏了。 */}
    {loaded() ? null : <View testID="mobile-image-loading" pointerEvents="none"
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 6,
        backgroundColor: mobileColors().thread, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2,
        borderColor: mobileColors().thread, borderTopColor: mobileColors().ink3,
        animationName: "spin", animationDuration: 850, animationIterationCount: "infinite" }} />
    </View>}
  </View>;
}

/**
 * 图片没法显示时的占位。
 * nsh 的 <Image> 加载失败后不会自动重试（同一 source 直接跳过），
 * 所以附件还没同步到本机时先不挂 <Image>，等库 generation 变化后再首次挂载。
 */
function ReaderImageNotice(props: { alt?: string; hint: string; testID?: string }) {
  return <View testID={props.testID} style={{ width: "100%", minHeight: 140, borderRadius: 6, backgroundColor: mobileColors().thread,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 16, paddingVertical: 20 }}>
    <Text style={{ fontSize: 13, lineHeight: 18, textAlign: "center", color: mobileColors().ink3 }}>
      {props.alt ? `${props.alt} · ${props.hint}` : props.hint}
    </Text>
  </View>;
}

function MobileApp(props: { library: MobileLibrary; connected: boolean; nativeChrome: boolean; initialTab?: Tab; settingsTap?: boolean; onStorageActivated: (root: string) => Promise<void> }) {
  const lib = props.library;
  const ios = props.nativeChrome && platform.os === "ios";
  const nav = createNavStack<Route>(lib.note() ? [{ kind: "library" }, { kind: "document" }] : [{ kind: "library" }]);
  // 宽屏（iPad 横屏 / 12.9 寸竖屏）走两栏：左边库、右边文档；窄屏仍是推入式导航。
  // 760pt 是 iPad 分栏的常用断点，11 寸竖屏（834）也落在宽屏这一侧，和多任务窄窗（≤ 700）分开。
  const wide = () => windowSize().width >= 760;
  /** 右栏自己的导航栈：文档页在两个栈里复用，靠这个栈撑住 NavPage。 */
  const detailNav = createNavStack<Route>([{ kind: "document" }]);
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
  // 正文内查找：iOS 没有 Mac 的 Editor 搜索面板，阅读视图自己按块查。
  const finding = signal(false);
  const findText = signal("");
  const findHit = signal(0);
  // iPad 的「编辑 + 预览」同屏（对齐 Mac 的 split 模式），窄屏不提供。
  const previewSplit = signal(false);
  // iPad 左栏可以收起（⌘B / 阅读页底栏的侧栏按钮），给文档腾出整幅宽度。
  const libraryCollapsed = signal(false);
  const toggleLibrary = () => { if (!wide()) return; Keyboard.dismiss(); libraryCollapsed.set(!libraryCollapsed()); };
  // 收藏按路径存在本机（云盘是真相源，但不往里面塞额外文件，Mac 版还没有收藏）。
  const favorites = signal<string[]>([]);
  void loadSavedFavorites().then(list => favorites.set(list)).catch(() => {});
  const isFavorite = (path: string) => favorites().includes(path);
  const favoriteSet = () => Object.fromEntries(favorites().map(path => [path, true]));
  const toggleFavorite = (path: string) => {
    const next = isFavorite(path) ? favorites().filter(item => item !== path) : [...favorites(), path];
    favorites.set(next);
    void saveFavorites(next);
  };
  // 大标题滚出屏幕后，用系统导航栏的小标题接住，和原生大标题收起一致。
  const libraryTitleCollapsed = signal(false);
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
    if (await lib.createNote(folder)) { editing.set(true); if (!wide()) nav.push({ kind: "document" }); }
  }); };
  const openNote = (path: string) => { void running(async () => {
    if (await lib.openNote(path)) {
      finding.set(false); findText.set(""); findHit.set(0);
      // 分屏预览里换笔记：留在编辑态，别把用户踢回阅读。
      if (!(wide() && previewSplit())) editing.set(false);
      if (!wide()) nav.push({ kind: "document" });
    }
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
  /**
   * 查找命中：编辑态在源码里按字符偏移找（选中原文），阅读态按块找（滚到那块高亮）。
   * 用 `toLowerCase` 而不是 `toLocaleLowerCase`：后者可能改变字符长度，偏移就对不上了。
   */
  const findHits = computed(() => {
    const query = findText().trim().toLowerCase();
    const hits: { block: number; start: number; end: number }[] = [];
    if (!finding() || !query) return hits;
    if (editing()) {
      const text = (lib.note()?.content ?? "").toLowerCase();
      let at = text.indexOf(query);
      while (at >= 0 && hits.length < 500) {
        hits.push({ block: -1, start: at, end: at + query.length });
        at = text.indexOf(query, at + query.length);
      }
      return hits;
    }
    model().blocks.forEach((block, index) => {
      const text = TextView.plainText({ blocks: [block] }).toLowerCase();
      let at = text.indexOf(query);
      while (at >= 0 && hits.length < 500) { hits.push({ block: index, start: -1, end: -1 }); at = text.indexOf(query, at + query.length); }
    });
    return hits;
  });
  const currentBlock = () => { const hit = findHits()[findHit()]; return hit ? hit.block : -1; };
  const goToHit = (index: number) => {
    const total = findHits().length;
    if (!total) return;
    const next = ((index % total) + total) % total;
    findHit.set(next);
    const hit = findHits()[next];
    if (editing()) { editor?.focus(); editor?.setSelection(hit.start, hit.end); return; }
    reader?.scrollToIndex({ index: hit.block, animated: true, viewPosition: 0.2 });
  };
  const openFind = () => {
    if (!lib.note()) return;
    Keyboard.dismiss();
    finding.set(true);
    if (findText() && findHits().length) goToHit(0);
  };
  const closeFind = () => { finding.set(false); findText.set(""); findHit.set(0); };
  const queryFind = (query: string) => {
    findText.set(query);
    findHit.set(0);
    if (query.trim() && findHits().length) goToHit(0);
  };
  const findKeys = findShortcuts();
  keymap.bind(findKeys.open, openFind, { when: "always" });
  keymap.bind(findKeys.next, () => { if (finding()) goToHit(findHit() + 1); }, { when: "always" });
  keymap.bind(findKeys.previous, () => { if (finding()) goToHit(findHit() - 1); }, { when: "always" });
  effect(() => {
    if (!finding()) return;
    const off = keymap.bind("escape", closeFind, { when: "always" });
    cleanup(off);
  });
  // iPad 外接键盘：对齐 Mac 的几个常用快捷键（新笔记 / 设置 / 编辑↔阅读）。
  keymap.bind("mod+n", () => { if (!busy()) newNote(selectedFolder()); }, { when: "always" });
  keymap.bind("mod+b", () => toggleLibrary(), { when: "always" });
  keymap.bind("mod+,", () => show("settings"), { when: "always" });
  keymap.bind("mod+1", () => { if (lib.note()) { finding.set(false); previewSplit.set(false); editing.set(true); } }, { when: "always" });
  keymap.bind("mod+2", () => { if (lib.note() && wide()) { finding.set(false); previewSplit.set(true); editing.set(true); } }, { when: "always" });
  keymap.bind("mod+3", () => { if (lib.note()) { Keyboard.dismiss(); finding.set(false); previewSplit.set(false); editing.set(false); void lib.flush(); } }, { when: "always" });
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
  // 打开 App 时同步一次；之后只在用户下拉刷新或设置里「立即同步」时打云盘，
  // 使用和阅读过程中不再定时全量同步，避免反复弹网络错误。
  const syncFails = signal(0);
  const sync = async (manual = false) => {
    if (!props.connected || !await lib.flush()) return;
    await syncRuntime.syncNow();
    const failure = syncRuntime.error();
    syncFails.set(!failure || failure.kind !== "network" ? 0 : manual ? SYNC_ERROR_AFTER : syncFails() + 1);
    // 附件随同同步下载；bump 让阅读页重新检查图片文件是否已就位。
    lib.bump();
    await lib.reconcile();
  };
  const shownSyncError = (): SyncErrorView | null => {
    const failure = syncRuntime.error();
    if (!failure) return null;
    return failure.kind === "network" && syncFails() < SYNC_ERROR_AFTER ? null : failure;
  };
  let reconciling = false;
  const timer = setInterval(() => {
    if (busy() || reconciling || panel() !== null || syncRuntime.phase() === "paused") return;
    reconciling = true;
    const current = nav.routes()[nav.routes().length - 1];
    void (async () => {
      // 只刷新本地列表；云端改动等用户下拉刷新或设置里手动同步。
      await (current?.kind === "document" ? lib.reconcile() : lib.refresh());
    })().catch(err => lib.error.set(String(err))).finally(() => { reconciling = false; });
  }, 3000);
  cleanup(() => clearInterval(timer));
  // 首次绑定云盘时激活流程还占着 storageBusy，等它放开后再做启动同步。
  let launchSynced = false;
  effect(() => {
    if (!props.connected || launchSynced || storageBusy()) return;
    launchSynced = true;
    void sync().catch(err => lib.error.set(String(err)));
  });

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

  // 系统导航栏的右侧只放一个主操作：阅读时「编辑」，编辑时「完成」——
  // 和通讯录 / 提醒事项的详情页一样，右侧永远只有一个模式切换按钮。
  // 次要操作（重命名 / 复制 / 移动 / 导出 / 删除）挪到阅读页底部的 dock 里，
  // 不再和「编辑」挤进同一枚胶囊：两个自绘项会被系统合进同一枚玻璃胶囊，
  // 中间那段空白看起来像个被拉长的怪药丸。
  // 必须用系统的 headerRightSystemItem，不能用自绘按钮：iOS 27.0 真机上
  // 导航栏里的自绘按钮点了没反应（同样的点击在 iOS 26 模拟器上正常），
  // 系统项则由 nsh 直接派发到槽位里那个按钮，不依赖导航栏的命中测试。
  // 代价：系统项的文字跟设备语言走，app 内单独换语言时它会跟着设备而不是界面。
  const docToggle = () => {
    finding.set(false); findText.set(""); findHit.set(0);
    if (editing()) { Keyboard.dismiss(); editing.set(false); previewSplit.set(false); void lib.flush(); } else editing.set(true);
  };
  const docToolbar = () => <Button testID={editing() ? "mobile-read" : "mobile-edit"}
    accessibilityLabel={editing() ? t("common.done") : t("mobile.edit")} onPress={docToggle}
    style={{ width: 1, height: 1, opacity: 0 }}><Text> </Text></Button>;

  const moveFolders = () => [{ path: "", name: t("mobile.library") }, ...lib.entries().filter(entry => entry.isDir)];

  const libraryPage = () => <NavPageI testID="mobile-library-page"
    headerVisible={ios} title={ios ? (libraryTitleCollapsed() ? (tab() === "favorites" ? t("mobile.favorites") : t("mobile.library")) : "") : undefined}
    header={ios ? undefined : <LibraryNav connected={props.connected} statusVisible={!!syncStatus(syncRuntime.phase(), syncRuntime.progress(), shownSyncError())} onSettings={() => { Keyboard.dismiss(); show("settings"); }}
      onSync={() => { void sync(true).catch(err => lib.error.set(String(err))); }}
      onPause={() => syncRuntime.pauseSync()} onResume={() => syncRuntime.resumeSync()}
      onRetry={() => { void sync(true).catch(err => lib.error.set(String(err))); }} />}
    headerRight={ios ? <Button testID="mobile-new-note" accessibilityLabel={t("note.new")} disabled={busy()}
      onPress={() => newNote(selectedFolder())} style={{ width: 1, height: 1, opacity: 0 }}><Text> </Text></Button> : undefined}
    ios={ios ? { headerRightSystemItem: "compose" } : undefined}
    statusBar={{ foreground: mobileIsDark() ? "light" : "dark" }} style={{ backgroundColor: ios ? mobileColors().list : mobileColors().paper }}>
    <LibraryPage library={lib} connected={props.connected} busy={busy()} ios={ios} wide={wide()}
      selectedPath={() => lib.note()?.path ?? ""} favorites={() => favoriteSet()}
      onOpen={openNote} onRecycle={path => { void running(async () => { await lib.recyclePath(path); }); }}
      onSync={() => sync(true)} syncError={shownSyncError} onSettings={() => show("settings")} settingsOpen={() => panel() === "settings"} settingsTap={props.settingsTap}
      tab={tab} onTab={next => tab.set(next)} folder={selectedFolder} onFolder={path => selectedFolder.set(path)}
      onNewNote={newNote} onNewFolder={() => { selectedFolder.set(""); input.set(""); show("folder"); }}
      onTitleCollapsed={collapsed => libraryTitleCollapsed.set(collapsed)}
      error={errorBanner()} conflict={conflictBanner()} />
  </NavPageI>;

  /** 源码编辑面板；分屏时左右各占一半，留白收窄。 */
  const sourcePane = (compact: boolean) => <Input ref={(node) => { editor = node; selected = { start: 0, end: 0 }; }}
    testID="mobile-source" readonly={busy()} value={lib.note()?.content ?? ""} multiline autoCorrect={false} autoCapitalize="none"
    placeholder={t("mobile.writeHint")} onChange={lib.edit} onSelectionChange={range => { selected = range; }}
    ios={{ inputAccessoryViewID: "markdown-tools", keyboardAppearance: mobileIsDark() ? "dark" : "light" }}
    style={{ flex: 1, paddingTop: ios ? 14 : 66 + bottom().top, paddingHorizontal: compact ? 14 : 20, paddingBottom: 14, color: mobileColors().ink, backgroundColor: mobileColors().editor,
      fontSize: editorFontSize() + 2, lineHeight: Math.round((editorFontSize() + 2) * 1.7), letterSpacing: 0.1 }} />;

  /** 阅读面板；`dock` 为 false 时（分屏预览）不挂底部工具条。 */
  const previewPane = (compact: boolean, dock: boolean) => <View style={{ flex: 1 }}>
    <List ref={node => { reader = node; }} testID="mobile-preview" each={model().blocks} estimatedItemSize={model().estimatedItemSize}
      contentStyle={{ paddingHorizontal: compact ? 16 : 24, paddingTop: ios ? 10 : 70 + bottom().top, paddingBottom: dock ? 104 + bottom().bottom : 24 + bottom().bottom }} style={{ flex: 1, backgroundColor: mobileColors().preview }}>
      {(block, index) => {
        const stripped = stripImages(block());
        const root = lib.vault.root;
        const notePath = lib.note()?.path ?? "";
        // 订阅库版本：同步下载附件后重新判断文件是否就位。
        lib.generation();
        const exists = lib.vault.mtime
          ? (rel: string) => { try { lib.vault.mtime!(rel); return true; } catch { return false; } }
          : undefined;
        return <View style={{ paddingTop: previewGap(index() > 0 ? model().blocks[index() - 1] : undefined, block(), fontSize() / 15),
          backgroundColor: finding() && currentBlock() === index() ? mobileColors().accentSoft : "transparent" }}>
          <TextView document={{ blocks: [displayBlock(stripped.block, renderMode())] }} selectable links="open" onLinkPress={event => onLink(event.url)} styles={readerStyles()} />
          {stripped.images.map(image => {
            const rel = root && exists ? imageRelPath(image.src, notePath, exists) : null;
            if (root && exists && rel && !exists(rel)) return <ReaderImageNotice alt={image.alt} hint={t("mobile.imagePending")} testID="mobile-image-pending" />;
            const src = root ? resolveImageSrc(image.src, notePath, root, exists) : image.src;
            return <ReaderImage src={src} alt={image.alt} width={image.width} height={image.height} />;
          })}
        </View>;
      }}
    </List>
    {dock ? <ReaderDock content={lib.note()?.content ?? ""} bottom={bottom().bottom}
      onOutline={() => show("outline")} onType={() => show("type")} onFind={openFind}
      onSplit={ios && wide() ? () => { finding.set(false); previewSplit.set(true); editing.set(true); } : undefined}
      onToggleLibrary={ios && wide() ? toggleLibrary : undefined} sidebarOpen={!libraryCollapsed()}
      onActions={ios ? () => show("actions") : undefined} /> : null}
  </View>;

  // 分栏里的文档页没有返回键：左边列表常在，换笔记靠左边点选。
  const documentPage = (split: boolean) => <NavPageI testID="mobile-document-page" headerVisible={ios}
    title={ios ? docTitle() : undefined} headerBackVisible={ios && !split} headerTransparent={false}
    headerRight={ios ? docToolbar() : undefined}
    ios={ios ? { headerRightSystemItem: editing() ? "done" : "edit" } : undefined}
    popOnBack={ios && !split} popOnSwipe={ios && !split}
    onBackPress={() => { if (split) return; if (ios) { Keyboard.dismiss(); void lib.flush(); } else back(); }}
    onDismiss={() => { void running(async () => { await lib.flush(); await lib.refresh(); }); }}
    statusBar={{ foreground: mobileIsDark() ? "light" : "dark" }} style={{ backgroundColor: mobileColors().editor }}>
    <View style={{ flex: 1, paddingBottom: keyboardFrame().height }}>
      {!ios ? docNav() : null}
      {lib.recovered() ? <View testID="mobile-recovered" style={{ marginTop: ios ? 8 : 52 + bottom().top, padding: 12, backgroundColor: mobileColors().accentSoft }}><Text style={{ color: mobileColors().ink }}>{t("mobile.recovered")}</Text></View> : null}
      {conflictBanner()}
      {errorBanner()}
      {/* iPad 收起左栏后进入编辑，阅读页的底栏不见了；编辑态顶部留一条细栏，保证不用键盘也能把库叫回来。 */}
      {wide() && libraryCollapsed() && editing() ? <View style={{ height: 40, paddingHorizontal: 10, flexDirection: "row", alignItems: "center",
        borderBottomWidth: 0.5, borderBottomColor: mobileColors().thread, backgroundColor: mobileColors().editor }}>
        <Button testID="mobile-edit-show-library" accessibilityLabel={t("mobile.showLibrary")} onPress={toggleLibrary}
          style={{ height: 30, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 6, ...glassStyle(999) }}>
          <Icon name="sidebar" color={mobileColors().accent} size={15} />
          <Text style={{ fontSize: 13.5, color: mobileColors().accent }}>{t("mobile.showLibrary")}</Text>
        </Button>
      </View> : null}
      {editing() && wide() && previewSplit()
        ? <View testID="mobile-doc-split" style={{ flex: 1, flexDirection: "row" }}>
          <View style={{ flex: 1, borderRightWidth: 0.5, borderRightColor: mobileColors().thread }}>{sourcePane(true)}</View>
          <View style={{ flex: 1 }}>{previewPane(true, false)}</View>
        </View>
        : editing() ? sourcePane(false) : previewPane(false, true)}
      <InputAccessoryView nativeID="markdown-tools" style={{ backgroundColor: mobileColors().paper }}>
        <View style={{ paddingHorizontal: 12, paddingTop: 4, paddingBottom: 8 }}>
          <View style={{ height: 46, paddingHorizontal: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 2, ...glassStyle(16) }}>
            <FormatButton label="H1" accessibilityLabel={t("mobile.tool.heading")} onPress={() => insert("# ")} />
            <FormatButton label="B" accessibilityLabel={t("mobile.tool.bold")} onPress={() => insert("**", "**")} bold />
            <FormatButton icon="list-tree" accessibilityLabel={t("mobile.tool.list")} onPress={() => insert("- ")} />
            <FormatButton label="❞" accessibilityLabel={t("mobile.tool.quote")} onPress={() => insert("> ")} />
            <FormatButton icon="cloud" accessibilityLabel={t("mobile.tool.link")} onPress={() => insert("[", "](https://)")} />
            <FormatButton icon="code" accessibilityLabel={t("mobile.tool.code")} onPress={() => insert("`", "`")} />
            <FormatButton icon="magnifying-glass" accessibilityLabel={t("find.open")} onPress={openFind} />
            <FormatButton icon="caret-down" accessibilityLabel={t("common.done")} onPress={() => { Keyboard.dismiss(); void lib.flush(); }} />
          </View>
        </View>
      </InputAccessoryView>
      {finding() ? <MobileFindBar query={findText()} total={findHits().length}
        current={findHits().length ? findHit() : -1} onQuery={queryFind}
        onNext={() => goToHit(findHit() + 1)} onPrevious={() => goToHit(findHit() - 1)} onClose={closeFind} /> : null}
    </View>
  </NavPageI>;

  const emptyDetail = () => <View testID="mobile-empty-detail" style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: mobileColors().preview }}>
    <Icon name="file-text" color={mobileColors().ink3} size={40} />
    <Text style={{ fontSize: 15, color: mobileColors().ink3 }}>{t("mobile.selectNote")}</Text>
    {libraryCollapsed() ? <Button testID="mobile-show-library" accessibilityLabel={t("mobile.showLibrary")} onPress={toggleLibrary}
      style={{ marginTop: 4, height: 38, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 7, ...glassStyle(999) }}>
      <Icon name="sidebar" color={mobileColors().accent} size={17} />
      <Text style={{ fontSize: 15, color: mobileColors().accent }}>{t("mobile.showLibrary")}</Text>
    </Button> : null}
  </View>;
  const detailPane = () => <View testID="mobile-split-detail" style={{ flex: 1 }}>
    {lib.note() ? <NavStack state={detailNav} style={{ flex: 1 }}>{() => documentPage(wide())}</NavStack> : emptyDetail()}
  </View>;

  return <View style={{ flex: 1, backgroundColor: mobileColors().paper }}>
    {wide() && libraryCollapsed()
      ? detailPane()
      : wide()
      ? <View testID="mobile-split" style={{ flex: 1, flexDirection: "row" }}>
        <View testID="mobile-split-library" style={{ width: 340, borderRightWidth: 1, borderRightColor: mobileColors().thread }}>
          <NavStack state={nav} style={{ flex: 1 }}>{() => libraryPage()}</NavStack>
        </View>
        {detailPane()}
      </View>
      : <NavStack state={nav} testID="mobile-navigation" style={{ flex: 1 }}>
        {(route) => route.kind === "library" ? libraryPage() : documentPage(false)}
      </NavStack>}
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
            : panel() === "actions" ? t("mobile.actions") : panel() === "info" ? t("info.stats") : docTitle()}
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
              onStorage={() => show("storage")} onSync={() => { void running(() => sync(true)); }} onConflicts={() => show("cloudConflicts")} />
            : panel() === "storage" ? <View style={{ gap: 20 }}>
              {props.connected ? <SyncSettings cloudOnly mobile vaultRoot={activeStorage()?.root}
                onBeforeMigration={async () => { if (!await lib.flush()) throw new Error(t("mobile.saveFailed")); }}
                onStorageActivated={props.onStorageActivated} onSyncNow={() => { void running(() => sync(true)); }}
                onManageConflicts={() => show("cloudConflicts")} /> : null}
              <SectionTitle>{t("settings.sync")}</SectionTitle>
              <SettingsGroup>
                <SettingsRow icon="cloud" title={t("mobile.syncIncluded")} value={syncRuntime.connection()?.account ?? ""} last />
              </SettingsGroup>
            </View> : panel() === "move" ? <SettingsGroup>
              {moveFolders().map((folder, index) =>
                <PanelRow id={`mobile-move-to-${folder.path || "root"}`} icon="folder" accent title={folder.path || folder.name}
                  selected={selectedFolder() === folder.path}
                  disabled={busy()} last={index === moveFolders().length - 1}
                  onPress={() => { void running(async () => { if (await lib.move(folder.path)) closePanel(); }); }} />)}
            </SettingsGroup> : panel() === "trash" ? <View style={{ gap: 20 }}>
              {!lib.recycled().length ? <View style={{ paddingTop: 96, alignItems: "center", gap: 14 }}>
                <Icon name="clock" color={mobileColors().ink3} size={40} />
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
            </View> : panel() === "info" ? <View style={{ gap: 20 }}>
              <SettingsGroup>
                <InfoRow label={t("info.chars")} value={String(articleModel(lib.note()?.content ?? "").stats.chars)} />
                <InfoRow label={t("info.readingTime")} value={articleModel(lib.note()?.content ?? "").stats.readingMinutes
                  ? t("info.aboutMinutes", { n: articleModel(lib.note()?.content ?? "").stats.readingMinutes }) : t("info.minutes", { n: 0 })} />
                <InfoRow label={t("info.paragraphs")} value={String(articleModel(lib.note()?.content ?? "").stats.paragraphs)} />
                <InfoRow label={t("info.headings")} value={String(articleModel(lib.note()?.content ?? "").stats.headings)} last />
              </SettingsGroup>
              <SettingsGroup>
                <InfoRow label={t("info.created")} value={formatDateTime(lib.note()?.createdMs ?? 0, locale())} />
                <InfoRow label={t("info.modified")} value={formatDateTime(lib.note()?.mtimeMs ?? 0, locale())} />
                <InfoRow label={t("info.format")} value={noteFormat(lib.note()?.path ?? "")} />
                <InfoRow label={t("info.path")} value={lib.note()?.path ?? ""} last />
              </SettingsGroup>
            </View> : panel() === "actions" ? <View style={{ gap: 16 }}>
              <Text numberOfLines={1} style={{ paddingHorizontal: 4, fontSize: 13, color: mobileColors().ink3 }}>{lib.note()?.path}</Text>
              <SettingsGroup>
                <PanelRow id="mobile-rename" icon="pencil" title={t("rename.title")} onPress={() => { input.set(docTitle()); show("rename"); }} />
                <PanelRow id="mobile-duplicate" icon="file-text" title={t("context.duplicate")} disabled={busy()} onPress={() => { void running(async () => { if (await lib.copy(t("context.duplicateSuffix"))) closePanel(); }); }} />
                <PanelRow id="mobile-move" icon="folder" title={t("mobile.move")} disabled={busy()} onPress={() => { void running(async () => { await lib.refresh(); show("move"); }); }} />
                <PanelRow id="mobile-favorite" icon="star" accent={isFavorite(lib.note()?.path ?? "")} title={isFavorite(lib.note()?.path ?? "") ? t("mobile.favoriteRemove") : t("mobile.favoriteAdd")}
                  onPress={() => { if (lib.note()) toggleFavorite(lib.note()!.path); }} />
                <PanelRow id="mobile-info" icon="info" title={t("info.stats")} onPress={() => show("info")} />
                <PanelRow id="mobile-export" icon="cloud" title={t("mobile.export")} disabled={busy()} last onPress={exportFile} />
              </SettingsGroup>
              <SettingsGroup>
                <PanelRow id="mobile-recycle" icon="x" title={t("mobile.recycle")} destructive last disabled={busy()} onPress={() => { void running(async () => { if (await lib.recycle()) { await dismissPanel(); nav.pop(); } }); }} />
              </SettingsGroup>
              <Text style={{ textAlign: "center", fontSize: 13, color: mobileColors().ink3 }}>{t("info.chars")}: {articleModel(lib.note()?.content ?? "").stats.chars}</Text>
            </View> : null}
        </Scroll>
      </View>
    </Dialog>
  </View>;
}


const TABS = ["recent", "all", "favorites"] as const;
/** 设置是底栏第四个入口；它打开面板，不切换库页的 tab。 */
const SETTINGS_TAB = TABS.length;

/**
 * 系统的 UITabBar：Liquid Glass、SF Symbol 与安全区都由 UIKit 负责，
 * tab 的标题和图标按平台的叫法给它（iOS 是 SF Symbol 名）。
 */
function NativeTabBar(props: { tab: () => Tab; onTab: (next: Tab) => void; onReselect: () => void; settingsOpen: () => boolean; onSettings: () => void }) {
  const bottom = safeAreaInsets();
  const items = [
    { title: t("mobile.recent"), icon: "clock" },
    { title: t("mobile.all"), icon: "folder" },
    { title: t("mobile.favorites"), icon: "star" },
    { title: t("settings.title"), icon: "gearshape" },
  ];
  // 挂载时 selectedIndex 若是 0（默认值）UIKit 不会重绘选中态，第一项看起来没被选中；
  // 先给一个越过末尾的索引（无选中）再设回，逼系统重设选中项。
  const settled = signal(false);
  effect(() => {
    const timer = setTimeout(() => settled.set(true), 0);
    return () => clearTimeout(timer);
  });
  const selected = () => props.settingsOpen() ? SETTINGS_TAB : TABS.indexOf(props.tab());
  // 高度必须显式给。把高度交给系统时，iOS 27.0 真机上底栏只画选中项的文字，
  // 其余标签缺失（3 项时稳定复现；4 项只是碰巧正常，不可依赖）。
  // 49 + 安全区就是系统底栏的高度，显式给它之后 3 项 / 4 项都正常。
  // 验证：2026-11-01 iPhone 16 Pro Max / iOS 27.0，build 13 与 dev 签名对照包截图。
  return <TabBar
    testID="mobile-tabbar"
    style={{ height: 49 + bottom().bottom, backgroundColor: mobileColors().list }}
    items={items}
    selectedIndex={settled() ? selected() : items.length}
    onChange={index => {
      Keyboard.dismiss();
      if (index === SETTINGS_TAB) { props.onSettings(); return; }
      const next = TABS[index];
      if (!next) return;
      // 再点一次当前 tab 走系统的「回到顶部」，否则这一下看起来像是没反应。
      if (next === props.tab()) { props.onReselect(); return; }
      props.onTab(next);
    }} />;
}


function LibraryPage(props: {
  library: MobileLibrary;
  connected: boolean;
  busy: boolean;
  ios: boolean;
  /** 分栏（iPad）：底栏换成列表上方的分段 tab，设置挪到同一行的齿轮。 */
  wide: boolean;
  /** 分栏里右栏正在看的笔记，列表里高亮它。 */
  selectedPath: () => string;
  /** 收藏的路径集合：收藏 Tab 按它过滤。 */
  favorites: () => Readonly<Record<string, boolean>>;
  onOpen: (path: string) => void;
  /** 左滑删除：把任意一篇笔记移进最近删除。 */
  onRecycle: (path: string) => void;
  onSync: () => Promise<void>;
  /** 要显示在同步 accessory 里的错误：自动同步的偶发网络失败会被压掉。 */
  syncError: () => SyncErrorView | null;
  onSettings: () => void;
  settingsOpen: () => boolean;
  settingsTap?: boolean;
  tab: () => Tab;
  onTab: (next: Tab) => void;
  folder: () => string;
  onFolder: (path: string) => void;
  onNewNote: (folder: string) => void;
  onNewFolder: () => void;
  onTitleCollapsed: (collapsed: boolean) => void;
  error?: JSX.Element;
  conflict?: JSX.Element;
}) {
  const lib = props.library;
  const c = mobileColors();
  const bottom = safeAreaInsets();
  const query = signal("");
  // 底栏再点当前 tab 时滚回列表顶部（系统的 reselect 行为）。
  let listScroll: { scrollTo(options: { y?: number; animated?: boolean }): void } | null = null;
  const expanded = signal<Set<string>>(new Set());
  const pulling = signal(false);
  const titleCollapsed = signal(false);
  const search = librarySearch(() => lib.vault, query, lib.entries);
  // 缓存派生列表：切 tab 时列表会整体重绘，tree() 又在每行里被调用，
  // 缓存后大库不会因为反复排序 / 平铺而卡顿。
  const allNotes = computed(() => lib.entries().filter(e => !e.isDir && /\.(md|markdown)$/i.test(e.name))
    .map(e => ({ path: e.path, title: titleFromName(e.name.normalize("NFC")), mtimeMs: e.mtimeMs }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs || a.path.localeCompare(b.path)));
  const favoriteNotes = computed(() => allNotes().filter(note => props.favorites()[note.path]));
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
  const tree = computed(() => flattenTree(lib.entries(), expanded()));
  // 同一时间只滑开一行；点别的行或再点自己都会收回去。
  const swipeOpen = signal("");
  const swipe = { open: () => swipeOpen(), setOpen: (path: string) => swipeOpen.set(path), close: () => swipeOpen.set(""), onRecycle: props.onRecycle };
  const toggleFolder = (path: string) => {
    props.onFolder(props.folder() === path ? "" : path);
    expanded.update(current => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  };
  // 全部 Tab 的文件行同样能左滑删除（文件夹行不参与）。
  const treeNote = (row: ReturnType<typeof tree>[number]) => {
    const button = () => <Button testID={`mobile-note-${row.path}`} disabled={props.busy}
      onPress={() => {
        Keyboard.dismiss();
        if (swipe.open() === row.path) { swipe.close(); return; }
        swipe.close();
        props.onOpen(row.path);
      }}
      style={{ minHeight: props.ios ? 48 : 40, paddingHorizontal: props.ios ? 16 : undefined, paddingLeft: row.depth * 18 + (props.ios ? 16 : 0), paddingRight: 16, flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: row.path === props.selectedPath() ? c.accentSoft : props.ios ? c.list : "transparent", borderBottomWidth: props.ios ? 0 : 0.5, borderBottomColor: c.thread }}>
      <View style={{ width: 22, height: 22 }} />
      <View style={{ width: 26, height: 26, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: c.searchBg }}>
        <Icon name="file-text" color={c.ink2} size={14} />
      </View>
      <Text numberOfLines={1} style={{ flex: 1, fontFamily: props.ios ? undefined : "monospace", fontSize: props.ios ? 17 : 13, fontWeight: 400, color: c.ink }}>{props.ios ? row.title : row.name}</Text>
      <Text style={{ fontSize: props.ios ? 15 : 11.5, color: c.ink3 }}>{formatWhen(row.mtimeMs, locale())}</Text>
    </Button>;
    return platform.os === "ios" && swipe
      ? <SwipeRow path={row.path} selected={row.path === props.selectedPath()} swipe={swipe} render={button} />
      : button();
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
  const statusVisible = () => !pulling() && !!syncStatus(syncRuntime.phase(), syncRuntime.progress(), props.syncError());
  const snippets = signal<Record<string, string>>({});
  const loadingSnippets = new Set<string>();
  const snippetFor = (path: string) => snippets()[path] ?? "";
  effect(() => {
    const notes = q() ? results() : allNotes().slice(0, 40);
    for (const note of notes) {
      if (note.path in snippets() || loadingSnippets.has(note.path)) continue;
      loadingSnippets.add(note.path);
      void Promise.resolve(lib.vault.read(note.path))
        .then(file => snippets.update(current => ({ ...current, [note.path]: noteSnippet(file.content) })))
        .catch(() => {})
        .finally(() => loadingSnippets.delete(note.path));
    }
  });
  const libraryTitle = () => props.tab() === "favorites" ? t("mobile.favorites") : t("mobile.library");
  const librarySubtitle = () => props.tab() === "all" && props.connected
    ? `${t(providerLabelKey(syncRuntime.connection()?.provider ?? "google"))} · ${syncRuntime.connection()?.remoteName || "StoatMD"}`
    : "";
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

  return <View style={{ flex: 1, backgroundColor: props.ios ? c.list : c.paper }}>
    <View style={{ flex: 1 }}>
      <Scroll ref={node => { listScroll = node; }} testID="mobile-library-list" style={{ flex: 1, backgroundColor: props.ios ? c.list : undefined }} onRefresh={refresh} refreshing={pulling()}
        onScroll={event => {
          const collapsed = event.offset.y > 40;
          if (collapsed === titleCollapsed()) return;
          titleCollapsed.set(collapsed);
          props.onTitleCollapsed(collapsed);
        }}
        refreshIndicator={{ height: 52 }} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled"
        contentStyle={{ paddingTop: props.ios ? 6 : (statusVisible() ? 100 : 58) + bottom().top, paddingHorizontal: props.ios ? 0 : 16, paddingBottom: props.wide ? 24 : props.ios ? 88 : 108 + bottom().bottom }}>
        {!props.ios && notPulling() ? <PullIndicator percent={percent()} /> : null}
        {props.ios ? <View style={{ paddingHorizontal: 16 }}>
          <Text style={{ fontSize: 34, fontWeight: 700, letterSpacing: 0.2, lineHeight: 41, color: c.ink }}>{libraryTitle()}</Text>
          {librarySubtitle() ? <Text numberOfLines={1} style={{ marginTop: 1, fontSize: 13, color: c.ink3 }}>{librarySubtitle()}</Text> : null}
          <View style={{ marginTop: 12 }}>{searchField()}</View>
          {/* 原生 UITabBar 的项不在 nsh 的视图树里，测试点不到底栏的「设置」；只有截图 harness 打开这块透明点击区。 */}
          {props.settingsTap ? <Button testID="mobile-settings" accessibilityLabel={t("settings.title")} onPress={props.onSettings}
            style={{ position: "absolute", top: 0, right: 0, width: 44, height: 44 }}><Text> </Text></Button> : null}
        </View> : null}
        {props.ios && statusVisible() ? <View style={{ marginHorizontal: 16, marginBottom: 8 }}><SyncAccessory error={props.syncError()} onPause={() => syncRuntime.pauseSync()} onResume={() => syncRuntime.resumeSync()}
          onRetry={() => { void props.onSync().catch(err => lib.error.set(String(err))); }} /></View> : null}
        {q() ? <Text testID="mobile-search-meta" style={{ paddingHorizontal: props.ios ? 16 : 4, paddingTop: props.ios ? 4 : 0, paddingBottom: props.ios ? 6 : 4, fontSize: 12, fontWeight: 500, color: c.ink3 }}>{t("mobile.searchResult", { n: results().length })}</Text> : null}
        {props.ios && !props.wide ? null : <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2, borderBottomWidth: 0.5, borderBottomColor: c.thread, paddingHorizontal: props.wide ? 16 : 2 }}>
          {([["recent", "mobile.recent"], ["all", "mobile.all"], ["favorites", "mobile.favorites"]] as const).map(([id, key]) => {
            // 必须是函数：在 render 里算成常量会在切换 tab 后一直停在旧值。
            const active = () => props.tab() === id;
            return <Button testID={`mobile-tab-${id}`} onPress={() => { Keyboard.dismiss(); props.onTab(id); }}
              style={{ height: 36, paddingHorizontal: 11, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 13, fontWeight: active() ? 600 : 500, letterSpacing: -0.2, color: active() ? c.ink : c.ink3 }}>{t(key)}</Text>
              {active() ? <View style={{ position: "absolute", left: 8, right: 8, bottom: 0, height: 2, borderTopLeftRadius: 2, borderTopRightRadius: 2, backgroundColor: c.accent }} /> : null}
            </Button>;
          })}
          {/* 分栏没有底栏，设置入口放在这里。 */}
          {props.wide ? <Button testID="mobile-settings" accessibilityLabel={t("settings.title")} onPress={() => { Keyboard.dismiss(); props.onSettings(); }}
            style={{ marginLeft: "auto", width: 40, height: 36, alignItems: "center", justifyContent: "center" }}>
            <Icon name="gear" color={c.accent} size={19} />
          </Button> : null}
        </View>}
      {props.error}
      {props.conflict}

      {q() ? <View>
        <View>
          {results().map((note, index) => noteRow(note, snippetFor(note.path), props.onOpen, props.ios, index === results().length - 1, props.wide && note.path === props.selectedPath(), swipe))}
        </View>
        {!results().length && !search.pending() ? <Text style={{ paddingVertical: 40, textAlign: "center", color: c.ink3, fontSize: 15 }}>{t("search.empty")}</Text> : null}
        {search.pending() ? <Text style={{ paddingVertical: 20, textAlign: "center", color: c.ink3 }}>{t("mobile.searching")}</Text> : null}
      </View> : props.tab() === "recent" ? <View>
        <View style={{ paddingTop: props.ios ? 6 : 16, paddingBottom: 6, paddingHorizontal: props.ios ? 16 : 0 }}>
          <Text style={{ fontSize: 13, fontWeight: 400, color: c.ink2 }}>{t("mobile.recentGroup")}</Text>
        </View>
        <View>
          {allNotes().slice(0, 40).map((note, index) => noteRow(note, snippetFor(note.path), props.onOpen, props.ios, index === Math.min(allNotes().length, 40) - 1, props.wide && note.path === props.selectedPath(), swipe))}
        </View>
        {!allNotes().length ? emptyNotes() : null}
      </View> : props.tab() === "all" ? <View style={{ paddingTop: props.ios ? 2 : 6 }}>
        {props.ios ? null : <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4, paddingBottom: 6 }}>
          <Text style={{ fontSize: 12.5, fontWeight: 500, color: c.ink2 }}>{props.connected ? t(providerLabelKey(syncRuntime.connection()?.provider ?? "google")) : t("mobile.library")}</Text>
          <Text style={{ color: c.ink3, opacity: 0.7 }}>/</Text>
          <Text style={{ fontSize: 12.5, fontWeight: 600, color: c.ink }}>{syncRuntime.connection()?.remoteName || "StoatMD"}</Text>
        </View>}
        <View>
        {tree().map((row, index) => <View>
        {row.kind === "folder" ? <Button testID={`mobile-folder-${row.path}`} disabled={props.busy}
          onPress={() => { Keyboard.dismiss(); toggleFolder(row.path); }}
          style={{ minHeight: props.ios ? 48 : 40, paddingHorizontal: props.ios ? 16 : undefined, paddingLeft: row.depth * 18 + (props.ios ? 16 : 0), paddingRight: 16, flexDirection: "row", alignItems: "center", gap: 8,
            backgroundColor: props.ios ? c.list : "transparent", borderBottomWidth: props.ios ? 0 : 0.5, borderBottomColor: c.thread }}>
          <View style={{ width: 22, height: 22, alignItems: "center", justifyContent: "center" }}>
            <Icon name={row.expanded ? "caret-down" : "caret-right"} color={c.ink3} size={14} />
          </View>
          <View style={{ width: 26, height: 26, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: c.accentSoft }}>
            <Icon name="folder" color={c.accent} size={14} />
          </View>
          <Text numberOfLines={1} style={{ flex: 1, fontSize: props.ios ? 17 : 16, fontWeight: props.ios ? 400 : 500, letterSpacing: 0, color: c.ink }}>{row.name}</Text>
          <Text style={{ fontSize: 15, color: c.ink3 }}>{row.count}</Text>
        </Button> : treeNote(row)}
        {props.ios && index < tree().length - 1 ? <RowDivider inset={16 + row.depth * 18 + 56} /> : null}
        </View>)}
        </View>
        {props.ios ? <RowDivider inset={16} /> : null}
        {props.ios ? <Button testID="mobile-new-folder" accessibilityLabel={t("mobile.newFolder")} disabled={props.busy} onPress={props.onNewFolder}
          style={{ minHeight: 46, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10,
            backgroundColor: c.list, opacity: props.busy ? 0.45 : 1 }}>
          <Icon name="folder-plus" color={c.accent} size={18} />
          <Text style={{ fontSize: 17, color: c.accent }}>{t("mobile.newFolder")}</Text>
        </Button> : null}
      </View> : <View>
        {favoriteNotes().length ? <View>
          <View style={{ paddingTop: props.ios ? 6 : 16, paddingBottom: 6, paddingHorizontal: props.ios ? 16 : 0 }}>
            <Text style={{ fontSize: 13, fontWeight: 400, color: c.ink2 }}>{t("mobile.favorites")}</Text>
          </View>
          {favoriteNotes().map((note, index, list) =>
            noteRow(note, snippetFor(note.path), props.onOpen, props.ios, index === list.length - 1, props.wide && note.path === props.selectedPath(), swipe))}
        </View> : <View testID="mobile-favorites-empty" style={{ minHeight: 260, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 28, paddingVertical: 24 }}>
          <Icon name="star" color={c.ink3} size={40} />
          <Text style={{ marginTop: 6, fontSize: 17, fontWeight: 600, letterSpacing: -0.35, color: c.ink }}>{t("mobile.favoritesEmpty")}</Text>
          <Text style={{ maxWidth: 260, textAlign: "center", fontSize: 13.5, lineHeight: 20, fontWeight: 500, color: c.ink2 }}>{t("mobile.favoritesEmptyHint")}</Text>
        </View>}
      </View>}
    </Scroll>

    </View>

    {props.ios && !props.wide ? <NativeTabBar tab={props.tab} onTab={props.onTab} settingsOpen={props.settingsOpen} onSettings={props.onSettings}
      onReselect={() => listScroll?.scrollTo({ y: 0, animated: true })} /> : null}

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

type SwipeState = { open: () => string; setOpen: (path: string) => void; close: () => void; onRecycle: (path: string) => void };

/**
 * iOS 的列表滑动删除：nsh 没有 `trailingSwipeActions`，但 `pan` 会在
 * 主线程把横向拖动喂给动画值，`panActivation` 又保证纵向仍然交给滚动视图。
 * 内容左滑超过 64pt 后停住，露出右侧 88pt 的删除按钮；一次只开一行。
 */
function SwipeRow(props: { path: string; selected: boolean; swipe: SwipeState; render: () => JSX.Element }) {
  const c = mobileColors();
  const drag = createAnimatedValue(0);
  const open = () => props.swipe.open() === props.path;
  // 别的行被滑开时，这一行自动收回去。
  effect(() => { if (!open()) void drag.timing(0, { duration: 160 }); });
  const settle = (event: { valueX?: number }) => {
    if ((event.valueX ?? 0) <= -64) {
      // 先把这一行标成滑开（渲染出删除按钮），再把内容收拢到按钮宽度。
      props.swipe.setOpen(props.path);
      void drag.timing(-88, { duration: 160 });
    } else {
      void drag.timing(0, { duration: 160 });
    }
  };
  return <View style={{ overflow: "hidden" }}>
    {open() ? <Button testID={`mobile-swipe-delete-${props.path}`} accessibilityLabel={t("mobile.recycle")}
      onPress={() => { props.swipe.close(); props.swipe.onRecycle(props.path); }}
      style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 88, alignItems: "center", justifyContent: "center", gap: 4,
        backgroundColor: mobileIsDark() ? "#FF453A" : "#FF3B30" }}>
      <Icon name="trash" color="#FFFFFF" size={19} />
      <Text style={{ fontSize: 12, fontWeight: 500, color: "#FFFFFF" }}>{t("mobile.recycle")}</Text>
    </Button> : null}
    <View
      style={{ transform: [{ translateX: drag }], backgroundColor: props.selected ? c.accentSoft : c.list }}
      {...(open() ? {} : {
        // 手势要挂在外层容器，不能挂在 Button 自己身上：nsh 的 pan 在按钮节点上不触发，
        // 放在父 View 上时子按钮的 press 仍然正常（实测见 PanProbe）。
        pan: { x: drag },
        panActivation: { activeOffsetX: 10, failOffsetY: 10 },
        onPanEnd: settle,
      })}>
      {props.render()}
    </View>
  </View>;
}

function noteRow(note: { path: string; title: string; mtimeMs: number }, snippet: string, onOpen: (path: string) => void, ios = false, last = false, selected = false, swipe?: SwipeState) {
  const c = mobileColors();
  const folder = note.path.includes("/") ? note.path.split("/").slice(0, -1).join(" / ") : "";
  const secondary = snippet || folder;
  const row = () => <Button testID={`mobile-note-${note.path}`} onPress={() => {
      Keyboard.dismiss();
      if (swipe && swipe.open() === note.path) { swipe.close(); return; }
      if (swipe) swipe.close();
      onOpen(note.path);
    }}
    style={{ minHeight: ios ? 64 : 58, paddingVertical: 10, paddingHorizontal: ios ? 16 : 4, gap: 3,
      backgroundColor: selected ? c.accentSoft : ios ? c.list : "transparent", borderBottomWidth: ios ? 0 : 0.5, borderBottomColor: c.thread }}>
    <Text numberOfLines={1} style={{ fontSize: ios ? 17 : 16, fontWeight: ios ? 600 : 590, letterSpacing: ios ? -0.2 : -0.25, color: c.ink }}>{note.title}</Text>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Text numberOfLines={1} style={{ flex: 1, fontSize: ios ? 15 : 12, color: c.ink2 }}>{secondary}</Text>
      <Text style={{ fontSize: ios ? 15 : 11, color: c.ink3 }}>{formatWhen(note.mtimeMs, locale())}</Text>
    </View>
  </Button>;
  return <View>
    {/* 滑动删除是 iOS 的列表行为，和是否用原生底栏无关。 */}
    {platform.os === "ios" && swipe ? <SwipeRow path={note.path} selected={selected} swipe={swipe} render={row} /> : row()}
    {ios && !last ? <RowDivider inset={16} /> : null}
  </View>;
}

function emptyNotes() {
  const c = mobileColors();
  return <View style={{ paddingVertical: 60, gap: 14, alignItems: "center" }}>
    <Icon name="notebook" color={c.accent} size={38} />
    <Text style={{ color: c.ink, fontSize: 20 }}>{t("note.empty")}</Text>
    <Text style={{ color: c.ink3, textAlign: "center", fontSize: 15 }}>{t("mobile.emptyHint")}</Text>
  </View>;
}

/** 信息面板的一行：左标签右值，和 iOS 分组表格一致。 */
function InfoRow(props: { label: string; value: string; last?: boolean }) {
  const c = mobileColors();
  return <View>
    <View style={{ minHeight: 44, paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.list }}>
      <Text style={{ flexShrink: 0, fontSize: 17, color: c.ink }}>{props.label}</Text>
      <Text numberOfLines={2} style={{ flex: 1, textAlign: "right", fontSize: 15, color: c.ink2 }}>{props.value}</Text>
    </View>
    {props.last ? null : <RowDivider inset={16} />}
  </View>;
}

function ReaderDock(props: { content: string; bottom: number; onOutline: () => void; onType: () => void; onFind?: () => void; onSplit?: () => void; onToggleLibrary?: () => void; sidebarOpen?: boolean; onActions?: () => void }) {
  const c = mobileColors();
  const words = () => articleModel(props.content).stats.chars;
  return <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0,
    paddingBottom: Math.max(8, props.bottom - 10), alignItems: "center" }}>
    <View style={{ height: 52, paddingHorizontal: 6, flexDirection: "row", alignItems: "center", gap: 2, ...glassStyle(26) }}>
      <Button testID="mobile-outline" accessibilityLabel={t("inspector.outline")} onPress={props.onOutline}
        style={{ width: 48, height: 44, alignItems: "center", justifyContent: "center" }}>
        <Icon name="list-tree" color={c.accent} size={20} />
      </Button>
      <Text testID="mobile-word-count" style={{ minWidth: 78, textAlign: "center", fontSize: 13, fontWeight: 400, color: c.ink3 }}>{t("mobile.words", { n: words() })}</Text>
      {props.onFind ? <Button testID="mobile-find-open" accessibilityLabel={t("find.open")} onPress={props.onFind}
        style={{ width: 48, height: 44, alignItems: "center", justifyContent: "center" }}>
        <Icon name="magnifying-glass" color={c.accent} size={20} />
      </Button> : null}
      <Button testID="mobile-type" accessibilityLabel={t("settings.font.size")} onPress={props.onType}
        style={{ width: 48, height: 44, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: 600, color: c.accent }}>Aa</Text>
      </Button>
      {props.onSplit ? <Button testID="mobile-split-preview" accessibilityLabel={t("mode.split")} onPress={props.onSplit}
        style={{ width: 48, height: 44, alignItems: "center", justifyContent: "center" }}>
        <Icon name="split" color={c.accent} size={20} />
      </Button> : null}
      {/* iPad：收起 / 展开左边笔记库，和 Mac 的 ⌘B 一样。 */}
      {props.onToggleLibrary ? <Button testID="mobile-toggle-library" accessibilityLabel={t(props.sidebarOpen ? "mobile.hideLibrary" : "mobile.showLibrary")}
        onPress={props.onToggleLibrary} style={{ width: 48, height: 44, alignItems: "center", justifyContent: "center" }}>
        <Icon name="sidebar" color={props.sidebarOpen ? c.accent : c.ink3} size={20} />
      </Button> : null}
      {/* iOS 的导航栏右侧让给了「编辑 / 完成」，笔记的次要操作（重命名、复制、移动、
          导出、删除）落在这里，跟 Apple Notes 一样把文稿操作放在底部工具条上。 */}
      {props.onActions ? <Button testID="mobile-actions" accessibilityLabel={t("mobile.actions")} onPress={props.onActions}
        style={{ width: 48, height: 44, alignItems: "center", justifyContent: "center" }}>
        <Icon name="more" color={c.accent} size={20} />
      </Button> : null}
    </View>
  </View>;
}

/** 阅读视图的查找条：浮在正文顶部，不挡导航栏。 */
function MobileFindBar(props: { query: string; total: number; current: number; onQuery: (query: string) => void; onNext: () => void; onPrevious: () => void; onClose: () => void }) {
  const c = mobileColors();
  const step = (id: string, label: string, text: string, onPress: () => void) =>
    <Button testID={id} accessibilityLabel={label} disabled={props.total === 0} onPress={onPress}
      style={{ width: 36, height: 40, alignItems: "center", justifyContent: "center", opacity: props.total === 0 ? 0.35 : 1 }}>
      <Text style={{ fontSize: 17, color: c.accent }}>{text}</Text>
    </Button>;
  return <View testID="mobile-find" style={{ position: "absolute", top: 8, left: 10, right: 10, height: 48, paddingLeft: 12, paddingRight: 2,
    flexDirection: "row", alignItems: "center", gap: 2, ...glassStyle(14), zIndex: 10 }}>
    <Icon name="magnifying-glass" color={c.ink3} size={16} />
    <Input testID="mobile-find-input" accessibilityLabel={t("find.placeholder")} placeholder={t("find.placeholder")}
      value={props.query} onChange={props.onQuery} autoFocus autoCorrect={false} autoCapitalize="none"
      returnKeyType="search" onSubmit={props.onNext}
      style={{ flex: 1, minWidth: 0, height: 36, fontSize: 15, color: c.ink, backgroundColor: "transparent" }} />
    <Text testID="mobile-find-count" numberOfLines={1} style={{ flexShrink: 0, fontSize: 12.5, color: c.ink3 }}>
      {props.query ? (props.total ? t("find.count", { current: props.current + 1, total: props.total }) : t("find.noResults")) : ""}
    </Text>
    {step("mobile-find-previous", t("find.previous"), "↑", props.onPrevious)}
    {step("mobile-find-next", t("find.next"), "↓", props.onNext)}
    <Button testID="mobile-find-close" accessibilityLabel={t("find.close")} onPress={props.onClose}
      style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
      <Icon name="x" color={c.ink2} size={15} />
    </Button>
  </View>;
}

/** 阅读页与 Mac 预览共用同一套文稿配色：彩色模式下标题、引用、代码、链接都跟随强调色。 */
function readerStyles() {
  return previewTextStyles(mobileColors());
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
  // 字号 +1/+1，行高 +0.05：与 Mac 的设置项和步长保持一致。
  const rows = [
    { id: "reading", title: "settings.font.reading", value: fontSize, set: applyFontSize, min: 12, max: 24, step: 1, show: (n: number) => String(n) },
    { id: "editor", title: "settings.font.editorSize", value: editorFontSize, set: applyEditorFontSize, min: 12, max: 24, step: 1, show: (n: number) => String(n) },
    { id: "line", title: "settings.font.lineHeight", value: fontLineHeight, set: applyFontLineHeight, min: LINE_HEIGHT_MIN, max: LINE_HEIGHT_MAX, step: LINE_HEIGHT_STEP, show: (n: number) => n.toFixed(2) },
  ];
  return <View>
    {rows.map((item, index) => <View>
      <SectionTitle top={index === 0 ? 2 : 24}>{t(item.title)}</SectionTitle>
      <SettingsGroup>
        <View style={{ height: 48, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", backgroundColor: c.list }}>
          <Button testID={`${item.title}-decrease`} accessibilityLabel={t("settings.font.decrease")} disabled={item.value() <= item.min + 0.001} onPress={() => item.set(item.value() - item.step)}
            style={{ width: 52, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: c.paper, opacity: item.value() <= item.min + 0.001 ? 0.35 : 1 }}>
            <Text style={{ fontSize: 17, fontWeight: 500, color: c.accent }}>−</Text>
          </Button>
          <Text style={{ flex: 1, textAlign: "center", fontSize: 19, fontWeight: 500, color: c.ink }}>{item.show(item.value())}</Text>
          <Button testID={`${item.title}-increase`} accessibilityLabel={t("settings.font.increase")} disabled={item.value() >= item.max - 0.001} onPress={() => item.set(item.value() + item.step)}
            style={{ width: 52, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: c.paper, opacity: item.value() >= item.max - 0.001 ? 0.35 : 1 }}>
            <Text style={{ fontSize: 19, fontWeight: 500, color: c.accent }}>+</Text>
          </Button>
        </View>
      </SettingsGroup>
    </View>)}
    <View style={{ marginTop: 24, paddingHorizontal: 4 }}>
      <Text numberOfLines={3} style={{ width: "100%", fontSize: fontSize(), lineHeight: lineHeightPx(), color: c.ink2 }}>
        {t("mobile.typeSample")}
      </Text>
    </View>
  </View>;
}

/** nsh 无主题预览组件，沿用自绘色板缩略图；两列布局用 iOS 截图测试验证。 */
function ThemeCard(props: { theme: MobileTheme }) {
  const theme = props.theme;
  // 同 tab：写成函数，切主题时选中边框和勾才会跟着走。
  const active = () => mobileThemeId() === theme.id;
  return <Button testID={`mobile-theme-${theme.id}`} accessibilityLabel={theme.name} onPress={() => applyTheme(theme.id)}
    style={{ flex: 1, minWidth: 0, borderRadius: 12, borderCurve: "continuous", overflow: "hidden",
      borderWidth: 2, borderColor: active() ? theme.palette.accent : theme.palette.thread }}>
    <View style={{ height: 64, flexDirection: "row", backgroundColor: theme.palette.editor }}>
      <View style={{ width: 28, backgroundColor: theme.palette.sidebar, padding: 5, gap: 5 }}>
        <View style={{ height: 5, borderRadius: 2, backgroundColor: theme.palette.accent }} />
        <View style={{ height: 3, borderRadius: 2, backgroundColor: theme.palette.ink3, opacity: 0.5 }} />
      </View>
      <View style={{ flex: 1, padding: 10, gap: 6 }}>
        <View style={{ alignSelf: "flex-start", width: "56%", height: 7, borderRadius: 3, backgroundColor: theme.art.ink, opacity: 0.85 }} />
        <View style={{ width: "84%", height: 5, borderRadius: 2.5, backgroundColor: theme.art.muted, opacity: 0.65 }} />
        <View style={{ width: "66%", height: 5, borderRadius: 2.5, backgroundColor: theme.art.muted, opacity: 0.45 }} />
      </View>
    </View>
    <View style={{ paddingHorizontal: 8, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: theme.palette.list }}>
      <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, fontWeight: 500, letterSpacing: -0.1, color: theme.palette.ink }}>{theme.name}</Text>
      {active() ? <Icon name="check" color={theme.palette.accent} size={13} /> : null}
    </View>
  </Button>;
}

/** 每组两列，明暗分组各自排版。 */
function themeRows(mode: "light" | "dark"): MobileTheme[][] {
  const themes = MOBILE_THEMES.filter(theme => theme.mode === mode);
  const rows: MobileTheme[][] = [];
  for (let index = 0; index < themes.length; index += 2) rows.push(themes.slice(index, index + 2));
  return rows;
}

function MobileSettings(props: { connected: boolean; onImport: () => void; onTrash: () => void; onStorage: () => void; onSync: () => void; onConflicts: () => void }) {
  const c = mobileColors();
  const themesOpen = signal(false);
  const iconsOpen = signal(false);
  const currentTheme = () => MOBILE_THEMES.find(theme => theme.id === mobileThemeId())!.name;
  const currentLogo = () => APP_LOGOS.find(logo => logo.id === appLogo())!;
  const connection = () => syncRuntime.connection();
  // 设置页也要给「立即同步」反馈：同步中显示进度，失败显示可读原因，
  // 否则按钮点了看不出反应，像是坏的。
  const syncState = () => syncStatus(syncRuntime.phase(), syncRuntime.progress(), syncRuntime.error());
  const syncDetail = () => {
    const state = syncState();
    if (state?.kind === "progress") return t(state.key, state.params);
    if (state?.kind === "paused") return t(state.key, state.params);
    if (state?.kind === "error") return t(state.key);
    return `${t("sync.synced")} · ${formatSyncMoment(syncRuntime.lastSyncAt())}`;
  };
  return <View>
    <SectionTitle top={2}>{t("settings.appearance")}</SectionTitle>
    <SettingsGroup>
      <SettingsRow id="mobile-theme-toggle" title={t("settings.theme")} value={currentTheme()} onPress={() => themesOpen.set(!themesOpen())} />
      {themesOpen() ? <View testID="mobile-themes" style={{ paddingHorizontal: 12, paddingBottom: 16, gap: 10 }}>
        {(["light", "dark"] as const).map(mode => <View style={{ gap: 8 }}>
          <Text style={{ paddingTop: 8, fontSize: 13, fontWeight: 600, color: c.ink2 }}>{t(`settings.theme.${mode}`)}</Text>
          {themeRows(mode).map(row => <View style={{ flexDirection: "row", gap: 8 }}>
            {row.map(theme => <ThemeCard theme={theme} />)}
            {row.length < 2 ? <View style={{ flex: 1 }} /> : null}
          </View>)}
        </View>)}
      </View> : null}
      <SettingsRow id="mobile-icon-toggle" title={t("settings.logo")} value={t(currentLogo().nameKey)} last={!iconsOpen()} onPress={() => iconsOpen.set(!iconsOpen())} />
      {iconsOpen() ? <View testID="mobile-icons" style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}>
        {APP_LOGOS.map(logo => <Button testID={`mobile-icon-${logo.id}`} accessibilityLabel={t(logo.nameKey)} disabled={appLogoBusy()}
          onPress={() => { void selectMobileAppLogo(logo.id); }}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, opacity: appLogoBusy() ? 0.5 : 1 }}>
          <Image src={logoAsset(logo)} style={{ width: 52, height: 52, borderRadius: 12, borderCurve: "continuous" }} />
          <Text style={{ flex: 1, fontSize: 16, color: c.ink }}>{t(logo.nameKey)}</Text>
          {appLogo() === logo.id ? <Icon name="check" color={c.accent} size={18} /> : null}
        </Button>)}
        <Text style={{ fontSize: 12, lineHeight: 17, color: c.ink3 }}>{t("mobile.iconHint")}</Text>
        {appLogoError() ? <Text testID="mobile-icon-error" style={{ fontSize: 13, lineHeight: 18, color: c.ink2 }}>{t("mobile.iconError")} {appLogoError()}</Text> : null}
      </View> : null}
    </SettingsGroup>
    {/* 和 Mac 的设置同一项：主题只管界面，文稿配色单独决定正文里的标题、引用、链接和代码。 */}
    <View testID="mobile-render-mode" style={{ marginTop: 12, marginHorizontal: 16 }}>
      <View style={{ height: 34, padding: 3, flexDirection: "row", borderRadius: 9, borderCurve: "continuous",
        backgroundColor: mobileIsDark() ? "rgba(118, 118, 128, 0.24)" : "rgba(118, 118, 128, 0.12)" }}>
        {(["color", "monochrome"] as const).map(mode => {
          const active = () => renderMode() === mode;
          return <Button testID={`mobile-render-${mode}`} onPress={() => applyRenderMode(mode)}
            style={{ flex: 1, borderRadius: 7, borderCurve: "continuous", alignItems: "center", justifyContent: "center",
              backgroundColor: active() ? c.list : "transparent", borderWidth: active() ? 0.5 : 0, borderColor: c.thread }}>
            <Text style={{ fontSize: 13, fontWeight: active() ? 600 : 500, letterSpacing: -0.1, color: active() ? c.ink : c.ink2 }}>{t(`settings.renderMode.${mode}`)}</Text>
          </Button>;
        })}
      </View>
      <Text style={{ marginTop: 6, paddingHorizontal: 2, fontSize: 12, lineHeight: 16, color: c.ink3 }}>{t("mobile.renderModeHint")}</Text>
    </View>

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
        detail={syncDetail()} disabled={syncState()?.kind === "progress"} last={!syncRuntime.conflicts().length} onPress={props.onSync} /> : null}
      {syncRuntime.conflicts().length ? <SettingsRow id="mobile-conflicts-row" icon="info" iconBg="#FF9500" title={t("sync.manageConflicts")}
        value={String(syncRuntime.conflicts().length)} last onPress={props.onConflicts} /> : null}
    </SettingsGroup>

    <SectionTitle>{t("mobile.sectionData")}</SectionTitle>
    <SettingsGroup>
      <SettingsRow id="mobile-import" icon="file-text" iconBg="#34C759" title={t("mobile.import")} onPress={props.onImport} />
      <SettingsRow id="mobile-trash" icon="x" iconBg="#FF3B30" title={t("mobile.trash")} onPress={props.onTrash} last />
    </SettingsGroup>

    <Text style={{ marginTop: 32, textAlign: "center", fontSize: 13, lineHeight: 19, color: c.ink3 }}>
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
  return fontLineHeight().toFixed(2);
}
