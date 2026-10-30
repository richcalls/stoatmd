# StoatMD UI 定稿说明 · ui-v1-final

> **FINAL** · 风格 B · impeccable craft floor · Operate  
> 产品定名：**StoatMD**（曾用名 LoomMD；仓库已更名为 `richcalls/stoatmd`；路径 `docs/ui-v1/` 与本地 `loommd/` 可暂留）  
> 相对源稿：`/workspace/loommd/ui-v1/`  
> 日期：2026-10-29（Asia/Shanghai）  
> 署名：forecho

> **布局更新（2026-10-30）**：macOS 窗口布局以 [../ui-v2/README.md](../ui-v2/README.md) 为准——统一窗口栏、通高左栏、内嵌画布与可收起文章栏。本文件其余视觉与交互约定继续有效；文中「编辑工具条 / 顶栏悬停开关 / 260px 左栏」等布局描述已被取代。

## 定稿范围

Mac 两栏主界面（浅/深）+ 折叠态 + iPhone 编辑 + Mac 设置（主题·字体·同步可进）+ **同步 S1/S2/S3/S5/S6/S7/S9** + overview。  
产品边界与色板世界见同目录 `PRODUCT.md`、`DESIGN.md`。

## 相对 v1 的改动（impeccable）

| # | 项 | v1 | 定稿 |
|---|----|----|------|
| 1 | 选中左侧织线 | `2px` | **`1px`**（folder + note-item） |
| 2 | 预览引用 | 底色 + `2px` 左边线 | **无底色、无侧边线**（Kami：缩进 + olive） |
| 3 | 顶栏底边 | 靛蓝↔thread 渐变装饰 | **纯色 1px `--thread`** |
| 4 | 侧栏「笔记」标签 | uppercase + 大字距（近 eyebrow） | 普通字重/字距的安静分区标签 |
| 5 | 弱文字对比 | ink-3 约 2.9:1 | 浅 `#6E6860` / 深 `#9A948C`，占位 ≥4.5:1 |
| 6 | 次文字 | `#6B6560` | `#5F5A54`（浅）略加深 |
| 7 | 浏览器表面 | 未主题化 | `::selection`、`caret-color`、`:focus-visible` |
| 8 | 预览测宽 | 栏宽撑满 | `.prev { max-width: 720px }` |
| 9 | 标题上边距 | H2 上下较均 | 上 > 下（32 / 10，Kami） |
| 10 | overview 品牌块 | 靛蓝圆角方块 + 线标（AI slop 典型） | **删除**；标题自重 |
| 11 | overview 屏号标签 | `01 · MAC…` 序号装饰 | 去掉序号，保留可读屏名 |
| 12 | 文档 | 仅 DESIGN-NOTES | 补 `PRODUCT.md` + `DESIGN.md` |

约定（仍有效）：默认 **Paper** 浅色 / **Nord** 深色（25 套 Otty 主题）、Mac 默认分栏、非 WYSIWYG。**同步已升正式**（不再灰显）；文案中文示意、结构出海多语言。

## 交付清单

| 文件 | 说明 |
|------|------|
| `01-mac-main-light.html` / `.png` | Mac 三栏 · 浅色 · 顶栏无 Palette |
| `02-mac-main-dark.html` / `.png` | Mac 三栏 · 深色 |
| `03-iphone-edit-light.html` / `.png` | iPhone 编辑 · 浅色 |
| `04-iphone-edit-dark.html` / `.png` | iPhone 编辑 · 深色 |
| `05-mac-settings.html` / `.png` | Mac 设置：主题网格（示意）+ 字体；左导航仅外观 / 字体 / 同步（**已砍 MCP**）；完整色号见 DESIGN.md |
| `09-mac-sync-s1.html` / `.png` | S1 设置·同步 · 未连接 + CTA |
| `10-mac-sync-s9.html` / `.png` | S9 付费墙（开启后） |
| `11-mac-sync-s2.html` / `.png` | S2 提供商：GDrive / Dropbox |
| `12-mac-sync-s6.html` / `.png` | S6 冲突处理弹层 |
| `13-mac-sync-s7.html` / `.png` | S7 侧栏冲突小状态 |
| `13b-mac-sync-s7-ok.html` / `.png` | S7 侧栏已同步 |
| `14-mac-sync-s3.html` / `.png` | S3 授权中（可选） |
| `15-mac-sync-s5.html` / `.png` | S5 首轮同步中（可选） |
| `SYNC-FLOW.md` | 同步流程规划（与仓库 SYNC.md 对齐） |
| `06-mac-rail-light.html` / `.png` | Mac · 左栏收为图标轨 · 浅色 |
| `07-mac-focus-light.html` / `.png` | Mac · 收左+中 · 仅编辑器 · 浅色 |
| `08-mac-focus-dark.html` / `.png` | Mac · 仅编辑器 · 深色 |
| `overview.html` / `.png` | 总览 |
| `shared.css` | token + chrome + settings |
| `PRODUCT.md` | 产品事实 |
| `DESIGN.md` | 视觉世界与禁止项 |
| `DESIGN-NOTES.md` | 本文 |
| `screenshot.py` / `.mjs` | 出图脚本 |

