# LoomMD Icons v1

> 界面线性图标套件（非 App 图标）  
> 风格 **B**：轻与原生 + Loom「织线」隐喻  
> 公开署名：forecho · 2026-10-29（Asia/Shanghai）

## 1. 描边规范

| 属性 | 值 |
|------|-----|
| viewBox | `0 0 24 24` |
| 描边 | `currentColor`（便于换色） |
| 描边宽度 | **1.75px**（视觉等效 1.5–2px） |
| 端点 / 连接 | `stroke-linecap="round"` / `stroke-linejoin="round"` |
| 填充 | 默认 `none`；小圆点等极少数用 `fill="currentColor"` |
| 对齐 | 像素对齐 24 网格；关键几何落在 0.5 或整数 |

### 颜色

| 场景 | Hex |
|------|-----|
| 浅色默认 | `#2C2A26` |
| 深色默认 | `#EDE9E3` |
| 强调（选中/链接） | 浅 `#3D5A80` · 深 `#7A9CC0` |
| 灰显（同步未开通） | 浅 `#9A948C` · 深 `#6F6A63` |

不要 ExpireMate 的 lime/cyan；不要填充色块图标。

### 导出尺寸

| 尺寸 | 用途 |
|------|------|
| **16** | 极紧凑菜单、状态角标 |
| **20** | 工具条、列表次要操作（推荐工具条默认） |
| **24** | 侧栏、导航、空状态（推荐主尺寸） |

SVG 用 CSS `width/height` 缩放到 16/20/24 即可；保持 `currentColor`。

### 织线隐喻

多数图标保持通用可读。仅 `icon-weave` 与个别（如 `icon-library` 书脊横线）带极轻经纬感——**不要在工具条批量铺织线装饰**。

## 2. 图标清单（共 63）

