import { View, host, mount } from "nsh";
import { EditorWorkspace } from "./EditorWorkspace";
import { WindowBar } from "./Toolbar";
import { restoreRenderMode } from "./documentAppearance";
import { setLocalePref } from "./i18n";
import { restoreTheme } from "./theme";
import { restoreTypography } from "./typography";
import { restoreReaderWidth } from "./readerWidth";

const NOTE = `# 海岸观测手记

> 记录潮汐、风向与沿岸植物的细小变化。

## 十月的第一场北风

清晨六点，海面仍然平静。远处的云层被日光染成很淡的金色，礁石间留下昨夜潮水带来的细沙。沿着旧灯塔向东走，能听见风穿过芦苇时轻轻的声响。

### 今日观察

- 潮位：低潮，海水退至第二道礁线
- 风向：北偏东，微风
- 植物：盐地碱蓬开始转红

海岸的季节变化总是从细节开始。先是风里多了一点凉意，接着沙地上的叶片换了颜色。把这些瞬间记下来，几个月后再读，会发现时间留下了清晰的纹路。

## 采样路线

从木栈道尽头沿海岸向南约四百米，在白色灯标附近折返。观察时尽量沿用上次的路线，避免踩入新生的植被区域。

> 今天没有带走任何样本，只留下了几张照片和一页记录。
`;

function Harness() {
  if (host.params.locale === "en") setLocalePref("en");
  return <View style={{ flex: 1, flexDirection: "column" }}>
    <WindowBar showSidebarToggle={false} sidebarOpen={false} onToggleSidebar={() => {}}
      vaultName="Field Notes" title="海岸观测手记" showModes={false} mode="preview" onMode={() => {}} />
    <EditorWorkspace source={NOTE} preview={NOTE} onChange={() => {}} mode="preview"
      onRevealEditor={() => {}} documentId="海岸观测手记.md" />
  </View>;
}

void Promise.all([restoreRenderMode(), restoreTheme(), restoreTypography(), restoreReaderWidth()])
  .then(() => mount(Harness));
