import type { Locale } from "./types";

export interface NoteCopy {
  title: string;
  path: string;
  author: string;
  date: string;
  words: string;
  summary: string;
  body: string[];
  quote: string;
  list: string[];
  ending: string;
}

export interface SiteCopy {
  meta: { title: string; description: string };
  nav: { why: string; features: string; pricing: string; download: string; cta: string };
  theme: { label: string; system: string; light: string; dark: string };
  hero: {
    kicker: string;
    title: string;
    lead: string;
    primary: string;
    secondary: string;
    note: string;
    status: string;
  };
  log: {
    label: string;
    folder: string;
    saved: string;
    modes: [string, string, string];
    state: [string, string, string];
    notes: NoteCopy[];
  };
  mechanism: {
    kicker: string;
    title: string;
    body: string;
    steps: { n: string; title: string; body: string }[];
    providers: string;
    caption: string;
  };
  comparison: {
    kicker: string;
    title: string;
    body: string;
    columns: [string, string, string];
    rows: { name: string; cells: [string, string, string]; ours?: boolean }[];
    footnote: string;
  };
  features: {
    kicker: string;
    title: string;
    body: string;
    items: { n: string; title: string; body: string }[];
  };
  pricing: {
    kicker: string;
    title: string;
    body: string;
    desktop: { label: string; name: string; price: string; unit: string; items: string[] };
    mobile: { label: string; name: string; price: string; unit: string; items: string[] };
    note: string;
    stamp: string;
    source: { title: string; body: string; linkLabel: string };
  };
  release: {
    kicker: string;
    title: string;
    body: string;
    mac: string;
    macNote: string;
    platforms: string;
    soon: string;
    ios: string;
  };
  footer: {
    line: string;
    feedback: string;
    langLabel: string;
    system: string;
    copyright: string;
  };
  a11y: { lang: string; nav: string; preview: string; skip: string };
}

const en: SiteCopy = {
  meta: {
    title: "StoatMD — Note-Taking Built for the Agent Era",
    description:
      "A Markdown notebook built for the agent era. You and your agents share the same local folder; continue seamlessly on Mac or iPhone. Sync via Google Drive or Dropbox. Desktop is free forever, iPhone is a one-time purchase with no subscriptions.",
  },
  nav: { why: "Why", features: "Features", pricing: "Pricing", download: "Download", cta: "Download for Mac — Free" },
  theme: { label: "Theme", system: "System", light: "Light", dark: "Dark" },
  hero: {
    kicker: "FIELD LOG / 2026",
    title: "Note-Taking Built for the Agent Era.",
    lead: "StoatMD is a Markdown note-taking app crafted for the age of AI agents. Your agent drafts directly into your local folder, and you open the exact same folder to read, edit, and keep writing.",
    primary: "Download for Mac — Free",
    secondary: "iPhone — One-time purchase · Coming soon",
    note: "Desktop is free forever, including cloud sync. No accounts, no subscriptions, no iCloud lock-in.",
    status: "BUILD 1.0",
  },
  log: {
    label: "Agent Collaboration Log",
    folder: "~/Notes/field",
    saved: "Saved locally",
    modes: ["Source", "Split", "Read"],
    state: ["Draft", "Read", "Filed"],
    notes: [
      {
        title: "Brief: A desk built for two",
        path: "field/2026-11-02-reading-desk.md",
        author: "AGENT",
        date: "2026-11-02",
        words: "428 words",
        summary: "Why a notebook must comfortably fit both you and your agent in the very same folder.",
        body: [
          "Most note-taking apps assume only a single human is writing. StoatMD is built for two: the agent puts down the initial draft, while you read, tweak, and call the shots. Either of you can pick up where the other left off.",
          "Notes stay plain Markdown files throughout. The app offers a clean reading interface and a raw source view. Agents write straight to disk without needing complex MCP bridges or plugin middleware.",
        ],
        quote: "The agent drafts. You call the shots. Right in the same folder.",
        list: ["Source view always accessible", "Distraction-free reading", "Every file portable anywhere"],
        ending: "Filed under: reading, agents, plain text.",
      },
      {
        title: "Field notes: Sync without self-hosting",
        path: "field/2026-11-01-sync.md",
        author: "AGENT",
        date: "2026-11-01",
        words: "512 words",
        summary: "Google Drive or Dropbox handles the transport, while StoatMD gives you a great reading and writing space.",
        body: [
          "No StoatMD accounts, no proprietary StoatMD servers. Files live right inside your Google Drive or Dropbox: local agents read and write through the filesystem, while remote agents sync in via cloud drives.",
          "When changes collide, the app pauses and lets you choose: keep local, keep cloud, or keep both. Nothing ever gets silently overwritten.",
        ],
        quote: "Cloud drives just carry your files; the files are always yours.",
        list: ["Google Drive", "Dropbox", "Keep both copies on conflict"],
        ending: "No iCloud lock-in, no WebDAV hassles, no self-hosted sync servers.",
      },
      {
        title: "Team log: One folder, three readers",
        path: "field/2026-10-30-team.md",
        author: "AGENT",
        date: "2026-10-30",
        words: "367 words",
        summary: "A shared folder doubles as a lightweight team knowledge base, letting agents handle what humans don't want to type.",
        body: [
          "A small team can share one folder. Let one agent organize meeting minutes, have another update research summaries, while team members read the latest docs on Mac or iPhone.",
          "Access permissions remain managed by your cloud drive. StoatMD never injects an annoying team account layer on top.",
        ],
        quote: "One folder, a few readers. Your notes don't need a second home.",
        list: ["One shared folder", "Same files across all devices", "Permissions follow your cloud drive"],
        ending: "Filed under: teams, shared folders, agents.",
      },
    ],
  },
  mechanism: {
    kicker: "HOW IT WORKS",
    title: "One folder, written together with your agent.",
    body: "Not a closed database—just an ordinary folder packed with plain .md files that you and your agents can access anytime.",
    steps: [
      { n: "01", title: "Agent writes directly", body: "Local agents save Markdown straight into your folder. No MCP bridges, no manual exports." },
      { n: "02", title: "Held in plain files", body: "Standard .md files, normal filenames, works offline. Your local folder is the single source of truth." },
      { n: "03", title: "Cloud syncs smoothly", body: "Google Drive or Dropbox automatically syncs files across your devices and remote agents." },
      { n: "04", title: "You keep writing", body: "Open the folder on Mac or iPhone. Read, edit, or hand off the next iteration back to the agent." },
    ],
    providers: "Google Drive / Dropbox",
    caption: "Your agent, your cloud drive, and you—all sharing one folder.",
  },
  comparison: {
    kicker: "WHY NOT JUST USE…",
    title: "Lightweight, without holding your data hostage.",
    body: "Modern note-taking tools are bloated with plugin configurations, lock you into paid proprietary sync, and make remote agents hard to connect. StoatMD is featherlight and works right on your existing folders.",
    columns: ["Footprint & Feel", "Cross-Platform & Agents", "Pricing"],
    rows: [
      { name: "Obsidian", cells: ["Feature-packed but increasingly heavy and reliant on plugins", "Official subscription sync; remote agents are tough to integrate", "Monthly subscription"] },
      { name: "Typora", cells: ["Focused on single-machine writing; lacks an official mobile app", "Sync requires tinkering; hard to coordinate with mobile & agents", "One-time purchase"] },
      { name: "Miaoyan & others", cells: ["Clean and minimalist, but limited ecosystem", "Apple ecosystem only; tricky to pair with remote agents", "Per-platform paid"] },
      { name: "StoatMD", cells: ["Featherlight and launches instantly with zero plugin burden", "Built-in Google Drive & Dropbox; local and remote agents write freely", "Desktop free · iPhone one-time"], ours: true },
    ],
    footnote: "Comparison reflects everyday workflow, sync setup, and agent accessibility. Product names belong to their respective owners.",
  },
  features: {
    kicker: "KEY DETAILS",
    title: "Crafted for comfortable reading and editing.",
    body: "Your agent drafts the content, and you polish and review. Every detail is tuned to feel natural and easy on the eyes.",
    items: [
      { n: "01", title: "Plain .md, no proprietary database", body: "Every note is a standard file: diff changes, migrate, or open with any tool at any time." },
      { n: "02", title: "Source, split, clean reading", body: "Switch effortlessly between raw Markdown, side-by-side split, or clean full-width reading with generous margins." },
      { n: "03", title: "Offline-first, worry-free", body: "Read and write completely offline. When connection returns, your cloud drive silently handles the sync." },
      { n: "04", title: "25 curated themes, easy on the eyes", body: "Thoughtfully tuned light and dark palettes. Defaults to Paper—a warm, calm texture that keeps focus on your words." },
      { n: "05", title: "Why the name Stoat?", body: "The stoat is nimble and quick. We designed StoatMD to be just like it: agile, light, darting between folders without weighing down your machine." },
    ],
  },
  pricing: {
    kicker: "PRICING",
    title: "Free on desktop. One-time purchase on mobile.",
    body: "No recurring subscriptions, no account signups. StoatMD for Desktop (including cloud sync) is completely free; iPhone is a one-time purchase for life.",
    desktop: {
      label: "DESKTOP",
      name: "StoatMD Desktop",
      price: "$0",
      unit: "free forever",
      items: ["Local folders + Google Drive / Dropbox", "Source, split, and clean reading modes", "25 themes, offline-ready, visual conflict picker"],
    },
    mobile: {
      label: "MOBILE",
      name: "StoatMD for iPhone",
      price: "One-time",
      unit: "price announced at launch",
      items: ["Link directly to cloud folders", "On-device offline cache", "Shares the exact same directory with your desktop agents"],
    },
    note: "iPhone pricing will be announced upon App Store release. There will never be a subscription.",
    stamp: "NO SUBSCRIPTION",
    source: {
      title: "Public source, noncommercial license",
      body: "The source code is available for personal, noncommercial use. The official iOS app remains a paid one-time App Store purchase; you can compile and install your own copy under the license.",
      linkLabel: "github.com/richcalls/stoatmd",
    },
  },
  release: {
    kicker: "RELEASE LOG",
    title: "Mac app is available now.",
    body: "The first public release is out on GitHub Releases. The same desktop codebase also targets Windows and Linux; packages are coming soon. The iPhone app is awaiting App Store release.",
    mac: "Download for Mac — Free",
    macNote: "GitHub Releases · macOS 14+ · Apple Silicon",
    platforms: "Windows and Linux builds coming soon.",
    soon: "Windows / Linux — in progress",
    ios: "iPhone — coming soon",
  },
  footer: {
    line: "A notebook app made for notes written together with your agent.",
    feedback: "Feedback",
    langLabel: "Language",
    system: "Follow system",
    copyright: "© 2026 StoatMD",
  },
  a11y: { lang: "Language", nav: "Primary navigation", preview: "StoatMD macOS reader with the outline open", skip: "Skip to content" },
};

