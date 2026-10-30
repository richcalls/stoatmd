import { Scroll, Text, View, cleanup, effect, signal } from "nsh";
import { Button } from "nsh/base";
import {
  activeHeadingFromBlock,
  activeHeadingFromLine,
  noteFormat,
  type ArticleModel,
  type OutlineEntry,
} from "./articleModel";
import { Icon } from "./Icon";
import { locale, t } from "./i18n";
import { watchEditorScroll } from "./scrollSync";
import { colors } from "./theme";
import type { ViewMode } from "./Toolbar";
import { formatDateTime } from "./vaultModel";

export type InspectorTab = "outline" | "info";

type Props = {
  tab: InspectorTab;
  onTab: (tab: InspectorTab) => void;
  onClose: () => void;
  mode: ViewMode;
  model: ArticleModel;
  /** 当前文章的元数据（来自打开时的文件信息）。 */
  createdMs: number;
  modifiedMs: number;
  path: string;
  /** 阅读模式下的视口顶部块；滚动高亮用。 */
  visibleBlock: number;
  onJump: (heading: OutlineEntry) => void;
};

function TabButton(props: {
  testID: string;
  icon: "list-tree" | "info";
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Button
      testID={props.testID}
      role="tab"
      selected={props.active}
      accessibilityLabel={props.label}
      onPress={props.onPress}
      style={{
        height: 27,
        paddingHorizontal: 8,
        borderRadius: 5,
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: props.active ? colors().searchBg : "transparent",
      }}
      activeStyle={{ opacity: 0.75 }}
    >
      <Icon
        name={props.icon}
        color={props.active ? colors().ink : colors().ink3}
        size={13}
      />
      <Text
        style={{
          fontSize: 12,
          fontWeight: props.active ? "560" : "450",
          color: props.active ? colors().ink : colors().ink2,
        }}
      >
        {props.label}
      </Text>
    </Button>
  );
}

function DetailRow(props: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 8,
        marginBottom: 11,
      }}
    >
      <Text style={{ fontSize: 11, color: colors().ink3 }}>{props.label}</Text>
      <Text
        numberOfLines={1}
        style={{ fontSize: 11, color: colors().ink, textAlign: "right" }}
      >
        {props.value}
      </Text>
    </View>
  );
}

function SectionTitle(props: { children: any }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: "500",
        color: colors().ink3,
        marginBottom: 11,
      }}
    >
      {props.children}
    </Text>
  );
}

