# Quiet

StoatMD 官网的视觉方向是**安静的排版**：白纸、墨字、细线，把注意力留给产品本身。没有纹理、胶带、印章、旋转纸张或装饰性插画；界面只做层级和留白。

## 论点

笔记不是一个人写完的。StoatMD 的用法是**和 Agent 一起做笔记**：Agent 往文件夹里写初稿，你打开同一个文件夹阅读、编辑，再把下一轮交回去。页面因此把「一起做」的主张、一段说明和一张真实 macOS 阅读界面截图放在首屏，其余部分按证据、机制、能力、价格、下载依次展开。

## 色板

颜色用 CSS `light-dark()` 定义，`color-scheme: light dark` 跟随系统；用户手动选择时在 `<html>` 上写 `data-theme="light|dark"` 覆盖。

| Token | 浅色 | 深色 | 用途 |
|-------|------|------|------|
| `--bg` | `#fbfbf8` | `#121311` | 页面底色 |
| `--surface` | `#ffffff` | `#191a17` | 定价卡 |
| `--surface-soft` | `#f6f5f1` | `#1f201c` | 提示条 |
| `--ink` | `#171815` | `#f1f0e9` | 标题、正文、主按钮 |
| `--ink-soft` | `#3f423c` | `#d2d1c7` | 次级正文 |
| `--muted` | `#6b6f66` | `#a3a69b` | 说明、元数据 |
| `--line` | `#e4e3dc` | `#2c2e29` | 分隔线与描边 |
| `--line-strong` | `#cfcdc4` | `#40433c` | 引用线、悬停下划线 |
| `--accent` | `#24408f` | `#a8b9ea` | 选中笔记、焦点环 |
| `--on-ink` | `#ffffff` | `#121311` | 墨色底上的文字 |

两套主题都保持正文与背景对比度 ≥ 4.5:1；标题与正文用墨色，说明文字用 `--muted`。全站只有一个强调色，不用于装饰。品牌标使用 `mask` + `var(--ink)`，随主题变色。

## 字体

- **Archivo** 400–800：界面、标题、按钮。可变字体，按拉丁 / 拉丁扩展两个 unicode-range 自托管。
- 界面中的中日韩文字回落到系统 UI 字体（PingFang / Hiragino / Apple SD Gothic Neo / Microsoft YaHei 等）。

## 版面

1. **顶栏**：64px 高，纸色半透明 + 细线底边。品牌、四个锚点、主题菜单、语言菜单、小型下载按钮。1000px 以下隐藏下载按钮、两个菜单只留图标；760px 以下隐藏锚点；380px 以下进一步收紧内边距。
2. **首屏**：上下布局；主张、导语、主按钮和 Agent 笔记索引在上方，完整窗口的 macOS 原图在下方横跨内容区，保留原始 16:9 比例，不裁切、不加装饰。
   - 标题按第一句 / 第二句分成两行，第二句用 `--muted`，不做彩色强调。
   - 笔记索引只有日期与标题；选中项标题变成强调色。
3. **竞品对照**：真正的 `<table>`，细线行，StoatMD 行用浅底；移动端每行转成带 `data-label` 的定义列表。
4. **机制**：四列，列顶一条墨色短线 + 序号 + 标题 + 说明；移动端堆叠。
5. **能力**：序号 + 标题 + 说明的细线行，不是图标卡片。
6. **定价**：一张白底圆角卡，两列（桌面 / iPhone），中间一条竖线；底部说明与 CTA。
7. **下载**：左侧红色实心按钮改为墨色主按钮 + 说明；右侧四行规格表。
8. **页脚**：细线顶边，品牌、说明、版权；右侧反馈链接。正式隐私政策与使用条款尚未成文，不放假入口。

## 主题与语言

- 默认跟随系统：`color-scheme: light dark` + `light-dark()`，不写 `data-theme`。
- 顶栏主题菜单提供「跟随系统 / 浅色 / 深色」；选择写入 `localStorage["stoatmd.theme"]`，并在首屏渲染前用内联脚本应用到 `<html>`，避免闪白 / 闪黑。
- 手动主题同时更新 `<meta name="theme-color">`（浅 `#fbfbf8` / 深 `#121311`）。
- 语言默认跟随浏览器：首次访问 `/` 时按 `navigator.languages` 跳到对应语言路径；爬虫 UA 不跳转。用户手动选择后写入 `stoatmd.langPref` / `stoatmd.langTouched`，之后不再自动覆盖。
- 主题与语言选择互不影响；`en` 的规范 URL 是 `/`，其余语言是 `/<locale>/`。

## 下载

- 顶栏、首屏、定价和下载区共用 `DownloadCta`，服务端默认输出 macOS 安装包直链。
- 客户端按 UA / `userAgentData` 识别系统：macOS 直接下载 `StoatMD-macos.dmg`；iOS 指向下载区并显示「尚未上架」；Windows / Linux 指向 Releases 并显示「准备中」，不伪造安装包。
- 固定地址是 `releases/latest/download/StoatMD-macos.dmg`；当前安装包要求 macOS 14+、Apple Silicon。

## 交互

- 首屏使用真实产品截图；其他导航、主题和语言控件保持原生 HTML 交互。
- 所有按钮有 `:focus-visible` 强调色描边。
- 菜单：`<details>` 原生展开；点击外部或按 Escape 关闭；当前项用 `aria-pressed` / `aria-current` 标记。
- 无 JavaScript：首屏截图和下载按钮仍可用；主题与语言降级为系统默认。
- 动效：只有 150ms 的颜色 / 边框过渡；没有入场动画。`prefers-reduced-motion` 全部关闭。

## 响应式

- `≤1000px`：两列间距收紧，标题略小。
- `≤1000px`：顶栏下载按钮与主题 / 语言菜单的文字标签隐藏，避免长语言（de / fr / es）和 Windows / Linux 下载标签挤压导航。
- `≤880px`：首屏单列，截图在主张之后；机制两列；下载单列。
- `≤760px`：隐藏顶栏锚点；对照表转定义列表；定价与机制堆叠。
- `≤560px`：语言菜单只留图标；主按钮全宽。
- `≤380px`：顶栏只留品牌与两个图标菜单；日文标题缩到 1.7rem，避免片假名断行。

## 分享图

`public/assets/og-{locale}.png`，1200 × 630。由 `scripts/capture-previews.mjs` 从当前语言页面克隆品牌、标题、导语、按钮和第一篇阅读页，排成白底细线的分享卡（分享图固定浅色，不随访客主题变化）。文案改动后重新生成。

```js
// 在 ego-browser nodejs 中运行；origin 指向本地 preview。
const task = await taskSpace(existingSpaceId);
const { capturePreviews } = await import(
  "file:///absolute/path/to/website/scripts/capture-previews.mjs"
);
await capturePreviews(task, {
  origin: "http://localhost:4321",
  reviewDir: "/tmp/stoatmd-website-shots",
});
await task.finish({ keep: [] });
```

脚本同时输出八种语言的桌面 / 手机整页截图到 `reviewDir`，用于人工检查。

## 验证

```sh
npm run check
npm run build
```

检查 320 / 390 / 768 / 1440px；八种语言；截图完整显示且保持比例；键盘与减少动效；分享图尺寸；语言菜单与锚点。注意 320px 下德语 / 法语长标题、日文片假名断行与顶栏是否溢出。
