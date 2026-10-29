import { Scroll, Text, View, effect, signal } from "nsh";
import { AlertDialog, Dialog } from "nsh/base";
import { credentialsFor, credentialsHint, loadSyncConfig } from "../sync/config";
import { SyncError, type RemoteDir } from "../sync/provider";
import { providerLabelKey, remoteRoot, syncRuntime } from "../sync/runtime";
import type { ProviderId } from "../sync/types";
import { Icon, type IconName } from "./Icon";
import { locale, t } from "./i18n";
import { colors, statusColor } from "./theme";

type Stage = "idle" | "providers" | "authorizing" | "folders";

export type SyncSettingsProps = {
  open?: boolean;
  vaultRoot?: string | null;
  onOpenVault?: () => void;
  onSyncNow?: () => void;
  onManageConflicts?: () => void;
};

const PROVIDERS: ProviderId[] = ["google", "dropbox"];

function providerIcon(_provider: ProviderId): IconName {
  return "cloud";
}

/** 「刚刚 / N 分钟前 / 时刻」——同步状态用的轻量相对时间。 */
export function formatSyncMoment(ms: number): string {
  if (!ms) return t("sync.never");
  const diff = Date.now() - ms;
  if (diff < 60_000) return t("sync.justNow");
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) {
    return locale() === "en" ? `${minutes} min ago` : `${minutes} 分钟前`;
  }
  return new Date(ms).toLocaleTimeString(locale() === "en" ? "en-US" : "zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function describeError(err: unknown): string {
  if (err instanceof SyncError) {
    if (err.kind === "config") return t("sync.error.config");
    if (err.kind === "auth") return t("sync.error.auth");
    if (err.kind === "network") return t("sync.error.network");
  }
  return t("sync.error.generic");
}