## 附录 · Phosphor 映射（短表）

实现时用 `@phosphor-icons/react`（或等价），权重 **Regular**（工具条可 Light）。稿面线性 SVG 仅占位。

| 场景 | Phosphor |
|------|----------|
| 日记 / 笔记页 | `Notebook` |
| 文件夹 | `Folder` / `FolderOpen` |
| 阅读 / 书 | `Book` |
| 写作 / 笔 | `PencilSimple` |
| 灵感 | `Lightbulb` |
| 搜索 | `MagnifyingGlass` |
| 新建 | `Plus` |
| 同步 | `ArrowsClockwise` / `Cloud` |
| 已同步 | `Check` |
| 冲突 | `Warning` |
| 锁（付费墙） | `Lock` |
| 设置 | `Gear` |
| 字体 | `TextT` |
| 返回 | `CaretLeft` |
| 仅编辑 | `Code` |
| 分栏 | `SquareSplitHorizontal` |
| 仅预览 | `Eye` |
| 关闭侧栏 | `SidebarSimple` |
| 更多 | `DotsThree` |
| 删除 | `Trash` |
| 分享 | `Export` / `ShareNetwork` |
| 星标 | `Star` |
| 外观（设置内） | `Palette` / `Drop` |
| 主题日夜参考 | `Moon` / `Sun` |

完整场景以开发清单为准；本表覆盖定稿可见图标。**顶栏不再放 Palette。**

## 实现备忘

- 图标主用 Phosphor，勿再引入自绘 icon kit 作主路径
- 选中织线务必 1px；QA 时量一下
- 深色不要落到 `#000`；**默认**浅底用 Paper `#FCFBF9`（非 `#FFF`）。纯白 `#FFFFFF` 仅作为可选主题「Floating Card」
- 主题 token 切换；字体设置写本地偏好，预览即时，源码区保持 mono
- 预览默认走 Kami：衬线正文、行高 1.55、标题 500 字重、引用无底色无侧线、测宽 720px

## 顶栏与设置（本轮 · 正海反馈）

- Mac 顶栏：`Code` / `Split` / `Eye` | `TextT` / `Gear`——**去掉 Palette**
- TextT → 字体相关；主题仅从 Gear → 设置
- `05-mac-settings` 替换原 `05-mac-theme`：左导航（外观 / 字体 / 同步）+ 主题网格（示意）+ 字体（下拉/字号/行高/预览）；**已砍 MCP**（无自有服务器、远程无法挂本地 MCP）
- 主题完整色号见 `src/ui/theme.ts`（25 套 Otty 含 **Floating Card** 纯白）；设置网格 PNG **不必**随色板重出


## 三栏折叠（本轮 · 正海反馈）

> **已被两栏文件树取代（2026-10-30）**：本节及 `06/07/08` 图标轨稿仅作历史记录；当前实现见文末「决策记录 · 两栏文件树」。

