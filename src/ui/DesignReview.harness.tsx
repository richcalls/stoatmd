import { Text, View, host, mount, setColorScheme } from "nsh";
import { EditorWorkspace } from "./EditorWorkspace";
import { SIDEBAR_WIDTH, WindowBar, type ViewMode } from "./Toolbar";
import { Sidebar } from "./Sidebar";
import { ArticleInspector } from "./ArticleInspector";
import { articleModel } from "./articleModel";
import { restoreRenderMode } from "./documentAppearance";
import { Icon } from "./Icon";
import { setLocalePref, t } from "./i18n";
import { chromeColors } from "./chrome";
import { colors, themeId, themePreset, type ThemeId } from "./theme";
import { restoreTypography, uiTextSize } from "./typography";
import { restoreReaderWidth } from "./readerWidth";
import type { FolderNode, NoteItem } from "./vaultModel";

const NOTE = `# Coastal Field Notes

A short log from a week spent walking the shoreline, kept as **Markdown** so it can travel anywhere. See the [field guide](https://example.com/guide) for the naming scheme, or grep for \`tag:tide\` in the vault.

## Morning Observations

The tide was out before six, and the flat light made the survey easy:

- Water line below the second reef marker
- Wind light from the northeast, about 8 knots
- First red leaves on the sea-blite near the boardwalk

Numbered for the report:

1. Photograph the lagoon at low water
2. Compare against last October's entries
3. File the GPS trace with the archive

> Nothing was collected today. I brought back a few photographs and this page of notes.

> [!warning] Tide window
> The survey markers are only reachable for about two hours after low water — plan the walk-back first.

### Equipment Check

The handheld anemometer read consistently high. A quick calibration in TypeScript terms:

\`\`\`ts
const readings = [8.1, 8.4, 7.9, 8.2];
const mean = readings.reduce((a, b) => a + b, 0) / readings.length;
const offset = mean - 7.6; // station reference
\`\`\`

| Instrument | Reading | Status |
| ---------- | ------- | ------ |
| Anemometer | 8.2 kn  | Check  |
| Barometer  | 1017 hPa | OK     |
| Thermometer | 11.4 °C | OK     |

#### Tomorrow's Plan

Head south past the white marker before the tide turns, then write up the comparison.

---

*Filed under Field Notes / Coast.*
`;

const SLOW_NOTE = `# MausBot 资料

## 当前状态

| 项目 | 状态 | 负责人 | 备注 |
| ---- | ---- | ------ | ---- |
| 网关服务 | 运行中 | 运维组 | 最近重启于周一 |
| 备份任务 | 已启用 | 运维组 | 每日凌晨三点执行 |
| 日志轮转 | 已启用 | 平台组 | 保留最近十四天 |
| 监控告警 | 待配置 | 平台组 | 等待告警渠道确认 |
| 证书续期 | 自动 | 安全组 | 到期前三十天续期 |
| 数据同步 | 运行中 | 数据组 | 每小时增量同步 |
| 镜像仓库 | 运行中 | 数据组 | 每周清理悬空镜像 |
| 访问审计 | 已启用 | 安全组 | 月度审计报告 |

> [!warning] 重要 请立刻把 \`/etc/openmausbot/backup-password\` 保存到密码管理器。

## 常用命令

\`\`\`bash
sudo systemctl status openmausbot
sudo systemctl restart openmausbot
sudo systemctl enable openmausbot
journalctl -u openmausbot -f
journalctl -u openmausbot --since today
journalctl -u openmausbot -p err -b
docker ps --filter name=mausbot
docker logs -f mausbot-worker
docker exec -it mausbot-worker sh
docker compose pull
docker compose up -d
docker compose restart worker
docker system df
docker system prune -f
df -h /var/lib/openmausbot
\`\`\`

## 提醒

- 升级前先跑一遍备份，确认恢复流程可用
- 修改配置后重启网关服务并观察五分钟日志
- 每周检查一次磁盘占用与告警渠道是否畅通
`;

const SELECTED_ID = "Field Notes/Coast/Coastal Field Notes.md";

const FOLDERS: FolderNode[] = [
  { id: "", name: "", path: "", depth: 0 },
  { id: "Field Notes", name: "Field Notes", path: "Field Notes", depth: 1 },
  { id: "Field Notes/Coast", name: "Coast", path: "Field Notes/Coast", depth: 2 },
  { id: "Field Notes/Fells", name: "Fells", path: "Field Notes/Fells", depth: 2 },
  { id: "Projects", name: "Projects", path: "Projects", depth: 1 },
];

