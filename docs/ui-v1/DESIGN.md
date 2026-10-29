# StoatMD · DESIGN

> 世界：**风格 B — 轻与原生 + StoatMD「织线」**（曾用名 LoomMD）  
> 遵循 [impeccable](https://github.com/pbakaus/impeccable) craft floor · Operate  
> **不**使用 Impeccable 自家 Neo Kinpaku（金漆 / 漆黑）品牌

## 世界一句话

安静的奶油纸上，栏与栏之间是一根细织线；选中时那根线变成靛蓝，别的都不抢笔。

## 色板

主题 = **只换颜色 token**（paper / surface / ink / thread / accent）。栏宽、控件结构、织线规则不变。禁止换布局皮肤；v1 不做自定义色板编辑器。

**实现按 token 切换即可。UI 稿不必为每套主题单独出 PNG**；`05-mac-settings` 主题网格仅为示意，**完整色号以本文为准**。

### Token 命名（实现别名）

| 文档 / CSS | 别名（可映射） | 用途 |
|------------|----------------|------|
| `--paper` | `--bg` | 窗口/页面底 |
| `--sidebar` | `--surface`（侧） | 左栏 |
| `--list` | — | 中栏列表 |
| `--editor` / `--preview` | `--surface`（主） | 右栏编辑/预览 |
| `--ink` | — | 主文字 |
| `--ink-2` | `--ink-muted` | 次文字（≥4.5:1） |
| `--ink-3` | — | 占位/弱（≥4.5:1） |
| `--thread` | — | 1px 栏分隔 |
| `--indigo` | `--accent` | 选中织线、链接、分段强调 |
| `--indigo-soft` | `--accent-soft` | 选中行底 |

非靛蓝主题中：`--indigo` / `--indigo-soft` **token 名可保留**，值映射为该套的 accent / accent-soft。

语法色（各套可微调，默认跟随）：标题=`--accent`；粗体标记=`--ink-3`；行内代码浅 `#8B5E3C` / 深 `#C4A484`；引用浅 `#4F6B4F` / 深 `#8FAF8F`。

### 默认两套（稿面与 `shared.css`）

#### 浅色默认 · 织线纸白 Weave Paper

| Token | Hex | 用途 |
|-------|-----|------|
| `--paper` | `#F7F3EB` | 窗口/页面底 |
| `--sidebar` | `#F1EBE2` | 左栏略深 |
| `--list` | `#FAF7F1` | 中栏 |
| `--editor` / `--preview` | `#FFFCF7` | 右栏略亮 |
| `--ink` | `#2C2A26` | 主文字 |
| `--ink-2` | `#5F5A54` | 次文字 |
| `--ink-3` | `#6E6860` | 占位/弱 |
| `--thread` | `#DDD5C8` | 1px 栏分隔 |
| `--indigo` / accent | `#3D5A80` | 选中织线、链接 |
| `--indigo-soft` / accent-soft | `#E4EBF3` | 选中行底 |

#### 深色默认 · 暖夜炭 Warm Charcoal

| Token | Hex | 用途 |
|-------|-----|------|
| `--paper` | `#1C1A18` | 暖炭灰（非纯黑） |
| `--sidebar` | `#221F1C` | |
| `--list` | `#24211E` | |
| `--editor` / `--preview` | `#1F1D1A` | |
| `--ink` | `#EDE9E3` | |
| `--ink-2` | `#B0AAA2` | |
| `--ink-3` | `#9A948C` | |
| `--thread` | `#33302C` | |
| `--indigo` / accent | `#7A9CC0` | 深色提亮一档 |
| `--indigo-soft` / accent-soft | `#2A3340` | |

## 织线规则

- 栏分隔、工具条底边、引用条：**一律 1px** `--thread` 或 `--indigo`
- 选中态：淡 accent 底 + **左侧 1px accent 织线**（禁止 2px+ 彩条）
- 顶栏底边：纯色 1px thread，**不要**装饰性渐变织线

## 字体与字号（Operate）

系统 UI 字体即可（SF Pro / PingFang）；源码用 SF Mono / Menlo。  
用户可在**设置 → 字体**改：正文字体（下拉选择系统字体，可搜索，含系统默认）、字号、行高；预览一行真文案。源码高亮区仍用等宽，不受正文字体影响。  
固定 rem 阶梯，比例约 1.125–1.2。预览正文测宽约 **65–75ch**（`max-width: 42rem`）。

| 场景 | 字号 | 字重 |
|------|------|------|
| 窗口标题 | 13 | 510 |
| 文件夹行 | 13 | 500 |
| 笔记列表标题 | 14 | 560 |
| 相对时间 | 12 | 400 |
| 源码 | 13.5 / lh 1.75 | 400 mono |
| 预览 H1 / H2 / 正文 | 26 / 18 / 15 | 650 / 600 / 400 |
| iPhone 导航标题 | 16 | 600 |

## 浏览器表面

- `::selection`：accent 浅底 + 主文字色
- 光标 / `caret-color`：`--accent`（`--indigo`）
- `:focus-visible`：2px accent outline + 2px offset

## 设置面板

居中 sheet（约 720×≤780）叠在浅色主窗口上：左导航（外观 / 字体 / **同步**）+ 右内容。**不做 MCP**（无自有服务器、远程 Agent 无法挂本地 MCP）。外观区为 Slack 式主题网格；字体区为下拉 + 步进器 + 预览条。顶栏 **无 Palette**；Gear 打开本面板。

`05-mac-settings` 主题网格：**示意**；完整色号与模式以本节「主题预设」为准。**不必**为每套主题重出 PNG。

## 主题预设（12 套 · light / dark）

入口：**设置 → 外观**。交互参考 Slack：网格卡片 · 左侧圆形色预览 · 右侧中文短名 · 选中描边。  
每套标明 **mode**；实现时整表替换 token，无需单独视觉稿。

### 总览

| # | 名称（中 / EN） | Mode | paper | ink | accent | 备注 |
|---|-----------------|------|-------|-----|--------|------|
| 1 | 织线纸白 / Weave Paper | light | `#F7F3EB` | `#2C2A26` | `#3D5A80` | **浅色默认** |
| 2 | 纯白 / Pure White | light | `#FFFFFF` | `#1A1A1A` | `#3D5A80` | **必须有**；主底纯白 |
| 3 | 鼠尾草 / Sage | light | `#F2F4F0` | `#2A2E28` | `#5A7A62` | |
| 4 | 墨灰 / Ink Gray | light | `#F4F4F2` | `#2C2C2A` | `#555555` | |
| 5 | 砂褐 / Sand | light | `#F5EDE3` | `#3A2F26` | `#7A5C3E` | |
| 6 | 雾蓝 / Mist Blue | light | `#F0F3F7` | `#2A3038` | `#5A7A9A` | |
| 7 | 樱雾 / Sakura Mist | light | `#F8F2F3` | `#3A2E32` | `#9A6B78` | |
| 8 | 青瓷 / Celadon | light | `#F0F4F1` | `#2A322C` | `#5A7A68` | |
| 9 | 暖夜炭 / Warm Charcoal | dark | `#1C1A18` | `#EDE9E3` | `#7A9CC0` | **深色默认** |
| 10 | 靛蓝浓 / Deep Indigo | dark | `#151A24` | `#E4E8F0` | `#5B7FB5` | |
| 11 | 暮紫 / Dusk Violet | dark | `#1E1A22` | `#E8E4EC` | `#9A7AB0` | |
| 12 | 松烟 / Pine Smoke | dark | `#181C18` | `#E4E8E4` | `#7A9A7A` | |

（原「石灰」与墨灰过近，本表以 **纯白** 替换，保证亮色含 `#FFFFFF` 套。）

### 1 · 织线纸白 Weave Paper · light · 默认

| Token | Hex |
|-------|-----|
| `--paper` / `--bg` | `#F7F3EB` |
| `--sidebar` | `#F1EBE2` |
| `--list` | `#FAF7F1` |
| `--editor` / `--preview` / surface | `#FFFCF7` |
| `--ink` | `#2C2A26` |
| `--ink-2` / `--ink-muted` | `#5F5A54` |
| `--ink-3` | `#6E6860` |
| `--thread` | `#DDD5C8` |
| `--accent` / `--indigo` | `#3D5A80` |
| `--accent-soft` / `--indigo-soft` | `#E4EBF3` |

### 2 · 纯白 Pure White · light · **必选套**

主底 / 主表面为 **`#FFFFFF`**（正海反馈：必须有纯白）。

| Token | Hex |
|-------|-----|
| `--paper` / `--bg` | `#FFFFFF` |
| `--sidebar` | `#F5F5F5` |
| `--list` | `#FAFAFA` |
| `--editor` / `--preview` / surface | `#FFFFFF` |
| `--ink` | `#1A1A1A` |
| `--ink-2` / `--ink-muted` | `#5C5C5C` |
| `--ink-3` | `#737373` |
| `--thread` | `#E5E5E5` |
| `--accent` / `--indigo` | `#3D5A80` |
| `--accent-soft` / `--indigo-soft` | `#E8EEF5` |

### 3 · 鼠尾草 Sage · light

| Token | Hex |
|-------|-----|
| `--paper` / `--bg` | `#F2F4F0` |
| `--sidebar` | `#E8EBE4` |
| `--list` | `#F6F7F4` |
| `--editor` / `--preview` | `#F9FAF7` |
| `--ink` | `#2A2E28` |
| `--ink-2` / `--ink-muted` | `#5A6058` |
| `--ink-3` | `#6E746C` |
| `--thread` | `#D0D6CC` |
| `--accent` | `#5A7A62` |
| `--accent-soft` | `#E0E8E2` |

### 4 · 墨灰 Ink Gray · light

| Token | Hex |
|-------|-----|
| `--paper` / `--bg` | `#F4F4F2` |
| `--sidebar` | `#EAEAE8` |
| `--list` | `#F7F7F5` |
| `--editor` / `--preview` | `#FAFAF8` |
| `--ink` | `#2C2C2A` |
| `--ink-2` / `--ink-muted` | `#5A5A58` |
| `--ink-3` | `#6E6E6C` |
| `--thread` | `#D4D4D2` |
| `--accent` | `#555555` |
| `--accent-soft` | `#E8E8E6` |

### 5 · 砂褐 Sand · light

| Token | Hex |
|-------|-----|
| `--paper` / `--bg` | `#F5EDE3` |
| `--sidebar` | `#EDE3D6` |
| `--list` | `#F8F2EA` |
| `--editor` / `--preview` | `#FBF6F0` |
| `--ink` | `#3A2F26` |
| `--ink-2` / `--ink-muted` | `#6A5A4C` |
| `--ink-3` | `#7E6E60` |
| `--thread` | `#D9CBB8` |
| `--accent` | `#7A5C3E` |
| `--accent-soft` | `#EDE4D8` |

### 6 · 雾蓝 Mist Blue · light

| Token | Hex |
|-------|-----|
| `--paper` / `--bg` | `#F0F3F7` |
| `--sidebar` | `#E8EDF3` |
| `--list` | `#F4F6F9` |
| `--editor` / `--preview` | `#F7F9FC` |
| `--ink` | `#2A3038` |
| `--ink-2` / `--ink-muted` | `#5A6470` |
| `--ink-3` | `#6E7884` |
| `--thread` | `#D0D8E2` |
| `--accent` | `#5A7A9A` |
| `--accent-soft` | `#E2EAF2` |

### 7 · 樱雾 Sakura Mist · light

| Token | Hex |
|-------|-----|
| `--paper` / `--bg` | `#F8F2F3` |
| `--sidebar` | `#F0E8EA` |
| `--list` | `#FAF5F6` |
| `--editor` / `--preview` | `#FCF8F9` |
| `--ink` | `#3A2E32` |
| `--ink-2` / `--ink-muted` | `#6A5A60` |
| `--ink-3` | `#7E6E74` |
| `--thread` | `#E0D4D6` |
| `--accent` | `#9A6B78` |
| `--accent-soft` | `#F0E4E7` |

### 8 · 青瓷 Celadon · light

| Token | Hex |
|-------|-----|
| `--paper` / `--bg` | `#F0F4F1` |
| `--sidebar` | `#E6EBE7` |
| `--list` | `#F4F7F5` |
| `--editor` / `--preview` | `#F7FAF8` |
| `--ink` | `#2A322C` |
| `--ink-2` / `--ink-muted` | `#5A645C` |
| `--ink-3` | `#6E786F` |
| `--thread` | `#D0D8D2` |
| `--accent` | `#5A7A68` |
| `--accent-soft` | `#E0E8E2` |

### 9 · 暖夜炭 Warm Charcoal · dark · 默认

| Token | Hex |
|-------|-----|
| `--paper` / `--bg` | `#1C1A18` |
| `--sidebar` | `#221F1C` |
| `--list` | `#24211E` |
| `--editor` / `--preview` | `#1F1D1A` |
| `--ink` | `#EDE9E3` |
| `--ink-2` / `--ink-muted` | `#B0AAA2` |
| `--ink-3` | `#9A948C` |
| `--thread` | `#33302C` |
| `--accent` / `--indigo` | `#7A9CC0` |
| `--accent-soft` / `--indigo-soft` | `#2A3340` |

### 10 · 靛蓝浓 Deep Indigo · dark

| Token | Hex |
|-------|-----|
| `--paper` / `--bg` | `#151A24` |
| `--sidebar` | `#1A2130` |
| `--list` | `#1C2434` |
| `--editor` / `--preview` | `#171E2A` |
| `--ink` | `#E4E8F0` |
| `--ink-2` / `--ink-muted` | `#A8B0C0` |
| `--ink-3` | `#8E96A6` |
| `--thread` | `#2A3344` |
| `--accent` | `#5B7FB5` |
| `--accent-soft` | `#243047` |

### 11 · 暮紫 Dusk Violet · dark

| Token | Hex |
|-------|-----|
| `--paper` / `--bg` | `#1E1A22` |
| `--sidebar` | `#242028` |
| `--list` | `#26222A` |
| `--editor` / `--preview` | `#211D25` |
| `--ink` | `#E8E4EC` |
| `--ink-2` / `--ink-muted` | `#B0A8B8` |
| `--ink-3` | `#968E9E` |
| `--thread` | `#342E3A` |
| `--accent` | `#9A7AB0` |
| `--accent-soft` | `#2E2836` |

### 12 · 松烟 Pine Smoke · dark

| Token | Hex |
|-------|-----|
| `--paper` / `--bg` | `#181C18` |
| `--sidebar` | `#1C221C` |
| `--list` | `#1E241E` |
| `--editor` / `--preview` | `#1A201A` |
| `--ink` | `#E4E8E4` |
| `--ink-2` / `--ink-muted` | `#A8B0A8` |
| `--ink-3` | `#8E968E` |
| `--thread` | `#2C322C` |
| `--accent` | `#7A9A7A` |
| `--accent-soft` | `#243024` |

## 禁止（craft floor + 本世界）

- 标题上方的 kicker / eyebrow 标签（绝对禁止）
- 嵌套卡片；同尺寸 icon+标题+正文卡片网格当结构
- 渐变字；装饰性玻璃模糊
- 选中 / 引用 / 列表项左侧色条 **>1px**
- Inter 全家桶；紫蓝渐变；每个标题上的圆角方块图标
- 纯黑 `#000` 作大面积底；**默认**浅底仍用织线纸白（非纯白）。纯白 `#FFFFFF` 仅作为可选预设「纯白 / Pure White」
- Kinpaku 金漆、漆黑品牌语言
- Unicode / emoji 当图标系统（用 Phosphor）
- 顶栏独立主题 Palette（主题归设置）

## 栏宽与折叠（Mac 1440×900）

| 栏 | 展开 | 折叠 |
|----|------|------|
| 文件夹树 | 200px | **图标轨 48px**，或完全藏起 |
| 笔记列表 | 280px | 完全藏起 |
| 编辑/预览 | 剩余；分栏 1:1 | 左右栏收起后**占满**中间 |

折叠控件：编辑工具条左侧 `SidebarSimple`（文件夹）+ 列表开关；图标为主，tooltip 中英。交互手感对齐 VS Code（可独立收左 / 收中）。

## 参考手感

妙言（miaoyan.app）：轻、原生、专注书写。差异：靛蓝织线、默认分栏、选中左侧 1px 线、侧栏底同步小状态（未开启 / 同步中 / 已同步 / 冲突）、设置内主题色板与同步段。


## 同步 UI（Mac · 织线纸白）

延续设置 sheet 与 1px 织线；不引入第二套视觉世界。

| 屏 | 要点 |
|----|------|
| S1 设置·同步 | 未连接英雄区 + 主 CTA「开启同步」；Agent 短注 |
| S9 付费墙 | 轻卡片挡在开启后；未付费不进 OAuth |
| S2 提供商 | 仅 GDrive / Dropbox；均带「推荐 · Agent」徽章 |
| S3 授权中 | 窄 modal + spinner + 取消 |
| S5 首轮同步 | 进度条 + 文件数；可后台 |
| S6 冲突 | 宽 modal；按文件三选一；批量条；禁止预勾覆盖 |
| S7 侧栏状态 | 底栏安静：勾/转圈/冲突琥珀点；点击进设置或冲突表 |

控件以图标为主；中文示意文案须能换成等长英文。冲突强调色用暖褐 `#8B5E3C`（非恐吓红、非紫蓝渐变）。
