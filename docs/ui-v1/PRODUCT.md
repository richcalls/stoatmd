# StoatMD · PRODUCT

> 模式：**Operate**（本地写作工具，任务优先）  
> 定名：**StoatMD** · 域名：stoatmd.com（可注册）  
> 曾用名：LoomMD（内部/早期代号；仓库已更名为 `richcalls/stoatmd`；本地设计目录 `loommd/` 可暂留）  
> 署名：forecho · 仓库：https://github.com/richcalls/stoatmd  
> 定稿：2026-10-29（Asia/Shanghai）

## 产品是什么

StoatMD（白鼬 / stoat）是本地 Markdown 笔记本。用户自选本机文件夹，读写普通 `.md` 文件；源码编辑，可切换或分栏预览——**不是**所见即所得。

首发平台：macOS + iOS（iPad 接近 Mac 两栏）。公开署名 forecho。

## 谁在用、在干什么

写作者、笔记爱好者。场景：打开本地库 → 找一篇笔记 → 写源码 → 偶尔看预览。工具应消失在任务里，不为「设计感」打断书写。

## 核心结构

| 平台 | 布局 |
|------|------|
| Mac | 两栏：搜索 + 文件树（文件夹内嵌笔记） / 编辑+预览；**左栏可藏起**，藏起后编辑区占满 |
| iPhone | 导航栈：文件夹 → 列表 → 编辑页 |
| iPad | 近 Mac；窄屏可折双栏（v1 稿不单独出屏） |

右栏模式：仅编辑 · **分栏（Mac 默认）** · 仅预览。非 WYSIWYG。

Mac 编辑工具条：左侧当前笔记标题（16 / 600，单行省略）；右侧 `Code` · `Split` · `Eye` | `TextT` · `Gear`。文件树开关移到 macOS 顶栏右侧，默认隐藏，鼠标进入右侧区域才露出（对齐 Otty）；⌘B 亦可。**无**独立 Palette 入口。控件以图标为主（出海多语言，tooltip 中英均可）。

## 设置 · 主题 · 字体（v1）

入口：**Gear → 设置**（TextT 可直达字体相关；主题只在设置里）。

| 能力 | 说明 |
|------|------|
| 主题 | 只换颜色的预设色板（参考 Slack 外观网格），**不**换布局、不做自定义色板编辑器；当前为 Rex 的 Merino Light / Silver Point Dark 两套主题，完整 token 见 `src/ui/theme.ts` |
| 字体 | 正文默认 **Kami 衬线**（宋体类；可下拉换系统字体）、字号步进、行高；一行真文案预览；区块右上「恢复默认」一键回到 Kami 排版。源码区仍用等宽 |
| 文件操作 | 右键笔记：打开、在 Finder 中显示、复制路径 / 相对路径、重命名、创建副本、移到废纸篓；文案随界面语言 |
| 同步 | **正式核心能力**：设置 → 同步；一期仅 Google Drive / Dropbox（均主推，Agent 友好）；一点「开启同步」付费墙（未付费不走 OAuth）；冲突必弹 |

预设两套（light / dark 标明模式；实现按 token 切换）：Merino Light、Silver Point Dark。

色号与全量 token 以 `src/ui/theme.ts` 为准；默认文章排版移植自 [Kami](https://github.com/tw93/kami)（MIT；归属见 `THIRD_PARTY_NOTICES.md`）。

## 付费与版本边界

| 能力 | v1 | 说明 |
|------|----|------|
| 本机读写 `.md` | 免费、默认可用 | 主路径 |
| 同步买断 | v1 正式 | 一点「开启同步」即墙；未付费不走 OAuth；详见 `SYNC-FLOW.md` / 仓库 `docs/product/SYNC.md` |

不要在主路径放大 Banner 或付费墙打断写作。

## 文案语气

中文。安静、短、说清动作。控件命名动作（搜索笔记、仅编辑、已保存）。错误说问题与恢复方式（实现阶段再补）。

## 图标

界面线性图标主用 **Phosphor**（Light / Regular）。稿面可用线性 SVG 占位；实现时对照附录映射表换成 Phosphor 名。

## 不做（本定稿）

- App 图标 / 营销页（另开）
- **MCP（已砍）**：无自有服务器，远程 Agent 无法挂本地 MCP——设置导航与灰显入口已移除；决策保留于此
- 多库、标签体系深设计（同步已升正式，见 SYNC-FLOW）
- WYSIWYG、实时协作
- 自定义主题编辑器 / 布局皮肤（主题仅预设色板）
- 顶栏独立 Palette 入口（主题归设置）

## 语言与市场

多语言、面向出海。UI 支持 8 种语言：English、简体中文、繁體中文、日本語、한국어、Deutsch、Français、Español；默认跟随系统（BCP 47 识别，未覆盖的语言回退英文），也可在设置 → 外观内固定。产品与同步文案勿默认「仅中文用户」。主推 Google Drive / Dropbox 也服务全球用户。
