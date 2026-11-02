# StoatMD 官网（stoatmd.com）

**Quiet** 方案：白纸、墨字、细线。首屏给出一句主张、一段说明和一个可读的笔记预览；没有纹理、胶带、印章或装饰性插画。8 种语言拥有独立可索引 URL；页面文案、笔记预览和分享图片按语言配套。设计规范见 [DESIGN.md](./DESIGN.md)，历史方案保存在 `docs/website-v1/`。

产品事实：Agent 往普通文件夹里写 Markdown，人来读。桌面版免费（含云盘同步），iPhone 一次买断，无订阅。同步仅支持 Google Drive / Dropbox。

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
- 自托管 **Archivo**（界面 / 标题）、**Newsreader + Paper SC/TC/JP/KR**（阅读预览衬线）
- 原生 HTML / TypeScript：语言菜单、笔记选择、源码 / 分栏 / 阅读切换
- 全部 8 语言文案、笔记预览和界面标签集中在 `src/i18n/copy.ts`
- 预览为界面示意，使用与页面相同的数据；产品状态以 `PRODUCT.md` 与 `docs/product/` 为准
- 无 WebGL、无第三方脚本、无外部字体请求

## 页面结构

单页顺序：首屏主张 + Agent 笔记索引 + 可交互阅读预览 → 竞品对照 → 四步机制（Agent → 文件夹 → 云盘 → 读者）→ 四条能力 → 定价（桌面免费 / iPhone 买断）→ 下载 → 页脚。

交互预览保留三篇 Agent 笔记与源码 / 分栏 / 阅读三种视图；阅读正文使用衬线字体，路径与日期使用系统等宽字体。没有 JavaScript 时默认显示第一篇笔记的阅读视图，切换按钮保持禁用。

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
| Node | runner 预装 `/usr/bin/node` v22（workflow 不跑 setup-node） |
| Runner | `[self-hosted, linux, wsl2]`（组织账单异常期间；私有仓） |
| Wrangler | 全局 4.x / `wrangler-action` 固定 `wranglerVersion: "4"` |

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

- macOS：通过公开的 [`richcalls/stoatmd-community`](https://github.com/richcalls/stoatmd-community) Releases 下载；源码仓保持私有，该公开仓需至少有一个已发布 Release，`releases/latest` 才能解析
- iOS：尚未上架；售价发布时公布
- 问题反馈：公开仓的 Issues / Discussions；安全报告走私密披露
- 页面上的 iPhone 价格使用「一次买断 / price at launch」，不要填入虚构数字

## 第三方许可

字体授权见 `public/fonts/*OFL.txt`（Archivo、Newsreader、Noto Serif）。所有图标为项目内联 SVG；没有第三方脚本或 WebGL 素材。