/** 右侧文章栏：目录（滚动高亮、点击定位）与信息（统计、文件元数据、标签）。 */
export function ArticleInspector(props: Props) {
  const activeId = signal("");

  // 目录页签才需要滚动监听：源码/分栏读编辑器偏移，阅读读预览可见块。
  effect(() => {
    if (props.tab !== "outline") return;
    if (props.mode === "preview") {
      activeId.set(activeHeadingFromBlock(props.model.headings, props.visibleBlock));
      return;
    }
    const stop = watchEditorScroll((y) => {
      activeId.set(activeHeadingFromLine(props.model.headings, y));
    });
    cleanup(stop);
  });

  const jump = (heading: OutlineEntry) => {
    activeId.set(heading.id);
    props.onJump(heading);
  };

  const created = () =>
    formatDateTime(props.createdMs, locale()) || t("info.unknown");
  const modified = () =>
    formatDateTime(props.modifiedMs, locale()) || t("info.unknown");

  const readingValue = () => {
    const minutes = props.model.stats.readingMinutes;
    return minutes > 0
      ? t("info.aboutMinutes", { n: minutes })
      : t("info.minutes", { n: 0 });
  };

  return (
    <View
      testID="article-inspector"
      style={{
        flex: 1,
        minWidth: 0,
        backgroundColor: colors().sidebar,
        borderLeftWidth: 1,
        borderLeftColor: colors().thread,
        flexDirection: "column",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 3,
          paddingHorizontal: 12,
          paddingTop: 13,
          paddingBottom: 14,
        }}
      >
        <TabButton
          testID="inspector-tab-outline"
          icon="list-tree"
          label={t("inspector.outline")}
          active={props.tab === "outline"}
          onPress={() => props.onTab("outline")}
        />
        <TabButton
          testID="inspector-tab-info"
          icon="info"
          label={t("inspector.info")}
          active={props.tab === "info"}
          onPress={() => props.onTab("info")}
        />
        <View style={{ flex: 1 }} />
        <Button
          testID="inspector-close"
          accessibilityLabel={t("inspector.close")}
          tooltip={<Text style={{ fontSize: 12 }}>{t("inspector.close")}</Text>}
          onPress={props.onClose}
          style={{
            width: 25,
            height: 25,
            borderRadius: 5,
            alignItems: "center",
            justifyContent: "center",
          }}
          activeStyle={{ opacity: 0.7 }}
        >
          <Icon name="x" color={colors().ink3} size={13} />
        </Button>
      </View>

      <Scroll style={{ flex: 1 }} contentStyle={{ paddingHorizontal: 12, paddingBottom: 18 }}>
        <If when={props.tab === "outline"}>
          <View>
            <Text
              style={{
                fontSize: 11,
                color: colors().ink3,
                marginHorizontal: 8,
                marginBottom: 10,
              }}
            >
              {t("inspector.structure")}
            </Text>
            <If when={props.model.headings.length === 0}>
              <View
                testID="inspector-outline-empty"
                style={{ paddingHorizontal: 8, paddingTop: 4, gap: 5 }}
              >
                <Text style={{ fontSize: 12, color: colors().ink2 }}>
                  {t("inspector.outline.empty")}
                </Text>
                <Text style={{ fontSize: 11, color: colors().ink3, lineHeight: 17 }}>
                  {t("inspector.outline.emptyHint")}
                </Text>
              </View>
            </If>
            <View testID="inspector-outline" style={{ gap: 2 }}>
              <Each of={props.model.headings} key={(heading) => heading.id}>
                {(row) => {
                  const heading = () => row();
                  const active = () => activeId() === heading().id;
                  return (
                    <Button
                      testID={`outline-${heading().id}`}
                      accessibilityLabel={heading().text}
                      tooltip={<Text style={{ fontSize: 12 }}>{heading().text}</Text>}
                      onPress={() => jump(heading())}
                      style={{
                        minHeight: 31,
                        paddingVertical: 5,
                        paddingRight: 9,
                        paddingLeft: 9 + (heading().level - 1) * 11,
                        borderRadius: 4,
                        backgroundColor: active() ? colors().accentSoft : "transparent",
                        justifyContent: "center",
                      }}
                      activeStyle={{ opacity: 0.75 }}
                    >
                      <Text
                        numberOfLines={1}
                        style={{
                          fontSize: heading().level === 1 ? 12 : 11,
                          fontWeight: active() ? "560" : "450",
                          color: active() ? colors().accent : colors().ink2,
                        }}
                      >
                        {heading().text}
                      </Text>
                    </Button>
                  );
                }}
              </Each>
            </View>
          </View>
        </If>

        <If when={props.tab === "info"}>
          <View testID="inspector-info">
            <SectionTitle>{t("info.stats")}</SectionTitle>
            <View>
              <DetailRow
                label={t("info.chars")}
                value={String(props.model.stats.chars)}
              />
              <DetailRow label={t("info.readingTime")} value={readingValue()} />
              <DetailRow
                label={t("info.paragraphs")}
                value={String(props.model.stats.paragraphs)}
              />
              <DetailRow
                label={t("info.headings")}
                value={String(props.model.stats.headings)}
              />
            </View>

            <View
              style={{
                height: 1,
                backgroundColor: colors().thread,
                marginTop: 6,
                marginBottom: 17,
              }}
            />
            <SectionTitle>{t("info.file")}</SectionTitle>
            <View>
              <DetailRow label={t("info.created")} value={created()} />
              <DetailRow label={t("info.modified")} value={modified()} />
              <DetailRow label={t("info.format")} value={noteFormat(props.path)} />
              <View style={{ marginBottom: 11 }}>
                <Text
                  style={{ fontSize: 11, color: colors().ink3, marginBottom: 6 }}
                >
                  {t("info.path")}
                </Text>
                <Text
                  selectable
                  style={{ fontSize: 11, color: colors().ink2, lineHeight: 16 }}
                >
                  {props.path}
                </Text>
              </View>
            </View>

            <View
              style={{
                height: 1,
                backgroundColor: colors().thread,
                marginTop: 6,
                marginBottom: 17,
              }}
            />
            <SectionTitle>{t("info.tags")}</SectionTitle>
            <If when={props.model.tags.length === 0}>
              <Text
                testID="inspector-no-tags"
                style={{ fontSize: 11, color: colors().ink3 }}
              >
                {t("info.noTags")}
              </Text>
            </If>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
              <Each of={props.model.tags}>
                {(row) => (
                  <View
                    style={{
                      backgroundColor: colors().searchBg,
                      borderRadius: 4,
                      paddingHorizontal: 7,
                      paddingVertical: 3,
                    }}
                  >
                    <Text style={{ fontSize: 10.5, color: colors().ink2 }}>
                      {row()}
                    </Text>
                  </View>
                )}
              </Each>
            </View>
          </View>
        </If>
      </Scroll>
    </View>
  );
}