- Mac **三栏可折叠**，手感对齐 VS Code
- 左栏（文件夹）：展开 200px → **图标轨 48px** → 可完全藏
- 中栏（笔记列表）：可独立收起
- 收起后编辑/预览区占满；分栏模式（仅编辑 / 分栏 / 仅预览）不变
- 控件：工具条左侧 `SidebarSimple` + 列表开关；图标为主，出海友好
- 新屏：`06` 轨、`07`/`08` 仅编辑器；overview 已纳入


## 同步界面（本轮 · 正海拍板）

- 不自建服务器；一期仅 **Google Drive + Dropbox**（均主推，Agent 友好）；不做 iCloud
- 冲突：**必须弹出** 本地 / 云端 / 两边都留
- 付费：一点「开启同步」就墙；未付费不走 OAuth
- 设置左导航「同步」正式可进；侧栏底从灰显锁改为状态脚标
- 视觉：织线纸白 · impeccable Operate · 延续 `shared.css`

## 决策记录 · 砍掉 MCP（正海 · 2026-10-29）

- **不做 MCP**：无自有服务器，远程 Agent 无法挂本地 MCP。
- 设置左导航最终三项：**外观 / 字体 / 同步**；已移除 MCP 项与「MCP 即将推出」hint / soon-row。
- 同步流程决策不变（仍正式核心）。


## 决策记录 · 主题色板含纯白（正海 · 2026-10-29）

- 配色**必须**有一套主底为 **`#FFFFFF` 的纯白亮色**（名称：**纯白 / Pure White**）。
- 颜色可多设计几套；**没必要出图**——直接在 `DESIGN.md` 写明 hex / token 即可。
- 需要同时支持 **亮色（light）与暗色（dark）**；每套标明 mode。
- 定稿默认仍为织线纸白 / 暖夜炭；实现按 token 切换。`05-mac-settings` 主题网格为示意，完整色号以 `DESIGN.md` 为准。
- 本轮以「纯白」替换原「石灰」（与墨灰过近）；总数仍 12（8 light + 4 dark）。


## 决策记录 · 两栏文件树（forecho · 2026-10-30）

- 参考 **Mado（madomd.com）**：不再需要「文件夹树 + 笔记列表 + 编辑区」三栏，改为 **两栏**。
- 左栏（260px）：顶部搜索框；下方一条文件树，文件夹可折叠、**笔记直接嵌在所属文件夹下**；底部保留同步状态脚标。
- 去掉独立笔记列表栏与图标轨：工具条只保留文件树开关（⌘B）；收起后编辑/预览占满。
- 搜索在左栏内全局过滤笔记，结果平铺并标注所属文件夹；新建笔记落在当前笔记所在文件夹（无笔记时落根目录）。
- 右栏编辑 / 分栏 / 预览三模式与 60fps 双向滚动同步不变。

## 决策记录 · 默认文章排版改用 Kami（forecho · 2026-10-30）

> 2026-10-30 后续：默认色板已由 **Otty 25 套主题**替换，Kami 仅保留文章排版 / 字体节奏；见文末「主题替换为 Otty 25 套」。

