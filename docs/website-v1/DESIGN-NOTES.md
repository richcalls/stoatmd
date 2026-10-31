# StoatMD 官网草案 · website-v1

> **Persuade** · 风格 B（织线纸白 / 暖炭暗色）· [impeccable](sand-workflow:impeccable) craft floor  
> 日期：2026-10-31（Asia/Shanghai） · 尚未开 PR，等正海点头  
> 域名：stoatmd.com

## 交付

| 路径 | 说明 |
|------|------|
| `index.html` | 单页长滚动 · 亮/暗 · 9 档语言选择器 |
| `i18n.js` | 文案表：中英完整；繁中完整草案；日/韩/德/法/西 = 英文骨架 + 待译条 |
| `theme-lang.js` | `prefers-color-scheme` 默认 · 顶栏手动切主题/语言 · 派发 `stoatmd:theme` |
| `threads-hero.js` | 暗色 Hero 挂载/卸载 `<pro-threads>`（亮色不跑 WebGL） |
| `assets/mark.svg` | Logo A · 织线白鼬（占位，主图标未定） |
| `assets/app-mac-light.png` | Hero 产品图（ui-v1 Mac 浅色定稿） |
| `shots/desktop-zh-light.png` | 桌面 · 中文 · 亮色 |
| `shots/desktop-zh-dark.png` | 桌面 · 中文 · 暗色 |
| `shots/mobile-zh-light.png` | 手机 · 中文 · 亮色 |
| `shots/mobile-zh-dark.png` | 手机 · 中文 · 暗色 |
| `shots/hero-zh-dark.png` | 桌面 Hero 视口 · 暗色织线（非 full_page） |
| `shots/hero-zh-light.png` | 桌面 Hero 视口 · 亮色暖纸（无 WebGL） |
| `DESIGN-NOTES.md` | 本文 |

## 信息架构（已拍板）

1. **Hero** — CTA：`Buy once · unlock sync`；副 CTA 下载 Mac  
2. **对比** — Obsidian / Typora / 妙言一类 → StoatMD  
3. **功能** — 源码+预览 · Drive/Dropbox · Agent 同库 · 买断  
4. **定价** — 本机 $0 · 同步 Buy once（金额占位 `—`）  
5. **下载** — Mac Coming soon（无假链接）· iOS/iPad 计划中 · **不列** Win/Linux  
6. **页脚** — 隐私 / 条款 / 语言提示  

## 视觉世界

### 亮色

| Token | Hex | 用途 |
|-------|-----|------|
| paper | `#F7F3EB` | 页底 |
| surface | `#FFFCF7` | 卡片/截图底 |
| ink | `#2C2A26` | 主文字 |
| ink-2 | `#5F5A54` | 次文字 |
| thread | `#DDD5C8` | 1px 织线分隔 |
| indigo | `#3D5A80` | CTA、强调、选中 |
| indigo-soft | `#E4EBF3` | Stoat 对比行 / Pro 定价底 |

### 暗色（暖炭纸感 · 非纯黑）

| Token | Hex | 用途 |
|-------|-----|------|
| paper | `#1C1A17` | 暖炭页底 |
| surface | `#26231F` | 抬升面 |
| ink | `#F0EBE3` | 主文字 |
| ink-2 | `#B8B0A4` | 次文字 |
| thread | `#3A3630` | 织线 |
| indigo | `#7A9BC2` | 略提亮，保证对比 |
| indigo-soft | `#243040` | 对比行 / Pro 底 |

- 字体：**Instrument Sans**（非 Inter）+ 系统中文/日/韩回退  
- 分隔一律 **1px thread**；不抄 Neo Kinpaku  
- Logo：方向 A 占位  

## 主题规矩

- **默认跟浏览器** `prefers-color-scheme`  
- 顶栏太阳/月亮按钮可强制 light / dark；写入 `localStorage`  
- `?theme=light|dark` 可强制（截图用）  