const zhHans: SiteCopy = {
  meta: {
    title: "StoatMD — 专做 Agent 时代的笔记应用",
    description:
      "专做 Agent 时代的 Markdown 笔记应用。Agent 和你共用同一个本地文件夹，随时在 Mac 或 iPhone 上接着往下写。用 Google Drive 或 Dropbox 同步。桌面版永久免费，iPhone 一次买断，无订阅。",
  },
  nav: { why: "为什么", features: "功能", pricing: "定价", download: "下载", cta: "免费下载 Mac 版" },
  theme: { label: "主题", system: "跟随系统", light: "浅色", dark: "深色" },
  hero: {
    kicker: "工作日志 / 2026",
    title: "专做 Agent 时代的笔记应用。",
    lead: "StoatMD 是一款为 Agent 时代打造的 Markdown 笔记应用。Agent 往你的本地文件夹里写初稿，你打开同一个文件夹直接读、直接改、接着往下写。",
    primary: "免费下载 Mac 版",
    secondary: "iPhone — 一次买断 · 尚未上架",
    note: "桌面版永久免费，含网盘同步。无账号、无订阅、不绑 iCloud。",
    status: "BUILD 1.0",
  },
  log: {
    label: "Agent 协作日志",
    folder: "~/Notes/field",
    saved: "已保存到本地",
    modes: ["源码", "分栏", "阅读"],
    state: ["草稿", "已读", "归档"],
    notes: [
      {
        title: "简报：给两个人留一张书桌",
        path: "field/2026-11-02-reading-desk.md",
        author: "AGENT",
        date: "2026-11-02",
        words: "428 字",
        summary: "为什么笔记应用要能同时装下你和 Agent，在同一个文件夹里写字。",
        body: [
          "大多数笔记应用默认只有一个人在写。StoatMD 是为两个人准备的：Agent 负责出初稿，你负责阅读、修改和拿主意，谁都能在同一个文件夹里接着推进。",
          "笔记始终是普通的 Markdown 文件。软件只提供干净清爽的阅读界面和源码视图，Agent 可以直接写入文件，不需要配复杂的 MCP 或插件中间件。",
        ],
        quote: "Agent 出初稿，你来拿主意。就在同一个文件夹里。",
        list: ["源码随时可见", "阅读界面干净不打扰", "所有文件随时能带走"],
        ending: "归档于：阅读、Agent、纯文本。",
      },
      {
        title: "实战笔记：不用自建服务器的同步",
        path: "field/2026-11-01-sync.md",
        author: "AGENT",
        date: "2026-11-01",
        words: "512 字",
        summary: "Google Drive 或 Dropbox 负责搬运文件，StoatMD 负责好好看、好好写。",
        body: [
          "不需要注册 StoatMD 账号，也没有 StoatMD 服务器。文件就在你的 Google Drive 或 Dropbox 里：本机的 Agent 直接读写本地文件，远程的 Agent 通过网盘同步写入。",
          "当两边改了同一个文件时，软件会停下来问你：保留本地、保留云端，还是两份都留。绝不自作主张悄悄覆盖任何内容。",
        ],
        quote: "网盘只负责搬运，文件永远是你自己的。",
        list: ["Google Drive", "Dropbox", "有冲突时两份都留"],
        ending: "不用 iCloud，不用配 WebDAV，不用自己搭同步服务。",
      },
      {
        title: "团队日志：一个文件夹，三个读者",
        path: "field/2026-10-30-team.md",
        author: "AGENT",
        date: "2026-10-30",
        words: "367 字",
        summary: "一个共享文件夹就是一个团队知识库，让 Agent 去整理大家不想手动写的部分。",
        body: [
          "一个小团队可以共用一个文件夹。让一个 Agent 负责整理会议纪要，另一个负责更新调研资料，其他人随时在 Mac 或 iPhone 上打开看。",
          "查看和编辑权限依然由网盘管理，StoatMD 不会多加一层烦人的团队账号系统。",
        ],
        quote: "一个文件夹，几个读者。笔记不需要第二个家。",
        list: ["共用一个文件夹", "所有设备看同一份文件", "权限跟着网盘走"],
        ending: "归档于：团队、共享文件夹、Agent。",
      },
    ],
  },
  mechanism: {
    kicker: "运行机制",
    title: "同一个文件夹，你和 Agent 共同写。",
    body: "它不是封闭的数据库，就是一个装满 .md 文件的普通文件夹，你和 Agent 都能随时读写。",
    steps: [
      { n: "01", title: "Agent 直接写", body: "本机的 Agent 直接把 Markdown 保存到文件夹。不用装 MCP，不用手动导出。" },
      { n: "02", title: "本地文件保存", body: "普通的 .md 文件，普通的文件名，没网也能用。本地文件夹就是唯一标准。" },
      { n: "03", title: "网盘自动同步", body: "Google Drive 或 Dropbox 自动把文件同步到你的手机、电脑和远端 Agent。" },
      { n: "04", title: "你接着往下改", body: "在 Mac 或 iPhone 上打开文件夹。直接阅读、修改，或者让 Agent 接着写下一轮。" },
    ],
    providers: "Google Drive / Dropbox",
    caption: "Agent、网盘和你，用的就是同一个文件夹。",
  },
  comparison: {
    kicker: "为什么不直接用…",
    title: "轻快，且不绑架你的数据。",
    body: "现在的笔记工具越来越臃肿，各种插件配置让人疲惫；而且要花钱买封闭的私有同步，远程 Agent 还很难介入。StoatMD 极度轻量，直接用你现成的文件夹。",
    columns: ["体积与体验", "多端同步与 Agent", "费用"],
    rows: [
      { name: "Obsidian", cells: ["功能多但越来越重，依赖插件配置", "官方订阅同步，远程 Agent 很难接", "按月订阅"] },
      { name: "Typora", cells: ["偏向单机写作，官方没有手机移动端", "需自行折腾同步，难与手机及 Agent 协同", "一次买断"] },
      { name: "妙言等", cells: ["极简好看，但生态受限", "仅限苹果设备，很难配合远程 Agent", "单端付费"] },
      { name: "StoatMD", cells: ["极简轻量，秒开即用，无任何插件负担", "自带 Google Drive / Dropbox，本地与远程 Agent 都能直接写", "桌面端免费 · iPhone 一次买断"], ours: true },
    ],
    footnote: "这里对比的是日常体验、同步方式与 Agent 读写便利度。相关产品名称归其所有者所有。",
  },
  features: {
    kicker: "核心细节",
    title: "为舒服的阅读与修改而做。",
    body: "Agent 帮你写好初稿，你负责阅读、调整和把关。每一个细节都让你用得顺手、看得舒服。",
    items: [
      { n: "01", title: "普通的 .md，没有私有数据库", body: "每条笔记都是标准文件：随时对比版本、迁移复制，用什么其他工具打开都行。" },
      { n: "02", title: "源码、分栏、纯净阅读", body: "想看 Markdown 源码、左右对照，还是全屏纯文本阅读，随你切换。阅读页面留白极佳。" },
      { n: "03", title: "离线优先，不担心断网", body: "没网也能随时打开读写。连上网络后，网盘会自动帮你静默同步好。" },
      { n: "04", title: "25 款排版主题，安静不刺眼", body: "精心调校的浅色与深色主题。默认经典的 Paper 纸质风格，不抢正文风头。" },
      { n: "05", title: "为什么叫 Stoat？", body: "白鼬（Stoat）体态轻灵敏捷。我们希望它像白鼬一样：轻快、敏捷穿梭于各文件夹之间，不给你的电脑增添丝毫负担。" },
    ],
  },
  pricing: {
    kicker: "价格方案",
    title: "电脑端免费用。手机端一次买断。",
    body: "没有按月扣费的订阅，不需要注册账号。电脑版（包括网盘同步）完全免费；iPhone 版一次买断，终身使用。",
    desktop: {
      label: "电脑端",
      name: "StoatMD 桌面版",
      price: "$0",
      unit: "永久免费",
      items: ["本地文件夹 + Google Drive / Dropbox", "源码、分栏、纯净阅读三种模式", "25 套主题、支持离线、文件冲突可视化选择"],
    },
    mobile: {
      label: "手机端",
      name: "StoatMD iPhone 版",
      price: "一次买断",
      unit: "上架时公布价格",
      items: ["绑定网盘文件夹", "手机本地离线缓存", "和电脑端的 Agent 共用同一个目录"],
    },
    note: "iPhone 版价格会在正式上架 App Store 时公布。未来也不会增加任何订阅制。",
    stamp: "无订阅",
    source: {
      title: "源码公开，个人可自行编译",
      body: "StoatMD 采用非商业授权。iOS 官方 App Store 版本仍为一次买断；如果不想购买，可以按许可自行编译并安装个人版本。",
      linkLabel: "GitHub 源码：github.com/richcalls/stoatmd",
    },
  },
  release: {
    kicker: "下载与版本",
    title: "Mac 版现在就可以下载。",
    body: "首个公开版本已在 GitHub Releases 发布。同一套电脑端代码也支持 Windows 和 Linux，安装包稍后补充。iPhone 版目前尚未在 App Store 上架。",
    mac: "免费下载 Mac 版",
    macNote: "GitHub Releases · 支持 macOS 14+ · Apple Silicon",
    platforms: "Windows 和 Linux 版稍后推出。",
    soon: "Windows / Linux 版准备中",
    ios: "iPhone 版 — 尚未上架",
  },
  footer: {
    line: "一个用来放你和 Agent 共同写出来的笔记应用。",
    feedback: "问题反馈",
    langLabel: "语言",
    system: "跟随系统",
    copyright: "© 2026 StoatMD",
  },
  a11y: { lang: "语言", nav: "主导航", preview: "显示目录的 StoatMD macOS 阅读界面", skip: "跳到正文" },
};

