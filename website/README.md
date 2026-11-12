# StoatMD 官网（stoatmd.com）

**Quiet** 方案：白纸、墨字、细线，深浅两套主题。首屏给出一句主张、一段说明和完整窗口的真实 macOS 阅读截图；不添加纹理、胶带、印章或装饰性插画。默认跟随浏览器语言与系统主题，用户可手动切换。8 种语言拥有独立可索引 URL；页面文案和分享图片按语言配套，产品截图保留英文界面原图。设计规范见 [DESIGN.md](./DESIGN.md)，历史方案保存在 `docs/website-v1/`。

产品事实：Agent 和用户在同一个普通文件夹里一起做 Markdown 笔记。桌面版免费（含云盘同步），iPhone 一次买断，无订阅。同步仅支持 Google Drive / Dropbox。

## 本地开发

```sh
cd website
npm ci
npm run dev      # http://localhost:4321
npm run build    # 输出到 dist/
npm run preview  # 预览构建产物
```

## 技术选型

- **Astro 5** 静态输出（零客户端框架，文案 SSR 进 HTML）
- 自托管 **Archivo**（界面 / 标题）
- 原生 HTML / TypeScript：主题菜单、语言菜单
- CSS `light-dark()` + `data-theme` 手工覆盖；首屏内联脚本在绘制前应用已保存主题与浏览器语言
- 全部 8 语言文案和界面标签集中在 `src/i18n/copy.ts`
- 首屏展示 `public/assets/mac-reader-outline-full-window.png` 原图；产品状态以 `PRODUCT.md` 与 `docs/product/` 为准
- 无 WebGL、无第三方脚本、无外部字体请求

## 页面结构

单页顺序：首屏居中主张 + 下载按钮 + 完整 macOS 阅读界面原图 → 竞品对照 → 四步机制（Agent 起草 → 文件夹 → 云盘 → 你接着做）→ 四条能力 → 定价（桌面免费 / iPhone 买断）→ 下载 → 页脚。

## 主题

- 默认跟随系统：`color-scheme: light dark` + `light-dark()`，不写 `data-theme`。
- 顶栏菜单可选「跟随系统 / 浅色 / 深色」，保存在 `localStorage["stoatmd.theme"]`；首屏内联脚本在绘制前应用，避免闪烁。
- 手动选择会同步更新 `<meta name="theme-color">`；品牌标用 `mask` 跟随 `--ink` 变色。
- `prefers-color-scheme` 变化时只有「跟随系统」模式实时响应。

## 语言与 URL

| 语言 | 路径 |
|------|------|
| English（默认 / x-default） | `/` |
| 简体中文 | `/zh-hans/` |
| 繁體中文 | `/zh-hant/` |
| 日本語 | `/ja/` |
| 한국어 | `/ko/` |
| Deutsch | `/de/` |
| Français | `/fr/` |
| Español | `/es/` |

检测逻辑（客户端，仅首次访问 `/` 且无手动偏好时跳转；爬虫 UA 跳过）：

1. 用户曾手动选择 → 尊重 `localStorage`（含「跟随系统」）
2. 否则读 `navigator.languages`：繁中（zh-TW/HK/MO/Hant）→ `/zh-hant/`；其他中文 → `/zh-hans/`；ja/ko/de/fr/es/en 前缀匹配；否则留在英文 `/`

## CI 部署（Cloudflare Pages）

由 GitHub Actions [`.github/workflows/website-pages.yml`](../.github/workflows/website-pages.yml) 负责：

| 触发 | 行为 |
|------|------|
| `pull_request` 且改动 `website/**` 或本 workflow | 仅 `npm ci && npm run build`，**不发布** |
| `push` 到 `main` 且同上路径 | **同一 job** 内：构建 → 确保 Pages 项目存在 → `wrangler pages deploy`（**不用** Actions artifact，避开组织存储配额） |

本 agent / 本 PR **不会**实际部署，也 **不会**改 DNS。合并到 `main` 且 secrets 配好后，Actions 才会发布。

### 构建参数（与本地一致）

| 项 | 值 |
|----|-----|
| 工作目录 | `website/` |
| 安装 | `npm ci`（无需 sudo） |
| 构建 | `npm run build` |
| 输出目录 | `website/dist` |
| Node | GitHub Actions workflow 固定使用 Node.js 22 |
| Runner | GitHub 托管 `ubuntu-latest`（公共 PR 无需访问私有机器） |
| Wrangler | 项目初始化用 `npx wrangler@4`；部署 action 固定 `wranglerVersion: "4"` |

静态配置文件随构建进入 `dist/`：

