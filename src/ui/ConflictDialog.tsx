import { uiTextSize, uiLineHeight, uiControlHeight } from "./typography";
import { Scroll, Text, View, signal } from "nsh";
import { AlertDialog, Dialog } from "nsh/base";
import { syncRuntime } from "../sync/runtime";
import type { ConflictChoice, ConflictItem } from "../sync/types";
import { Icon } from "./Icon";
import { locale, t } from "./i18n";
import { colors, statusColor } from "./theme";
import { formatWhen } from "./vaultModel";

type Props = {
  open: boolean;
  onClose: () => void;
  onResolved?: () => void;
};

const CHOICES: ConflictChoice[] = ["keepLocal", "keepRemote", "keepBoth"];

function kindLabel(kind: ConflictItem["kind"]): string {
  if (kind === "bothModified") return t("sync.conflict.bothModified");
  if (kind === "localDeletedRemoteModified") {
    return t("sync.conflict.localDeletedRemoteModified");
  }
  return t("sync.conflict.remoteDeletedLocalModified");
}

function choiceLabel(choice: ConflictChoice): string {
  if (choice === "keepLocal") return t("sync.conflict.keepLocal");
  if (choice === "keepRemote") return t("sync.conflict.keepRemote");
  return t("sync.conflict.keepBoth");
}

