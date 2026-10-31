import { Scroll, Text, View, effect, signal } from "nsh";
import { Button, Checkbox, Dialog } from "nsh/base";
import { VaultDialog } from "stoatmd/native";
import { credentialsFor, loadSyncConfig } from "../sync/config";
import { SyncError, type RemoteDir } from "../sync/provider";
import { providerLabelKey, remoteRoot, syncRuntime } from "../sync/runtime";
import type { ProviderId } from "../sync/types";
import { connectionLocation, storageMigration as migration } from "../storage/runtime";
import { activeStorage, storageBusy, type Location } from "../storage/state";
import { settingsStorage } from "./settingsStorage";
import { Icon } from "./Icon";
import { intlTag, locale, t } from "./i18n";
import { colors, statusColor } from "./theme";
import { uiTextSize, uiLineHeight, uiControlHeight } from "./typography";

export type SyncSettingsProps = {
  open?: boolean;
  cloudOnly?: boolean;
  vaultRoot?: string | null;
  onOpenVault?: () => void;
  onBeforeMigration?: () => Promise<void>;
  onStorageActivated?: (root: string) => Promise<void>;
  onSyncNow?: () => void;
  onManageConflicts?: () => void;
};

type Stage = "idle" | "authorizing" | "folders" | "migration";
const LOCATIONS = ["local", "dropbox", "google"] as const;
export function formatSyncMoment(ms: number): string {
  if (!ms) return t("sync.never");
  const minutes = Math.floor((Date.now() - ms) / 60_000);
  if (minutes < 1) return t("sync.justNow");
  if (minutes < 60) return t("time.minutesAgo", { n: minutes });
  return new Date(ms).toLocaleTimeString(intlTag(locale()), { hour: "2-digit", minute: "2-digit" });
}
const locationName = (kind: Location["kind"]) => kind === "local" ? t("storage.local") : t(providerLabelKey(kind));
const locationPath = (location: Location) => location.kind === "local" ? location.root : location.remote.path || "/";
function errorText(err: unknown, connecting = false): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.startsWith("storage.")) return t(message);
  if (connecting && err instanceof SyncError && err.kind === "network") return t("sync.error.connectNetwork");
  if (err instanceof SyncError) return t(`sync.error.${err.kind === "network" || err.kind === "auth" || err.kind === "config" ? err.kind : "generic"}`);
  return `${t("storage.error.failed")} ${message}`;
}