const zhHant: SiteCopy = {
  meta: {
    title: "StoatMD — 專做 Agent 時代的筆記應用",
    description:
      "專做 Agent 時代的 Markdown 筆記應用。Agent 和你共用同一個本機資料夾，隨時在 Mac 或 iPhone 上接著往下寫。用 Google Drive 或 Dropbox 同步。桌面版永久免費，iPhone 一次買斷，無訂閱。",
  },
  nav: { why: "為什麼", features: "功能", pricing: "定價", download: "下載", cta: "免費下載 Mac 版" },
  theme: { label: "主題", system: "跟隨系統", light: "淺色", dark: "深色" },
  hero: {
    kicker: "工作日誌 / 2026",
    title: "專做 Agent 時代的筆記應用。",
    lead: "StoatMD 是一款為 Agent 時代打造的 Markdown 筆記應用。Agent 往你的本機資料夾裡寫初稿，你打開同一個資料夾直接讀、直接改、接著往下寫。",
    primary: "免費下載 Mac 版",
    secondary: "iPhone — 一次買斷 · 尚未上架",
    note: "桌面版永久免費，含雲端硬碟同步。無帳號、無訂閱、不綁 iCloud。",
    status: "BUILD 1.0",
  },
  log: {
    label: "Agent 協作日誌",
    folder: "~/Notes/field",
    saved: "已儲存到本機",
    modes: ["原始碼", "分欄", "閱讀"],
    state: ["草稿", "已讀", "歸檔"],
    notes: [
      {
        title: "簡報：給兩個人留一張書桌",
        path: "field/2026-11-02-reading-desk.md",
        author: "AGENT",
        date: "2026-11-02",
        words: "428 字",
        summary: "為什麼筆記應用要能同時裝下你和 Agent，在同一個資料夾裡寫字。",
        body: [
          "大多數筆記應用預設只有一個人在寫。StoatMD 是為兩個人準備的：Agent 負責出初稿，你負責閱讀、修改和拿主意，誰都能在同一個資料夾裡接著推進。",
          "筆記始終是普通的 Markdown 檔案。軟體只提供乾淨清爽的閱讀介面和原始碼檢視，Agent 可以直接寫入檔案，不需要配複雜的 MCP 或外掛中介軟體。",
        ],
        quote: "Agent 出初稿，你來拿主意。就在同一個資料夾裡。",
        list: ["原始碼隨時可見", "閱讀介面乾淨不打擾", "所有檔案隨時能帶走"],
        ending: "歸檔於：閱讀、Agent、純文字。",
      },
      {
        title: "實戰筆記：不用自建伺服器的同步",
        path: "field/2026-11-01-sync.md",
        author: "AGENT",
        date: "2026-11-01",
        words: "512 字",
        summary: "Google Drive 或 Dropbox 負責搬運檔案，StoatMD 負責好好看、好好寫。",
        body: [
          "不需要註冊 StoatMD 帳號，也沒有 StoatMD 伺服器。檔案就在你的 Google Drive 或 Dropbox 裡：本機的 Agent 直接讀寫本機檔案，遠端的 Agent 透過雲端硬碟同步寫入。",
          "當兩邊改了同一個檔案時，軟體會停下來問你：保留本機、保留雲端，還是兩份都留。絕不自作主張悄悄覆蓋任何內容。",
        ],
        quote: "雲端硬碟只負責搬運，檔案永遠是你自己的。",
        list: ["Google Drive", "Dropbox", "有衝突時兩份都留"],
        ending: "不用 iCloud，不用配 WebDAV，不用自己架同步服務。",
      },
      {
        title: "團隊日誌：一個資料夾，三個讀者",
        path: "field/2026-10-30-team.md",
        author: "AGENT",
        date: "2026-10-30",
        words: "367 字",
        summary: "一個共享資料夾就是一個團隊知識庫，讓 Agent 去整理大家不想手動寫的部分。",
        body: [
          "一個小團隊可以共用一個資料夾。讓一個 Agent 負責整理會議記錄，另一個負責更新調研資料，其他人隨時在 Mac 或 iPhone 上打開看。",
          "查看和編輯權限依然由雲端硬碟管理，StoatMD 不會多加一層煩人的團隊帳號系統。",
        ],
        quote: "一個資料夾，幾個讀者。筆記不需要第二個家。",
        list: ["共用一個資料夾", "所有裝置看同一份檔案", "權限跟著雲端硬碟走"],
        ending: "歸檔於：團隊、共享資料夾、Agent。",
      },
    ],
  },
  mechanism: {
    kicker: "運作機制",
    title: "同一個資料夾，你和 Agent 共同寫。",
    body: "它不是封閉的資料庫，就是一個裝滿 .md 檔案的普通資料夾，你和 Agent 都能隨時讀寫。",
    steps: [
      { n: "01", title: "Agent 直接寫", body: "本機的 Agent 直接把 Markdown 儲存到資料夾。不用裝 MCP，不用手動匯出。" },
      { n: "02", title: "本機檔案保存", body: "普通的 .md 檔案，普通的檔名，沒網也能用。本機資料夾就是唯一標準。" },
      { n: "03", title: "雲端硬碟自動同步", body: "Google Drive 或 Dropbox 自動把檔案同步到你的手機、電腦和遠端 Agent。" },
      { n: "04", title: "你接著往下改", body: "在 Mac 或 iPhone 上打開資料夾。直接閱讀、修改，或者讓 Agent 接著寫下一輪。" },
    ],
    providers: "Google Drive / Dropbox",
    caption: "Agent、雲端硬碟和你，用的就是同一個資料夾。",
  },
  comparison: {
    kicker: "為什麼不直接用…",
    title: "輕快，且不綁架你的資料。",
    body: "現在的筆記工具越來越臃腫，各種外掛設定讓人疲倦；而且要花錢買封閉的私有同步，遠端 Agent 還很難介入。StoatMD 極度輕量，直接用你現成的資料夾。",
    columns: ["體積與體驗", "多端同步與 Agent", "費用"],
    rows: [
      { name: "Obsidian", cells: ["功能多但越來越重，依賴外掛設定", "官方訂閱同步，遠端 Agent 很難接", "按月訂閱"] },
      { name: "Typora", cells: ["偏向單機寫作，官方沒有手機行動端", "需自行折騰同步，難與手機及 Agent 協同", "一次買斷"] },
      { name: "妙言等", cells: ["極簡好看，但生態受限", "僅限蘋果裝置，很難配合遠端 Agent", "單端付費"] },
      { name: "StoatMD", cells: ["極簡輕量，秒開即用，無任何外掛負擔", "自帶 Google Drive / Dropbox，本機與遠端 Agent 都能直接寫", "桌面端免費 · iPhone 一次買斷"], ours: true },
    ],
    footnote: "這裡對比的是日常體驗、同步方式與 Agent 讀寫便利度。相關產品名稱歸其所有者所有。",
  },
  features: {
    kicker: "核心細節",
    title: "為舒服的閱讀與修改而做。",
    body: "Agent 幫你寫好初稿，你負責閱讀、調整和把關。每一個細節都讓你用得順手、看得舒服。",
    items: [
      { n: "01", title: "普通的 .md，沒有私有資料庫", body: "每條筆記都是標準檔案：隨時比對版本、遷移複製，用什麼其他工具打開都行。" },
      { n: "02", title: "原始碼、分欄、純淨閱讀", body: "想看 Markdown 原始碼、左右對照，還是全螢幕純文字閱讀，隨你切換。閱讀頁面留白極佳。" },
      { n: "03", title: "離線優先，不擔心斷網", body: "沒網也能隨時打開讀寫。連上網路後，雲端硬碟會自動幫你靜默同步好。" },
      { n: "04", title: "25 款排版主題，安靜不刺眼", body: "精心調校的淺色與深色主題。預設經典的 Paper 紙質風格，不搶正文風頭。" },
      { n: "05", title: "為什麼叫 Stoat？", body: "白鼬（Stoat）體態輕靈敏捷。我們希望它像白鼬一樣：輕快、敏捷穿梭於各資料夾之間，不給你的電腦增添絲毫負擔。" },
    ],
  },
  pricing: {
    kicker: "價格方案",
    title: "電腦端免費使用。手機端一次買斷。",
    body: "沒有按月扣費的訂閱，不需要註冊帳號。電腦版（包括雲端硬碟同步）完全免費；iPhone 版一次買斷，終身使用。",
    desktop: {
      label: "電腦端",
      name: "StoatMD 桌面版",
      price: "$0",
      unit: "永久免費",
      items: ["本機資料夾 + Google Drive / Dropbox", "原始碼、分欄、純淨閱讀三種模式", "25 套主題、支援離線、檔案衝突視覺化選擇"],
    },
    mobile: {
      label: "手機端",
      name: "StoatMD iPhone 版",
      price: "一次買斷",
      unit: "上架時公布價格",
      items: ["綁定雲端硬碟資料夾", "手機本機離線快取", "和電腦端的 Agent 共用同一個目錄"],
    },
    note: "iPhone 版價格會在正式上架 App Store 時公布。未來也不會增加任何訂閱制。",
    stamp: "無訂閱",
    source: {
      title: "原始碼公開，個人可自行編譯",
      body: "StoatMD 採用非商業授權。iOS 官方 App Store 版本仍為一次買斷；如果不想購買，可以依照授權自行編譯並安裝個人版本。",
      linkLabel: "GitHub 原始碼：github.com/richcalls/stoatmd",
    },
  },
  release: {
    kicker: "下載與版本",
    title: "Mac 版現在就可以下載。",
    body: "首個公開版本已在 GitHub Releases 發布。同一套電腦端程式碼也支援 Windows 和 Linux，安裝套件稍後補充。iPhone 版目前尚未在 App Store 上架。",
    mac: "免費下載 Mac 版",
    macNote: "GitHub Releases · 支援 macOS 14+ · Apple Silicon",
    platforms: "Windows 和 Linux 版稍後推出。",
    soon: "Windows / Linux 版準備中",
    ios: "iPhone 版 — 尚未上架",
  },
  footer: {
    line: "一個用來放你和 Agent 共同寫出來的筆記應用。",
    feedback: "問題回饋",
    langLabel: "語言",
    system: "跟隨系統",
    copyright: "© 2026 StoatMD",
  },
  a11y: { lang: "語言", nav: "主導航", preview: "顯示目錄的 StoatMD macOS 閱讀介面", skip: "跳至內容" },
};