## 语言规矩

- **默认跟浏览器**（正海：所有官网一律如此）  
- 选择器九项齐：跟随系统 · English · 简体中文 · 繁體中文 · 日本語 · 한국어 · Deutsch · Français · Español  
- 完整文案：`en` / `zh`；`zh-Hant` 有完整草案；其余语种暂用英文骨架，页顶显示「待译」条  
- `?lang=` 可强制；用户手动切换后才写入 `localStorage`  

## SEO / GEO（交给开发经理实现）

本草案是静态视觉稿，**不做**生产级 SEO/GEO 基建。正式站由 **开发经理** 落地，至少包括：

- 语义 HTML（已有粗结构：`header` / `main` / `section` / `footer`；正式站补全 landmark / heading 层级）  
- 每语言独立可索引 URL（或路径/子域）+ **`hreflang`**（含 `x-default`）  
- **Open Graph** / Twitter Card（title、description、`og:image`、locale）  
- 结构化数据（SoftwareApplication / Product，买断价就绪后填）  
- `sitemap.xml`、`robots.txt`、规范 `canonical`  
- GEO：面向海外的英文默认可发现性；中文等语言不靠客户端-only 切换作为唯一入口（爬虫要能拿到对应文案）  
- Core Web Vitals：字体与 Hero 图优化、少 JS、暗色无闪（`color-scheme` / 早期 theme 引导）  

设计侧只保证：文案键齐全、语言列表与产品设定一致、亮暗 token 可用。



## 暗色 Hero 织线（PRO Threads）

> 正海：亮暗差距太大 → 亮暗都跑同一织线环，布局/参数一致，只换色。