const NOTES: NoteItem[] = [
  { id: "Field Notes/Coast/Coastal Field Notes.md", path: "Field Notes/Coast/Coastal Field Notes.md", title: "Coastal Field Notes", mtimeMs: 8 },
  { id: "Field Notes/Coast/Tide Tables.md", path: "Field Notes/Coast/Tide Tables.md", title: "Tide Tables", mtimeMs: 7 },
  { id: "Field Notes/Fells/Autumn Traverse.md", path: "Field Notes/Fells/Autumn Traverse.md", title: "Autumn Traverse", mtimeMs: 6 },
  { id: "Field Notes/Reading List.md", path: "Field Notes/Reading List.md", title: "Reading List", mtimeMs: 5 },
  { id: "Projects/Stoat Roadmap.md", path: "Projects/Stoat Roadmap.md", title: "Stoat Roadmap", mtimeMs: 4 },
  { id: "Projects/Sync Design.md", path: "Projects/Sync Design.md", title: "Sync Design", mtimeMs: 3 },
  { id: "Daily Scratch.md", path: "Daily Scratch.md", title: "Daily Scratch", mtimeMs: 2 },
  { id: "Ideas.md", path: "Ideas.md", title: "Ideas", mtimeMs: 1 },
];

function Harness() {
  setLocalePref("en");
  const theme = (host.params.theme ?? "merino-light") as ThemeId;
  const preset = themePreset(theme);
  themeId.set(preset.id);
  setColorScheme(preset.mode);

  const mode = (host.params.mode ?? "preview") as ViewMode;
  const inspector = host.params.inspector === true;
  const empty = host.params.empty === true;
  const sidebar = host.params.sidebar !== false;
  const note = host.params.note === "slow" ? SLOW_NOTE : NOTE;
  const noteTitle = host.params.note === "slow" ? "MausBot 资料" : "Coastal Field Notes";

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: sidebar ? colors().sidebar : colors().paper,
        backgroundImage: sidebar ? chromeColors().shellFinish : "none",
        flexDirection: "column",
      }}
    >
      <WindowBar
        showSidebarToggle
        sidebarOpen={sidebar}
        onToggleSidebar={() => {}}
        vaultName="Field Journal"
        title={empty ? "" : noteTitle}
        showModes={!empty}
        mode={mode}
        onMode={() => {}}
      />
      <View style={{ flex: 1, flexDirection: "row", minHeight: 0 }}>
        {sidebar ? (
          <View style={{ width: SIDEBAR_WIDTH, flexShrink: 0 }}>
          <Sidebar
            folders={FOLDERS}
            notes={NOTES}
            selectedNoteId={empty ? "" : SELECTED_ID}
            folderId="Field Notes/Coast"
            collapsed={[]}
            query=""
            onQuery={() => {}}
            onSelectNote={() => {}}
            onSelectFolder={() => {}}
            onToggleFolder={() => {}}
            onOpenVault={() => {}}
            onNewNote={() => {}}
            onSync={() => {}}
            vaultRoot="/notes/Field Journal"
            syncPhase="synced"
            syncConflictCount={0}
          />
          </View>
        ) : null}
        <View style={{ flex: 1, minWidth: 0, paddingLeft: 0, paddingRight: sidebar ? 9 : 0, paddingBottom: sidebar ? 9 : 0 }}>
          <View
            style={{
              flex: 1,
              minWidth: 0,
              flexDirection: "row",
              overflow: "hidden",
              borderRadius: sidebar ? 10 : 0,
              borderWidth: sidebar ? 1 : 0,
              borderColor: chromeColors().panelEdge,
              boxShadow: sidebar ? chromeColors().panelShadow : "none",
              backgroundColor: colors().paper,
              position: "relative",
            }}
          >
            <View style={{ flex: 1, minWidth: 0, flexDirection: "column" }}>
              {empty ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <Icon name="file-text" color={colors().ink3} size={28} />
                  <Text style={{ fontSize: uiTextSize(13), color: colors().ink2 }}>{t("mobile.selectNote")}</Text>
                </View>
              ) : (
                <EditorWorkspace
                  source={note}
                  preview={note}
                  onChange={() => {}}
                  mode={mode}
                  documentId={SELECTED_ID}
                  onRevealEditor={() => {}}
                  onVisibleBlock={() => {}}
                />
              )}
            </View>
            {!empty && inspector ? (
              <View style={{ width: 222, flexShrink: 0 }}>
                <ArticleInspector
                  tab="outline"
                  onTab={() => {}}
                  onClose={() => {}}
                  mode={mode}
                  model={articleModel(note)}
                  createdMs={1728000000000}
                  modifiedMs={1730500000000}
                  path={SELECTED_ID}
                  visibleBlock={0}
                  onJump={() => {}}
                />
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

void Promise.all([restoreRenderMode(), restoreTypography(), restoreReaderWidth()])
  .then(() => mount(Harness));