const ja: SiteCopy = {
  meta: {
    title: "StoatMD — エージェント時代のためのノートアプリ",
    description:
      "エージェント時代に特化した Markdown ノートアプリ。エージェントとあなたが同じローカルフォルダを共有し、Mac や iPhone でそのまま続きを書けます。Google Drive や Dropbox で同期。デスクトップ版は永久無料、iPhone 版は買い切り・サブスクなし。",
  },
  nav: { why: "特徴", features: "機能", pricing: "料金", download: "ダウンロード", cta: "Mac 版を無料ダウンロード" },
  theme: { label: "テーマ", system: "システム準拠", light: "ライト", dark: "ダーク" },
  hero: {
    kicker: "開発ログ / 2026",
    title: "エージェント時代のためのノートアプリ。",
    lead: "StoatMD は、AI エージェント時代のために設計された Markdown ノートアプリです。エージェントがあなたのローカルフォルダに下書きを書き込み、あなたは同じフォルダを開いて読み、手直しし、そのまま書き進めます。",
    primary: "Mac 版を無料ダウンロード",
    secondary: "iPhone — 買い切り · まもなく公開",
    note: "デスクトップ版はクラウド同期を含め永久無料。アカウント不要、サブスクなし、iCloud 囲い込みなし。",
    status: "BUILD 1.0",
  },
  log: {
    label: "エージェント協働ログ",
    folder: "~/Notes/field",
    saved: "ローカルに保存済み",
    modes: ["ソース", "2分割", "閲覧"],
    state: ["下書き", "既読", "保管"],
    notes: [
      {
        title: "ブリーフ：二人で使うひとつの机",
        path: "field/2026-11-02-reading-desk.md",
        author: "AGENT",
        date: "2026-11-02",
        words: "428 文字",
        summary: "あなたとエージェントが同じフォルダを共有して書くべき理由。",
        body: [
          "従来のノートアプリの多くは、人間ひとりで書くことを前提にしています。StoatMD は二人で使うために作られました。エージェントが初稿を用意し、あなたが読んで直し、仕上げる。どちらからでも同じフォルダで作業を再開できます。",
          "ノートは終始プレーンな Markdown ファイルのまま。アプリはすっきりとした読書画面とソースコード表示を提供し、エージェントは MCP や複雑なプラグインを介さずに直接書き込めます。",
        ],
        quote: "エージェントが初稿を書き、あなたが仕上げる。すべて同じフォルダの中で。",
        list: ["ソースコードがいつでも確認できる", "集中を妨げないクリーンな読書画面", "すべてのファイルを持ち運び可能"],
        ending: "分類：読書、エージェント、プレーンテキスト。",
      },
      {
        title: "実践ノート：自前サーバーなしで同期する",
        path: "field/2026-11-01-sync.md",
        author: "AGENT",
        date: "2026-11-01",
        words: "512 文字",
        summary: "ファイルの受け渡しは Google Drive や Dropbox に任せ、StoatMD は快適な読み書きに集中します。",
        body: [
          "StoatMD 専用のアカウントも、専用サーバーも不要です。ノートはあなたの Google Drive や Dropbox に直接保存されます。ローカルのエージェントはファイルシステムから直接、リモートのエージェントはクラウド同期経由で書き込めます。",
          "万が一同じファイルが同時に編集されて競合した場合も、アプリが立ち止まり「ローカルを残す・クラウドを残す・両方保存する」を選択できます。勝手に上書きされる心配はありません。",
        ],
        quote: "クラウドはただの運び手。ファイルはいつでもあなたの手元に。",
        list: ["Google Drive", "Dropbox", "競合時は両方のコピーを保持"],
        ending: "iCloud への依存なし、WebDAV 設定不要、自前サーバーの構築も不要。",
      },
      {
        title: "チームログ：1つのフォルダ、3人の読者",
        path: "field/2026-10-30-team.md",
        author: "AGENT",
        date: "2026-10-30",
        words: "367 文字",
        summary: "共有フォルダを小さなチームのナレッジベースにし、面倒な定型作業はエージェントに任せます。",
        body: [
          "少人数のチームでひとつのフォルダを共有できます。ひとつのエージェントにミーティングの議事録をまとめさせ、別のエージェントに調査メモを整理させ、メンバーは Mac や iPhone から同じドキュメントをチェックできます。",
          "アクセス権限はクラウドストレージ側でそのまま管理。StoatMD が煩わしい独自のチームアカウント管理を強制することはありません。",
        ],
        quote: "ひとつのフォルダ、数人の読者。ノートに別の家はいりません。",
        list: ["フォルダをチームで共有", "すべてのデバイスで同一ファイルを閲覧", "権限はクラウドストレージに準拠"],
        ending: "分類：チーム、共有フォルダ、エージェント。",
      },
    ],
  },
  mechanism: {
    kicker: "仕組み",
    title: "ひとつのフォルダを、あなたとエージェントが共に書く。",
    body: "閉じたデータベースではありません。あなたもエージェントもいつでもアクセスできる、プレーンな .md ファイルが入った普通のフォルダです。",
    steps: [
      { n: "01", title: "エージェントが直接書く", body: "ローカルのエージェントが Markdown を直接フォルダに保存。MCP も手動エクスポートも不要。" },
      { n: "02", title: "プレーンファイルで保持", body: "普通の .md ファイル、普通のファイル名、オフライン対応。ローカルフォルダこそが唯一の正本です。" },
      { n: "03", title: "クラウドが自動同期", body: "Google Drive や Dropbox が、他のデバイスやリモートのエージェントへファイルを自動同期。" },
      { n: "04", title: "あなたが続きを書く", body: "Mac や iPhone でフォルダを開き、読んだり直したり、次の作業をエージェントにバトンタッチ。" },
    ],
    providers: "Google Drive / Dropbox",
    caption: "エージェント、クラウド、あなたが、まったく同じひとつのフォルダを共有。",
  },
  comparison: {
    kicker: "なぜ他のアプリではなく…",
    title: "軽快で、あなたのデータを人質に取らない。",
    body: "最近のノートツールはプラグイン設定などで肥大化しがちで、高額な専用同期サブスクを求められたり、外部エージェントのアクセスが困難だったりします。StoatMD は極めて軽量で、手元のフォルダをそのまま使えます。",
    columns: ["サイズと使い心地", "マルチデバイス同期と Agent", "料金"],
    rows: [
      { name: "Obsidian", cells: ["機能豊富だが徐々に重くなり、プラグイン設定に依存", "公式有料サブスク同期、リモート Agent の連携が困難", "月額サブスクリプション"] },
      { name: "Typora", cells: ["ローカル単体執筆向けで、公式スマホアプリがない", "同期の自前構築が必要で、スマホや Agent と連携しづらい", "買い切り"] },
      { name: "妙言など", cells: ["シンプルで美しいが、エコシステムが限られる", "Apple 端末のみで、リモート Agent との連携が難しい", "プラットフォーム別購入"] },
      { name: "StoatMD", cells: ["極限まで軽量、一瞬で起動、プラグインの負担ゼロ", "Google Drive / Dropbox 標準対応。ローカル・リモート問わず直接読み書き", "デスクトップ無料 · iPhone 買い切り"], ours: true },
    ],
    footnote: "日常の使い勝手、同期方式、エージェントからの読み書きのしやすさを比較しています。製品名は各社の商標です。",
  },
  features: {
    kicker: "こだわりの詳細",
    title: "気持ちよく読み、手直すために。",
    body: "エージェントが初稿を書き、あなたが目を通してブラッシュアップする。すべての細部を、ストレスなく心地よく扱えるよう整えました。",
    items: [
      { n: "01", title: "普通の .md、独自データベースなし", body: "すべてのノートは標準ファイル。差分の比較、移行、他のツールでの閲覧もいつでも自由です。" },
      { n: "02", title: "ソース、分割、クリーンな読書", body: "生マークダウン、左右の比較分割、ゆったりとした余白の全画面読書モードを自由に切り替えられます。" },
      { n: "03", title: "オフライン優先設計", body: "ネットがつながらない場所でも快適に読み書き。接続復帰時にクラウドが静かに自動同期します。" },
      { n: "04", title: "目に優しい 25 種の厳選テーマ", body: "丁寧に調整されたライト＆ダークテーマ。標準は文字を引き立てる落ち着いた Paper（紙）スタイルです。" },
      { n: "05", title: "なぜ Stoat（オコジョ）なのか？", body: "オコジョは身軽で俊敏です。StoatMD もオコジョのように、フォルダ間を軽快に駆け抜け、PC に負担をかけない存在でありたいと考えています。" },
    ],
  },
  pricing: {
    kicker: "料金プラン",
    title: "PC 版はずっと無料。スマホ版は買い切り。",
    body: "月額のサブスクリプションも、ユーザー登録もありません。デスクトップ版（クラウド同期を含む）は完全無料。iPhone 版は一度きりの買い切りで永久に使えます。",
    desktop: {
      label: "デスクトップ",
      name: "StoatMD デスクトップ版",
      price: "¥0",
      unit: "永久無料",
      items: ["ローカルフォルダ + Google Drive / Dropbox", "ソース、分割、クリーン読書の 3 つの表示モード", "25 種のテーマ、オフライン対応、競合選択機能"],
    },
    mobile: {
      label: "モバイル",
      name: "StoatMD iPhone 版",
      price: "買い切り",
      unit: "リリース時に価格公開",
      items: ["クラウドフォルダ連携", "端末内のオフラインキャッシュ", "PC のエージェントと同じフォルダを共有"],
    },
    note: "iPhone 版の価格は App Store リリース時に発表します。サブスク化の予定はありません。",
    stamp: "サブスクなし",
    source: {
      title: "ソースコードを公開、非商用ライセンス",
      body: "ソースコードは個人の非商用利用向けに公開しています。iOS 公式アプリは App Store での買い切り販売を続けます。購入せずに利用したい場合は、ライセンスに従って自分でビルドし、インストールできます。",
      linkLabel: "GitHub ソースコード：github.com/richcalls/stoatmd",
    },
  },
  release: {
    kicker: "リリース情報",
    title: "Mac 版のダウンロードを開始しました。",
    body: "最初の公開ビルドを GitHub Releases にて配布しています。同じデスクトップコードベースで Windows と Linux にも対応予定で、インストーラーは順次追加します。iPhone 版は現在 App Store 公開準備中です。",
    mac: "Mac 版を無料ダウンロード",
    macNote: "GitHub Releases · macOS 14 以降 · Apple Silicon 対応",
    platforms: "Windows 版および Linux 版は近日公開予定。",
    soon: "Windows / Linux — 準備中",
    ios: "iPhone 版 — まもなく公開",
  },
  footer: {
    line: "あなたとエージェントが共に書き上げるためのノートアプリ。",
    feedback: "フィードバック",
    langLabel: "言語",
    system: "システム準拠",
    copyright: "© 2026 StoatMD",
  },
  a11y: { lang: "言語", nav: "メインナビゲーション", preview: "アウトラインを表示した StoatMD macOS の読書画面", skip: "本文へスキップ" },
};