| 项 | 值 |
|----|----|
| 来源 | [kubai087/pro-threads](https://github.com/kubai087/pro-threads)（MIT © Kubai087） |
| 嵌入 | jsDelivr `embed.js` → `<pro-threads>` iframe 加载 `https://www.kubai.design/pro-threads/hero/` |
| 场景 | `ring`（织线圆环 · 贴合 StoatMD 织线隐喻） |
| 配色 | `ocean`（偏靛蓝；若过艳可改 `graphite`） |
| fps | `30` |
| settings | `speed=0.35&spin=0.22&gain=0.8&glow=0.32&threshold=0.72&saturation=0.7&warm=0.4&parallax=0.35&threads=0.85&sheen=0.45&sparkle=0.25&quality=0.55` |
| 宿主底 | CSS 强制 `#1C1A17`（组件默认纯黑 `#000`，破 craft floor，必须覆盖） |
| 显隐 | 亮暗都挂载；切主题时 `threads-hero.js` 重挂载 |
| 亮色 | `paper` 配色实测发灰发脏（白底+灰黑环），弃用。改为同一 `ocean` 场景 + CSS `filter:invert(1) hue-rotate(180deg) saturate(.8)` + `mix-blend-mode:multiply` + `opacity:.7`：暗底反成白、multiply 后≈暖纸 #F7F3EB，线成浅靛蓝 |
| 文案 scrim | 暗：暖炭 rgba(28,26,23,.78→0)；亮：暖纸 rgba(247,243,235,.82→0) |
| 无障碍 | 组件自带 reduced-motion 静止、滚出视口暂停；宿主 `aria-hidden` |
| 截图定格 | `?threadsT=` 写入 iframe `t=`（光时钟秒） |

### 生产建议（交开发经理）

- **自托管** 一份 pro-threads 静态副本，用 `<pro-threads src="…">` 指向自有源：避免第三方 CSP/`frame-src` 依赖与 demo 站可用性风险。  
- CSP 至少：`script-src` 允许 embed 源；`frame-src` 允许场景源。  
- 页脚或关于页保留 MIT 归因（Kubai087 / PRO Threads）。  
- 亮色依赖 CSS filter 反色，自托管后可改为原生 light palette 省掉 filter。

## Craft floor 自检

| 禁项 | 本稿 |
|------|------|
| Kicker / eyebrow | 无 |
| 渐变字 | 无 |
| 卡片套卡片 | 无 |
| Inter 万能 | 用 Instrument Sans |
| 紫蓝渐变 / 玻璃拟态 | 无（nav 仅轻 blur） |
| Emoji 当图标 | 无；描边 SVG |
| 假下载链接 | Coming soon / Planned chip |
| 纯黑/纯白默认底 | 暖纸 / 暖炭 |

## 待正海拍板

1. Hero 主标题中英定稿是否够硬  
2. 买断金额何时填入（现为 `—` 占位）  
3. Logo 主方向 A vs C（官网暂用 A）  
4. 隐私 / 条款正文（现仅锚点占位）  
5. Mac 安装包就绪后下载区改可点链接  
6. 日/韩/德/法/西正式译稿  

## 不做（本草案）

- 开 GitHub PR / 部署 stoatmd.com  
- Windows / Linux 下载行  
- 订阅文案、iCloud、MCP、Kinpaku 皮  
- 生产 SEO/GEO 实现（见上，交开发经理）  
- 生产自托管 pro-threads（见上；草案暂用 jsDelivr + kubai.design）  

## 决定：官网仅暗色（2026-10-31 正海拍板）

- 只做暗色，**不做亮色、不提供主题切换**；`html` 固定 `data-theme="dark"` + `<meta name="color-scheme" content="dark">`；忽略 `prefers-color-scheme` 与 `?theme=`。亮色 token 仍留在 CSS 但不可达。
- 上文亮色织线 / 反色方案与「主题规矩」作废。
- Hero 织线：`ring` · `ocean` · fps 30 · 参数同上，保持动画；织线层溢出 + `mask-image` 底部 68%→100% 渐隐到 `#1C1A17`，Hero 底部 padding 加到 140px（手机 96px），圆环不再被切平。
- 语言切换保留，默认跟浏览器的规则不变。

## Unslop heavy（2026-10-31 · 正式站 website/）

正海：现网「难看」→ 按 [unslop](https://github.com/heydamir/unslop) **heavy** + [impeccable](https://impeccable.style/) craft floor 重做 `website/` 视觉节奏；信息架构与暗色织线世界不变。

### 方向五句

| 线 | 定稿 |
|----|------|
| **Product** | 本地优先 Markdown 笔记本；用你自己的 Drive/Dropbox 同步，人和 Agent 共用同一库；同步一次买断 |
| **Character** | 暖炭、织线、墨迹沉稳（纸面有重量） |
| **World** | 暖炭纸底 `#1C1A17` 上的靛蓝织线环，源码 Markdown 摊开在纸上 |
| **Moments** | (1) 首屏 PRO Threads `ring` 织线场景；(2) 真实 Mac 应用截图作为纸面物件升起 |
| **Signature** | 1px 织线分隔；靛蓝只落在买断相关时刻与 Stoat 对比行，不洒满按钮/边框 |

### Audit → 已修

- Hero 标准 SaaS 左右分栏模板感 → 织线全bleed 场景 + 左文案 scrim + 底部升起产品图
- CTA / SEO 文案 `unlock` 等 hype → `Buy once · sync` / 各语对应
- Nav `backdrop-filter` 玻璃模糊 → 去掉，安静 sticky 暖炭
- 功能区描边 icon tile 墙 → 织线序号 `01–04` 编辑列表
- 定价等宽双卡墙 → 非对称：本机安静 / 同步 indigo-soft 抬升
- Download pill chip → 安静状态字
- 主 CTA 靛蓝铺色 → 纸白墨字主按钮；靛蓝留给内容时刻
- pro-threads Ocean 纯黑/过青 → 自托管 palette 调成暖炭底 + 靛蓝纤维；参数加强可见度
- `prefers-reduced-motion` → 静态暖炭径向，不挂 WebGL