- `_headers` — CSP（自托管 script/frame）、安全头、静态缓存
- `_redirects` — 轻量兜底（**不做** Accept-Language 强制跳转）
- `robots.txt` / `sitemap.xml` / `llms.txt` / `llms-full.txt`

### 需要配置的 GitHub Secrets / Variables

在仓库 **Settings → Secrets and variables → Actions**：

| 名称 | 类型 | 说明 |
|------|------|------|
| `CLOUDFLARE_API_TOKEN` | Secret（必填） | Cloudflare API Token，见下方权限 |
| `CLOUDFLARE_ACCOUNT_ID` | Secret（必填） | 账号 ID（Cloudflare 仪表盘右侧 / Overview） |
| `CLOUDFLARE_PAGES_PROJECT` | Variable（可选） | Pages 项目名；默认 `stoatmd-website` |

### API Token 所需权限

创建 Token：Cloudflare 仪表盘 → **My Profile → API Tokens → Create Token → Create Custom Token**。

| 权限范围 | 权限 | 用途 |
|----------|------|------|
| Account → **Cloudflare Pages** | **Edit** | 创建项目、上传部署 |
| Account → **Account Settings** | **Read** | 解析 Account ID / 项目列表（推荐） |

绑定自定义域若在仪表盘手动操作，Token **不必**含 Zone DNS 权限。若希望用 API/wrangler 管理域名，再额外加：

| 权限范围 | 权限 |
|----------|------|
| Zone → **Zone** | Read |
| Zone → **DNS** | Edit（仅当要用 API 改 DNS 记录时） |

Zone 资源建议限制为 `stoatmd.com` 所在 zone。

### 首次上线清单

1. 配好上述两个 Secrets（Variable 可选）。
2. 合并本 PR 到 `main`（或推送一次 `website/**` 变更）；workflow 会尝试 `pages project create stoatmd-website --production-branch=main`，已存在则跳过并继续 `pages deploy`。
3. 在 Cloudflare 仪表盘打开 Pages 项目 `stoatmd-website`，确认生产部署成功（会有 `*.pages.dev` 预览域名）。
4. **绑定自定义域名 `stoatmd.com`**（人工，本仓库 CI 不改 DNS）：
   1. Pages 项目 → **Custom domains** → **Set up a custom domain** → 输入 `stoatmd.com`（如需也可加 `www`）。
   2. 若域名已在同一 Cloudflare 账号代理：按提示一键添加 CNAME/路由即可。
   3. 若域名在registrar、尚未接入 Cloudflare：把 DNS 迁入 Cloudflare，或按 Pages 提示添加 CNAME（如 `@`/`stoatmd.com` → `<project>.pages.dev`，以控制台文案为准）。
   4. 等待证书签发与 DNS 生效；用 `https://stoatmd.com/` 验证。
5. （可选）在 Pages 项目 Settings 里确认 Production branch 为 `main`。

### 本地手动发布（调试用）

```sh
cd website && npm ci && npm run build
export CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=...
npx wrangler@4 pages deploy dist --project-name=stoatmd-website --branch=main
```

## SEO / GEO 清单

- [x] 每语言 `title` / `description`
- [x] `canonical` + 完整 `hreflang`（含 `x-default`）
- [x] Open Graph / Twitter Card（Quiet 分享图，1200 × 630）
- [x] JSON-LD `SoftwareApplication`（桌面 $0；iPhone 买断价未写入假价格）
- [x] `sitemap.xml`（含 xhtml alternate）
- [x] `robots.txt`
- [x] `llms.txt` + `llms-full.txt`
- [x] 语义化 HTML；关键文案不依赖 JS 渲染

## 发布状态

- macOS：安装包与构建源码统一发布于 [`richcalls/stoatmd`](https://github.com/richcalls/stoatmd/releases)
  - 官网下载按钮按系统切换：macOS 直链 `releases/latest/download/StoatMD-macos.dmg`；iOS 指向下载区；Windows / Linux 指向 Releases 并显示「准备中」
  - 安装包要求 macOS 14+、Apple Silicon；改资源名时要同步 `src/lib/download.ts`
- Windows / Linux：桌面版同一套代码库面向这两个平台，构建与发布随后补充；官网只写「稍后」，不要提前给下载链接
- iOS：尚未上架；售价发布时公布
- 问题反馈：公开仓的 Issues / Discussions；安全报告走私密披露
- 页面上的 iPhone 价格使用「一次买断 / price at launch」，不要填入虚构数字

## 第三方许可

字体授权见 `public/fonts/*OFL.txt`（Archivo）。所有图标为项目内联 SVG；没有第三方脚本或 WebGL 素材。
