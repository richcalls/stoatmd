# 纸间 · 编辑部

以用户选定的第一版为基础，按 Impeccable 的 typography、polish、harden 指引打磨。产品事实以 [`docs/product/PRODUCT.md`](../docs/product/PRODUCT.md) 和同步专章为准。

## 视觉与结构

- 暖纸 `#f8f6f0`、墨色 `#2d302d`、鼠尾草绿 `#596b4d`；细线、低对比窗口投影。
- Instrument Sans 用于导航和说明，Newsreader 用于拉丁衬线标题，Noto Serif 的四个地区字形用于中日韩。字体自托管，许可证随文件保留。
- 顺序：写作主张 → 可交互笔记预览 → 简短利益点 → 自有云盘与 Agent → 四组核心功能 → 免费本机 / 买断同步 → 发布状态。
- 保留普通 Markdown、三种视图、离线、25 套主题、字体设置、Drive / Dropbox、Agent 共用文件夹、冲突选择、本地免费与同步买断等产品观点。
- Mac 安装包以“即将推出”呈现；iPhone / iPad 标为后续计划。售价随正式发布公布。

## 多语言与预览

8 个语言路由共享版式，文案由 `src/i18n/paper.ts` 与 `details.ts` 管理。笔记内容、标题、侧栏、模式、保存状态与日期均随路由语言变化。

主预览采用 HTML 实现，支持三篇笔记和源码 / 分栏 / 阅读切换，标注为“界面示意”。它可随文案和屏幕宽度重新排版。真实应用截图加入官网时，应按相同语言矩阵提供资源，配套本地化替代文本。

手机端：760px 以下导航换行；480px 以下笔记侧栏变为横向三项选择。分栏模式在窄屏上下排列。所有预览文字均在静态 HTML 中，JavaScript 负责启用切换按钮。原生语言菜单支持键盘、Escape 和点击外部关闭；尊重减少动态效果设置。

## 更新图片

分享图位于 `public/assets/og-{locale}.png`，各语言尺寸为 1200 × 630。生成器从对应语言页面提取标题、说明和产品预览，桌面与手机整页截图用于人工检查。

先运行 `npm run build`，再在独立终端运行 `npm run preview -- --port 4322`。使用 ego-browser 技能开始一个截图目标，记录 TaskSpace ID；后续截图轮次复用该 ID：

```js
// 在 ego-browser nodejs 中执行，替换绝对路径与已有 TaskSpace ID。
const task = await taskSpace(existingSpaceId);
const { capturePreviews } = await import('file:///absolute/path/to/website/scripts/capture-previews.mjs');
await capturePreviews(task, {
  origin: 'http://localhost:4322',
  reviewDir: '/tmp/stoatmd-website-shots',
});
// 完成当前目标的全部浏览器检查后调用一次。
await task.finish({ keep: [] });
```

生成器会在预览站点记录英语偏好，稳定截取 `/`。该偏好仅影响此本地站点。文案改动后重新生成分享图，再构建一次，让图片进入 `dist/`。

## 更新字体子集

新增中日韩文案后，运行以下命令刷新地区衬线字形：

```sh
python3 -m venv /tmp/stoatmd-font-tools
/tmp/stoatmd-font-tools/bin/pip install 'fonttools[woff]'
/tmp/stoatmd-font-tools/bin/python website/scripts/subset-fonts.py
```

脚本从两个文案文件收集字符，通过 Google Fonts 获取 Noto Serif 的地区字体并转为 WOFF2。字体子集生成后提交资源文件，构建环境可直接使用。刷新已有字体文件时同步刷新 CDN 缓存。

## 验证

运行 `npm run check` 和 `npm run build`；检查八种语言在 320 / 390 / 768 / 1440px 的布局，并切换所有笔记和视图。复核长文本、地区字形、语言偏好、锚点、分享图与本地资源链接。