const ko: SiteCopy = {
  meta: {
    title: "StoatMD — 에이전트 시대를 위한 마크다운 노트 앱",
    description:
      "에이전트 시대를 위해 만들어진 Markdown 노트 앱. 에이전트와 당신이 동일한 로컬 폴더를 공유하며, Mac이나 iPhone에서 자연스럽게 이어서 작업합니다. Google Drive나 Dropbox로 동기화. 데스크톱 영구 무료, iPhone 일회 구매, 구독 없음.",
  },
  nav: { why: "특징", features: "기능", pricing: "가격", download: "다운로드", cta: "Mac 버전 무료 다운로드" },
  theme: { label: "테마", system: "시스템 설정", light: "라이트", dark: "다크" },
  hero: {
    kicker: "작업 로그 / 2026",
    title: "에이전트 시대를 위한 마크다운 노트 앱.",
    lead: "StoatMD는 AI 에이전트 시대를 위해 설계된 Markdown 노트 앱입니다. 에이전트가 로컬 폴더에 초안을 써두면, 당신은 같은 폴더를 열어 바로 읽고, 다듬고, 이어서 글을 써내려갑니다.",
    primary: "Mac 버전 무료 다운로드",
    secondary: "iPhone — 일회 구매 · 출시 준비 중",
    note: "데스크톱 버전은 클라우드 동기화 포함 영구 무료. 계정 불필요, 구독 없음, iCloud 종속 없음.",
    status: "BUILD 1.0",
  },
  log: {
    label: "에이전트 협업 로그",
    folder: "~/Notes/field",
    saved: "로컬에 저장됨",
    modes: ["소스", "분할", "읽기"],
    state: ["초안", "읽음", "보관"],
    notes: [
      {
        title: "브리프: 둘만을 위한 책상",
        path: "field/2026-11-02-reading-desk.md",
        author: "AGENT",
        date: "2026-11-02",
        words: "428 단어",
        summary: "노트 앱이 당신과 에이전트를 위해 같은 폴더를 공유해야 하는 이유.",
        body: [
          "기존의 대다수 노트 앱은 사람 혼자 쓰는 것을 전제로 합니다. StoatMD는 둘이 함께 쓰도록 만들어졌습니다. 에이전트가 초안을 잡고, 당신이 읽고 고치며 판단을 내립니다. 누구든 같은 폴더에서 작업을 이어받을 수 있습니다.",
          "노트는 온전히 평범한 Markdown 파일로 유지됩니다. 앱은 군더더기 없는 편안한 읽기 화면과 소스 보기를 제공하며, 에이전트는 복잡한 MCP나 플러그인 없이 파일에 바로 쓸 수 있습니다.",
        ],
        quote: "에이전트가 초안을 쓰고, 당신이 다듬는다. 같은 폴더 안에서.",
        list: ["언제든 열어보는 소스 코드", "집중을 방해하지 않는 깔끔한 읽기 화면", "어디든 자유롭게 가져갈 수 있는 파일"],
        ending: "분류: 읽기, 에이전트, 일반 텍스트.",
      },
      {
        title: "실전 노트: 자체 서버 구축 없는 동기화",
        path: "field/2026-11-01-sync.md",
        author: "AGENT",
        date: "2026-11-01",
        words: "512 단어",
        summary: "파일 운반은 Google Drive나 Dropbox가 맡고, StoatMD는 쾌적한 읽기와 쓰기에 집중합니다.",
        body: [
          "StoatMD 전용 계정도, 서버도 필요하지 않습니다. 파일은 당신의 Google Drive나 Dropbox에 그대로 저장됩니다. 로컬 에이전트는 파일 시스템으로 직접, 원격 에이전트는 클라우드 동기화로 자유롭게 작성합니다.",
          "동시에 같은 파일이 수정되어 충돌이 나면, 앱이 멈추고 묻습니다: 로컬 유지, 클라우드 유지, 아니면 둘 다 보관. 어떤 내용도 조용히 덮어쓰지 않습니다.",
        ],
        quote: "클라우드는 배달부일 뿐. 파일의 주인은 언제나 당신입니다.",
        list: ["Google Drive", "Dropbox", "충돌 시 둘 다 보관"],
        ending: "iCloud 종속 없음, WebDAV 번거로움 없음, 자체 동기화 서버 구축 없음.",
      },
      {
        title: "팀 로그: 하나의 폴더, 세 명의 독자",
        path: "field/2026-10-30-team.md",
        author: "AGENT",
        date: "2026-10-30",
        words: "367 단어",
        summary: "공유 폴더 하나로 팀 지식베이스를 구성하고, 사람이 작성하기 번거로운 내용은 에이전트에게 맡깁니다.",
        body: [
          "작은 팀이 하나의 폴더를 공유할 수 있습니다. 한 에이전트에게 회의록을 정리하게 하고, 다른 에이전트에게 리서치 요약을 업데이트하게 하면, 팀원들은 Mac이나 iPhone에서 최신 내용을 바로 읽을 수 있습니다.",
          "접근 권한 관리는 클라우드 드라이브가 담당합니다. StoatMD가 번거로운 팀 계정 체계를 별도로 얹지 않습니다.",
        ],
        quote: "하나의 폴더, 몇 명의 독자. 노트에 또 다른 집은 필요 없습니다.",
        list: ["하나의 공유 폴더", "모든 기기에서 동일한 파일 열람", "권한은 클라우드 드라이브 기준"],
        ending: "분류: 팀, 공유 폴더, 에이전트.",
      },
    ],
  },
  mechanism: {
    kicker: "작동 방식",
    title: "하나의 폴더를, 당신과 에이전트가 함께 씁니다.",
    body: "폐쇄적인 데이터베이스가 아닙니다. 당신과 에이전트 모두 언제든 자유롭게 접근할 수 있는 평범한 .md 파일 폴더입니다.",
    steps: [
      { n: "01", title: "에이전트가 직접 작성", body: "로컬 에이전트가 폴더에 마크다운을 직접 저장합니다. MCP 브리지나 수동 내보내기 불필요." },
      { n: "02", title: "로컬 파일로 보관", body: "표준 .md 파일, 일반 파일명, 오프라인 지원. 당신의 로컬 폴더가 언제나 기준입니다." },
      { n: "03", title: "클라우드 자동 동기화", body: "Google Drive나 Dropbox가 스마트폰, 다른 컴퓨터, 원격 에이전트에 파일을 자동으로 동기화합니다." },
      { n: "04", title: "당신이 이어쓰기", body: "Mac이나 iPhone에서 폴더를 엽니다. 바로 읽고 수정하거나 다음 작업을 에이전트에게 넘깁니다." },
    ],
    providers: "Google Drive / Dropbox",
    caption: "에이전트, 클라우드 드라이브, 당신 모두 같은 폴더를 공유합니다.",
  },
  comparison: {
    kicker: "왜 다른 앱 대신…",
    title: "가볍고 경쾌하며, 데이터를 인질로 잡지 않습니다.",
    body: "요즘 노트 앱들은 플러그인 설정 등으로 지나치게 무거워지고 유료 폐쇄형 동기화를 요구하며 원격 에이전트 연동이 까다롭습니다. StoatMD는 군더더기 없이 가볍고 기존 폴더를 그대로 사용합니다.",
    columns: ["체감 무게 & 사용성", "멀티 디바이스 & 에이전트", "가격"],
    rows: [
      { name: "Obsidian", cells: ["기능은 많지만 점차 무거워지고 플러그인 관리에 피로감", "공식 구독형 동기화, 원격 에이전트 연동이 어려움", "월간 구독료"] },
      { name: "Typora", cells: ["단일 기기 집필 중심, 공식 모바일 앱 없음", "동기화를 직접 구성해야 하며 모바일/에이전트 협동 난항", "일회 구매"] },
      { name: "Miaoyan 등", cells: ["깔끔하고 미니멀하지만 폐쇄적인 생태계", "Apple 기기 전용, 원격 에이전트 연동 어려움", "기기별 유료"] },
      { name: "StoatMD", cells: ["극도로 가볍고 즉시 실행되며 플러그인 스트레스 제로", "Google Drive / Dropbox 기본 내장, 로컬/원격 에이전트 모두 직접 읽고 씀", "데스크톱 무료 · iPhone 일회 구매"], ours: true },
    ],
    footnote: "일상적인 사용 경험, 동기화 방식, 에이전트 접근 편의성을 비교한 내용입니다. 제품 이름은 각 소유자의 상표입니다.",
  },
  features: {
    kicker: "핵심 디테일",
    title: "편안한 읽기와 수정을 위해.",
    body: "에이전트가 초안을 완성하면 당신이 검토하고 다듬습니다. 모든 디테일을 거슬림 없이 편안하게 다듬었습니다.",
    items: [
      { n: "01", title: "평범한 .md, 전용 DB 없음", body: "모든 노트는 표준 파일입니다. 변경 내역 diff, 파일 이동, 다른 도구로 열기까지 완벽히 자유롭습니다." },
      { n: "02", title: "소스, 분할, 여백 읽기", body: "마크다운 소스, 좌우 분할 비교, 여백이 넉넉한 전체화면 읽기 모드를 언제든 손쉽게 전환할 수 있습니다." },
      { n: "03", title: "오프라인 우선 설계", body: "인터넷이 없어도 불편함 없이 읽고 씁니다. 네트워크가 복구되면 클라우드가 알아서 조용히 동기화합니다." },
      { n: "04", title: "눈이 편안한 25가지 테마", body: "정갈하게 다듬어진 라이트 및 다크 테마. 본문에 오롯이 집중할 수 있는 따뜻한 Paper 스타일을 기본 제공합니다." },
      { n: "05", title: "왜 이름이 Stoat(북방족제비)인가요?", body: "Stoat는 작고 민첩합니다. 컴퓨터에 아무런 부담을 주지 않고 폴더 사이를 가볍고 날렵하게 누비는 앱을 지향합니다." },
    ],
  },
  pricing: {
    kicker: "가격 안내",
    title: "데스크톱은 영구 무료. 모바일은 일회 구매.",
    body: "월정액 구독도 없고, 계정 가입도 요구하지 않습니다. 데스크톱 앱(클라우드 동기화 포함)은 완전 무료이며, iPhone 앱은 평생 일회 구매입니다.",
    desktop: {
      label: "데스크톱",
      name: "StoatMD 데스크톱 버전",
      price: "₩0",
      unit: "영구 무료",
      items: ["로컬 폴더 + Google Drive / Dropbox", "소스, 분할, 클린 읽기 3가지 모드", "25가지 테마, 오프라인 완벽 지원, 파일 충돌 선택"],
    },
    mobile: {
      label: "모바일",
      name: "StoatMD iPhone 버전",
      price: "일회 구매",
      unit: "정식 출시 시 공개",
      items: ["클라우드 드라이브 폴더 연동", "기기 내 오프라인 캐시", "데스크톱 에이전트와 동일한 폴더 공유"],
    },
    note: "iPhone 버전 가격은 App Store 출시 시 안내됩니다. 구독 모델은 전혀 계획되어 있지 않습니다.",
    stamp: "구독 없음",
    source: {
      title: "소스 공개 · 비상업 라이선스",
      body: "소스 코드는 개인의 비상업적 사용을 위해 공개되어 있습니다. iOS 공식 앱은 App Store에서 일회 구매로 계속 제공됩니다. 구매하지 않고 사용하려면 라이선스에 따라 직접 빌드하고 설치할 수 있습니다.",
      linkLabel: "GitHub 소스 코드: github.com/richcalls/stoatmd",
    },
  },
  release: {
    kicker: "릴리스 안내",
    title: "Mac 버전을 지금 바로 다운로드할 수 있습니다.",
    body: "첫 공개 버전이 GitHub Releases에 출시되었습니다. 동일한 데스크톱 코드베이스로 Windows 및 Linux도 지원 예정이며 설치 패키지는 순차적으로 추가됩니다. iPhone 앱은 App Store 등록 준비 중입니다.",
    mac: "Mac 버전 무료 다운로드",
    macNote: "GitHub Releases · macOS 14 이상 · Apple Silicon 지원",
    platforms: "Windows 및 Linux 버전 출시 예정.",
    soon: "Windows / Linux — 준비 중",
    ios: "iPhone 버전 — 출시 준비 중",
  },
  footer: {
    line: "당신과 에이전트가 함께 만들어가는 마크다운 노트 앱.",
    feedback: "피드백",
    langLabel: "언어",
    system: "시스템 설정",
    copyright: "© 2026 StoatMD",
  },
  a11y: { lang: "언어", nav: "주요 탐색", preview: "목차가 열린 StoatMD macOS 읽기 화면", skip: "본문으로 건너뛰기" },
};

