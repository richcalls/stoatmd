# Quiet

StoatMD 官网的视觉方向是**安静的排版**：白纸、墨字、细线，把注意力留给产品本身。没有纹理、胶带、印章、旋转纸张或装饰性插画；界面只做层级和留白。

## 论点

笔记应用通常把「写作那一刻」当成主角。StoatMD 的主角是**写作之后**：Agent 已经写完，文件已经在文件夹里，人坐下来读。页面因此把一句主张、一段说明和一个可读的笔记预览放在首屏，其余部分按证据、机制、能力、价格、下载依次展开。

## 色板

| Token | 值 | 用途 |
|-------|----|------|
| `--bg` | `#fbfbf8` | 页面底色 |
| `--surface` | `#ffffff` | 预览卡、定价卡 |
| `--surface-soft` | `#f6f5f1` | 源码视图、提示条 |
| `--ink` | `#171815` | 标题、正文、主按钮 |
| `--ink-soft` | `#3f423c` | 次级正文 |
| `--muted` | `#6b6f66` | 说明、元数据 |
| `--line` | `#e4e3dc` | 分隔线与描边 |
| `--line-strong` | `#cfcdc4` | 引用线、悬停下划线 |
| `--accent` | `#24408f` | 选中笔记、焦点环 |

正文与背景对比度 ≥ 4.5:1；标题与正文用墨色，说明文字用 `--muted`。全站只有一个强调色，不用于装饰。

## 字体

- **Archivo** 400–800：界面、标题、按钮。可变字体，按拉丁 / 拉丁扩展两个 unicode-range 自托管。
- **Newsreader** 400：阅读预览中的拉丁正文。
- **Paper SC / TC / JP / KR**：阅读预览中的中日韩衬线，通过 `:lang()` 选择对应地区字形。
- 界面中的中日韩文字回落到系统 UI 字体（PingFang / Hiragino / Apple SD Gothic Neo / Microsoft YaHei 等）。
- 路径、日期、字数使用系统等宽字体，仅服务数据，不做装饰。

## 版面

1. **顶栏**：64px 高，纸色半透明 + 细线底边。品牌、四个锚点、语言菜单、小型下载按钮。760px 以下隐藏锚点；380px 以下隐藏下载按钮。
2. **首屏**：两列（约 0.92 / 1.08），左列主张、导语、主按钮、说明与三篇 Agent 笔记索引；右列一张白底细线预览卡。
   - 标题按第一句 / 第二句分成两行，第二句用 `--muted`，不做彩色强调。
   - 笔记索引只有日期与标题；选中项标题变成强调色。
3. **竞品对照**：真正的 `<table>`，细线行，StoatMD 行用浅底；移动端每行转成带 `data-label` 的定义列表。
4. **机制**：四列，列顶一条墨色短线 + 序号 + 标题 + 说明；移动端堆叠。
5. **能力**：序号 + 标题 + 说明的细线行，不是图标卡片。
6. **定价**：一张白底圆角卡，两列（桌面 / iPhone），中间一条竖线；底部说明与 CTA。
7. **下载**：左侧红色实心按钮改为墨色主按钮 + 说明；右侧四行规格表。
8. **页脚**：细线顶边，品牌、说明、版权；右侧反馈链接与隐私 / 条款折叠。

## 交互

- 三篇笔记切换：左列索引与右列预览共享 `data-note`；切换时同步文件名与 `AGENT / 字数`。
- 三种视图：`data-view="source|split|read"`；分栏只对当前可见的 `.note-panel:not([hidden])` 启用网格。
- 键盘：笔记组支持 ArrowUp / ArrowDown；所有按钮有 `:focus-visible` 强调色描边。
- 无 JavaScript：默认显示第一篇的阅读视图；切换按钮以 `disabled` 输出。
- 动效：只有 150ms 的颜色 / 边框过渡；没有入场动画。`prefers-reduced-motion` 全部关闭。

## 响应式

- `≤1000px`：两列间距收紧，标题略小。
- `≤880px`：首屏单列，预览在索引之后；机制两列；下载单列；阅读区高度 440px。
- `≤760px`：隐藏顶栏锚点；对照表转定义列表；定价与机制堆叠；预览分栏在窄屏改为上下。
- `≤560px`：语言菜单只留图标；主按钮全宽；预览工具栏换成两行；阅读区内边距收紧。
- `≤380px`：顶栏只留品牌与语言；日文标题缩到 1.7rem，避免片假名断行。

## 分享图

`public/assets/og-{locale}.png`，1200 × 630。由 `scripts/capture-previews.mjs` 从当前语言页面克隆品牌、标题、导语、按钮和第一篇阅读页，排成白底细线的分享卡。文案改动后重新生成。

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

检查 320 / 390 / 768 / 1440px；八种语言；三篇笔记；三种视图；键盘与减少动效；分享图尺寸；语言菜单与锚点。注意 320px 下德语 / 法语长标题、日文片假名断行与顶栏是否溢出。
