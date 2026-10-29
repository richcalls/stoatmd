# StoatMD Mac 一期实现计划

> 日期：2026-10-29 · 产品定名 StoatMD（曾用名 LoomMD）  
> 依据：`docs/技术设计-v1.md` · `docs/ui-v1/`（DESIGN / PRODUCT / DESIGN-NOTES）  
> 署名约定：PR / commit / 注释用中文；git author：蔡正海 \<caizhenghai@gmail.com\>

## 全局约束（不可破）

| 约束 | 说明 |
|------|------|
| 框架 | [nsh](https://nsh.dev) **≥ 0.3**，`nsh init --template mixed`（Rust + TSX） |
| 版本锁定 | CLI 与 `Cargo.toml` 中 `nsh-core` / `nsh-base` **同版本**；本仓库首锁 **0.3.0** |
| 首发平台 | **先 Mac**；iOS / iPad 设计可保留文档，**本计划不排实现任务** |
| 多语言 | 产品出海；UI 文案至少 **中 / 英**（键驱动，默认中文示意） |
| 不做 MCP | 无 AgentBridge / 本地 MCP sidecar（产品已定） |
| 同步后置 | Drive / Dropbox（不做 iCloud）与付费墙：**本地 Vault 跑通之后**再做 |
| 编辑模型 | 源码 Editor + TextView 预览；**非**所见即所得；Mermaid / LaTeX 不进一期 |
| 视觉 | 默认 **织线纸白**；深色 **暖夜炭**（非 `#000`）；纯白主题为预设但可后置接线 |
| 顶栏 | Code / Split / Eye \| TextT / Gear；**不要 Palette** |
| 图标 | Phosphor Regular（本仓库用 SVG 资源 + `tintColor`，等价于 `@phosphor-icons/react` Regular） |

## 建议顺序（与技术设计一致）

```
Phase 0  空壳冒烟：nsh mixed + Editor + TextView 分栏可编译/可跑
   ↓
Phase 1  Mac 三栏骨架对齐 ui-v1（假数据、折叠、模式切换、主题 token）
   ↓
Phase 2  Vault 读写（自选文件夹、.md CRUD、自动保存、冲突提示）
   ↓
Phase 3  Mac 打磨（设置面板完整主题网格、字体偏好、快捷键、菜单）
   ↓
Phase 4  再谈同步（S1–S9，见 product/SYNC.md；本计划仅预留位）
```

**Phase 0 + Phase 1**：计划入库 + Mac 壳（假数据）。  
**Phase 2（本阶段 PR）**：Vault 真读写、系统选文件夹、自动保存、冲突提示。

## 目标目录（对齐技术设计）

```
stoatmd/
  App.tsx                 # nsh mixed 入口（mount）
  App.test.tsx
  nsh.json                # 锁名 / id / theme / rust 指向
  theme.json              # 织线纸白 + 暖夜炭 token
  Cargo.toml              # workspace：本 crate + stoatmd-core
  src/
    lib.rs                # #[native_module("stoatmd/native")] 薄桥
    ui/                   # TSX：壳、侧栏、列表、编辑器、预览、设置
  crates/stoatmd-core/    # Vault / 索引 / 监视（本 PR 仅 stub）
  assets/icons/           # Phosphor Regular SVG
  locales/                # zh / en 文案
  docs/                   # 已有产品与 UI 定稿（勿破坏）
```

> 说明：nsh mixed 约定根目录 `Cargo.toml` + `src/lib.rs` 为原生桥；TSX 业务放在 `src/ui/`，由根 `App.tsx` 引入。这与技术设计「`src/` 为 TSX、`crates/stoatmd-core/` 为 Rust 重活」一致——Vault 进 core，UI 进 `src/ui/`。

---

## 任务拆分（可独立验收）

### T0 · 工程脚手架（本 PR）

**内容**

- `nsh init --template mixed --name StoatMD`，保留既有 `docs/`
- 锁 `nsh` **0.3.0**；`nsh.json` id → `com.stoatmd.app`（或等价）
- workspace 加入 `crates/stoatmd-core` 空壳
- `.gitignore` 含 `.nsh/`、`target/`
- README 写明 Mac 本地运行方式

**文件**

- `App.tsx` · `Cargo.toml` · `nsh.json` · `tsconfig.json` · `src/lib.rs` · `crates/stoatmd-core/**` · `README.md`

**验收**

- [ ] 仓库可检出；`docs/` 完整
- [ ] `nsh check` 在 Linux CI/开发机通过（或文档说明需 Rust ≥ CLI 要求）
- [ ] Mac 上 `nsh run --target macos` 有明确说明（本环境无 macOS 时不要求本机跑通 AppKit）

---

### T1 · Editor + TextView 分栏冒烟（本 PR · Phase 0）

**内容**

- 右栏：`ResizablePanelGroup` 横向分栏
- 左：`Editor`（`language="markdown"`，受控 `value` / `onChange`）
- 右：`TextView`（`markdown={…}`）
- 模式：仅编辑 / 分栏 / 仅预览（顶栏 Code / Split / Eye）

**文件**

- `src/ui/EditorWorkspace.tsx` · `src/ui/Toolbar.tsx`

**验收**

- [ ] 三种模式切换正确；分栏下改源码预览跟随
- [ ] 顶栏**无 Palette**；有 TextT、Gear 占位入口

---

### T2 · Mac 三栏骨架 + 折叠（本 PR · Phase 1）

**内容**

- 左：文件夹树（假数据：日记 / 项目 / 阅读 / 写作 / 灵感）
- 中：搜索框 + 分类标题 + `+` + 笔记列表（假数据）
- 右：T1 工作区
- 顶栏左侧：切换文件夹侧栏 / 笔记列表显隐（对齐 `06-mac-rail` / `07-mac-focus` 行为骨架）
- 选中态：**左侧 1px accent 织线** + accent-soft 底（禁止 2px+ 彩条）

**文件**

- `src/ui/MacShell.tsx` · `src/ui/Sidebar.tsx` · `src/ui/NoteList.tsx` · `src/ui/mockData.ts`

**验收**

- [ ] 三栏在宽屏同时可见；折叠后布局正确
- [ ] 选中织线视觉为 1px（对照 `docs/ui-v1/DESIGN.md`）
- [ ] 列表点击切换当前假笔记正文

---

### T3 · 主题 token（本 PR · Phase 1）

**内容**

- `theme.json`：浅色默认织线纸白、深色默认暖夜炭（色号以 `DESIGN.md` 为准）
- 自定义 token：`paper` / `list` / `editor` / `ink-2` / `ink-3` / `thread` 等（或映射到 shadcn 语义色）
- Gear → 设置 sheet 骨架：外观 / 字体 / 同步（同步页仅文案「稍后」；**不做 OAuth**）
- 外观：至少可选织线纸白 / 暖夜炭；**纯白可列在计划/UI 占位，完整接线可放 T6**

**文件**

- `theme.json` · `src/ui/theme.ts` · `src/ui/SettingsSheet.tsx`

**验收**

- [ ] 默认非纯白、非纯黑
- [ ] 切换浅/深后栏底、文字、织线、accent 一致更新
- [ ] 设置左导航无 MCP 项

---

### T4 · 多语言骨架（本 PR）

**内容**

- `locales/zh.json` · `locales/en.json`
- 简单 `t(key)`；首批键：侧栏标签、搜索占位、同步未开启、模式 tooltip、设置标题

**文件**

- `locales/*.json` · `src/ui/i18n.ts`

**验收**

- [ ] 切换 locale 信号后可见文案切换（调试入口可放设置或暂时硬切）

---

### T5 · Phosphor 图标资源（本 PR）

**内容**

- `assets/icons/` 收齐定稿短表用到的 Regular SVG
- `src/ui/Icon.tsx`：`Image` + `tintColor`

**验收**

- [ ] 顶栏 / 侧栏 / 列表控件图标齐全且风格一致

---

### T6 · Vault（Phase 2）

**内容**

- `crates/stoatmd-core`：`open` / `list` / `read` / `write` / `create` / `rename` / `delete`
- 路径规范化，禁止逃出 root
- 文件监视 → UI 冲突保留/重载
- Mac：系统选文件夹（`rfd`；nsh 0.3.0 尚无 `file_dialog`）+ `Storage` 记上次 root
- 替换假数据；停顿自动保存

**验收**

- [x] Vault 单元测试（路径逃逸 / CRUD / 冲突 mtime）
- [x] native 桥暴露给 TSX；Mac UI 主路径为真 `.md`
- [ ] Mac 真机：打开自选文件夹，新建/编辑/预览，自动保存与冲突弹窗（本环境无 macOS）

---

### T7 · 同步（再下一阶段 · Phase 4）

- 见 `docs/product/SYNC.md` 与 `docs/ui-v1/SYNC-FLOW.md`
- 本计划不拆实现任务；设置里「同步」页仅占位

---

## 本 PR 明确不做

- iOS / iPad 实现
- 云盘同步 / OAuth / 付费墙
- MCP / AgentBridge
- 所见即所得、Mermaid / LaTeX
- 像素级复刻 HTML（对齐布局与色调即可）

## Mac 本地运行（开发者）

前置：macOS 14+、Xcode CLT、[安装 nsh](https://nsh.dev/docs/installation.md)（建议 `NSH_VERSION=v0.3.0`）、Rust（与 nsh 0.3 依赖匹配，建议 rustup stable 新近版本）。

```sh
git clone https://github.com/richcalls/stoatmd.git
cd stoatmd
# 确认 nsh --version 为 0.3.x，且与 Cargo.toml 中 nsh-* 一致
nsh check
nsh run --target macos
```

Linux / CI：可用 `nsh check` 与（若有 GTK）`nsh run` 默认 Linux 后端做冒烟；**Mac AppKit 真机/本机以 `--target macos` 为准**。

## 风险

1. nsh API 仍可能微调 → 锁 0.3.0，升级单独评估  
2. 本 Cloud 环境无 macOS → Mac 跑通依赖本地或后续 CI macOS runner  
3. Editor 手感与大文件性能 → Phase 2 起真机压测  

## 决策记录

| 日期 | 内容 |
|------|------|
| 2026-10-29 | 正海拍板先 Mac；本 PR = 计划 + Phase 0/1 壳 |
| 2026-10-29 | 同步与 Vault 顺序：Vault 先于同步 |
| 2026-10-29 | 不做 MCP；顶栏无 Palette |