const de: SiteCopy = {
  meta: {
    title: "StoatMD — Notizen für das Zeitalter der KI-Agenten",
    description:
      "Eine Markdown-Notiz-App für das Agenten-Zeitalter. Agent und Mensch teilen denselben lokalen Ordner; nahtlos weiterarbeiten auf Mac oder iPhone. Synchronisierung über Google Drive oder Dropbox. Desktop dauerhaft kostenlos, iPhone einmaliger Kauf ohne Abo.",
  },
  nav: { why: "Warum", features: "Funktionen", pricing: "Preise", download: "Download", cta: "Kostenlos für Mac laden" },
  theme: { label: "Darstellung", system: "System", light: "Hell", dark: "Dunkel" },
  hero: {
    kicker: "ARBEITSTAGEBUCH / 2026",
    title: "Notizen für das Zeitalter der KI-Agenten.",
    lead: "StoatMD ist eine Markdown-Notiz-App für das Zusammenspiel mit KI-Agenten. Der Agent schreibt Erstentwürfe direkt in deinen lokalen Ordner, und du öffnest denselben Ordner zum Lesen, Bearbeiten und Weiterschreiben.",
    primary: "Kostenlos für Mac laden",
    secondary: "iPhone — Einmalkauf · Bald verfügbar",
    note: "Desktop dauerhaft kostenlos, inklusive Cloud-Sync. Ohne Account, ohne Abo, ohne iCloud-Zwang.",
    status: "BUILD 1.0",
  },
  log: {
    label: "Agenten-Protokoll",
    folder: "~/Notes/field",
    saved: "Lokal gespeichert",
    modes: ["Quelle", "Geteilt", "Lesen"],
    state: ["Entwurf", "Gelesen", "Ablage"],
    notes: [
      {
        title: "Briefing: Ein Schreibtisch für zwei",
        path: "field/2026-11-02-reading-desk.md",
        author: "AGENT",
        date: "2026-11-02",
        words: "428 Wörter",
        summary: "Warum die Notiz-App für zwei Personen im selben Ordner gedacht sein muss.",
        body: [
          "Die meisten Notiz-Apps gehen davon aus, dass nur ein Mensch allein schreibt. StoatMD ist für zwei gemacht: Der Agent liefert den ersten Entwurf, du liest gegen, optimierst und entscheidest. Beide können nahtlos im selben Ordner weiterarbeiten.",
          "Notizen bleiben gewöhnliche Markdown-Dateien. Die App bietet eine ruhige Leseoberfläche und eine Quellansicht, in die Agenten ohne MCP-Bridges oder Plugin-Ballast direkt schreiben können.",
        ],
        quote: "Der Agent entwirft, du entscheidest. Alles im selben Ordner.",
        list: ["Quellansicht jederzeit griffbereit", "Ablenkungsfreie Leseansicht", "Alle Dateien portabel überall nutzbar"],
        ending: "Abgelegt unter: Lesen, Agenten, Plain Text.",
      },
      {
        title: "Praxisnotiz: Sync ganz ohne eigenen Server",
        path: "field/2026-11-01-sync.md",
        author: "AGENT",
        date: "2026-11-01",
        words: "512 Wörter",
        summary: "Google Drive oder Dropbox transportieren die Dateien, StoatMD sorgt für angenehmes Lesen und Schreiben.",
        body: [
          "Kein StoatMD-Konto, keine proprietären Server. Deine Notizen liegen direkt in Google Drive oder Dropbox: Lokale Agenten schreiben über das Dateisystem, entfernte Agenten synchronisieren über die Cloud.",
          "Kollidieren zwei Änderungen, stoppt die App und lässt dich wählen: lokal behalten, Cloud behalten oder beide behalten. Nichts wird stillschweigend überschrieben.",
        ],
        quote: "Die Cloud transportiert nur; deine Daten gehören immer dir.",
        list: ["Google Drive", "Dropbox", "Bei Konflikten beide Kopien behalten"],
        ending: "Kein iCloud-Zwang, kein WebDAV-Gefummel, kein eigener Sync-Server nötig.",
      },
      {
        title: "Team-Log: Ein Ordner, drei Leser",
        path: "field/2026-10-30-team.md",
        author: "AGENT",
        date: "2026-10-30",
        words: "367 Wörter",
        summary: "Ein geteilter Ordner als leichtgewichtige Team-Wissensdatenbank, in der Agenten die lästige Fleißarbeit erledigen.",
        body: [
          "Ein kleines Team kann denselben Ordner teilen. Ein Agent fasst Meetings zusammen, ein anderer hält Recherche-Indizes aktuell, während Teammitglieder die Dokumente auf Mac oder iPhone lesen.",
          "Berechtigungen verwaltet direkt dein Cloud-Speicher. StoatMD setzt keine überflüssige Team-Account-Verwaltung oben drauf.",
        ],
        quote: "Ein Ordner, mehrere Leser. Deine Notizen brauchen kein zweites Zuhause.",
        list: ["Gemeinsamer Ordner", "Dieselben Dateien auf allen Geräten", "Zugriffsrechte folgen deinem Cloud-Speicher"],
        ending: "Abgelegt unter: Teams, geteilte Ordner, Agenten.",
      },
    ],
  },
  mechanism: {
    kicker: "FUNKTIONSWEISE",
    title: "Ein gemeinsamer Ordner für dich und deinen Agenten.",
    body: "Keine geschlossene Datenbank, sondern ein ganz normaler Ordner mit .md-Dateien, auf den du und deine Agenten jederzeit zugreifen können.",
    steps: [
      { n: "01", title: "Agent schreibt direkt", body: "Lokale Agenten speichern Markdown direkt im Ordner. Ohne MCP-Bridge, ohne manuellen Export." },
      { n: "02", title: "Lokal & transparent", body: "Klartext-Dateien, normale Dateinamen, offline nutzbar. Dein lokaler Ordner ist die Quelle der Wahrheit." },
      { n: "03", title: "Cloud synchronisiert", body: "Google Drive oder Dropbox synchronisieren Dateien automatisch auf Smartphone, Zweitrechner und entfernte Agenten." },
      { n: "04", title: "Du schreibst weiter", body: "Öffne den Ordner auf Mac oder iPhone. Lesen, nachbessern oder den nächsten Schritt an den Agenten übergeben." },
    ],
    providers: "Google Drive / Dropbox",
    caption: "Agent, Cloud-Speicher und du nutzen exakt denselben Ordner.",
  },
  comparison: {
    kicker: "WARUM NICHT EINFACH…",
    title: "Leichtgewichtig und ohne deine Daten einzusperren.",
    body: "Moderne Notiz-Tools werden immer träger, ersticken in Plugin-Konfigurationen, verlangen teure proprietäre Sync-Abos und sperren Agenten aus. StoatMD ist federleicht und nutzt direkt deine vorhandenen Ordner.",
    columns: ["Gewicht & Feeling", "Sync & Agenten", "Preis"],
    rows: [
      { name: "Obsidian", cells: ["Funktionsreich, aber zunehmend schwerfällig durch Plugins", "Offizielles Sync-Abo; für entfernte Agenten schwer erreichbar", "Monatliches Abo"] },
      { name: "Typora", cells: ["Fokus auf Einzeldokumente, keine offizielle Smartphone-App", "Sync muss selbst eingerichtet werden; mühsam mit Mobile & Agenten", "Einmalkauf"] },
      { name: "Miaoyan etc.", cells: ["Schlicht und elegant, aber eingeschränktes Ökosystem", "Nur Apple-Welt; schwer mit entfernten Agenten kombinierbar", "Plattformgebunden bezahlt"] },
      { name: "StoatMD", cells: ["Federleicht, startet sofort, absolut kein Plugin-Ballast", "Google Drive & Dropbox integriert; lokale und entfernte Agenten schreiben frei", "Desktop kostenlos · iPhone Einmalkauf"], ours: true },
    ],
    footnote: "Der Vergleich bezieht sich auf Alltagserlebnis, Synchronisation und Agenten-Zugänglichkeit. Markennamen gehören den jeweiligen Inhabern.",
  },
  features: {
    kicker: "DETAILS",
    title: "Für entspanntes Lesen und Überarbeiten gemacht.",
    body: "Der Agent liefert die Rohfassung, du übernimmst Feinschliff und Urteil. Jedes Detail ist so gestaltet, dass es sich natürlich anfühlt.",
    items: [
      { n: "01", title: "Reines .md, keine eigene Datenbank", body: "Jede Notiz ist eine Datei: Versionen vergleichen, verschieben oder mit beliebigen anderen Werkzeugen öffnen." },
      { n: "02", title: "Quelle, geteilt, ruhiges Lesen", body: "Wechsle flexibel zwischen rohem Markdown, geteilter Gegenüberstellung oder großzügiger Vollansicht zum Lesen." },
      { n: "03", title: "Offline-First", body: "Unterwegs ohne Internet lesen und schreiben. Sobald das Netz zurück ist, gleicht der Cloud-Speicher alles geräuschlos ab." },
      { n: "04", title: "25 kuratierte Themes", body: "Sorgfältig abgestimmte helle und dunkle Farbwelten. Standardmäßig mit ruhigem Paper-Stil, der den Text wirken lässt." },
      { n: "05", title: "Warum der Name Stoat?", body: "Das Hermelin (Stoat) ist flink und wendig. Genau so ist StoatMD: leichtfüßig, schnell zwischen Ordnern unterwegs und ohne deinen Rechner zu belasten." },
    ],
  },
  pricing: {
    kicker: "PREISE",
    title: "Desktop dauerhaft kostenlos. iPhone einmaliger Kauf.",
    body: "Keine laufenden Abos, keine Kontoregistrierung. Die Desktop-Version (inklusive Cloud-Sync) ist komplett kostenlos; die iPhone-App kaufst du einmalig für immer.",
    desktop: {
      label: "DESKTOP",
      name: "StoatMD Desktop",
      price: "0 €",
      unit: "dauerhaft kostenlos",
      items: ["Lokale Ordner + Google Drive / Dropbox", "Quell-, geteilte und ruhige Leseansicht", "25 Themes, offline-fähig, visuelle Konfliktauswahl"],
    },
    mobile: {
      label: "MOBIL",
      name: "StoatMD für iPhone",
      price: "Einmalkauf",
      unit: "Preis zum Start",
      items: ["Cloud-Ordner verknüpfen", "Offline-Cache auf dem Gerät", "Derselbe Ordner wie für Desktop-Agenten"],
    },
    note: "Der iPhone-Preis wird beim Release im App Store bekanntgegeben. Ein Abo ist niemals geplant.",
    stamp: "KEIN ABO",
    source: {
      title: "Quellcode öffentlich, nichtkommerzielle Lizenz",
      body: "Der Quellcode ist für private, nichtkommerzielle Nutzung verfügbar. Die offizielle iOS-App bleibt ein einmaliger Kauf im App Store. Wer sie nicht kaufen möchte, kann eine eigene Version gemäß Lizenz kompilieren und installieren.",
      linkLabel: "GitHub-Quellcode: github.com/richcalls/stoatmd",
    },
  },
  release: {
    kicker: "RELEASE-LOG",
    title: "Die Mac-App kann jetzt geladen werden.",
    body: "Die erste öffentliche Version steht über GitHub Releases bereit. Dieselbe Desktop-Codebasis unterstützt auch Windows und Linux; diese Pakete folgen in Kürze. Die iPhone-App wartet auf den App Store Start.",
    mac: "Kostenlos für Mac laden",
    macNote: "GitHub Releases · macOS 14+ · Apple Silicon",
    platforms: "Windows- und Linux-Builds folgen in Kürze.",
    soon: "Windows / Linux — in Vorbereitung",
    ios: "iPhone-App — bald verfügbar",
  },
  footer: {
    line: "Eine Notiz-App für Gedanken, die du gemeinsam mit deinem Agenten festhältst.",
    feedback: "Feedback",
    langLabel: "Sprache",
    system: "System",
    copyright: "© 2026 StoatMD",
  },
  a11y: { lang: "Sprache", nav: "Hauptnavigation", preview: "StoatMD-Leseansicht für macOS mit geöffneter Gliederung", skip: "Zum Inhalt springen" },
};