/** 设置 · 同步：S1 连接状态 / S2 选提供商 / S3 授权 / S4 选远程文件夹。 */
export function SyncSettings(props: SyncSettingsProps) {
  const stage = signal<Stage>("idle");
  const provider = signal<ProviderId | null>(null);
  const account = signal<string | null>(null);
  const stack = signal<RemoteDir[]>([]);
  const subfolders = signal<RemoteDir[]>([]);
  const folderLoading = signal(false);
  const busy = signal(false);
  const localError = signal<string | null>(null);
  const paywallOpen = signal(false);
  let folderGen = 0;

  effect(() => {
    void syncRuntime.load();
  });

  // 关掉设置时放弃未完成的授权流程，避免令牌悬挂
  effect(() => {
    if (props.open === false && stage() !== "idle" && !syncRuntime.connection()) {
      stage.set("idle");
      void syncRuntime.cancelConnect();
    }
  });

  const connected = () => {
    const conn = syncRuntime.connection();
    if (!conn) return null;
    if (props.vaultRoot && conn.localRoot !== props.vaultRoot) return null;
    return conn;
  };

  const currentDir = (): RemoteDir => {
    const list = stack();
    return list[list.length - 1] ?? remoteRoot(provider() ?? "google");
  };

  const resetFlow = () => {
    folderGen += 1;
    stage.set("idle");
    provider.set(null);
    account.set(null);
    stack.set([]);
    subfolders.set([]);
    localError.set(null);
    busy.set(false);
  };

  const cancelFlow = async () => {
    resetFlow();
    await syncRuntime.cancelConnect();
  };

  const startProviders = () => {
    if (!props.vaultRoot) return;
    const config = loadSyncConfig(true);
    if (config.purchaseRequired) {
      paywallOpen.set(true);
      return;
    }
    localError.set(null);
    stage.set("providers");
  };

  const chooseProvider = async (id: ProviderId) => {
    const config = loadSyncConfig(true);
    if (!credentialsFor(id, config)) {
      localError.set(`${t("sync.error.config")} ${credentialsHint(id)}`);
      return;
    }
    provider.set(id);
    localError.set(null);
    stage.set("authorizing");
    try {
      const label = await syncRuntime.beginConnect(id);
      account.set(label);
      const root: RemoteDir = { ...remoteRoot(id), name: t(providerLabelKey(id)) };
      stack.set([root]);
      stage.set("folders");
      await loadFolders(root);
    } catch (err) {
      if (err instanceof SyncError && err.kind === "config") {
        localError.set(`${t("sync.error.config")} ${credentialsHint(id)}`);
      } else {
        localError.set(describeError(err));
      }
      stage.set("providers");
    }
  };

  const loadFolders = async (dir: RemoteDir) => {
    const id = provider();
    if (!id) return;
    const gen = ++folderGen;
    folderLoading.set(true);
    try {
      const list = await syncRuntime.listFolders(id, dir);
      if (gen === folderGen) subfolders.set(list);
    } catch (err) {
      if (gen === folderGen) localError.set(describeError(err));
    } finally {
      if (gen === folderGen) folderLoading.set(false);
    }
  };

  const enterFolder = async (dir: RemoteDir) => {
    stack.update((list) => [...list, dir]);
    localError.set(null);
    await loadFolders(dir);
  };

  const goUp = async () => {
    const list = stack();
    if (list.length <= 1) return;
    const next = list.slice(0, -1);
    stack.set(next);
    localError.set(null);
    await loadFolders(next[next.length - 1]!);
  };

  const bindTo = async (dir: RemoteDir) => {
    busy.set(true);
    localError.set(null);
    try {
      await syncRuntime.bind(dir);
      resetFlow();
      props.onSyncNow?.();
    } catch (err) {
      localError.set(describeError(err));
    } finally {
      busy.set(false);
    }
  };

  const createVaultHere = async () => {
    const id = provider();
    if (!id) return;
    busy.set(true);
    localError.set(null);
    try {
      const created = await syncRuntime.createFolder(id, currentDir(), "StoatMD");
      await bindTo(created);
    } catch (err) {
      localError.set(describeError(err));
      busy.set(false);
    }
  };

  const reauth = async () => {
    const conn = connected();
    if (!conn) return;
    busy.set(true);
    localError.set(null);
    try {
      await syncRuntime.reconnect(conn.provider);
      props.onSyncNow?.();
    } catch (err) {
      localError.set(describeError(err));
    } finally {
      busy.set(false);
    }
  };

  const confirmDisconnect = async () => {
    const action = await AlertDialog.show({
      title: t("sync.disconnect.title"),
      description: t("sync.disconnect.desc"),
      actions: [
        { id: "cancel", label: t("sync.cancel") },
        { id: "disconnect", label: t("sync.disconnect.confirm"), role: "destructive" },
      ],
    });
    if (action !== "disconnect") return;
    busy.set(true);
    try {
      await syncRuntime.disconnect();
    } finally {
      busy.set(false);
    }
  };

  const statusLabel = (): string => {
    const phase = syncRuntime.phase();
    if (phase === "syncing") {
      const p = syncRuntime.progress();
      return p.total > 0
        ? `${t("sync.syncing")} ${p.done}/${p.total}`
        : t("sync.firstSync");
    }
    if (phase === "conflict") {
      return `${syncRuntime.conflicts().length} ${t("sync.conflicts")}`;
    }
    if (phase === "offline") return t("sync.offline");
    if (phase === "error") {
      return syncRuntime.error()?.kind === "auth" ? t("sync.error.auth") : t("sync.error");
    }
    if (!syncRuntime.lastSyncAt()) return t("sync.connectedPending");
    return `${t("sync.synced")} · ${formatSyncMoment(syncRuntime.lastSyncAt())}`;
  };

  const statusDot = (): string => {
    const phase = syncRuntime.phase();
    if (phase === "conflict") return statusColor("danger");
    if (phase === "error") return statusColor("danger");
    if (phase === "syncing" || phase === "authorizing") return colors().accent;
    if (phase === "offline") return colors().ink3;
    return statusColor("ok");
  };

  const sectionTitle = (text: string) => (
    <Text
      style={{
        fontSize: 14,
        fontWeight: "600",
        letterSpacing: -0.14,
        color: colors().ink,
      }}
    >
      {text}
    </Text>
  );

  const secondary = (text: string) => (
    <Text style={{ fontSize: 12.5, color: colors().ink2, lineHeight: 18 }}>{text}</Text>
  );

  const actionButton = (props2: {
    testID: string;
    label: string;
    onPress?: () => void;
    primary?: boolean;
    disabled?: boolean;
    danger?: boolean;
  }) => (
    <View
      role="button"
      testID={props2.testID}
      onPress={props2.disabled ? undefined : props2.onPress}
      style={{
        height: 30,
        paddingHorizontal: 12,
        borderRadius: 6,
        borderWidth: props2.primary ? 0 : 1,
        borderColor: props2.danger ? statusColor("danger") : colors().thread,
        backgroundColor: props2.primary ? colors().accent : "transparent",
        opacity: props2.disabled ? 0.45 : 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: props2.primary ? "560" : "500",
          color: props2.primary
            ? "#FFFFFF"
            : props2.danger
              ? statusColor("danger")
              : colors().ink,
        }}
      >
        {props2.label}
      </Text>
    </View>
  );

  return (
    <View style={{ gap: 14 }}>
      {sectionTitle(t("settings.sync"))}

      <If when={stage() === "idle" && !connected()}>
        <View style={{ gap: 12 }}>
          {secondary(t("sync.enableDesc"))}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {actionButton({
              testID: "sync-enable",
              label: t("sync.enable"),
              primary: true,
              disabled: !props.vaultRoot,
              onPress: startProviders,
            })}
            <If when={!props.vaultRoot}>
              <Text style={{ fontSize: 12, color: colors().ink3 }}>{t("sync.noVault")}</Text>
            </If>
          </View>
          <Text style={{ fontSize: 12, color: colors().ink3, lineHeight: 18 }}>
            {t("sync.agentHint")}
          </Text>
        </View>
      </If>

      <If when={stage() === "providers"}>
        <View style={{ gap: 12 }}>
          {sectionTitle(t("sync.provider.pick"))}
          {secondary(t("sync.provider.pickDesc"))}
          <View style={{ gap: 8 }}>
            <Each of={PROVIDERS}>
              {(row) => {
                const id = row();
                return (
                  <View
                    role="button"
                    testID={`sync-provider-${id}`}
                    onPress={() => {
                      void chooseProvider(id);
                    }}
                    style={{
                      height: 62,
                      paddingHorizontal: 14,
                      borderRadius: 9,
                      borderWidth: 1,
                      borderColor: colors().thread,
                      backgroundColor: colors().list,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        backgroundColor: colors().accentSoft,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon name={providerIcon(id)} color={colors().accent} size={16} />
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: "600", color: colors().ink }}>
                        {t(providerLabelKey(id))}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors().ink2 }}>
                        {t("sync.agentHint")}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 14, color: colors().ink3 }}>›</Text>
                  </View>
                );
              }}
            </Each>
          </View>
          <View style={{ flexDirection: "row" }}>
            {actionButton({ testID: "sync-provider-cancel", label: t("sync.cancel"), onPress: cancelFlow })}
          </View>
        </View>
      </If>

      <If when={stage() === "authorizing"}>
        <View style={{ gap: 12 }}>
          {sectionTitle(t("sync.authorizing"))}
          {secondary(t("sync.authorizing.desc"))}
          <View style={{ flexDirection: "row" }}>
            {actionButton({
              testID: "sync-auth-cancel",
              label: t("sync.cancelAuth"),
              onPress: cancelFlow,
            })}
          </View>
        </View>
      </If>

      <If when={stage() === "folders"}>
        <View style={{ gap: 12 }}>
          {sectionTitle(t("sync.folder.title"))}
          {secondary(t("sync.folder.desc"))}

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <If when={stack().length > 1}>
              <View role="button" testID="sync-folder-up" onPress={() => void goUp()}>
                <Text style={{ fontSize: 15, color: colors().ink2 }}>‹</Text>
              </View>
            </If>
            <Text
              testID="sync-folder-path"
              style={{ flex: 1, fontSize: 12.5, color: colors().ink, fontWeight: "500" }}
              numberOfLines={1}
            >
              {stack()
                .map((dir) => dir.name || t("sync.folder.root"))
                .join(" / ")}
            </Text>
          </View>

          <View
            style={{
              borderWidth: 1,
              borderColor: colors().thread,
              borderRadius: 9,
              backgroundColor: colors().list,
              overflow: "hidden",
            }}
          >
            <Scroll style={{ height: 176 }}>
              <View style={{ padding: 6, gap: 2 }}>
                <If when={folderLoading()}>
                  <Text style={{ fontSize: 12, color: colors().ink3, padding: 8 }}>
                    {t("sync.folder.loading")}
                  </Text>
                </If>
                <If when={!folderLoading() && subfolders().length === 0}>
                  <Text style={{ fontSize: 12, color: colors().ink3, padding: 8 }}>
                    {t("sync.folder.empty")}
                  </Text>
                </If>
                <Each of={subfolders()}>
                  {(row) => {
                    const dir = row();
                    return (
                      <View
                        role="button"
                        testID={`sync-folder-${dir.name}`}
                        onPress={() => void enterFolder(dir)}
                        style={{
                          height: 30,
                          paddingHorizontal: 8,
                          borderRadius: 6,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Icon name="folder" color={colors().ink2} size={14} />
                        <Text style={{ flex: 1, fontSize: 13, color: colors().ink }} numberOfLines={1}>
                          {dir.name}
                        </Text>
                        <Text style={{ fontSize: 14, color: colors().ink3 }}>›</Text>
                      </View>
                    );
                  }}
                </Each>
              </View>
            </Scroll>
          </View>

          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {actionButton({
              testID: "sync-folder-use",
              label: t("sync.folder.use"),
              primary: true,
              disabled: busy(),
              onPress: () => void bindTo(currentDir()),
            })}
            {actionButton({
              testID: "sync-folder-create",
              label: t("sync.folder.create"),
              disabled: busy(),
              onPress: () => void createVaultHere(),
            })}
            {actionButton({
              testID: "sync-folder-cancel",
              label: t("sync.cancel"),
              disabled: busy(),
              onPress: cancelFlow,
            })}
          </View>
        </View>
      </If>

      <If when={!!connected()}>
        <View style={{ gap: 12 }}>
          <View
            style={{
              padding: 14,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors().thread,
              backgroundColor: colors().editor,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  backgroundColor: colors().accentSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon
                  name={providerIcon(connected()!.provider)}
                  color={colors().accent}
                  size={16}
                />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 13.5, fontWeight: "600", color: colors().ink }}>
                  {t(providerLabelKey(connected()!.provider))}
                </Text>
                <Text style={{ fontSize: 12, color: colors().ink2 }} numberOfLines={1}>
                  {connected()!.account || t("sync.connected")}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: statusDot(),
                  }}
                />
                <Text testID="sync-status" style={{ fontSize: 12, color: colors().ink2 }}>
                  {statusLabel()}
                </Text>
              </View>
            </View>

            <View style={{ height: 1, backgroundColor: colors().thread }} />

            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Text style={{ width: 76, fontSize: 12, color: colors().ink3 }}>
                  {t("sync.remotePath")}
                </Text>
                <Text style={{ flex: 1, fontSize: 12, color: colors().ink2 }} numberOfLines={1}>
                  {connected()!.remotePath || `/${connected()!.remoteName || t("sync.folder.root")}`}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Text style={{ width: 76, fontSize: 12, color: colors().ink3 }}>
                  {t("sync.lastSync")}
                </Text>
                <Text style={{ flex: 1, fontSize: 12, color: colors().ink2 }}>
                  {formatSyncMoment(syncRuntime.lastSyncAt())}
                </Text>
              </View>
            </View>

            <If when={syncRuntime.phase() === "error" || syncRuntime.phase() === "offline"}>
              <Text
                testID="sync-error"
                style={{
                  fontSize: 12,
                  lineHeight: 18,
                  color:
                    syncRuntime.phase() === "error" ? statusColor("danger") : colors().ink2,
                }}
              >
                {syncRuntime.error()?.kind === "network"
                  ? t("sync.error.network")
                  : syncRuntime.error()?.kind === "auth"
                    ? t("sync.error.auth")
                    : syncRuntime.error()?.kind === "config"
                      ? t("sync.error.config")
                      : t("sync.error.generic")}
              </Text>
            </If>

            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {actionButton({
                testID: "sync-now",
                label: t("sync.syncNow"),
                primary: true,
                disabled: syncRuntime.phase() === "syncing" || busy(),
                onPress: () => props.onSyncNow?.(),
              })}
              <If when={syncRuntime.conflicts().length > 0}>
                {actionButton({
                  testID: "sync-conflicts",
                  label: `${t("sync.manageConflicts")} (${syncRuntime.conflicts().length})`,
                  danger: true,
                  onPress: () => props.onManageConflicts?.(),
                })}
              </If>
              <If when={syncRuntime.phase() === "error" && syncRuntime.error()?.kind === "auth"}>
                {actionButton({
                  testID: "sync-reauth",
                  label: t("sync.error.reauth"),
                  disabled: busy(),
                  onPress: () => void reauth(),
                })}
              </If>
              {actionButton({
                testID: "sync-disconnect",
                label: t("sync.disconnect"),
                danger: true,
                disabled: busy(),
                onPress: () => void confirmDisconnect(),
              })}
            </View>
          </View>
        </View>
      </If>

      <If when={!!localError()}>
        <Text
          testID="sync-local-error"
          style={{ fontSize: 12, lineHeight: 18, color: statusColor("danger") }}
        >
          {localError()}
        </Text>
      </If>

      <View style={{ height: 1, backgroundColor: colors().thread }} />

      <View style={{ gap: 4 }}>
        {sectionTitle(t("vault.section"))}
        <Text style={{ fontSize: 12, color: colors().ink3, lineHeight: 18 }}>
          {props.vaultRoot ? props.vaultRoot : t("vault.none")}
        </Text>
        <If when={!!props.onOpenVault}>
          <View style={{ flexDirection: "row", marginTop: 2 }}>
            {actionButton({
              testID: "vault-open-sync",
              label: t("vault.open"),
              onPress: props.onOpenVault,
            })}
          </View>
        </If>
      </View>

      <Dialog
        open={paywallOpen()}
        testID="sync-paywall"
        onOpenChange={(open) => {
          if (!open) paywallOpen.set(false);
        }}
        onCancel={() => paywallOpen.set(false)}
        closeOnBackdropPress
        closeOnEscape
        animation="fade"
        style={{
          width: 360,
          margin: "auto",
          padding: 20,
          gap: 10,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors().thread,
          backgroundColor: colors().paper,
        }}
      >
        {sectionTitle(t("sync.paywall.title"))}
        {secondary(t("sync.paywall.desc"))}
        <Text style={{ fontSize: 12, color: colors().ink3 }}>{t("sync.paywall.note")}</Text>
        <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 4 }}>
          {actionButton({
            testID: "sync-paywall-ok",
            label: t("sync.paywall.ok"),
            primary: true,
            onPress: () => paywallOpen.set(false),
          })}
        </View>
      </Dialog>
    </View>
  );
}