- 默认预览文章样式移植自 **[Kami](https://github.com/tw93/kami)**（MIT；归属见 `THIRD_PARTY_NOTICES.md`）。
- 默认色板换成 Kami 羊皮纸 `#F5F4ED` + 墨蓝 `#1B365D`；主题 id `weave-paper` 保留，旧偏好不失效，显示名改为「Kami 羊皮纸」。
- 正文默认衬线（macOS 优先 Songti SC），行高默认 1.55；字体下拉首项改为「Kami 默认（衬线）」，用户自选字体仍优先。
- 标题字号按 Kami 10.5pt 正文比例缩放（H1/H2/H3 = 2.10/1.52/1.24 倍），字重锁定 500；引用去掉底色与侧边线；行内代码与代码块用暖灰底。
- 预览测宽 672 → **720px**，块间距按 Kami 的 pt 节奏并随字号缩放。

## 决策记录 · 工具条标题与悬停开关（forecho · 2026-10-30）

- 推翻同日「两栏文件树」中「工具条只保留文件树开关」一条：文件树开关**移出**编辑工具条。
- 编辑工具条左侧改放**当前笔记标题**（16 / 600，单行省略）；文件名去掉 `.md`，与文件树显示一致。原先编辑区顶部的 mono 文件名头随之删除，避免重复。
- 文件树开关移到 **macOS 顶栏右侧**，默认隐藏；鼠标进入右侧 220px 区域才露出（对齐 Otty），移出即隐藏；没有库时不出现。
- ⌘B 与菜单项不变，仍可随时展开/隐藏。

## 决策记录 · 字体一键恢复默认（forecho · 2026-10-30）

- 设置 → 字体区块标题右侧加「恢复默认」；点击回到 Kami 排版：默认衬线字体（下拉显示实际字体名）、字号 **15**、行高 **1.55**，并覆盖已保存偏好。
- 已是默认值时按钮置灰，避免无意义点击；只重置字体三项，不动主题、语言与同步。

## 决策记录 · 字体下拉显示实际字体名（forecho · 2026-10-30）

- 撤销「Kami 默认（衬线）」这层包装：设置里的字体下拉不再出现产品 / 规范名，收起条与首项直接显示本机解析到的字体，如「Songti SC（默认）」。
- 首项仍代表跟随默认衬线栈；用户在列表里显式选同一字体时，首项不带勾，二者语义保持区分。

## 决策记录 · 八种界面语言（forecho · 2026-10-30）

- 界面语言扩到 **8 种**：English、简体中文、繁體中文、日本語、한국어、Deutsch、Français、Español。
- 跟随系统按 BCP 47 判断：`zh` + Hant/`-TW`/`-HK`/`-MO` → 繁體中文，其余 `zh` → 简体中文；`ja` / `ko` / `de` / `fr` / `es` 各自匹配；未覆盖语言回退英文。
- 设置 → 外观的语言行改为**下拉框**：收起只显示当前项，展开列出「跟随系统」+ 8 种语言共 9 项，选中打勾；语言名用各自写法，不随界面翻译。
- 相对时间（今天 / 昨天 / N 分钟前）改走文案表，日期与时刻用各语言的 Intl 写法（如 `2. Jan.`、`1月2日`）。
- 冲突徽标由「数字 + 单词」改为整句模板 `{n}`，避免韩语等语序不自然。

## 决策记录 · 主题替换为 Otty 25 套（forecho · 2026-10-30）

- 弃用 v1 自绘的 12 套色板，改为 **25 套 [Otty](https://otty.sh) 内置主题**（9 light + 16 dark），默认 **Paper**；完整 token 在 `src/ui/theme.ts`。
- 颜色取自 Otty 的 terminal / token / panel 段；缺少 UI token 的按对比度派生：正文、次级、弱文字与强调色在纸面 / 侧栏 / 列表面板上均 ≥4.5:1（WCAG AA）。
- 新增 `accentInk`：亮强调色上配近黑文字、深强调色上配白字，避免白字对比不足；设置、同步与空态按钮统一读它。
- 旧 12 套 id 自动映射到最接近的新主题（`weave-paper`→`paper`、`pure-white`→`floating-card`、`warm-charcoal`→`night` 等），未知值回落 Paper；八语言文案移除旧主题名。
- 归属见 `THIRD_PARTY_NOTICES.md`（Otty Apache-2.0 与各经典配色作者）；Kami 仅保留文章排版与字体节奏。

## 决策记录 · 设置改为可拖动浮窗（forecho · 2026-10-30）

- 推翻此前的「全窗口设置」：设置不再接管整扇窗口，改为主窗口内的**无遮罩浮窗**（约 680×560，窗口变小时按可用空间收缩），主窗口始终可交互。
- 浮窗自带标题栏：左侧红色关闭圆点、中间「设置」、右侧「完成」；关闭与 Esc 只收起浮窗，**不再有退出应用的风险**。字体下拉等弹层打开时，Esc 先收弹层。
- 标题栏可拖动，松手或关闭时把位置写入 `prefs.settingsFrame`（相对主窗口内容区）；启动与重开时还原，越界或窗口缩小后夹回可见范围。浮窗顶边不低于 44px，避免挡住主窗口红绿灯。
- 限制说明：nsh 0.3.0 的 `Window` 是单例、关闭即结束应用，没有创建第二个系统窗口的 API；真正的独立设置窗口需等 nsh 支持多窗口后再替换。