const fr: SiteCopy = {
  meta: {
    title: "StoatMD — L'application de notes conçue pour l'ère des agents",
    description:
      "Une application de notes Markdown pensée pour l'ère des agents IA. L'agent et vous partagez le même dossier local ; poursuivez sans coupure sur Mac ou iPhone. Synchronisation via Google Drive ou Dropbox. Bureau gratuit pour toujours, iPhone achat unique, sans abonnement.",
  },
  nav: { why: "Pourquoi", features: "Fonctions", pricing: "Tarifs", download: "Télécharger", cta: "Télécharger pour Mac — Gratuit" },
  theme: { label: "Thème", system: "Système", light: "Clair", dark: "Sombre" },
  hero: {
    kicker: "JOURNAL DE BORD / 2026",
    title: "L'application de notes conçue pour l'ère des agents.",
    lead: "StoatMD est une application Markdown pensée pour travailler main dans la main avec des agents IA. L'agent écrit ses premiers jets dans votre dossier local ; vous ouvrez ce même dossier pour lire, corriger et continuer à rédiger.",
    primary: "Télécharger pour Mac — Gratuit",
    secondary: "iPhone — Achat unique · Bientôt disponible",
    note: "Bureau gratuit pour toujours, synchronisation cloud comprise. Sans compte, sans abonnement, sans verrouillage iCloud.",
    status: "BUILD 1.0",
  },
  log: {
    label: "Journal de collaboration Agent",
    folder: "~/Notes/field",
    saved: "Enregistré en local",
    modes: ["Source", "Partagé", "Lecture"],
    state: ["Brouillon", "Lu", "Classé"],
    notes: [
      {
        title: "Brief : Un bureau pour deux",
        path: "field/2026-11-02-reading-desk.md",
        author: "AGENT",
        date: "2026-11-02",
        words: "428 mots",
        summary: "Pourquoi l'application doit accueillir deux auteurs dans un même et unique dossier.",
        body: [
          "La plupart des carnets de notes supposent qu'un seul humain écrit. StoatMD est pensé pour deux : l'agent rédige un premier jet, vous lisez, affinez et tranchez. L'un comme l'autre peut reprendre le fil dans le même dossier.",
          "Les notes restent de simples fichiers Markdown classiques. L'application offre une surface de lecture reposante et une vue source directe, où les agents écrivent sans passerelle MCP ni extension lourde.",
        ],
        quote: "L'agent ébauche, vous tranchez. Tout se passe dans le même dossier.",
        list: ["Source Markdown accessible en permanence", "Lecture calme sans distractions", "Fichiers portables et réutilisables partout"],
        ending: "Classé sous : lecture, agents, texte brut.",
      },
      {
        title: "Notes de terrain : Synchroniser sans serveur dédié",
        path: "field/2026-11-01-sync.md",
        author: "AGENT",
        date: "2026-11-01",
        words: "512 mots",
        summary: "Google Drive ou Dropbox transporte les fichiers, StoatMD vous offre un confort absolu pour lire et écrire.",
        body: [
          "Ni compte StoatMD, ni serveur propriétaire. Les notes vivent dans votre Google Drive ou Dropbox : les agents locaux écrivent via le système de fichiers, les agents distants écrivent via le cloud.",
          "En cas de modification simultanée, l'application s'arrête et demande : garder le local, garder le cloud, ou conserver les deux. Rien n'est jamais écrasé en silence.",
        ],
        quote: "Le cloud n'est qu'un transporteur ; vos fichiers vous appartiennent.",
        list: ["Google Drive", "Dropbox", "Conserver les deux versions en cas de conflit"],
        ending: "Sans verrouillage iCloud, sans configuration WebDAV, sans serveur à héberger soi-même.",
      },
      {
        title: "Journal d'équipe : Un dossier, trois lecteurs",
        path: "field/2026-10-30-team.md",
        author: "AGENT",
        date: "2026-10-30",
        words: "367 mots",
        summary: "Un dossier partagé devient une base de connaissances d'équipe légère, où les agents gèrent les tâches ingrates.",
        body: [
          "Une petite équipe peut partager un même dossier. Un agent s'occupe des comptes-rendus de réunion, un autre met à jour la veille, et les membres lisent les mêmes documents sur Mac ou iPhone.",
          "Les autorisations sont gérées par votre service cloud habituel. StoatMD n'ajoute aucune couche superflue de gestion de comptes d'équipe.",
        ],
        quote: "Un dossier, quelques lecteurs. Vos notes n'ont pas besoin d'un second foyer.",
        list: ["Un dossier partagé", "Les mêmes fichiers sur tous vos appareils", "Accès aligné sur votre cloud habituel"],
        ending: "Classé sous : équipes, dossiers partagés, agents.",
      },
    ],
  },
  mechanism: {
    kicker: "FONCTIONNEMENT",
    title: "Le même dossier, écrit main dans la main avec votre agent.",
    body: "Pas de base de données fermée : un dossier ordinaire rempli de fichiers .md auquel vous et vos agents accédez librement.",
    steps: [
      { n: "01", title: "L'agent écrit directement", body: "Les agents locaux enregistrent le Markdown directement dans le dossier. Sans passerelle MCP, sans export." },
      { n: "02", title: "Conservé en texte brut", body: "Des fichiers .md standard, des noms clairs, utilisables hors ligne. Votre dossier local fait foi." },
      { n: "03", title: "Le cloud synchronise", body: "Google Drive ou Dropbox synchronise automatiquement vos fichiers vers vos autres appareils et vos agents distants." },
      { n: "04", title: "Vous continuez d'écrire", body: "Ouvrez le dossier sur Mac ou iPhone. Lisez, modifiez ou confiez l'étape suivante à votre agent." },
    ],
    providers: "Google Drive / Dropbox",
    caption: "Votre agent, votre stockage cloud et vous-même, réunis dans le même dossier.",
  },
  comparison: {
    kicker: "POURQUOI PAS LES AUTRES…",
    title: "Léger, et sans prendre vos données en otage.",
    body: "Les outils de notes récents deviennent lourds, noient l'utilisateur sous les réglages d'extensions, facturent des abonnements de synchronisation fermés et compliquent l'accès aux agents distants. StoatMD est ultra-léger et se greffe directement sur vos dossiers existants.",
    columns: ["Poids & Expérience", "Multi-appareils & Agents", "Prix"],
    rows: [
      { name: "Obsidian", cells: ["Très complet mais de plus en plus lourd et dépendant des extensions", "Synchronisation payante par abonnement ; intégration difficile pour les agents distants", "Abonnement mensuel"] },
      { name: "Typora", cells: ["Orienté écriture mono-poste, pas d'application mobile officielle", "Synchronisation complexe à bricoler, peu pratique avec mobile & agents", "Achat unique"] },
      { name: "Miaoyan et autres", cells: ["Minimaliste et élégant, mais écosystème très restreint", "Limité à l'écosystème Apple, difficile à relier à des agents distants", "Achat par plateforme"] },
      { name: "StoatMD", cells: ["Ultra-léger, ouverture instantanée, zéro surcharge d'extensions", "Google Drive & Dropbox intégrés ; agents locaux et distants écrivent directement", "Bureau gratuit · iPhone achat unique"], ours: true },
    ],
    footnote: "Cette comparaison porte sur l'expérience quotidienne, la synchronisation et la facilité d'accès pour les agents. Les marques appartiennent à leurs détenteurs.",
  },
  features: {
    kicker: "POINTS FORTS",
    title: "Conçu pour une lecture et une édition confortables.",
    body: "L'agent rédige la première version, vous vous chargez de la lecture, des retouches et de la validation. Chaque détail a été soigné pour vous être agréable.",
    items: [
      { n: "01", title: "Du .md ordinaire, aucune base propriétaire", body: "Chaque note est un fichier standard : comparez les versions, déplacez-les ou ouvrez-les avec n'importe quel autre outil." },
      { n: "02", title: "Source, partagé, lecture pure", body: "Basculez librement entre le code Markdown brut, l'affichage scindé en deux ou une lecture plein écran aux marges généreuses." },
      { n: "03", title: "Hors ligne d'abord", body: "Lisez et écrivez sans connexion Internet. Dès que le réseau revient, votre stockage cloud synchronise le tout discrètement." },
      { n: "04", title: "25 thèmes soignés et reposants", body: "Des palettes claires et sombres minutieusement calibrées. Thème par défaut « Paper » : un rendu papier apaisant qui met votre texte en valeur." },
      { n: "05", title: "Pourquoi s'appelle-t-il Stoat ?", body: "L'hermine (Stoat) est un petit animal agile et vif. StoatMD est conçu à son image : rapide, se faufilant entre vos dossiers sans jamais alourdir votre machine." },
    ],
  },
  pricing: {
    kicker: "TARIFS",
    title: "Gratuit sur ordinateur. Achat unique sur mobile.",
    body: "Sans abonnement récurrent, sans création de compte. L'application de bureau (synchronisation cloud comprise) est entièrement gratuite ; la version iPhone est un achat unique à vie.",
    desktop: {
      label: "BUREAU",
      name: "StoatMD Bureau",
      price: "0 €",
      unit: "gratuit pour toujours",
      items: ["Dossiers locaux + Google Drive / Dropbox", "Modes source, partagé et lecture épurée", "25 thèmes, fonctionnement hors ligne, sélecteur de conflits"],
    },
    mobile: {
      label: "MOBILE",
      name: "StoatMD pour iPhone",
      price: "Achat unique",
      unit: "prix annoncé au lancement",
      items: ["Liaison directe aux dossiers cloud", "Cache hors ligne sur l'appareil", "Partage le même répertoire que vos agents de bureau"],
    },
    note: "Le prix iPhone sera dévoilé lors de la sortie sur l'App Store. Aucun abonnement ne sera jamais proposé.",
    stamp: "SANS ABONNEMENT",
    source: {
      title: "Code source public, licence non commerciale",
      body: "Le code source est disponible pour un usage personnel et non commercial. L’app iOS officielle reste vendue en achat unique sur l’App Store. Si vous préférez ne pas l’acheter, vous pouvez compiler et installer votre propre version selon la licence.",
      linkLabel: "Code source GitHub : github.com/richcalls/stoatmd",
    },
  },
  release: {
    kicker: "JOURNAL DES VERSIONS",
    title: "La version Mac est disponible dès maintenant.",
    body: "La première version publique est disponible sur GitHub Releases. Le même code de bureau cible aussi Windows et Linux ; les paquets arriveront prochainement. L'application iPhone est en attente de publication sur l'App Store.",
    mac: "Télécharger pour Mac — Gratuit",
    macNote: "GitHub Releases · macOS 14+ · Apple Silicon",
    platforms: "Versions Windows et Linux disponibles prochainement.",
    soon: "Windows / Linux — en préparation",
    ios: "Version iPhone — bientôt disponible",
  },
  footer: {
    line: "Une application de notes pour les documents rédigés avec votre agent.",
    feedback: "Retours",
    langLabel: "Langue",
    system: "Système",
    copyright: "© 2026 StoatMD",
  },
  a11y: { lang: "Langue", nav: "Navigation principale", preview: "Vue de lecture StoatMD pour macOS avec le plan ouvert", skip: "Aller au contenu" },
};