/** S6：逐文件选择冲突处理方式；不预勾选、不静默覆盖。 */
export function ConflictDialog(props: Props) {
  const busyPath = signal("");
  const batchBusy = signal(false);
  const errorText = signal("");

  const conflicts = () => syncRuntime.conflicts();

  const apply = async (item: ConflictItem, choice: ConflictChoice) => {
    if (busyPath() || batchBusy()) return;
    busyPath.set(item.path);
    errorText.set("");
    try {
      await syncRuntime.resolveConflict(item, choice);
      if (syncRuntime.conflicts().length === 0) {
        props.onResolved?.();
        props.onClose();
      }
    } catch {
      errorText.set(t("sync.error.generic"));
    } finally {
      busyPath.set("");
    }
  };

  const applyAll = async (choice: ConflictChoice) => {
    if (batchBusy()) return;
    const items =
      choice === "keepBoth"
        ? conflicts().filter((item) => item.kind === "bothModified")
        : conflicts();
    if (items.length === 0) return;
    const { action } = await AlertDialog.show({
      title: t("sync.conflict.confirmTitle"),
      description: `${t("sync.conflict.confirmDesc")} (${items.length})`,
      actions: [
        { id: "cancel", label: t("sync.cancel") },
        { id: "apply", label: t("sync.conflict.confirm"), role: "destructive" },
      ],
    });
    if (action !== "apply") return;
    batchBusy.set(true);
    errorText.set("");
    try {
      for (const item of items) {
        await syncRuntime.resolveConflict(item, choice);
      }
      if (syncRuntime.conflicts().length === 0) {
        props.onResolved?.();
        props.onClose();
      }
    } catch {
      errorText.set(t("sync.error.generic"));
    } finally {
      batchBusy.set(false);
    }
  };

  const chip = (props2: {
    testID: string;
    label: string;
    onPress: () => void;
    disabled: boolean;
    danger?: boolean;
  }) => (
    <View
      role="button"
      testID={props2.testID}
      onPress={props2.disabled ? undefined : props2.onPress}
      style={{
        height: uiControlHeight(26),
        paddingHorizontal: 10,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: props2.danger ? statusColor("danger") : colors().thread,
        backgroundColor: "transparent",
        opacity: props2.disabled ? 0.45 : 1,
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: uiTextSize(12),
          color: props2.danger ? statusColor("danger") : colors().ink,
        }}
      >
        {props2.label}
      </Text>
    </View>
  );

  return (
    <Dialog
      open={props.open}
      testID="conflict-dialog"
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
      onCancel={() => props.onClose()}
      onClose={() => props.onClose()}
      closeOnBackdropPress
      closeOnEscape
      animation="fade"
      backdropStyle={{ backgroundColor: "rgba(44,42,38,0.28)" }}
      style={{
        width: 620,
        height: 460,
        margin: "auto",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors().thread,
        backgroundColor: colors().paper,
        overflow: "hidden",
        flexDirection: "column",
      }}
    >
      <View
        style={{
          height: 54,
          flexShrink: 0,
          paddingHorizontal: 18,
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: colors().thread,
          gap: 10,
        }}
      >
        <Icon name="cloud" color={statusColor("danger")} size={16} />
        <Text style={{ flex: 1, fontSize: uiTextSize(15), fontWeight: "650", color: colors().ink }}>
          {t("sync.conflict.title")}
        </Text>
        <Text style={{ fontSize: uiTextSize(12), color: colors().ink3 }}>{conflicts().length}</Text>
        <View role="button" testID="conflict-close" onPress={props.onClose}>
          <Icon name="x" color={colors().ink2} size={15} />
        </View>
      </View>

      <View style={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8, gap: 6 }}>
        <Text style={{ fontSize: uiTextSize(12.5), color: colors().ink2, lineHeight: uiLineHeight(18) }}>
          {t("sync.conflict.desc")}
        </Text>
        <If when={errorText() !== ""}>
          <Text testID="conflict-error" style={{ fontSize: uiTextSize(12), color: statusColor("danger") }}>
            {errorText()}
          </Text>
        </If>
      </View>

      <Scroll style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 18, paddingBottom: 12, gap: 8 }}>
          <If when={conflicts().length === 0}>
            <Text style={{ fontSize: uiTextSize(13), color: colors().ink3 }}>
              {t("sync.conflict.empty")}
            </Text>
          </If>
          <Each of={conflicts()}>
            {(row) => {
              const item = row();
              const busy = () => busyPath() === item.path || batchBusy();
              return (
                <View
                  style={{
                    padding: 12,
                    borderRadius: 9,
                    borderWidth: 1,
                    borderColor: colors().thread,
                    backgroundColor: colors().editor,
                    gap: 8,
                  }}
                >
                  <Text
                    testID={`conflict-path-${item.path}`}
                    style={{ numberOfLines: 1, fontSize: uiTextSize(13), fontWeight: "560", color: colors().ink }}
                  >
                    {item.path}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
                    <Text style={{ fontSize: uiTextSize(11.5), color: statusColor("danger") }}>
                      {kindLabel(item.kind)}
                    </Text>
                    <Text style={{ fontSize: uiTextSize(11.5), color: colors().ink3 }}>
                      {item.local
                        ? `${t("sync.conflict.localInfo")} · ${formatWhen(item.local.mtimeMs, locale())}`
                        : t("sync.conflict.noLocal")}
                    </Text>
                    <Text style={{ fontSize: uiTextSize(11.5), color: colors().ink3 }}>
                      {item.remote
                        ? `${t("sync.conflict.remoteInfo")} · ${formatWhen(item.remote.mtimeMs, locale())}`
                        : t("sync.conflict.noRemote")}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                    <Each of={CHOICES}>
                      {(choice) => {
                        const value = choice();
                        return (
                          <If when={value !== "keepBoth" || item.kind === "bothModified"}>
                            {chip({
                              testID: `conflict-${item.path}-${value}`,
                              label: choiceLabel(value),
                              disabled: busy(),
                              danger: value === "keepBoth",
                              onPress: () => void apply(item, value),
                            })}
                          </If>
                        );
                      }}
                    </Each>
                    <If when={busyPath() === item.path}>
                      <Text style={{ fontSize: uiTextSize(11.5), color: colors().ink3, alignSelf: "center" }}>
                        {t("sync.conflict.processing")}
                      </Text>
                    </If>
                  </View>
                  <If when={item.kind === "bothModified"}>
                    <Text style={{ fontSize: uiTextSize(11), color: colors().ink3 }}>
                      {t("sync.conflict.keepBothHint")}
                    </Text>
                  </If>
                </View>
              );
            }}
          </Each>
        </View>
      </Scroll>

      <If when={conflicts().length > 1}>
        <View
          style={{
            flexShrink: 0,
            borderTopWidth: 1,
            borderTopColor: colors().thread,
            paddingHorizontal: 18,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Text style={{ fontSize: uiTextSize(12), color: colors().ink3, flex: 1 }}>
            {t("sync.conflict.applyAll")}
          </Text>
          {chip({
            testID: "conflict-apply-local",
            label: t("sync.conflict.keepLocal"),
            disabled: batchBusy() || busyPath() !== "",
            onPress: () => void applyAll("keepLocal"),
          })}
          {chip({
            testID: "conflict-apply-remote",
            label: t("sync.conflict.keepRemote"),
            disabled: batchBusy() || busyPath() !== "",
            onPress: () => void applyAll("keepRemote"),
          })}
          <If when={conflicts().some((item) => item.kind === "bothModified")}>
            {chip({
              testID: "conflict-apply-both",
              label: t("sync.conflict.keepBoth"),
              disabled: batchBusy() || busyPath() !== "",
              onPress: () => void applyAll("keepBoth"),
            })}
          </If>
        </View>
      </If>
    </Dialog>
  );
}
