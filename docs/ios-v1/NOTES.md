# StoatMD iOS v1 polish · NOTES

日期：2026-11-01（Asia/Singapore）· Operate · [impeccable](sand-workflow:impeccable)

## 本轮（正海确认）

库页参考妙言程度「差不多」后，**其余屏统一 Cream×Glass**（奶油纸 `#F7F3EB` × Liquid Glass × 靛蓝 `#3D5A80`）。  
另补：**全部 = App 文件树**（非扁平列表）；库页默认「最近修改」。

### 保留

- 同步状态机仅库页（idle / syncing·暂停 / paused·继续 / error·重试）
- 玻璃顶栏底栏；搜索默认藏、下拉才出；无「我的笔记·已同步」芯片
- 首启两步绑云盘（Drive/Dropbox → 选远程文件夹），**无迁移**
- 不抄妙言像素 / Tab IA / 森绿 / iCloud 叙事

### 新增 · 文件树

- **`11-file-tree.html` / `11-file-tree.png`** — 「全部」Tab：可展开缩进树；路径 `Google Drive / StoatMD`
- **`12-favorites.html` / `12-favorites.png`** — 「收藏夹」Tab：即将推出示例列表

### 文件（全套）

| PNG | 内容 |
|-----|------|
| `00-board-overview.png` | 全套拼板（含树 + 收藏夹） |
| `01`–`03b` | 库页五态（已定） |
| `11-file-tree.png` | **全部 · 文件树** |
| `12-favorites.png` | **收藏夹 · 即将推出** |
| `04-editor.png` | 编辑：安静顶栏 · 书本图标切阅读 · 「已保存」小字 · 附属条 |
| `05-reader-paper.png` | 阅读 Paper · 顶右「编辑」文字 · 无分段控件 |
| `06-reader-nord.png` | 阅读 Nord/暗 · 同上安静顶栏 |
| `07-onboarding-provider.png` | 首启选 Drive/Dropbox |
| `08-onboarding-folder.png` | 首启选远程文件夹 |
| `09-conflict-sheet.png` | 冲突：本地 / 云端 / 两边都留 |
| `10-settings.png` | 主题缩略、语言、存储 |

源：`liquid.css` + `gen_liquid_library.py`（库）+ `gen_liquid_rest.py`（04–11）· `capture_liquid.py` / `capture_rest.py`。

未 push 仓库。


## 顶栏修订（正海：分段控件丑）

去掉「编辑|阅读」segmented + 「已保存」pill；阅读顶右「编辑」；编辑顶右书本图标；已保存改为标题下小字。[impeccable](sand-workflow:impeccable)


## 主背景（正海：渐变太丑）

正海要求主背景**禁止渐变**，统一纯色奶油纸 `#F7F3EB`（暗色/Nord 用对应纯色 `--paper` / `--sys-bg`）。顶栏/工具栏可继续 Liquid Glass；去掉 `.phone.bare` 径向叠色与 `.edge-top` vignette。

## Tobi 反 AI-slop（正海丢帖）

学精神不照搬：纸面世界、大字层级、砍玻璃浮条与渐变。阅读页去掉底栏目录/字数/A；顶栏只留返回+「编辑」+…；正文 H1 海报级；引用缩进斜体无粗色左边框；编辑格式条改扁平细分割。[impeccable](sand-workflow:impeccable) Read


## Liquid Glass + Mac Kami 正文（正海 · 2026-11-01）

正海要求：
1. **仍要 Liquid Glass** — chrome（顶栏返回/操作、编辑格式条、阅读底栏）加回毛玻璃；主底保持纯色奶油纸 `#F7F3EB`，禁止渐变。
2. **正文格式与 Mac 版统一**（预览与编辑）— Kami：衬线 Songti/Noto Serif CJK、行高 1.55、tracking 0.3pt、标题字重 500、字号比 H1/H2/H3/正文 ≈ 31/23/19/15（手机略缩）、引用无底无侧线、行内 code 暖灰底；示例文改用 Mac 同款「写作的框架」。