const es: SiteCopy = {
  meta: {
    title: "StoatMD — La app de notas hecha para la era de los agentes",
    description:
      "Una app de notas Markdown diseñada para la era de los agentes de IA. Tú y tus agentes compartís la misma carpeta local; continúa sin interrupciones en Mac o iPhone. Sincroniza con Google Drive o Dropbox. Escritorio gratis para siempre, iPhone compra única sin suscripciones.",
  },
  nav: { why: "Por qué", features: "Funciones", pricing: "Precios", download: "Descargar", cta: "Descargar para Mac — Gratis" },
  theme: { label: "Tema", system: "Sistema", light: "Claro", dark: "Oscuro" },
  hero: {
    kicker: "DIARIO DE TRABAJO / 2026",
    title: "La app de notas hecha para la era de los agentes.",
    lead: "StoatMD es una app Markdown diseñada para trabajar codo a codo con agentes de IA. El agente escribe los primeros borradores en tu carpeta local y tú abres la misma carpeta para leer, retocar y seguir escribiendo.",
    primary: "Descargar para Mac — Gratis",
    secondary: "iPhone — Compra única · Próximamente",
    note: "Escritorio gratis para siempre, sincronización en la nube incluida. Sin cuentas, sin suscripciones, sin depender de iCloud.",
    status: "BUILD 1.0",
  },
  log: {
    label: "Registro de colaboración con agentes",
    folder: "~/Notes/field",
    saved: "Guardado en local",
    modes: ["Código", "Dividido", "Lectura"],
    state: ["Borrador", "Leído", "Archivado"],
    notes: [
      {
        title: "Informe: Un escritorio para dos",
        path: "field/2026-11-02-reading-desk.md",
        author: "AGENT",
        date: "2026-11-02",
        words: "428 palabras",
        summary: "Por qué una app de notas debe acomodar a dos autores en una misma carpeta compartida.",
        body: [
          "La gran mayoría de las apps de notas asumen que escribe una sola persona. StoatMD está pensada para dos: el agente redacta el primer borrador, tú lees, ajustas y decides. Cualquiera de los dos puede continuar el hilo en la misma carpeta.",
          "Las notas se mantienen siempre como archivos Markdown normales. La app proporciona una interfaz de lectura despejada y una vista de código directo donde los agentes escriben sin necesidad de pasarelas MCP ni complejos plugins.",
        ],
        quote: "El agente redacta, tú decides. Todo en la misma carpeta.",
        list: ["Código fuente visible en todo momento", "Lectura limpia sin distracciones", "Archivos totalmente portables a cualquier lugar"],
        ending: "Archivado en: lectura, agentes, texto plano.",
      },
      {
        title: "Notas prácticas: Sincronización sin servidor propio",
        path: "field/2026-11-01-sync.md",
        author: "AGENT",
        date: "2026-11-01",
        words: "512 palabras",
        summary: "Google Drive o Dropbox se encargan de transportar los archivos; StoatMD te ofrece una lectura y escritura impecables.",
        body: [
          "Sin cuentas de StoatMD y sin servidores propietarios. Los archivos viven directamente en tu Google Drive o Dropbox: los agentes locales leen y escriben a través del sistema de archivos, y los remotos a través de la nube.",
          "Si dos ediciones coinciden al mismo tiempo, la app se detiene y te da a elegir: conservar local, conservar nube o guardar ambas copias. Nada se sobrescribe en silencio jamás.",
        ],
        quote: "La nube solo transporta tus datos; los archivos siempre son tuyos.",
        list: ["Google Drive", "Dropbox", "Conservar ambas copias ante conflictos"],
        ending: "Sin depender de iCloud, sin complicaciones con WebDAV, sin servidores de sync que mantener.",
      },
      {
        title: "Diario de equipo: Una carpeta, tres lectores",
        path: "field/2026-10-30-team.md",
        author: "AGENT",
        date: "2026-10-30",
        words: "367 palabras",
        summary: "Una carpeta compartida funciona como una base de conocimiento ligera de equipo, dejando el trabajo tedioso a los agentes.",
        body: [
          "Un equipo pequeño puede compartir una misma carpeta. Deja que un agente recopile las actas de reuniones y otro actualice resúmenes de investigación, mientras los miembros leen los documentos en Mac o iPhone.",
          "Los permisos de acceso los gestiona directamente tu almacenamiento en la nube. StoatMD no añade otra capa pesada de cuentas de equipo.",
        ],
        quote: "Una carpeta, varios lectores. Tus notas no necesitan un segundo hogar.",
        list: ["Una carpeta compartida", "Los mismos archivos en todos tus dispositivos", "Los permisos siguen a tu almacenamiento en la nube"],
        ending: "Archivado en: equipos, carpetas compartidas, agentes.",
      },
    ],
  },
  mechanism: {
    kicker: "CÓMO FUNCIONA",
    title: "La misma carpeta, escrita codo a codo con tu agente.",
    body: "No es una base de datos cerrada: es una carpeta común llena de archivos .md a la que tú y tus agentes tenéis acceso directo en cualquier momento.",
    steps: [
      { n: "01", title: "El agente escribe directo", body: "Los agentes locales guardan el Markdown directamente en la carpeta. Sin puentes MCP ni exportaciones." },
      { n: "02", title: "Archivos locales planos", body: "Archivos .md estándar, nombres legibles, compatible sin conexión. Tu carpeta local es la fuente fidedigna." },
      { n: "03", title: "La nube sincroniza", body: "Google Drive o Dropbox sincronizan automáticamente tus archivos con otros dispositivos y agentes remotos." },
      { n: "04", title: "Tú continúas escribiendo", body: "Abre la carpeta en Mac o iPhone. Lee, retoca o pasa la siguiente tarea de vuelta al agente." },
    ],
    providers: "Google Drive / Dropbox",
    caption: "Tu agente, tu nube y tú: todos compartiendo exactamente la misma carpeta.",
  },
  comparison: {
    kicker: "¿POR QUÉ NO OTRAS APPS…?",
    title: "Ligera, y sin retener tus datos como rehenes.",
    body: "Las herramientas actuales de notas se han vuelto pesadas, exigen configurar montones de plugins, cobran caras suscripciones por sincronización cerrada y aíslan a los agentes remotos. StoatMD es ultra-ligera y se adapta de inmediato a tus carpetas actuales.",
    columns: ["Peso & Experiencia", "Multiplataforma & Agentes", "Precio"],
    rows: [
      { name: "Obsidian", cells: ["Muy completa pero cada vez más pesada y dependiente de plugins", "Sincronización oficial de pago por suscripción; difícil acceso para agentes remotos", "Suscripción mensual"] },
      { name: "Typora", cells: ["Enfocada a escritura en ordenador local, sin app móvil oficial", "Sincronización manual compleja; difícil de coordinar con móviles y agentes", "Compra única"] },
      { name: "Miaoyan y similares", cells: ["Minimalistas y cuidadas, pero con un ecosistema limitado", "Exclusivas del ecosistema Apple; difícil sincronización con agentes remotos", "Pago por plataforma"] },
      { name: "StoatMD", cells: ["Extremadamente ligera, abre al instante, sin sobrecarga de plugins", "Google Drive y Dropbox integrados; agentes locales y remotos leen y escriben directamente", "Escritorio gratis · iPhone compra única"], ours: true },
    ],
    footnote: "La comparativa analiza la experiencia diaria, la sincronización y la facilidad de acceso para agentes. Los nombres de marca pertenecen a sus dueños.",
  },
  features: {
    kicker: "DETALLES DESTACADOS",
    title: "Diseñada para leer y corregir con absoluta comodidad.",
    body: "El agente se encarga del borrador inicial y tú lees, revisas y validas. Cada detalle se ha cuidado para que disfrutes de una experiencia fluida y agradable.",
    items: [
      { n: "01", title: "Markdown .md puro, sin bases propietarias", body: "Cada nota es un archivo estándar: compara diferencias, muévelas o ábrelas con cualquier otra herramienta cuando quieras." },
      { n: "02", title: "Código, dividido y lectura limpia", body: "Cambia al instante entre Markdown puro, vista dividida en dos o una lectura a pantalla completa con márgenes relajantes." },
      { n: "03", title: "Pensada primero para offline", body: "Lee y escribe con total fluidez sin conexión a Internet. Al reconectar, tu nube sincroniza todo discretamente en segundo plano." },
      { n: "04", title: "25 temas cuidados y agradables", body: "Paletas claras y oscuras afinadas al detalle. Estilo Paper por defecto: un tono cálido y sereno que cede todo el protagonismo al texto." },
      { n: "05", title: "¿Por qué el nombre Stoat?", body: "El armiño (Stoat) es un animal ágil, veloz y ligero. Así es StoatMD: rápido, moviéndose con soltura entre carpetas sin sobrecargar jamás tu ordenador." },
    ],
  },
  pricing: {
    kicker: "PRECIOS",
    title: "Gratis en escritorio. Compra única en móvil.",
    body: "Sin suscripciones mensuales, sin crear cuentas obligatorias. La app de escritorio (con sincronización en la nube incluida) es totalmente gratuita; la app de iPhone es un pago único de por vida.",
    desktop: {
      label: "ESCRITORIO",
      name: "StoatMD para Escritorio",
      price: "0 €",
      unit: "gratis para siempre",
      items: ["Carpetas locales + Google Drive / Dropbox", "Modos código, dividido y lectura despejada", "25 temas, soporte offline, selector visual de conflictos"],
    },
    mobile: {
      label: "MÓVIL",
      name: "StoatMD para iPhone",
      price: "Compra única",
      unit: "precio anunciado al lanzar",
      items: ["Vinculación directa con carpetas en la nube", "Caché sin conexión en el propio dispositivo", "Comparte exactamente el mismo directorio que tus agentes de escritorio"],
    },
    note: "El precio de la versión iPhone se publicará al debutar en la App Store. Nunca habrá suscripciones.",
    stamp: "SIN SUSCRIPCIÓN",
    source: {
      title: "Código fuente público, licencia no comercial",
      body: "El código fuente está disponible para uso personal y no comercial. La app oficial para iOS seguirá siendo una compra única en la App Store. Si prefieres no comprarla, puedes compilar e instalar tu propia versión según la licencia.",
      linkLabel: "Código fuente en GitHub: github.com/richcalls/stoatmd",
    },
  },
  release: {
    kicker: "HISTORIAL DE VERSIONES",
    title: "La versión para Mac ya está disponible.",
    body: "La primera versión pública está disponible a través de GitHub Releases. La misma base de código de escritorio es compatible con Windows y Linux; esos paquetes se añadirán próximamente. La app de iPhone espera su llegada a la App Store.",
    mac: "Descargar para Mac — Gratis",
    macNote: "GitHub Releases · macOS 14+ · Apple Silicon",
    platforms: "Versiones para Windows y Linux disponibles próximamente.",
    soon: "Windows / Linux — en preparación",
    ios: "Versión iPhone — próximamente",
  },
  footer: {
    line: "Una app de notas para lo que escribís juntos tú y tu agente.",
    feedback: "Comentarios",
    langLabel: "Idioma",
    system: "Sistema",
    copyright: "© 2026 StoatMD",
  },
  a11y: { lang: "Idioma", nav: "Navegación principal", preview: "Vista de lectura de StoatMD para macOS con el esquema abierto", skip: "Saltar al contenido" },
};

export const SITE_COPY: Record<Locale, SiteCopy> = {
  en,
  "zh-hans": zhHans,
  "zh-hant": zhHant,
  ja,
  ko,
  de,
  fr,
  es,
};