/** A single active storage location with an explicit, verified migration before switching. */
export function SyncSettings(props: SyncSettingsProps) {
  const stage = signal<Stage>(migration.phase() === "idle" ? "idle" : "migration");
  const provider = signal<ProviderId | null>(null);
  const stack = signal<RemoteDir[]>([]);
  const subfolders = signal<RemoteDir[]>([]);
  const loading = signal(false);
  const localError = signal<string | null>(null);
  const paywall = signal(false);
  const account = signal<string | null>(null);
  let generation = 0;
  const connected = () => {
    const conn = syncRuntime.connection();
    return conn && (!props.vaultRoot || conn.localRoot === props.vaultRoot) ? conn : null;
  };
  const currentKind = () => connected()?.provider ?? "local";
  const locations = props.cloudOnly ? LOCATIONS.filter(kind => kind !== "local") : LOCATIONS;
  const locked = () => loadSyncConfig().purchaseRequired;
  const currentDir = () => stack()[stack().length - 1] ?? remoteRoot(provider() ?? "google");
  const currentLocation = (): Location => connected() ? connectionLocation(connected()!) : { kind: "local", root: props.vaultRoot ?? t("vault.none") };

  effect(() => { void syncRuntime.load().catch(err => localError.set(errorText(err))); });
  effect(() => {
    if (props.open === false && !storageBusy()) {
      generation++;
      stage.set("idle");
      void settingsStorage.cancel();
      loading.set(false);
      void syncRuntime.cancelConnect();
    }
  });

  const cancel = async () => {
    generation++;
    stage.set("idle");
    await settingsStorage.cancel();
    localError.set(null);
    loading.set(false);
    await syncRuntime.cancelConnect();
  };
  const loadFolders = async (dir: RemoteDir) => {
    const id = provider();
    if (!id) return;
    const gen = ++generation;
    loading.set(true);
    subfolders.set([]);
    try {
      const list = await syncRuntime.listFolders(id, dir);
      if (gen === generation) subfolders.set(list);
    } catch (err) { if (gen === generation) localError.set(errorText(err)); }
    finally { if (gen === generation) loading.set(false); }
  };
  // iOS first run has no library to move: bind the chosen cloud folder directly.
  const initialSetup = () => !!props.cloudOnly && !props.vaultRoot && !!props.onStorageActivated;
  const selectTarget = async (location: Location) => {
    const gen = ++generation;
    localError.set(null);
    loading.set(true);
    try {
      if (initialSetup()) {
        await settingsStorage.activate(location, props.onStorageActivated!);
      } else {
        await settingsStorage.prepare(props.vaultRoot ?? null, location, () => gen === generation);
        if (gen === generation) stage.set("migration");
        else await settingsStorage.cancel();
      }
    } catch (err) { if (gen === generation) localError.set(errorText(err)); }
    finally { if (gen === generation) loading.set(false); }
  };
  const choose = async (kind: Location["kind"]) => {
    if (storageBusy() || loading()) return;
    localError.set(null);
    if (activeStorage()?.cleanup) { localError.set(t("storage.error.pendingCleanup")); return; }
    if (kind === "local") {
      if (props.cloudOnly) return;
      const gen = ++generation;
      loading.set(true);
      try {
        const root = await VaultDialog.pickFolder();
        if (gen !== generation) return;
        loading.set(false);
        if (root) await selectTarget({ kind, root });
      } catch (err) { if (gen === generation) { localError.set(errorText(err)); loading.set(false); } }
      return;
    }
    const config = loadSyncConfig(true);
    if (config.purchaseRequired) { paywall.set(true); return; }
    if (!credentialsFor(kind, config)) {
      localError.set(t("sync.error.config"));
      return;
    }
    provider.set(kind);
    stage.set("authorizing");
    const gen = ++generation;
    try {
      const name = await syncRuntime.beginConnect(kind);
      if (gen !== generation) return;
      account.set(name);
      const root = { ...remoteRoot(kind), name: locationName(kind) };
      stack.set([root]);
      stage.set("folders");
      await loadFolders(root);
    } catch (err) {
      if (gen === generation) { stage.set("idle"); localError.set(errorText(err, true)); }
    }
  };
  const useFolder = async (dir: RemoteDir) => {
    if (loading() || !provider()) return;
    await selectTarget({ kind: provider()!, remote: dir, account: account() });
  };
  const createFolder = async () => {
    if (loading() || !provider()) return;
    loading.set(true);
    try {
      const dir = await syncRuntime.createFolder(provider()!, currentDir(), "StoatMD");
      loading.set(false);
      await useFolder(dir);
    } catch (err) { localError.set(errorText(err)); loading.set(false); }
  };
  const start = async () => {
    if (!props.onBeforeMigration || !props.onStorageActivated) {
      localError.set(t("storage.error.failed")); return;
    }
    await settingsStorage.migrate(props.vaultRoot ?? null, props.onBeforeMigration, props.onStorageActivated);
  };
  const cleanup = async () => {
    if (storageBusy()) return;
    try { await settingsStorage.retryCleanup(); }
    catch (err) { localError.set(errorText(err)); }
  };
  const label = (text: string) => <Text style={{ fontSize: uiTextSize(14), fontWeight: "600", color: colors().ink }}>{text}</Text>;
  const detail = (text: string) => <Text style={{ fontSize: uiTextSize(12.5), lineHeight: uiLineHeight(19), color: colors().ink2 }}>{text}</Text>;
  const button = (id: string, text: string, onPress: () => void, primary = false, disabled = false) => (
    <Button testID={id} disabled={disabled} onPress={onPress}
      style={{ minHeight: props.cloudOnly ? 44 : uiControlHeight(30), paddingHorizontal: 12, borderRadius: 6, borderWidth: primary ? 0 : 1,
        borderColor: colors().thread, backgroundColor: primary ? colors().accent : colors().list,
        justifyContent: "center", alignItems: "center", opacity: disabled ? 0.45 : 1 }}
      hoverStyle={{ opacity: 0.8 }} activeStyle={{ opacity: 0.65 }}>
      <Text style={{ fontSize: uiTextSize(13), fontWeight: "500", color: primary ? colors().accentInk : colors().ink }}>{text}</Text>
    </Button>
  );
  const pathRow = (caption: string, location: Location) => (
    <View style={{ padding: 12, gap: 4 }}>
      <Text style={{ fontSize: uiTextSize(11), color: colors().ink3 }}>{caption}</Text>
      {label(locationName(location.kind))}
      {detail(locationPath(location))}
    </View>
  );
  const status = () => {
    if (locked()) return t("storage.expired");
    const phase = syncRuntime.phase();
    if (phase === "syncing") return t("sync.syncing");
    if (phase === "conflict") return t("sync.conflictsCount", { n: syncRuntime.conflicts().length });
    if (phase === "offline") return t("sync.offline");
    if (phase === "error") return t("sync.error.generic");
    return `${t("sync.synced")} · ${formatSyncMoment(syncRuntime.lastSyncAt())}`;
  };

  return (
    <View style={{ gap: 16 }}>
      <If when={stage() === "idle"}>
        {label(t("storage.title"))}
        {detail(t(props.cloudOnly ? "mobile.connectHint" : "storage.description"))}
        <View testID="storage-locations" style={{ borderWidth: 1, borderColor: colors().thread, borderRadius: 9, overflow: "hidden" }}>
          <Each of={locations}>{(row) => {
            const kind = row();
            return (
              <Button testID={`storage-location-${kind}`} disabled={loading() || storageBusy() || currentKind() === kind}
                onPress={() => void choose(kind)}
                style={{ paddingHorizontal: 13, paddingVertical: 13, minHeight: uiControlHeight(64),
                  flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors().list,
                  borderBottomWidth: kind === "google" ? 0 : 1, borderBottomColor: colors().thread }}
                hoverStyle={{ backgroundColor: colors().accentSoft }}>
                <Icon name={kind === "local" ? "folder" : "cloud"} size={20} color={currentKind() === kind ? colors().accent : colors().ink2} />
                <View style={{ flex: 1, gap: 4 }}>
                  {label(locationName(kind))}
                  <Text style={{ fontSize: uiTextSize(12), color: colors().ink3 }}>{t(props.cloudOnly ? "mobile.cloudIncluded" : kind === "local" ? "storage.localDescription" : "storage.cloudDescription")}</Text>
                </View>
                <If when={currentKind() === kind}>
                  <Text testID={`storage-current-${kind}`} style={{ fontSize: uiTextSize(12), color: colors().accent }}>{t("storage.inUse")} ✓</Text>
                </If>
                <If when={currentKind() !== kind}>
                  <Text style={{ fontSize: uiTextSize(12), color: colors().ink3 }}>{kind !== "local" && locked() ? "Pro" : "›"}</Text>
                </If>
              </Button>
            );
          }}</Each>
        </View>
        <View style={{ gap: 8 }}>
          {connected() || !props.cloudOnly ? detail(locationPath(currentLocation())) : null}
          <If when={!!connected()}>
            {detail(status())}
            {detail(t("storage.cacheDescription"))}
          </If>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {connected() || !props.cloudOnly ? button("storage-change-folder", t("storage.changeFolder"), () => void choose(currentKind()), false, loading()) : null}
            <If when={!!connected()}>
              {button("sync-now", t("sync.syncNow"), () => props.onSyncNow?.(), false, locked() || syncRuntime.phase() === "syncing")}
              <If when={syncRuntime.conflicts().length > 0}>
                {button("sync-conflicts", t("sync.manageConflicts"), () => props.onManageConflicts?.())}
              </If>
              <If when={syncRuntime.error()?.kind === "auth" || !!localError()}>
                {button("sync-reauth", t("sync.error.reauth"), () => {
                  void syncRuntime.reconnect(connected()!.provider, true).then(() => localError.set(null)).catch(err => localError.set(errorText(err)));
                }, false)}
              </If>
            </If>
          </View>
        </View>
      </If>

      <If when={stage() === "authorizing"}>
        {label(t("sync.authorizing"))}
        {detail(t("sync.authorizing.desc"))}
        <View style={{ flexDirection: "row" }}>{button("sync-auth-cancel", t("sync.cancelAuth"), () => void cancel())}</View>
      </If>

      <If when={stage() === "folders"}>
        {label(t("sync.folder.title"))}
        {detail(t(initialSetup() ? "mobile.folderDescription" : "storage.folderDescription"))}
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <If when={stack().length > 1}>
            {button("sync-folder-up", "‹", () => { stack.update(s => s.slice(0, -1)); void loadFolders(currentDir()); }, false, loading())}
          </If>
          <Text testID="sync-folder-path" style={{ flex: 1, fontSize: uiTextSize(13), color: colors().ink }} numberOfLines={1}>{stack().map(d => d.name).join(" / ")}</Text>
        </View>
        <Scroll style={{ height: 180, borderWidth: 1, borderColor: colors().thread, borderRadius: 8 }}>
          <View style={{ padding: 6, gap: 2 }}>
            <If when={loading()}>{detail(t("sync.folder.loading"))}</If>
            <If when={!loading() && !subfolders().length}>{detail(t("sync.folder.empty"))}</If>
            <Each of={subfolders()}>{row => {
              const dir = row();
              return <Button testID={`sync-folder-${dir.name}`} disabled={loading()}
                onPress={() => { stack.update(s => [...s, dir]); void loadFolders(dir); }}
                style={{ flexDirection: "row", alignItems: "center", padding: 8, gap: 8, borderRadius: 5 }} hoverStyle={{ backgroundColor: colors().accentSoft }}>
                <Icon name="folder" size={15} color={colors().ink2} />
                <Text style={{ flex: 1, fontSize: uiTextSize(13), color: colors().ink }}>{dir.name}</Text>
                <Text style={{ color: colors().ink3 }}>›</Text>
              </Button>;
            }}</Each>
          </View>
        </Scroll>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {button("sync-folder-cancel", t("sync.cancel"), () => void cancel(), false, loading())}
          {button("sync-folder-create", t("sync.folder.create"), () => void createFolder(), false, loading())}
          {button("sync-folder-use", t("storage.continue"), () => void useFolder(currentDir()), true, loading())}
        </View>
      </If>

      <If when={stage() === "migration"}>
        <If when={migration.phase() === "confirm" || migration.phase() === "failed"}>
          {label(t("storage.confirmTitle"))}
          <View style={{ borderWidth: 1, borderColor: colors().thread, borderRadius: 9, backgroundColor: colors().list }}>
            {pathRow(t("storage.from"), currentLocation())}
            <View style={{ height: 1, backgroundColor: colors().thread }} />
            <If when={!!migration.target()}>{pathRow(t("storage.to"), migration.target()!)}</If>
          </View>
          {detail(t("storage.summary", { files: migration.summary()?.files ?? 0, folders: migration.summary()?.directories ?? 0,
            size: ((migration.summary()?.bytes ?? 0) / 1048576).toFixed(1) }))}
          {detail(t("storage.mergeDescription"))}
          <Checkbox testID="storage-keep-original" checked={migration.keepOriginal()} onChange={checked => migration.keepOriginal.set(checked)}
            style={{ flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 6 }}
            indicatorStyle={{ width: 17, height: 17, borderWidth: 1, borderRadius: 4,
              borderColor: migration.keepOriginal() ? colors().accent : colors().thread,
              backgroundColor: migration.keepOriginal() ? colors().accent : colors().list,
              alignItems: "center", justifyContent: "center" }}
            indicator={<If when={migration.keepOriginal()}><Icon name="check" color={colors().accentInk} size={12} /></If>}>
            <Text style={{ fontSize: uiTextSize(13), color: colors().ink }}>{t("storage.keepOriginal")}</Text>
          </Checkbox>
          <If when={!migration.keepOriginal()}>{detail(t("storage.cleanupDescription"))}</If>
          <If when={migration.phase() === "failed"}>
            <Text testID="storage-migration-error" style={{ color: statusColor("danger"), fontSize: uiTextSize(13), lineHeight: uiLineHeight(19) }}>{t("storage.failure")} {errorText(migration.error())}</Text>
          </If>
          <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
            {button("storage-cancel", t("sync.cancel"), () => void cancel())}
            {button("storage-start", t(migration.phase() === "failed" ? "storage.retry" : "storage.start"), () => void start(), true)}
          </View>
        </If>
        <If when={storageBusy()}>
          {label(t(`storage.${migration.phase()}`))}
          {detail(t("storage.progressDescription"))}
          <Text testID="storage-progress" style={{ fontSize: uiTextSize(13), color: colors().ink2 }}>{migration.progress().done} / {migration.progress().total}</Text>
          <View style={{ height: 4, borderRadius: 2, backgroundColor: colors().thread, overflow: "hidden" }}>
            <View style={{ height: 4, width: `${Math.round(migration.progress().done / Math.max(1, migration.progress().total) * 100)}%`, backgroundColor: colors().accent }} />
          </View>
        </If>
        <If when={migration.phase() === "succeeded" && !storageBusy()}>
          <Icon name="check" size={28} color={statusColor("ok")} />
          {label(t("storage.success"))}
          {detail(t("storage.successDescription"))}
          <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>{button("storage-done", t("storage.done"), () => void cancel(), true)}</View>
        </If>
      </If>

      <If when={!!activeStorage()?.cleanup && !storageBusy()}>
        <View style={{ padding: 12, gap: 10, borderWidth: 1, borderColor: colors().thread, borderRadius: 8 }}>
          {detail(t("storage.cleanupWarning"))}
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {button("storage-cleanup-retry", t("storage.retryCleanup"), () => void cleanup())}
            {button("storage-cleanup-keep", t("storage.keepRemaining"), () => void settingsStorage.keepRemainingOriginals())}
          </View>
        </View>
      </If>
      <If when={!!migration.warning() && !activeStorage()?.cleanup}>{detail(t("storage.activationWarning"))}</If>
      <If when={!!localError()}><Text testID="sync-local-error" style={{ fontSize: uiTextSize(12.5), lineHeight: uiLineHeight(19), color: statusColor("danger") }}>{localError()}</Text></If>
      <Dialog open={paywall()} testID="sync-paywall" onOpenChange={next => paywall.set(next)} onCancel={() => paywall.set(false)}
        closeOnBackdropPress closeOnEscape animation="fade" style={{ width: 360, margin: "auto", padding: 20, gap: 12, borderRadius: 12,
          backgroundColor: colors().paper, borderWidth: 1, borderColor: colors().thread }}>
        {label(t("sync.paywall.title"))}{detail(t("storage.paywallDescription"))}
        <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>{button("sync-paywall-ok", t("sync.paywall.ok"), () => paywall.set(false), true)}</View>
      </Dialog>
    </View>
  );
}