| 中文名 | 文件名 | 分类 | 使用场景 | SF Symbols 近似 |
|--------|--------|------|----------|-----------------|
| 笔记库 | `icon-library.svg` | 导航/侧栏 | 侧栏顶部库名旁；打开本地文件夹库 | `books.vertical` |
| 文件夹 | `icon-folder.svg` | 导航/侧栏 | 文件夹树未展开节点 | `folder` |
| 文件夹打开 | `icon-folder-open.svg` | 导航/侧栏 | 文件夹树展开节点 | `folder.fill` |
| 全部笔记 | `icon-all-notes.svg` | 导航/侧栏 | 侧栏「全部笔记」入口 | `doc.on.doc` |
| 星标 | `icon-star.svg` | 导航/侧栏 | 收藏/星标笔记筛选 | `star` |
| 标签 | `icon-tag.svg` | 导航/侧栏 | 标签筛选入口 | `tag` |
| 搜索 | `icon-search.svg` | 导航/侧栏 | 全局搜索、列表搜索框 | `magnifyingglass` |
| 设置 | `icon-settings.svg` | 导航/侧栏 | 设置页入口 | `gearshape` |
| 同步 | `icon-sync.svg` | 导航/侧栏 | 底栏同步入口（v1 灰显/锁） | `arrow.triangle.2.circlepath` |
| 锁定 | `icon-lock.svg` | 导航/侧栏 | 同步未开通时的灰显锁 | `lock` |
| 解锁 | `icon-unlock.svg` | 导航/侧栏 | 同步已开通 | `lock.open` |
| 新建 | `icon-new.svg` | 导航/侧栏 | 通用加号；工具栏新建 | `plus` |
| 更多 | `icon-more.svg` | 导航/侧栏 | 溢出菜单 … | `ellipsis` |
| 笔记 | `icon-note.svg` | 列表/文件 | 笔记行默认图标 | `doc.text` |
| 新建笔记 | `icon-note-new.svg` | 列表/文件 | 新建笔记按钮 | `doc.badge.plus` |
| 删除 | `icon-trash.svg` | 列表/文件 | 删除笔记/文件夹 | `trash` |
| 重命名 | `icon-rename.svg` | 列表/文件 | 重命名菜单项 | `pencil` |
| 移动到文件夹 | `icon-move-to-folder.svg` | 列表/文件 | 移动笔记 | `folder.badge.plus` |
| 排序 | `icon-sort.svg` | 列表/文件 | 列表排序 | `arrow.up.arrow.down` |
| 筛选 | `icon-filter.svg` | 列表/文件 | 列表筛选 | `line.3.horizontal.decrease` |
| 复制 | `icon-copy.svg` | 列表/文件 | 复制内容/路径 | `doc.on.doc` |
| 粘贴 | `icon-paste.svg` | 列表/文件 | 粘贴 | `doc.on.clipboard` |
| 外部打开 | `icon-external.svg` | 列表/文件 | 用其他 App 打开 | `arrow.up.right.square` |
| 附件 | `icon-attach.svg` | 列表/文件 | 附件入口（预留） | `paperclip` |
| 图片 | `icon-image.svg` | 列表/文件 | 插入图片 | `photo` |
| 仅编辑 | `icon-edit-only.svg` | 编辑器 | 视图模式：仅源码 | `rectangle` |
| 分栏预览 | `icon-split-view.svg` | 编辑器 | 视图模式：源码|预览 | `rectangle.split.2x1` |
| 仅预览 | `icon-preview-only.svg` | 编辑器 | 视图模式：仅预览 | `eye` |
| 撤销 | `icon-undo.svg` | 编辑器 | 撤销 | `arrow.uturn.backward` |
| 重做 | `icon-redo.svg` | 编辑器 | 重做 | `arrow.uturn.forward` |
| 粗体 | `icon-bold.svg` | 编辑器 | Markdown 粗体 ** | `bold` |
| 斜体 | `icon-italic.svg` | 编辑器 | Markdown 斜体 * | `italic` |
| 标题 | `icon-heading.svg` | 编辑器 | 插入/循环标题 # | `textformat.size` |
| 无序列表 | `icon-list.svg` | 编辑器 | 无序列表 - | `list.bullet` |
| 有序列表 | `icon-list-ordered.svg` | 编辑器 | 有序列表 1. | `list.number` |
| 任务列表 | `icon-task-list.svg` | 编辑器 | 任务列表 - [ ] | `checklist` |
| 引用 | `icon-quote.svg` | 编辑器 | 引用 > | `text.quote` |
| 行内代码 | `icon-code.svg` | 编辑器 | 行内代码 ` | `chevron.left.forwardslash.chevron.right` |
| 代码块 | `icon-code-block.svg` | 编辑器 | 围栏代码块 ``` | `curlybraces` |
| 链接 | `icon-link.svg` | 编辑器 | 插入链接 | `link` |
| 表格 | `icon-table.svg` | 编辑器 | 插入表格 | `tablecells` |
| 目录 | `icon-toc.svg` | 编辑器 | 大纲 / TOC | `list.bullet.indent` |
| 字号 | `icon-font-size.svg` | 编辑器 | 编辑器字号 | `textformat.size.larger` |
| 分隔线 | `icon-horizontal-rule.svg` | 编辑器 | 水平线 --- | `minus` |
| 关闭侧栏 | `icon-sidebar-close.svg` | 编辑器 | 收起左/中栏 | `sidebar.left` |
| 打开侧栏 | `icon-sidebar-open.svg` | 编辑器 | 展开侧栏 | `sidebar.left` |
| 浅色主题 | `icon-theme.svg` | 编辑器 | 主题切换（日） | `sun.max` |
| 深色主题 | `icon-theme-moon.svg` | 编辑器 | 主题切换（夜） | `moon` |
| 已保存 | `icon-saved.svg` | 状态 | 本地已写入磁盘 | `checkmark.circle` |
| 保存中 | `icon-saving.svg` | 状态 | 正在写入 | `arrow.triangle.2.circlepath` |
| 云同步 | `icon-cloud-sync.svg` | 状态 | v2 云同步状态 | `icloud.and.arrow.down` |
| 警告 | `icon-warning.svg` | 状态 | 冲突/权限警告 | `exclamationmark.triangle` |
| 错误 | `icon-error.svg` | 状态 | 失败态 | `xmark.circle` |
| 信息 | `icon-info.svg` | 状态 | 提示信息 | `info.circle` |
| 空白笔记 | `icon-empty-note.svg` | 状态 | 空状态插图用简笔 | `doc` |
| 未勾选 | `icon-checkbox.svg` | 状态 | 任务项未完成 | `square` |
| 已勾选 | `icon-checkbox-checked.svg` | 状态 | 任务项已完成 | `checkmark.square` |
| 返回 | `icon-back.svg` | iPhone | 导航返回 | `chevron.backward` |
| 分享 | `icon-share.svg` | iPhone | 系统分享表 | `square.and.arrow.up` |
| 完成 | `icon-check.svg` | iPhone | 导航栏完成/勾选 | `checkmark` |
| 收起键盘 | `icon-keyboard-dismiss.svg` | iPhone | 工具条旁收起键盘 | `keyboard.chevron.compact.down` |
| 关闭 | `icon-close.svg` | iPhone | 关闭浮层/模态 | `xmark` |
| 织线 | `icon-weave.svg` | 品牌 | 极轻品牌点缀，勿滥用 | `—` |

## 3. 目录结构

```
icons-v1/
├── ICONS.md
├── sprite.svg              # <symbol id="icon-..."> 集合
├── preview-light.html
├── preview-dark.html
├── preview-light.png
├── preview-dark.png
├── overview.png
└── svg/
    ├── icon-library.svg
    ├── icon-folder.svg
    └── …
```

## 4. 使用方式

### 单文件

```html
<img src="svg/icon-split-view.svg" width="20" height="20" alt="" />
<!-- 或内联后用 CSS color 换色 -->
```

### Sprite

```html
<svg width="20" height="20" aria-hidden="true">
  <use href="sprite.svg#icon-split-view"></use>
</svg>
```

Swift / nsh 侧建议把 SVG 转成 PDF/SF Symbol 兼容模板，或用 `SwiftDraw` / 资源目录保留矢量。

## 5. 与界面对照

- Mac 三栏：侧栏用 20–24；笔记列表行用 16–20；编辑器工具条用 **20**
- iPhone：导航 24；Markdown 快捷条 20
- 同步入口：`icon-sync` + `icon-lock`，灰显色，v2 再亮起

## 6. 变更记录

| 日期 | 说明 |
|------|------|
| 2026-10-29 | v1 首版，63 枚线性图标 |
