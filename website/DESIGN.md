# Field Log

StoatMD 官网的视觉世界是一本**正在工作的野外日志**：Agent 写条目，人读整页。方向由 Impeccable 的 concept-seed 指定（seed `1b2ddb85263cad66`），实现是 code-first。产品事实以 [`docs/product/PRODUCT.md`](../docs/product/PRODUCT.md) 为准。

## 论点

笔记应用通常把「写作那一刻」当成主角。StoatMD 的主角是**写作之后**：Agent 已经写完，文件已经在文件夹里，人坐下来读。页面因此不是一张常规的 hero，而是一本摊开的日志：左页是索引和主张，右页是贴上去的阅读页。

## 视觉语汇

- **方格纸**：页面底色是带蓝灰网格的浅绿灰纸 `#dfe7d8`；网格 24px，每 120px 加重一次。不是装饰纹理，而是日志的测量面。
- **织布书脊**：左右页之间 14px 的深色布脊，横向缝线是马尼拉色虚线。两页用同一张纸，不做圆角卡片。
- **马尼拉胶带**：阅读页顶部和右下角各一块半透明马尼拉胶带，边缘用 `clip-path` 做不规则切口。
- **红色橡皮章**：主 CTA 是红色双线章，内层虚线；定价页有 `NO SUBSCRIPTION` 印章；状态与序号用红色点/短线。
- **红色铅笔**：笔记标题下是一条手绘感的红色下划线（内联 SVG path），选中条目的标题下也有短红线。
- **等宽元数据**：路径、日期、字数、AGENT 章、模式标签都用 Azeret Mono；等宽只服务数据，不冒充「技术感」。

## 色板

| Token | 值 | 用途 |
|-------|----|------|
| `--paper` | `#dfe7d8` | 页面底色 / 方格纸 |
| `--paper-page` | `#e4eadb` | 日志左右页 |
| `--sheet` | `#f3efe2` | 阅读页 / 账本纸 |
| `--ink` | `#1b1d1a` | 正文与标题 |
| `--ink-soft` | `#3f453c` | 次级正文 |
| `--muted` | `#596052` | 元数据 |
| `--blue` | `#24408f` | 第二句标题、路径、选中态 |
| `--stamp` | `#b8392c` | 印章、红铅笔、序号 |
| `--manila` | `#d8c49a` | 胶带、选中条目、页脚顶边 |
| `--cloth` | `#141613` | 书脊、页脚 |
| `--rule` | `rgba(27,29,26,.24)` | 账本横线 |

正文与背景对比度 ≥ 4.5:1；阅读页正文为墨色 on 米白纸。不要用灰色代替有色表面上的次级文字。

## 字体

- **Archivo** 400–800：导航、标题、按钮、界面。可变字体，按拉丁 / 拉丁扩展两个 unicode-range 自托管。
- **Azeret Mono** 400/600：路径、日期、字数、模式、印章、页脚元数据。
- **Newsreader** 400：阅读页的拉丁正文与标题。
- **Paper SC / TC / JP / KR**：阅读页的中日韩衬线；通过 `:lang()` 选择对应地区字形，避免日文汉字落到简体字形。
- 界面中的中日韩文字回落到系统 UI 字体（PingFang / Hiragino / Apple SD Gothic Neo / Microsoft YaHei 等），不自造 CJK 无衬线。

## 版面

1. **Masthead**：顶部 4px 马尼拉条 + 纸色导航。品牌、四个锚点、语言菜单、红色小 CTA。760px 以下导航折成两行，链接横向可滚。
2. **Hero 双页**：`grid-template-columns: 1fr 14px 1.06fr`。左页：
   - 日志头（品牌 / FIELD LOG / 日期 / BUILD 章）
   - 两段式标题（第一句墨色，第二句蓝色）
   - 导语、红色印章 CTA、iPhone 说明、桌面免费说明
   - 底部 Agent 日志索引：三篇笔记按钮，日期 / 标题 / 字数 / AGENT 章；选中项用马尼拉底 + 红铅笔短线
   右页：
   - 一张旋转 `-0.35deg` 的阅读纸，顶部与右下角有胶带
   - 工具栏：文件路径 + 源码 / 分栏 / 阅读三段开关
   - 状态条：READ 红点 + AGENT / 字数
   - 可滚动正文：路径、日期、字数、衬线标题、红铅笔下划线、两段正文、引文、清单、归档行
3. **竞品账本**：真正的 `<table>`；桌面四列，移动端每行转成带 `data-label` 的定义列表。StoatMD 行用马尼拉底色和红色方块标记。
4. **机制**：四列路线（Agent 写入 → 文件夹持有 → 云盘搬运 → 你阅读），列间 1px 竖线和小箭头；移动端纵向堆叠。
5. **能力记录**：四行账本，序号 / 标题 / 说明三列；不是图标卡片。
6. **定价账本**：一张米白纸，两行（桌面 / iPhone），价格数字用 Archivo 800；右上角 `NO SUBSCRIPTION` 印章；底部 CTA。
7. **发布记录**：左侧发布说明 + 红色实心下载章 + iOS 未上架；右侧一张带胶带的记录纸，列出桌面、价格、移动端状态。
8. **页脚**：深布色，顶部 4px 马尼拉条；品牌反白、工作日志说明、版权、隐私 / 条款折叠。

## 交互

- 三篇笔记切换：左页索引按钮与右页阅读纸共享 `data-note`；切换时同步文件名与 `AGENT / 字数`。
- 三种视图：`data-view="source|split|read"`；分栏模式只在当前可见的 `.note-panel:not([hidden])` 上启用网格，避免隐藏面板被撑开。
- 键盘：笔记组支持 ArrowUp / ArrowDown 移动并切换；所有按钮有 `:focus-visible` 蓝色描边。
- 无 JavaScript：默认显示第一篇的阅读视图；切换按钮以 `disabled` 输出。
- 语言菜单：沿用 `src/scripts/lang.ts` 的 localStorage、系统跟随、爬虫跳过逻辑。
- 动效：阅读纸落纸（`sheet-settle`）与 CTA 盖章（`stamp-press`）两个作者时刻；其余只用 130–180ms 的颜色/位移过渡。`prefers-reduced-motion` 全部关闭。

## 响应式

- `≤1080px`：导航与两页比例收紧。
- `≤900px`：双页改为上下堆叠，布脊隐藏；阅读纸取消旋转与入场动画；机制变两列；发布区单列。
- `≤760px`：导航两行；hero 标题放大到 9.8vw；索引改为两列网格；账本表头移到 `data-label`；定价行改为名称 / 价格两列；触控目标 ≥36px。
- `≤480px`：语言菜单只留图标；按钮全宽；模式按钮隐藏图标，只留文字。

## 分享图

`public/assets/og-{locale}.png`，1200 × 630。由 `scripts/capture-previews.mjs` 从当前语言页面克隆品牌、标题、导语、CTA 和第一篇阅读页，重新排成一张 Field Log 分享卡。文案改动后重新生成：

```js
// 在 ego-browser nodejs 中运行；origin 指向本地 preview。
const task = await taskSpace(existingSpaceId);
const { capturePreviews } = await import(
  "file:///absolute/path/to/website/scripts/capture-previews.mjs"
);
await capturePreviews(task, {
  origin: "http://localhost:4322",
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

检查 320 / 390 / 768 / 1440px；八种语言；三篇笔记；三种视图；键盘与减少动效；分享图尺寸；语言菜单与锚点。注意 320px 下德语 / 法语长标题和 `RECORD` 账本行是否溢出。