仍无「编辑|阅读」分段；阅读顶右「编辑」；编辑顶右书本；「已保存」标题下小字。阅读安静玻璃底栏：目录 / 字数 / A。[impeccable](sand-workflow:impeccable)

## 全套统一（正海 · 2026-11-01）

正海点头认可 04/05 的 **Liquid Glass + Mac Kami** 后，要求**所有页面**按同一风格重出：
- Chrome（顶栏 / 底栏 / 搜索 / 筛选 pill / 同步条 / 格式条 / sheet / 设置返回）一律液态玻璃
- 主底纯色奶油纸 `#F7F3EB`（暗色纯色），禁止页面渐变底
- 阅读正文 Kami；库列表首篇与树节点示例文统一「写作的框架」
- 库页高密度、下拉搜索、文件树、同步四态、首启两步绑盘、冲突三选一不变
- 反 slop：进度条实色靛蓝（去掉 soft gradient）、列表组改为轻玻璃面板而非厚卡片

源：`liquid.css` + `gen_liquid_library.py` + `gen_liquid_rest.py` · 截图 `capture_liquid.py` / `capture_rest.py`。[impeccable](sand-workflow:impeccable)

## 库底栏与下拉（正海更正 · 2026-11-01）

正海更正：
- **不要下拉搜索**（之前说错了）。搜索放在**底栏中间**，参考 iOS Grok Bot：左「新建文件夹」· 中搜索框 · 右「新建文件」。
- **搜索**在底栏中间（左新建文件夹 · 中搜索 · 右新建文件）；`01c` = 搜索激活态。
- **两种同步路径**：
  1. **下拉 = 浅度刷新**（少量文件改动）：无提示文案；只出现刷新指示 + 进度条。`01b`。
  2. **右上角同步按钮 = 完整同步**（首次/大量文件）：点开后顶下出现进度条 accessory，可**暂停 / 继续**，失败可**重试**。`02` syncing · `03` paused · `03b` error。


## 库页视觉重做（正海嫌丑 · 2026-11-01）

正海：交互大概对，界面太丑。视觉重做、交互保留：
- 底栏贴底连续液态玻璃；左/中/右同条对齐；两侧同尺线框/轻 fill 图标，不要凸出大蓝圆
- 筛选改文字+下划线，去掉厚黑胶囊
- 列表去厚白/玻璃大卡片，改 hairline 分组
- 完整同步改顶下细进度条 + 小图标暂停/继续/重试
- 顶栏右：同步、设置两个独立圆形 glass，不挤脏 pill
[impeccable](sand-workflow:impeccable) Operate quieter


## 底栏对齐真机 Grok Bot（正海 · 2026-11-01）

正海以真机截图为准：底栏是**分离浮起的 Liquid Glass**（半透明毛玻璃+细描边，透出背后列表），不是 Ask 实色贴底、也不是连体玻璃条。
- 左：独立圆角方玻璃钮 = 新建文件夹
- 中：超宽玻璃搜索胶囊（🔍 +「搜索」）
- 右：同高玻璃圆钮 = 新建文件
三件分开，中间有间隙，悬浮在 home indicator 上方，左右有边距。


## 库页顶 Tab IA（正海 · 2026-11-01）

正海改顶部筛选顺序与默认：
1. **最近修改**（默认）— 最近修改文件列表；去掉文件夹分区，只保留「最近的文字」列表
2. **全部** — 文件树（原「文件夹」/ `11-file-tree` 语义迁到此 Tab）
3. **收藏夹** — 收藏文件列表；未来功能（Mac 未做）。iOS 稿：`12-favorites` 示例列表 + 「即将推出」轻提示，Cream×Glass，非灰禁用

底栏仍为真机 Grok Bot 分离浮起 Liquid Glass：左新建文件夹 · 中搜索胶囊 · 右新建文件。
