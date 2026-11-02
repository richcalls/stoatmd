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
  };
  release: {
    kicker: string;
    title: string;
    body: string;
    mac: string;
    macNote: string;
    platforms: string;
    ios: string;
  };
  footer: {
    line: string;
    privacy: string;
    terms: string;
    feedback: string;
    privacyBody: string;
    termsBody: string;
    langLabel: string;
    system: string;
    copyright: string;
  };
  a11y: { lang: string; nav: string; preview: string; skip: string };
}

const en: SiteCopy = {
  meta: {
    title: "StoatMD — A notebook you make with your agent.",
    description:
      "A Markdown notebook made for working with agents. Agent and human read and write the same plain folder; continue on Mac or iPhone. Sync through your own Google Drive or Dropbox. Desktop free, iPhone one-time purchase. No subscription.",
  },
  nav: { why: "Why", features: "Features", pricing: "Pricing", download: "Download", cta: "Download for Mac" },
  theme: { label: "Theme", system: "Auto", light: "Light", dark: "Dark" },
  hero: {
    kicker: "FIELD LOG / 2026",
    title: "Make notes with your agent. A notebook built for that.",
    lead: "StoatMD is a Markdown notebook made for working alongside an agent. Agents write into a folder you own; you open the same folder to read, edit, and continue the work together.",
    primary: "Download for Mac — free",
    secondary: "iPhone — one-time purchase · not listed yet",
    note: "Desktop free, including sync. No subscription, no account, no iCloud.",
    status: "BUILD 1.0",
  },
  log: {
    label: "Agent log",
    folder: "~/Notes/field",
    saved: "Saved locally",
    modes: ["Source", "Split", "Read"],
    state: ["Draft", "Read", "Filed"],
    notes: [
      {
        title: "Brief: the reading desk",
        path: "field/2026-11-02-reading-desk.md",
        author: "AGENT",
        date: "2026-11-02",
        words: "428 words",
        summary: "Why the notebook has to work for two people writing the same folder.",
        body: [
          "Most note apps assume one person writing. This one is built for two: the agent drafts, you read and edit, and either of you picks the thread back up in the same folder.",
          "The note stays a plain Markdown file. The app adds a quiet reading surface, a source view, and a file tree that agents can write to without a bridge.",
        ],
        quote: "The agent drafts. You add the judgment. Same folder.",
        list: ["Keep the source visible", "Keep the reading surface quiet", "Keep every file portable"],
        ending: "Filed under: reading, agents, plain text.",
      },
      {
        title: "Field notes: sync without a server",
        path: "field/2026-11-01-sync.md",
        author: "AGENT",
        date: "2026-11-01",
        words: "512 words",
        summary: "Google Drive or Dropbox carries the folder; StoatMD adds the reading and editing layer.",
        body: [
          "There is no StoatMD account and no StoatMD server. The folder lives in your Google Drive or Dropbox, which means a local agent can write to it through the filesystem and a remote agent can write to it through the cloud.",
          "When two edits collide, the app stops and asks: keep local, keep cloud, or keep both. Nothing is overwritten silently.",
        ],
        quote: "The cloud is the carrier, not the owner.",
        list: ["Google Drive", "Dropbox", "Keep both on conflict"],
        ending: "No iCloud. No WebDAV. No self-hosted sync.",
      },
      {
        title: "Team log: one folder, three readers",
        path: "field/2026-10-30-team.md",
        author: "AGENT",
        date: "2026-10-30",
        words: "367 words",
        summary: "A shared folder can be a small team library, with agents maintaining the parts people do not want to write.",
        body: [
          "A team can share one library folder. One agent maintains the meeting log, another keeps the research index current, and the people on the team read the same files from Mac or iPhone.",
          "Permissions stay with Google Drive or Dropbox. StoatMD does not add another account layer on top.",
        ],
        quote: "One folder. Three readers. No second home for the notes.",
        list: ["One shared folder", "Same files on every device", "Access follows your cloud"],
        ending: "Filed under: teams, shared folders, agents.",
      },
    ],
  },
  mechanism: {
    kicker: "THE MECHANISM",
    title: "One folder, four hands.",
    body: "The notebook is not a database. It is a folder of .md files that agents and people can both reach.",
    steps: [
      { n: "01", title: "Agent writes", body: "A local agent writes Markdown straight into the folder. No MCP bridge, no export step." },
      { n: "02", title: "Folder holds", body: "Plain files, ordinary names, offline by default. The folder is the source of truth." },
      { n: "03", title: "Cloud carries", body: "Google Drive or Dropbox syncs the same folder to your other devices and to remote agents." },
      { n: "04", title: "You continue", body: "Open the library on Mac or iPhone. Read, edit, or hand the next pass back to the agent." },
    ],
    providers: "Google Drive / Dropbox",
    caption: "The same folder for the agent, the cloud, and you.",
  },
  comparison: {
    kicker: "WHY NOT JUST…",
    title: "The sync pipe is the product.",
    body: "Most note apps make you choose between a closed sync subscription and a folder your agents can actually reach. StoatMD chooses the folder.",
    columns: ["Sync", "Agents can write", "Price"],
    rows: [
      { name: "Obsidian", cells: ["Subscription sync", "Hard from a remote agent", "Subscription"] },
      { name: "Typora", cells: ["Your own folder", "Possible, but no reading library", "One-time"] },
      { name: "Miaoyan-class", cells: ["Apple-only", "Rarely remote", "Paid app"] },
      { name: "StoatMD", cells: ["Your Drive or Dropbox", "Local and remote", "Desktop free · iPhone one-time"], ours: true },
    ],
    footnote: "Comparison is about the sync and agent path, not a feature checklist. Product names belong to their owners.",
  },
  features: {
    kicker: "IN THE LOG",
    title: "Built for the second pass.",
    body: "The agent has written a first pass. Now the two of you keep going.",
    items: [
      { n: "01", title: "Plain .md, no database", body: "Every note is a file you can open, diff, move, or hand to another tool." },
      { n: "02", title: "Source, split, read", body: "See the Markdown, the rendered page, or both. The reading view gets the space." },
      { n: "03", title: "Offline first", body: "Write and read without a connection. The cloud catches up when it can." },
      { n: "04", title: "25 themes, one quiet default", body: "Otty themes and typography settings. Paper is the default; the reading surface stays out of the way." },
    ],
  },
  pricing: {
    kicker: "THE LEDGER",
    title: "Free on the desktop. One purchase on the phone.",
    body: "No subscription. No account. The desktop app is free, including cloud sync. The iPhone app is a one-time purchase.",
    desktop: {
      label: "DESKTOP",
      name: "StoatMD Desktop",
      price: "$0",
      unit: "free forever",
      items: ["Local folders + Google Drive / Dropbox", "Source, split, read", "25 themes, offline, conflict picker"],
    },
    mobile: {
      label: "MOBILE",
      name: "StoatMD for iPhone",
      price: "One-time",
      unit: "price at launch",
      items: ["Cloud library only", "Offline cache on device", "Same folder as your agents and team"],
    },
    note: "The iPhone price will be published at launch. No subscription is planned.",
    stamp: "NO SUBSCRIPTION",
  },
  release: {
    kicker: "RELEASE RECORD",
    title: "Mac is ready to download.",
    body: "The first public build ships through GitHub Releases. The same desktop codebase targets Windows and Linux too; those builds are coming later. The iPhone app is not listed yet.",
    mac: "Download for Mac — free",
    macNote: "GitHub Releases · macOS 14+",
    platforms: "Windows and Linux builds are coming later.",
    ios: "iPhone — not listed yet",
  },
  footer: {
    line: "A working log for notes your agents write.",
    privacy: "Privacy",
    terms: "Terms",
    feedback: "Feedback",
    privacyBody: "Privacy policy will live here.",
    termsBody: "Terms of use will live here.",
    langLabel: "Language",
    system: "Follow system",
    copyright: "© 2026 StoatMD",
  },
  a11y: { lang: "Language", nav: "Primary", preview: "Interactive notebook preview", skip: "Skip to content" },
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
  },
  release: {
    kicker: "下载与版本",
    title: "Mac 版现在就可以下载。",
    body: "首个公开版本已在 GitHub Releases 发布。同一套电脑端代码也支持 Windows 和 Linux，安装包稍后补充。iPhone 版目前尚未在 App Store 上架。",
    mac: "免费下载 Mac 版",
    macNote: "GitHub Releases · 支持 macOS 14+",
    platforms: "Windows 和 Linux 版稍后推出。",
    ios: "iPhone 版 — 尚未上架",
  },
  footer: {
    line: "一个用来放你和 Agent 共同写出来的笔记应用。",
    privacy: "隐私政策",
    terms: "用户协议",
    feedback: "问题反馈",
    privacyBody: "隐私政策后续将在此更新。",
    termsBody: "用户协议后续将在此更新。",
    langLabel: "语言",
    system: "跟随系统",
    copyright: "© 2026 StoatMD",
  },
  a11y: { lang: "语言", nav: "主导航", preview: "笔记本预览", skip: "跳到正文" },
};

const zhHant: SiteCopy = {
  meta: {
    title: "StoatMD — 和 Agent 一起做筆記",
    description:
      "一款為和 Agent 一起做筆記而設計的 Markdown 筆記本。Agent 和你讀寫同一個普通資料夾，在 Mac 或 iPhone 上接著往下做。用 Google Drive 或 Dropbox 同步。桌面版免費，iPhone 一次買斷，無訂閱。",
  },
  nav: { why: "為什麼", features: "功能", pricing: "定價", download: "下載", cta: "下載 Mac 版" },
  theme: { label: "主題", system: "跟隨系統", light: "淺色", dark: "深色" },
  hero: {
    kicker: "工作日誌 / 2026",
    title: "和 Agent 一起做筆記。專為此設計的筆記本。",
    lead: "StoatMD 是一款為「和 Agent 一起做筆記」而設計的 Markdown 筆記本。Agent 往你的資料夾裡寫，你打開同一個資料夾閱讀、編輯、接著往下做。",
    primary: "下載 Mac 版 — 免費",
    secondary: "iPhone — 一次買斷 · 尚未上架",
    note: "桌面版免費，含雲端硬碟同步。無訂閱、無帳號、不綁 iCloud。",
    status: "BUILD 1.0",
  },
  log: {
    label: "Agent 日誌",
    folder: "~/Notes/field",
    saved: "已儲存到本機",
    modes: ["原始碼", "分欄", "閱讀"],
    state: ["草稿", "已讀", "歸檔"],
    notes: [
      {
        title: "簡報：閱讀桌",
        path: "field/2026-11-02-reading-desk.md",
        author: "AGENT",
        date: "2026-11-02",
        words: "428 字",
        summary: "為什麼筆記本要容得下兩個作者，寫同一個資料夾。",
        body: [
          "大多數筆記應用預設只有一個人在寫。這一款是為兩個人做的：Agent 先起稿，你來讀、來改，然後你們中的任何一個都能在同一個資料夾裡接著往下寫。",
          "筆記始終是普通的 Markdown 檔案。應用補上安靜的閱讀介面、原始碼檢視，以及 Agent 能直接寫入的檔案樹——不需要 MCP 橋。",
        ],
        quote: "Agent 起稿，你來判斷。同一個資料夾。",
        list: ["讓原始碼可見", "讓閱讀介面安靜", "讓每個檔案都能帶走"],
        ending: "歸檔於：閱讀、Agent、純文字。",
      },
      {
        title: "野外筆記：不建伺服器的同步",
        path: "field/2026-11-01-sync.md",
        author: "AGENT",
        date: "2026-11-01",
        words: "512 字",
        summary: "Google Drive 或 Dropbox 負責搬運資料夾，StoatMD 負責閱讀與編輯。",
        body: [
          "沒有 StoatMD 帳號，也沒有 StoatMD 伺服器。資料夾就在你的 Google Drive 或 Dropbox 裡：本機 Agent 透過檔案系統寫入，遠端 Agent 透過雲端硬碟寫入。",
          "兩邊同時改動時，應用會停下來問你：保留本機、保留雲端，還是兩邊都留。不會靜默覆蓋。",
        ],
        quote: "雲端硬碟是搬運者，不是擁有者。",
        list: ["Google Drive", "Dropbox", "衝突時兩邊都留"],
        ending: "不做 iCloud。不做 WebDAV。不自建同步。",
      },
      {
        title: "團隊日誌：一個資料夾，三個讀者",
        path: "field/2026-10-30-team.md",
        author: "AGENT",
        date: "2026-10-30",
        words: "367 字",
        summary: "共享資料夾可以是一個小團隊的資料庫，Agent 維護人不想寫的那部分。",
        body: [
          "團隊可以共享一個庫資料夾。一個 Agent 維護會議記錄，另一個更新研究索引，團隊成員在 Mac 或 iPhone 上讀同一批檔案。",
          "權限仍由 Google Drive 或 Dropbox 管理。StoatMD 不再疊一層帳號。",
        ],
        quote: "一個資料夾，三個讀者。筆記沒有第二個家。",
        list: ["一個共享資料夾", "每台裝置都是同一批檔案", "權限跟隨你的雲端硬碟"],
        ending: "歸檔於：團隊、共享資料夾、Agent。",
      },
    ],
  },
  mechanism: {
    kicker: "工作機制",
    title: "一個資料夾，四雙手。",
    body: "筆記本不是資料庫，而是一個裝滿 .md 檔案的資料夾，Agent 和人共用。",
    steps: [
      { n: "01", title: "Agent 寫入", body: "本機 Agent 直接把 Markdown 寫進資料夾。不掛 MCP，不做匯出。" },
      { n: "02", title: "資料夾持有", body: "普通檔案、普通檔名，預設離線可用。資料夾就是真相來源。" },
      { n: "03", title: "雲端搬運", body: "Google Drive 或 Dropbox 把同一個資料夾同步到其他裝置和遠端 Agent。" },
      { n: "04", title: "接著往下做", body: "在 Mac 或 iPhone 上打開庫，讀、改，或把下一輪交回給 Agent。" },
    ],
    providers: "Google Drive / Dropbox",
    caption: "Agent、雲端硬碟和你，共用同一個資料夾。",
  },
  comparison: {
    kicker: "為什麼不繼續用…",
    title: "同步管道，才是產品。",
    body: "多數筆記應用讓你二選一：封閉的同步訂閱，或 Agent 真正搆得著的資料夾。StoatMD 選資料夾。",
    columns: ["同步", "Agent 可寫", "價格"],
    rows: [
      { name: "Obsidian", cells: ["訂閱同步", "遠端 Agent 很難接", "訂閱制"] },
      { name: "Typora", cells: ["自己的資料夾", "可以，但沒有閱讀庫", "買斷"] },
      { name: "妙言一類", cells: ["只限蘋果生態", "很少支援遠端", "付費應用"] },
      { name: "StoatMD", cells: ["你的 Drive / Dropbox", "本機與遠端都能寫", "桌面免費 · iPhone 買斷"], ours: true },
    ],
    footnote: "比較的是同步與 Agent 路徑，不是功能清單。產品名歸各自所有者。",
  },
  features: {
    kicker: "日誌內頁",
    title: "為第二遍而做。",
    body: "Agent 寫完了第一遍。接下來，你們一起往下做。",
    items: [
      { n: "01", title: "普通 .md，沒有資料庫", body: "每條筆記都是檔案：能打開、能 diff、能搬走，也能交給別的工具。" },
      { n: "02", title: "原始碼、分欄、閱讀", body: "看 Markdown、看排版，或兩者並排。閱讀檢視拿到最大的空間。" },
      { n: "03", title: "離線優先", body: "沒有網路也能讀寫。雲端恢復後再對齊。" },
      { n: "04", title: "25 套主題，一個安靜預設", body: "Otty 主題與字型設定。預設 Paper；閱讀介面始終讓位給文字。" },
    ],
  },
  pricing: {
    kicker: "帳本",
    title: "桌面免費。手機一次買斷。",
    body: "沒有訂閱，沒有帳號。桌面版免費，含雲端硬碟同步；iPhone 版一次買斷。",
    desktop: {
      label: "桌面",
      name: "StoatMD Desktop",
      price: "$0",
      unit: "永久免費",
      items: ["本機資料夾 + Google Drive / Dropbox", "原始碼、分欄、閱讀", "25 套主題、離線、衝突選擇"],
    },
    mobile: {
      label: "行動版",
      name: "StoatMD for iPhone",
      price: "一次買斷",
      unit: "售價發布時公布",
      items: ["只能綁定雲端庫", "裝置上保留離線快取", "與 Agent、團隊共用同一資料夾"],
    },
    note: "iPhone 售價將在發布時公布。沒有訂閱計畫。",
    stamp: "不訂閱",
  },
  release: {
    kicker: "發布記錄",
    title: "Mac 版可以下載了。",
    body: "首個公開版本透過 GitHub Releases 發布。桌面版同一套程式碼庫也面向 Windows 與 Linux，對應安裝包隨後補充。iPhone 版尚未上架。",
    mac: "下載 Mac 版 — 免費",
    macNote: "GitHub Releases · macOS 14+",
    platforms: "Windows 與 Linux 版隨後補充。",
    ios: "iPhone — 尚未上架",
  },
  footer: {
    line: "給 Agent 寫的筆記，一個能工作的日誌。",
    privacy: "隱私",
    terms: "條款",
    feedback: "回饋",
    privacyBody: "隱私政策將放在這裡。",
    termsBody: "使用條款將放在這裡。",
    langLabel: "語言",
    system: "跟隨系統",
    copyright: "© 2026 StoatMD",
  },
  a11y: { lang: "語言", nav: "主導航", preview: "互動式筆記本預覽", skip: "跳至內容" },
};

const ja: SiteCopy = {
  meta: {
    title: "StoatMD — エージェントと一緒にノートをつくる",
    description:
      "エージェントと一緒にノートをつくるための Markdown ノートブック。エージェントとあなたが同じフォルダを読み書きし、Mac や iPhone で続きを進めます。Google Drive または Dropbox で同期。デスクトップ版は無料、iPhone 版は買い切り。サブスクなし。",
  },
  nav: { why: "理由", features: "機能", pricing: "料金", download: "ダウンロード", cta: "Mac 版をダウンロード" },
  theme: { label: "テーマ", system: "システム", light: "ライト", dark: "ダーク" },
  hero: {
    kicker: "フィールドログ / 2026",
    title: "エージェントと一緒にノートをつくる。そのためのノートブック。",
    lead: "StoatMD は、エージェントと一緒にノートをつくるための Markdown ノートブックです。エージェントがあなたのフォルダに書き、あなたは同じフォルダを開いて読み、編集し、続きを進めます。",
    primary: "Mac 版をダウンロード — 無料",
    secondary: "iPhone — 買い切り · 未掲載",
    note: "デスクトップ版は同期込みで無料。サブスクなし、アカウントなし、iCloud なし。",
    status: "BUILD 1.0",
  },
  log: {
    label: "エージェントログ",
    folder: "~/Notes/field",
    saved: "ローカルに保存",
    modes: ["ソース", "分割", "読書"],
    state: ["下書き", "既読", "保管"],
    notes: [
      {
        title: "ブリーフ：読書机",
        path: "field/2026-11-02-reading-desk.md",
        author: "AGENT",
        date: "2026-11-02",
        words: "428 語",
        summary: "ひとつのフォルダを二人で書くためのノートブックである理由。",
        body: [
          "多くのノートアプリは、一人で書くことを前提にしています。これは二人のために作られています。エージェントが下書きし、あなたが読み、直し、どちらでも同じフォルダで続きを進められます。",
          "ノートは普通の Markdown ファイルのまま。アプリは静かな読書面、ソース表示、エージェントが直接書き込めるファイルツリーを足します。MCP ブリッジは不要です。",
        ],
        quote: "エージェントが下書きし、あなたが判断する。同じフォルダで。",
        list: ["ソースを見えるままに", "読書面を静かに", "どのファイルも持ち運べる"],
        ending: "分類：読書、エージェント、プレーンテキスト。",
      },
      {
        title: "フィールドノート：サーバーなしの同期",
        path: "field/2026-11-01-sync.md",
        author: "AGENT",
        date: "2026-11-01",
        words: "512 語",
        summary: "Google Drive か Dropbox がフォルダを運び、StoatMD が読む・編集する層を足します。",
        body: [
          "StoatMD のアカウントもサーバーもありません。フォルダはあなたの Google Drive か Dropbox にあります。ローカルのエージェントはファイルシステムから、リモートのエージェントはクラウドから書き込めます。",
          "二つの編集が衝突したら、アプリは止まって尋ねます。ローカルを残す、クラウドを残す、両方残す。黙って上書きはしません。",
        ],
        quote: "クラウドは運び手であって、所有者ではない。",
        list: ["Google Drive", "Dropbox", "衝突時は両方残す"],
        ending: "iCloud なし。WebDAV なし。自前サーバー同期なし。",
      },
      {
        title: "チームログ：ひとつのフォルダ、三人の読者",
        path: "field/2026-10-30-team.md",
        author: "AGENT",
        date: "2026-10-30",
        words: "367 語",
        summary: "共有フォルダは小さなチームのライブラリになり、エージェントが人が書きたくない部分を維持します。",
        body: [
          "チームでひとつのライブラリフォルダを共有できます。あるエージェントが議事録を維持し、別のエージェントが研究索引を更新し、チームの人は Mac や iPhone で同じファイルを読みます。",
          "権限は Google Drive か Dropbox のまま。StoatMD がアカウント層を重ねることはありません。",
        ],
        quote: "ひとつのフォルダ。三人の読者。ノートの第二の家はない。",
        list: ["ひとつの共有フォルダ", "どの端末でも同じファイル", "アクセスはクラウドに従う"],
        ending: "分類：チーム、共有フォルダ、エージェント。",
      },
    ],
  },
  mechanism: {
    kicker: "仕組み",
    title: "ひとつのフォルダ、四つの手。",
    body: "ノートブックはデータベースではありません。エージェントと人が一緒に使える .md ファイルのフォルダです。",
    steps: [
      { n: "01", title: "エージェントが書く", body: "ローカルのエージェントが Markdown を直接フォルダに書きます。MCP ブリッジも書き出しも不要。" },
      { n: "02", title: "フォルダが保つ", body: "普通のファイル、普通の名前、既定でオフライン。フォルダが真実の源です。" },
      { n: "03", title: "クラウドが運ぶ", body: "Google Drive か Dropbox が同じフォルダを他の端末とリモートのエージェントへ同期します。" },
      { n: "04", title: "あなたが続ける", body: "Mac か iPhone でライブラリを開き、読み、編集し、次のパスをエージェントに戻します。" },
    ],
    providers: "Google Drive / Dropbox",
    caption: "エージェント、クラウド、あなたが同じフォルダを使う。",
  },
  comparison: {
    kicker: "なぜ他のアプリでは…",
    title: "同期の通り道こそが製品です。",
    body: "多くのノートアプリは、閉じた同期サブスクか、エージェントが実際に届くフォルダかの二択です。StoatMD はフォルダを選びます。",
    columns: ["同期", "エージェントが書ける", "価格"],
    rows: [
      { name: "Obsidian", cells: ["サブスク同期", "リモートからは難しい", "サブスク"] },
      { name: "Typora", cells: ["自分のフォルダ", "可能だが読書ライブラリなし", "買い切り"] },
      { name: "Miaoyan 系", cells: ["Apple 限定", "リモートはまれ", "有料アプリ"] },
      { name: "StoatMD", cells: ["あなたの Drive / Dropbox", "ローカルもリモートも", "デスクトップ無料 · iPhone 買い切り"], ours: true },
    ],
    footnote: "比較は同期とエージェントの経路についてで、機能一覧ではありません。製品名は各所有者のものです。",
  },
  features: {
    kicker: "ログの内側",
    title: "二度目のために作る。",
    body: "エージェントが最初の一稿を書きました。ここからは、二人で続けます。",
    items: [
      { n: "01", title: "普通の .md、データベースなし", body: "すべてのノートはファイル。開く、diff する、移動する、他のツールに渡す。" },
      { n: "02", title: "ソース、分割、読書", body: "Markdown とレイアウト、または両方。読書ビューが最大の面積を持ちます。" },
      { n: "03", title: "オフライン優先", body: "接続なしで読み書き。クラウドはつながったときに追いつきます。" },
      { n: "04", title: "25 テーマ、静かな既定", body: "Otty テーマとタイポグラフィ設定。既定は Paper。読書面は文字を邪魔しません。" },
    ],
  },
  pricing: {
    kicker: "台帳",
    title: "デスクトップは無料。iPhone は買い切り。",
    body: "サブスクなし、アカウントなし。デスクトップ版は同期込みで無料。iPhone 版は買い切りです。",
    desktop: {
      label: "デスクトップ",
      name: "StoatMD Desktop",
      price: "$0",
      unit: "永久無料",
      items: ["ローカルフォルダ + Google Drive / Dropbox", "ソース、分割、読書", "25 テーマ、オフライン、衝突選択"],
    },
    mobile: {
      label: "モバイル",
      name: "StoatMD for iPhone",
      price: "買い切り",
      unit: "価格は発表時",
      items: ["クラウドライブラリのみ", "端末にオフラインキャッシュ", "エージェントとチームと同じフォルダ"],
    },
    note: "iPhone の価格は発表時に公開します。サブスクの予定はありません。",
    stamp: "サブスクなし",
  },
  release: {
    kicker: "リリース記録",
    title: "Mac 版をダウンロードできます。",
    body: "最初の公開ビルドは GitHub Releases で配布します。デスクトップ版は同じコードベースで Windows と Linux にも対応予定で、ビルドは追って追加します。iPhone 版はまだ掲載されていません。",
    mac: "Mac 版をダウンロード — 無料",
    macNote: "GitHub Releases · macOS 14+",
    platforms: "Windows / Linux 版は追って追加します。",
    ios: "iPhone — 未掲載",
  },
  footer: {
    line: "エージェントが書くノートのための、実用的なログ。",
    privacy: "プライバシー",
    terms: "利用規約",
    feedback: "フィードバック",
    privacyBody: "プライバシーポリシーはここに掲載されます。",
    termsBody: "利用規約はここに掲載されます。",
    langLabel: "言語",
    system: "システムに従う",
    copyright: "© 2026 StoatMD",
  },
  a11y: { lang: "言語", nav: "メインナビ", preview: "インタラクティブなノートブックプレビュー", skip: "本文へスキップ" },
};

const ko: SiteCopy = {
  meta: {
    title: "StoatMD — 에이전트와 함께 노트를 만드세요",
    description:
      "에이전트와 함께 노트를 만들기 위한 Markdown 노트북. 에이전트와 사람이 같은 폴더를 읽고 쓰며, Mac이나 iPhone에서 이어서 작업합니다. Google Drive 또는 Dropbox로 동기화. 데스크톱 무료, iPhone 일회 구매. 구독 없음.",
  },
  nav: { why: "이유", features: "기능", pricing: "가격", download: "다운로드", cta: "Mac 버전 다운로드" },
  theme: { label: "테마", system: "시스템", light: "라이트", dark: "다크" },
  hero: {
    kicker: "필드 로그 / 2026",
    title: "에이전트와 함께 노트를 만드세요. 그를 위해 만든 노트북.",
    lead: "StoatMD는 에이전트와 함께 노트를 만들기 위해 설계된 Markdown 노트북입니다. 에이전트가 당신의 폴더에 쓰고, 당신은 같은 폴더를 열어 읽고 편집하며 작업을 이어갑니다.",
    primary: "Mac 버전 다운로드 — 무료",
    secondary: "iPhone — 일회 구매 · 아직 미등록",
    note: "데스크톱은 동기화까지 무료. 구독 없음, 계정 없음, iCloud 없음.",
    status: "BUILD 1.0",
  },
  log: {
    label: "에이전트 로그",
    folder: "~/Notes/field",
    saved: "로컬에 저장됨",
    modes: ["소스", "분할", "읽기"],
    state: ["초안", "읽음", "보관"],
    notes: [
      {
        title: "브리프: 읽기 책상",
        path: "field/2026-11-02-reading-desk.md",
        author: "AGENT",
        date: "2026-11-02",
        words: "428 단어",
        summary: "하나의 폴더를 두 사람이 함께 쓰기 위한 노트북인 이유.",
        body: [
          "대부분의 노트 앱은 한 사람이 쓰는 것을 전제로 합니다. 이 앱은 두 사람을 위해 만들어졌습니다. 에이전트가 초안을 쓰고, 당신이 읽고 고친 뒤, 둘 중 누구든 같은 폴더에서 이어서 작업합니다.",
          "노트는 평범한 Markdown 파일로 남습니다. 앱은 조용한 읽기 화면, 소스 보기, 에이전트가 브리지 없이 바로 쓸 수 있는 파일 트리를 더합니다.",
        ],
        quote: "에이전트가 초안을 쓰고, 당신이 판단한다. 같은 폴더에서.",
        list: ["소스를 보이게", "읽기 화면은 조용하게", "모든 파일을 가지고 갈 수 있게"],
        ending: "분류: 읽기, 에이전트, 일반 텍스트.",
      },
      {
        title: "필드 노트: 서버 없는 동기화",
        path: "field/2026-11-01-sync.md",
        author: "AGENT",
        date: "2026-11-01",
        words: "512 단어",
        summary: "Google Drive나 Dropbox가 폴더를 옮기고, StoatMD가 읽기와 편집 층을 더합니다.",
        body: [
          "StoatMD 계정도, StoatMD 서버도 없습니다. 폴더는 당신의 Google Drive나 Dropbox에 있습니다. 로컬 에이전트는 파일 시스템으로, 원격 에이전트는 클라우드로 씁니다.",
          "두 편집이 충돌하면 앱이 멈추고 묻습니다. 로컬 유지, 클라우드 유지, 둘 다 유지. 조용히 덮어쓰지 않습니다.",
        ],
        quote: "클라우드는 운반자이지 소유자가 아니다.",
        list: ["Google Drive", "Dropbox", "충돌 시 둘 다 유지"],
        ending: "iCloud 없음. WebDAV 없음. 자체 동기화 서버 없음.",
      },
      {
        title: "팀 로그: 하나의 폴더, 세 명의 독자",
        path: "field/2026-10-30-team.md",
        author: "AGENT",
        date: "2026-10-30",
        words: "367 단어",
        summary: "공유 폴더는 작은 팀 라이브러리가 될 수 있고, 에이전트가 사람이 쓰기 싫은 부분을 맡습니다.",
        body: [
          "팀은 하나의 라이브러리 폴더를 공유할 수 있습니다. 한 에이전트는 회의록을 관리하고, 다른 에이전트는 연구 색인을 최신으로 유지하며, 팀원은 Mac이나 iPhone에서 같은 파일을 읽습니다.",
          "권한은 Google Drive나 Dropbox에 그대로 있습니다. StoatMD가 계정 층을 더하지 않습니다.",
        ],
        quote: "하나의 폴더. 세 명의 독자. 노트의 두 번째 집은 없다.",
        list: ["하나의 공유 폴더", "모든 기기에서 같은 파일", "접근 권한은 클라우드를 따름"],
        ending: "분류: 팀, 공유 폴더, 에이전트.",
      },
    ],
  },
  mechanism: {
    kicker: "작동 방식",
    title: "하나의 폴더, 네 개의 손.",
    body: "노트북은 데이터베이스가 아닙니다. 에이전트와 사람이 함께 쓰는 .md 파일 폴더입니다.",
    steps: [
      { n: "01", title: "에이전트가 쓴다", body: "로컬 에이전트가 Markdown을 폴더에 바로 씁니다. MCP 브리지도, 내보내기도 없습니다." },
      { n: "02", title: "폴더가 보관한다", body: "평범한 파일, 평범한 이름, 기본 오프라인. 폴더가 진실의 원천입니다." },
      { n: "03", title: "클라우드가 옮긴다", body: "Google Drive나 Dropbox가 같은 폴더를 다른 기기와 원격 에이전트에 동기화합니다." },
      { n: "04", title: "당신이 이어간다", body: "Mac이나 iPhone에서 라이브러리를 열고 읽고 편집하며, 다음 작업을 에이전트에게 다시 맡깁니다." },
    ],
    providers: "Google Drive / Dropbox",
    caption: "에이전트, 클라우드, 당신이 같은 폴더를 씁니다.",
  },
  comparison: {
    kicker: "왜 다른 앱 대신…",
    title: "동기화 경로가 곧 제품입니다.",
    body: "대부분의 노트 앱은 닫힌 동기화 구독과 에이전트가 실제로 닿는 폴더 중 하나를 고르게 합니다. StoatMD는 폴더를 고릅니다.",
    columns: ["동기화", "에이전트 쓰기", "가격"],
    rows: [
      { name: "Obsidian", cells: ["구독 동기화", "원격에서 어려움", "구독"] },
      { name: "Typora", cells: ["내 폴더", "가능하지만 읽기 라이브러리 없음", "일회 구매"] },
      { name: "Miaoyan 계열", cells: ["Apple 전용", "원격은 드묾", "유료 앱"] },
      { name: "StoatMD", cells: ["당신의 Drive / Dropbox", "로컬과 원격 모두", "데스크톱 무료 · iPhone 일회 구매"], ours: true },
    ],
    footnote: "비교는 동기화와 에이전트 경로에 대한 것이며 기능 목록이 아닙니다. 제품 이름은 각 소유자의 것입니다.",
  },
  features: {
    kicker: "로그 안쪽",
    title: "두 번째 패스를 위해.",
    body: "에이전트가 첫 번째 초안을 썼습니다. 이제 둘이 함께 이어갑니다.",
    items: [
      { n: "01", title: "평범한 .md, 데이터베이스 없음", body: "모든 노트는 파일입니다. 열고, diff하고, 옮기고, 다른 도구에 넘길 수 있습니다." },
      { n: "02", title: "소스, 분할, 읽기", body: "Markdown과 렌더링, 또는 둘 다. 읽기 보기가 가장 큰 공간을 가집니다." },
      { n: "03", title: "오프라인 우선", body: "연결 없이 읽고 씁니다. 클라우드는 연결되면 따라옵니다." },
      { n: "04", title: "25가지 테마, 조용한 기본값", body: "Otty 테마와 타이포그래피 설정. 기본은 Paper. 읽기 화면은 글을 방해하지 않습니다." },
    ],
  },
  pricing: {
    kicker: "장부",
    title: "데스크톱은 무료. iPhone은 일회 구매.",
    body: "구독 없음, 계정 없음. 데스크톱 앱은 동기화까지 무료. iPhone 앱은 일회 구매입니다.",
    desktop: {
      label: "데스크톱",
      name: "StoatMD Desktop",
      price: "$0",
      unit: "영구 무료",
      items: ["로컬 폴더 + Google Drive / Dropbox", "소스, 분할, 읽기", "25가지 테마, 오프라인, 충돌 선택"],
    },
    mobile: {
      label: "모바일",
      name: "StoatMD for iPhone",
      price: "일회 구매",
      unit: "가격은 출시 시",
      items: ["클라우드 라이브러리만", "기기에 오프라인 캐시", "에이전트와 팀이 같은 폴더"],
    },
    note: "iPhone 가격은 출시 시 공개합니다. 구독 계획은 없습니다.",
    stamp: "구독 없음",
  },
  release: {
    kicker: "릴리스 기록",
    title: "Mac 버전을 다운로드할 수 있습니다.",
    body: "첫 공개 빌드는 GitHub Releases로 배포합니다. 데스크톱 앱은 같은 코드베이스로 Windows와 Linux도 지원할 예정이며, 빌드는 추후 추가합니다. iPhone 앱은 아직 등록되지 않았습니다.",
    mac: "Mac 버전 다운로드 — 무료",
    macNote: "GitHub Releases · macOS 14+",
    platforms: "Windows / Linux 버전은 추후 추가됩니다.",
    ios: "iPhone — 아직 미등록",
  },
  footer: {
    line: "에이전트가 쓰는 노트를 위한 실용적인 로그.",
    privacy: "개인정보",
    terms: "약관",
    feedback: "피드백",
    privacyBody: "개인정보 처리방침이 여기에 게시됩니다.",
    termsBody: "이용약관이 여기에 게시됩니다.",
    langLabel: "언어",
    system: "시스템 따르기",
    copyright: "© 2026 StoatMD",
  },
  a11y: { lang: "언어", nav: "주요 탐색", preview: "대화형 노트북 미리보기", skip: "본문으로 건너뛰기" },
};

const de: SiteCopy = {
  meta: {
    title: "StoatMD — Notizen, die du mit deinem Agenten machst.",
    description:
      "Ein Markdown-Notizbuch für die gemeinsame Arbeit mit Agenten. Agent und Mensch lesen und schreiben denselben Ordner; weiterarbeiten auf Mac oder iPhone. Synchronisierung über dein eigenes Google Drive oder Dropbox. Desktop kostenlos, iPhone einmaliger Kauf. Kein Abo.",
  },
  nav: { why: "Warum", features: "Funktionen", pricing: "Preise", download: "Download", cta: "Mac-Version laden" },
  theme: { label: "Darstellung", system: "System", light: "Hell", dark: "Dunkel" },
  hero: {
    kicker: "FELDTAGEBUCH / 2026",
    title: "Mach Notizen mit deinem Agenten. Ein Notizbuch für genau das.",
    lead: "StoatMD ist ein Markdown-Notizbuch für die Arbeit mit einem Agenten. Agenten schreiben in einen Ordner, der dir gehört; du öffnest denselben Ordner, liest, bearbeitest und arbeitest weiter.",
    primary: "Mac-Version laden — kostenlos",
    secondary: "iPhone — einmaliger Kauf · noch nicht gelistet",
    note: "Desktop kostenlos, inklusive Sync. Kein Abo, kein Konto, kein iCloud.",
    status: "BUILD 1.0",
  },
  log: {
    label: "Agenten-Log",
    folder: "~/Notes/field",
    saved: "Lokal gespeichert",
    modes: ["Quelle", "Geteilt", "Lesen"],
    state: ["Entwurf", "Gelesen", "Ablage"],
    notes: [
      {
        title: "Brief: der Lesetisch",
        path: "field/2026-11-02-reading-desk.md",
        author: "AGENT",
        date: "2026-11-02",
        words: "428 Wörter",
        summary: "Warum das Notizbuch für zwei Personen taugen muss, die denselben Ordner schreiben.",
        body: [
          "Die meisten Notiz-Apps gehen von einer schreibenden Person aus. Diese ist für zwei gebaut: Der Agent entwirft, du liest und bearbeitest, und wer von euch beiden will, macht im selben Ordner weiter.",
          "Die Notiz bleibt eine einfache Markdown-Datei. Die App ergänzt eine ruhige Leseoberfläche, eine Quellansicht und einen Dateibaum, in den Agenten ohne Brücke schreiben können.",
        ],
        quote: "Der Agent entwirft. Du entscheidest. Derselbe Ordner.",
        list: ["Quelle sichtbar halten", "Leseoberfläche ruhig halten", "Jede Datei portabel halten"],
        ending: "Abgelegt unter: Lesen, Agenten, Klartext.",
      },
      {
        title: "Feldnotiz: Sync ohne Server",
        path: "field/2026-11-01-sync.md",
        author: "AGENT",
        date: "2026-11-01",
        words: "512 Wörter",
        summary: "Google Drive oder Dropbox trägt den Ordner; StoatMD ergänzt Lesen und Bearbeiten.",
        body: [
          "Es gibt kein StoatMD-Konto und keinen StoatMD-Server. Der Ordner liegt in deinem Google Drive oder Dropbox: Ein lokaler Agent schreibt über das Dateisystem, ein entfernter Agent über die Cloud.",
          "Wenn zwei Änderungen kollidieren, hält die App an und fragt: lokal behalten, Cloud behalten oder beides behalten. Nichts wird still überschrieben.",
        ],
        quote: "Die Cloud ist der Träger, nicht der Eigentümer.",
        list: ["Google Drive", "Dropbox", "Bei Konflikt beides behalten"],
        ending: "Kein iCloud. Kein WebDAV. Kein eigener Sync-Server.",
      },
      {
        title: "Team-Log: ein Ordner, drei Leser",
        path: "field/2026-10-30-team.md",
        author: "AGENT",
        date: "2026-10-30",
        words: "367 Wörter",
        summary: "Ein geteilter Ordner kann eine kleine Team-Bibliothek sein, in der Agenten pflegen, was Menschen nicht schreiben wollen.",
        body: [
          "Ein Team kann einen Bibliotheksordner teilen. Ein Agent pflegt das Meeting-Log, ein anderer hält den Recherche-Index aktuell, und die Menschen im Team lesen dieselben Dateien auf Mac oder iPhone.",
          "Die Berechtigungen bleiben bei Google Drive oder Dropbox. StoatMD legt keine weitere Kontoschicht darüber.",
        ],
        quote: "Ein Ordner. Drei Leser. Kein zweites Zuhause für die Notizen.",
        list: ["Ein geteilter Ordner", "Dieselben Dateien auf jedem Gerät", "Zugriff folgt deiner Cloud"],
        ending: "Abgelegt unter: Teams, geteilte Ordner, Agenten.",
      },
    ],
  },
  mechanism: {
    kicker: "DER MECHANISMUS",
    title: "Ein Ordner, vier Hände.",
    body: "Das Notizbuch ist keine Datenbank. Es ist ein Ordner mit .md-Dateien, den Agenten und Menschen gemeinsam erreichen.",
    steps: [
      { n: "01", title: "Agent schreibt", body: "Ein lokaler Agent schreibt Markdown direkt in den Ordner. Keine MCP-Brücke, kein Export." },
      { n: "02", title: "Ordner hält", body: "Einfache Dateien, normale Namen, standardmäßig offline. Der Ordner ist die Wahrheitsquelle." },
      { n: "03", title: "Cloud trägt", body: "Google Drive oder Dropbox synchronisiert denselben Ordner auf andere Geräte und zu entfernten Agenten." },
      { n: "04", title: "Du machst weiter", body: "Öffne die Bibliothek auf Mac oder iPhone. Lies, bearbeite oder gib den nächsten Durchgang an den Agenten zurück." },
    ],
    providers: "Google Drive / Dropbox",
    caption: "Derselbe Ordner für Agent, Cloud und dich.",
  },
  comparison: {
    kicker: "WARUM NICHT EINFACH …",
    title: "Die Sync-Leitung ist das Produkt.",
    body: "Die meisten Notiz-Apps lassen dich wählen: ein geschlossenes Sync-Abo oder ein Ordner, den deine Agenten wirklich erreichen. StoatMD wählt den Ordner.",
    columns: ["Sync", "Agenten schreiben", "Preis"],
    rows: [
      { name: "Obsidian", cells: ["Abo-Sync", "Vom entfernten Agenten schwer", "Abo"] },
      { name: "Typora", cells: ["Eigener Ordner", "Möglich, aber keine Lesebibliothek", "Einmalkauf"] },
      { name: "Miaoyan-Klasse", cells: ["Nur Apple", "Selten remote", "Kostenpflichtige App"] },
      { name: "StoatMD", cells: ["Dein Drive oder Dropbox", "Lokal und remote", "Desktop kostenlos · iPhone einmalig"], ours: true },
    ],
    footnote: "Der Vergleich betrifft Sync und Agentenweg, keine Funktionsliste. Produktnamen gehören ihren Inhabern.",
  },
  features: {
    kicker: "IM LOG",
    title: "Für den zweiten Durchgang gebaut.",
    body: "Der Agent hat einen ersten Entwurf geschrieben. Jetzt geht es zu zweit weiter.",
    items: [
      { n: "01", title: "Einfaches .md, keine Datenbank", body: "Jede Notiz ist eine Datei: öffnen, diffen, verschieben oder an ein anderes Werkzeug geben." },
      { n: "02", title: "Quelle, geteilt, lesen", body: "Markdown, gerenderte Seite oder beides. Die Leseansicht bekommt den Platz." },
      { n: "03", title: "Offline zuerst", body: "Lesen und schreiben ohne Verbindung. Die Cloud holt auf, wenn sie kann." },
      { n: "04", title: "25 Themes, ein ruhiger Standard", body: "Otty-Themes und Typografie. Paper ist der Standard; die Leseoberfläche tritt zurück." },
    ],
  },
  pricing: {
    kicker: "DAS KASSENBUCH",
    title: "Desktop kostenlos. iPhone einmalig.",
    body: "Kein Abo. Kein Konto. Die Desktop-App ist kostenlos, inklusive Cloud-Sync. Die iPhone-App ist ein einmaliger Kauf.",
    desktop: {
      label: "DESKTOP",
      name: "StoatMD für Mac",
      price: "0 $",
      unit: "für immer kostenlos",
      items: ["Lokale Ordner + Google Drive / Dropbox", "Quelle, geteilt, lesen", "25 Themes, offline, Konfliktwahl"],
    },
    mobile: {
      label: "MOBIL",
      name: "StoatMD für iPhone",
      price: "Einmalig",
      unit: "Preis zum Start",
      items: ["Nur Cloud-Bibliothek", "Offline-Cache auf dem Gerät", "Derselbe Ordner wie Agenten und Team"],
    },
    note: "Der iPhone-Preis wird zum Start veröffentlicht. Ein Abo ist nicht geplant.",
    stamp: "KEIN ABO",
  },
  release: {
    kicker: "RELEASE-PROTOKOLL",
    title: "Die Mac-Version ist zum Download bereit.",
    body: "Der erste öffentliche Build erscheint über GitHub Releases. Dieselbe Desktop-Codebasis ist auch für Windows und Linux ausgelegt; diese Builds folgen später. Die iPhone-App ist noch nicht gelistet.",
    mac: "Mac-Version laden — kostenlos",
    macNote: "GitHub Releases · macOS 14+",
    platforms: "Windows- und Linux-Builds folgen später.",
    ios: "iPhone — noch nicht gelistet",
  },
  footer: {
    line: "Ein Arbeitslog für Notizen, die deine Agenten schreiben.",
    privacy: "Datenschutz",
    terms: "Bedingungen",
    feedback: "Feedback",
    privacyBody: "Die Datenschutzerklärung folgt hier.",
    termsBody: "Die Nutzungsbedingungen folgen hier.",
    langLabel: "Sprache",
    system: "System folgen",
    copyright: "© 2026 StoatMD",
  },
  a11y: { lang: "Sprache", nav: "Hauptnavigation", preview: "Interaktive Notizbuch-Vorschau", skip: "Zum Inhalt springen" },
};

const fr: SiteCopy = {
  meta: {
    title: "StoatMD — Prenez des notes avec votre agent.",
    description:
      "Un carnet Markdown conçu pour prendre des notes avec des agents. Agent et humain lisent et écrivent le même dossier ; continuez sur Mac ou iPhone. Synchronisation via votre Google Drive ou Dropbox. Bureau gratuit, iPhone achat unique. Sans abonnement.",
  },
  nav: { why: "Pourquoi", features: "Fonctions", pricing: "Tarifs", download: "Télécharger", cta: "Télécharger pour Mac" },
  theme: { label: "Thème", system: "Système", light: "Clair", dark: "Sombre" },
  hero: {
    kicker: "JOURNAL DE TERRAIN / 2026",
    title: "Prenez des notes avec votre agent. Un carnet fait pour ça.",
    lead: "StoatMD est un carnet Markdown conçu pour travailler avec un agent. Les agents écrivent dans un dossier qui vous appartient ; vous ouvrez le même dossier pour lire, modifier et poursuivre le travail.",
    primary: "Télécharger pour Mac — gratuit",
    secondary: "iPhone — achat unique · pas encore listé",
    note: "Bureau gratuit, synchronisation comprise. Sans abonnement, sans compte, sans iCloud.",
    status: "BUILD 1.0",
  },
  log: {
    label: "Journal de l'agent",
    folder: "~/Notes/field",
    saved: "Enregistré localement",
    modes: ["Source", "Partagé", "Lecture"],
    state: ["Brouillon", "Lu", "Classé"],
    notes: [
      {
        title: "Brief : le bureau de lecture",
        path: "field/2026-11-02-reading-desk.md",
        author: "AGENT",
        date: "2026-11-02",
        words: "428 mots",
        summary: "Pourquoi le carnet doit convenir à deux personnes qui écrivent le même dossier.",
        body: [
          "La plupart des carnets supposent une seule personne qui écrit. Celui-ci est fait pour deux : l'agent rédige une première version, vous lisez et modifiez, puis l'un ou l'autre reprend le fil dans le même dossier.",
          "La note reste un simple fichier Markdown. L'application ajoute une surface de lecture calme, une vue source et une arborescence dans laquelle les agents écrivent sans passerelle.",
        ],
        quote: "L'agent rédige. Vous tranchez. Le même dossier.",
        list: ["Garder la source visible", "Garder la lecture calme", "Garder chaque fichier portable"],
        ending: "Classé sous : lecture, agents, texte brut.",
      },
      {
        title: "Notes de terrain : synchroniser sans serveur",
        path: "field/2026-11-01-sync.md",
        author: "AGENT",
        date: "2026-11-01",
        words: "512 mots",
        summary: "Google Drive ou Dropbox transporte le dossier ; StoatMD ajoute la lecture et l'édition.",
        body: [
          "Il n'y a ni compte StoatMD ni serveur StoatMD. Le dossier vit dans votre Google Drive ou Dropbox : un agent local y écrit via le système de fichiers, un agent distant via le cloud.",
          "Quand deux modifications se heurtent, l'application s'arrête et demande : garder le local, garder le cloud, ou garder les deux. Rien n'est écrasé en silence.",
        ],
        quote: "Le cloud transporte ; il ne possède pas.",
        list: ["Google Drive", "Dropbox", "Garder les deux en cas de conflit"],
        ending: "Pas d'iCloud. Pas de WebDAV. Pas de serveur de synchronisation maison.",
      },
      {
        title: "Journal d'équipe : un dossier, trois lecteurs",
        path: "field/2026-10-30-team.md",
        author: "AGENT",
        date: "2026-10-30",
        words: "367 mots",
        summary: "Un dossier partagé peut être une petite bibliothèque d'équipe, où les agents tiennent ce que les gens ne veulent pas écrire.",
        body: [
          "Une équipe peut partager un dossier de bibliothèque. Un agent tient le journal des réunions, un autre met à jour l'index de recherche, et les membres lisent les mêmes fichiers sur Mac ou iPhone.",
          "Les permissions restent dans Google Drive ou Dropbox. StoatMD n'ajoute pas une couche de compte par-dessus.",
        ],
        quote: "Un dossier. Trois lecteurs. Pas de second foyer pour les notes.",
        list: ["Un dossier partagé", "Les mêmes fichiers sur chaque appareil", "L'accès suit votre cloud"],
        ending: "Classé sous : équipes, dossiers partagés, agents.",
      },
    ],
  },
  mechanism: {
    kicker: "LE MÉCANISME",
    title: "Un dossier, quatre mains.",
    body: "Le carnet n'est pas une base de données. C'est un dossier de fichiers .md que les agents et les humains peuvent atteindre ensemble.",
    steps: [
      { n: "01", title: "L'agent écrit", body: "Un agent local écrit le Markdown directement dans le dossier. Pas de passerelle MCP, pas d'export." },
      { n: "02", title: "Le dossier garde", body: "Fichiers simples, noms ordinaires, hors ligne par défaut. Le dossier est la source de vérité." },
      { n: "03", title: "Le cloud transporte", body: "Google Drive ou Dropbox synchronise le même dossier vers vos autres appareils et les agents distants." },
      { n: "04", title: "Vous continuez", body: "Ouvrez la bibliothèque sur Mac ou iPhone. Lisez, modifiez, ou confiez la prochaine passe à l'agent." },
    ],
    providers: "Google Drive / Dropbox",
    caption: "Le même dossier pour l'agent, le cloud et vous.",
  },
  comparison: {
    kicker: "POURQUOI PAS…",
    title: "Le tuyau de synchronisation est le produit.",
    body: "La plupart des carnets vous obligent à choisir entre un abonnement de synchronisation fermé et un dossier que vos agents peuvent réellement atteindre. StoatMD choisit le dossier.",
    columns: ["Synchronisation", "Les agents écrivent", "Prix"],
    rows: [
      { name: "Obsidian", cells: ["Synchronisation par abonnement", "Difficile à distance", "Abonnement"] },
      { name: "Typora", cells: ["Votre propre dossier", "Possible, sans bibliothèque de lecture", "Achat unique"] },
      { name: "Classe Miaoyan", cells: ["Apple uniquement", "Rarement à distance", "Application payante"] },
      { name: "StoatMD", cells: ["Votre Drive ou Dropbox", "Local et distant", "Bureau gratuit · iPhone achat unique"], ours: true },
    ],
    footnote: "La comparaison porte sur le chemin de synchronisation et d'agents, pas sur une liste de fonctions. Les noms de produits appartiennent à leurs propriétaires.",
  },
  features: {
    kicker: "DANS LE JOURNAL",
    title: "Conçu pour la seconde passe.",
    body: "L'agent a écrit une première version. Maintenant, vous continuez à deux.",
    items: [
      { n: "01", title: "Du .md simple, pas de base de données", body: "Chaque note est un fichier : à ouvrir, diffuser, déplacer ou confier à un autre outil." },
      { n: "02", title: "Source, partagé, lecture", body: "Voir le Markdown, la page rendue, ou les deux. La vue lecture prend la place." },
      { n: "03", title: "Hors ligne d'abord", body: "Lire et écrire sans connexion. Le cloud rattrape quand il peut." },
      { n: "04", title: "25 thèmes, un défaut calme", body: "Thèmes Otty et réglages typographiques. Paper par défaut ; la lecture s'efface devant le texte." },
    ],
  },
  pricing: {
    kicker: "LE REGISTRE",
    title: "Gratuit sur ordinateur. Achat unique sur iPhone.",
    body: "Sans abonnement. Sans compte. L'application de bureau est gratuite, synchronisation comprise. L'application iPhone est un achat unique.",
    desktop: {
      label: "BUREAU",
      name: "StoatMD pour Mac",
      price: "0 $",
      unit: "gratuit pour toujours",
      items: ["Dossiers locaux + Google Drive / Dropbox", "Source, partagé, lecture", "25 thèmes, hors ligne, choix des conflits"],
    },
    mobile: {
      label: "MOBILE",
      name: "StoatMD pour iPhone",
      price: "Achat unique",
      unit: "prix au lancement",
      items: ["Bibliothèque cloud uniquement", "Cache hors ligne sur l'appareil", "Le même dossier que vos agents et votre équipe"],
    },
    note: "Le prix iPhone sera publié au lancement. Aucun abonnement n'est prévu.",
    stamp: "SANS ABONNEMENT",
  },
  release: {
    kicker: "JOURNAL DE VERSION",
    title: "La version Mac est prête à être téléchargée.",
    body: "La première version publique passe par GitHub Releases. La même base de code bureau vise aussi Windows et Linux ; ces versions arriveront plus tard. L'application iPhone n'est pas encore listée.",
    mac: "Télécharger pour Mac — gratuit",
    macNote: "GitHub Releases · macOS 14+",
    platforms: "Les versions Windows et Linux arriveront plus tard.",
    ios: "iPhone — pas encore listé",
  },
  footer: {
    line: "Un journal de travail pour les notes que vos agents écrivent.",
    privacy: "Confidentialité",
    terms: "Conditions",
    feedback: "Retours",
    privacyBody: "La politique de confidentialité sera ici.",
    termsBody: "Les conditions d'utilisation seront ici.",
    langLabel: "Langue",
    system: "Suivre le système",
    copyright: "© 2026 StoatMD",
  },
  a11y: { lang: "Langue", nav: "Navigation principale", preview: "Aperçu interactif du carnet", skip: "Aller au contenu" },
};

const es: SiteCopy = {
  meta: {
    title: "StoatMD — Toma notas con tu agente.",
    description:
      "Un cuaderno Markdown diseñado para tomar notas con agentes. Agente y persona leen y escriben la misma carpeta; sigue en Mac o iPhone. Sincroniza con tu propio Google Drive o Dropbox. Escritorio gratis, iPhone compra única. Sin suscripción.",
  },
  nav: { why: "Por qué", features: "Funciones", pricing: "Precios", download: "Descargar", cta: "Descargar para Mac" },
  theme: { label: "Tema", system: "Sistema", light: "Claro", dark: "Oscuro" },
  hero: {
    kicker: "CUADERNO DE CAMPO / 2026",
    title: "Toma notas con tu agente. Un cuaderno hecho para eso.",
    lead: "StoatMD es un cuaderno Markdown diseñado para trabajar con un agente. Los agentes escriben en una carpeta que es tuya; tú abres la misma carpeta para leer, editar y seguir trabajando.",
    primary: "Descargar para Mac — gratis",
    secondary: "iPhone — compra única · aún no listado",
    note: "Escritorio gratis, sincronización incluida. Sin suscripción, sin cuenta, sin iCloud.",
    status: "BUILD 1.0",
  },
  log: {
    label: "Registro del agente",
    folder: "~/Notes/field",
    saved: "Guardado localmente",
    modes: ["Fuente", "Dividido", "Lectura"],
    state: ["Borrador", "Leído", "Archivado"],
    notes: [
      {
        title: "Informe: el escritorio de lectura",
        path: "field/2026-11-02-reading-desk.md",
        author: "AGENT",
        date: "2026-11-02",
        words: "428 palabras",
        summary: "Por qué el cuaderno tiene que servir para dos personas que escriben la misma carpeta.",
        body: [
          "La mayoría de las apps de notas dan por hecho que escribe una sola persona. Esta está hecha para dos: el agente redacta una primera versión, tú lees y editas, y cualquiera de los dos retoma el hilo en la misma carpeta.",
          "La nota sigue siendo un archivo Markdown normal. La app añade una superficie de lectura tranquila, una vista de fuente y un árbol de archivos en el que los agentes escriben sin puente.",
        ],
        quote: "El agente redacta. Tú decides. La misma carpeta.",
        list: ["Mantener la fuente visible", "Mantener la lectura tranquila", "Mantener cada archivo portable"],
        ending: "Archivado en: lectura, agentes, texto plano.",
      },
      {
        title: "Notas de campo: sincronizar sin servidor",
        path: "field/2026-11-01-sync.md",
        author: "AGENT",
        date: "2026-11-01",
        words: "512 palabras",
        summary: "Google Drive o Dropbox transporta la carpeta; StoatMD añade la capa de lectura y edición.",
        body: [
          "No hay cuenta de StoatMD ni servidor de StoatMD. La carpeta vive en tu Google Drive o Dropbox: un agente local escribe por el sistema de archivos y un agente remoto escribe por la nube.",
          "Cuando dos ediciones chocan, la app se detiene y pregunta: conservar local, conservar nube o conservar ambas. Nada se sobrescribe en silencio.",
        ],
        quote: "La nube transporta; no posee.",
        list: ["Google Drive", "Dropbox", "Conservar ambas en conflicto"],
        ending: "Sin iCloud. Sin WebDAV. Sin servidor de sincronización propio.",
      },
      {
        title: "Registro de equipo: una carpeta, tres lectores",
        path: "field/2026-10-30-team.md",
        author: "AGENT",
        date: "2026-10-30",
        words: "367 palabras",
        summary: "Una carpeta compartida puede ser una pequeña biblioteca de equipo, con agentes manteniendo lo que la gente no quiere escribir.",
        body: [
          "Un equipo puede compartir una carpeta de biblioteca. Un agente mantiene el registro de reuniones, otro actualiza el índice de investigación y las personas leen los mismos archivos desde Mac o iPhone.",
          "Los permisos siguen en Google Drive o Dropbox. StoatMD no añade otra capa de cuenta.",
        ],
        quote: "Una carpeta. Tres lectores. Sin segundo hogar para las notas.",
        list: ["Una carpeta compartida", "Los mismos archivos en cada dispositivo", "El acceso sigue a tu nube"],
        ending: "Archivado en: equipos, carpetas compartidas, agentes.",
      },
    ],
  },
  mechanism: {
    kicker: "EL MECANISMO",
    title: "Una carpeta, cuatro manos.",
    body: "El cuaderno no es una base de datos. Es una carpeta de archivos .md que agentes y personas pueden alcanzar.",
    steps: [
      { n: "01", title: "El agente escribe", body: "Un agente local escribe Markdown directamente en la carpeta. Sin puente MCP, sin exportar." },
      { n: "02", title: "La carpeta guarda", body: "Archivos simples, nombres normales, offline por defecto. La carpeta es la fuente de verdad." },
      { n: "03", title: "La nube transporta", body: "Google Drive o Dropbox sincroniza la misma carpeta con tus otros dispositivos y los agentes remotos." },
      { n: "04", title: "Tú continúas", body: "Abre la biblioteca en Mac o iPhone. Lee, edita o devuelve la siguiente pasada al agente." },
    ],
    providers: "Google Drive / Dropbox",
    caption: "La misma carpeta para el agente, la nube y tú.",
  },
  comparison: {
    kicker: "¿POR QUÉ NO…?",
    title: "La tubería de sincronización es el producto.",
    body: "La mayoría de las apps de notas te obligan a elegir entre una suscripción de sincronización cerrada y una carpeta que tus agentes realmente pueden alcanzar. StoatMD elige la carpeta.",
    columns: ["Sincronización", "Los agentes escriben", "Precio"],
    rows: [
      { name: "Obsidian", cells: ["Sincronización por suscripción", "Difícil desde un agente remoto", "Suscripción"] },
      { name: "Typora", cells: ["Tu propia carpeta", "Posible, pero sin biblioteca de lectura", "Compra única"] },
      { name: "Clase Miaoyan", cells: ["Solo Apple", "Rara vez remoto", "App de pago"] },
      { name: "StoatMD", cells: ["Tu Drive o Dropbox", "Local y remoto", "Escritorio gratis · iPhone compra única"], ours: true },
    ],
    footnote: "La comparación trata sobre la ruta de sincronización y agentes, no sobre una lista de funciones. Los nombres de producto pertenecen a sus dueños.",
  },
  features: {
    kicker: "DENTRO DEL REGISTRO",
    title: "Hecho para la segunda pasada.",
    body: "El agente ya escribió una primera versión. Ahora seguís los dos.",
    items: [
      { n: "01", title: ".md simple, sin base de datos", body: "Cada nota es un archivo: se abre, se compara, se mueve o se entrega a otra herramienta." },
      { n: "02", title: "Fuente, dividido, lectura", body: "Ve el Markdown, la página renderizada o ambos. La vista de lectura ocupa el espacio." },
      { n: "03", title: "Offline primero", body: "Lee y escribe sin conexión. La nube se pone al día cuando puede." },
      { n: "04", title: "25 temas, un defecto tranquilo", body: "Temas Otty y ajustes tipográficos. Paper por defecto; la lectura se aparta del texto." },
    ],
  },
  pricing: {
    kicker: "EL LIBRO MAYOR",
    title: "Gratis en escritorio. Compra única en iPhone.",
    body: "Sin suscripción. Sin cuenta. La app de escritorio es gratis, sincronización incluida. La app de iPhone es una compra única.",
    desktop: {
      label: "ESCRITORIO",
      name: "StoatMD para Mac",
      price: "0 $",
      unit: "gratis para siempre",
      items: ["Carpetas locales + Google Drive / Dropbox", "Fuente, dividido, lectura", "25 temas, offline, elección de conflictos"],
    },
    mobile: {
      label: "MÓVIL",
      name: "StoatMD para iPhone",
      price: "Compra única",
      unit: "precio en el lanzamiento",
      items: ["Solo biblioteca en la nube", "Caché offline en el dispositivo", "La misma carpeta que tus agentes y equipo"],
    },
    note: "El precio de iPhone se publicará en el lanzamiento. No hay suscripción prevista.",
    stamp: "SIN SUSCRIPCIÓN",
  },
  release: {
    kicker: "REGISTRO DE VERSIÓN",
    title: "La versión para Mac ya se puede descargar.",
    body: "La primera versión pública se distribuye por GitHub Releases. La misma base de código de escritorio también está pensada para Windows y Linux; esas versiones llegarán más tarde. La app de iPhone aún no está listada.",
    mac: "Descargar para Mac — gratis",
    macNote: "GitHub Releases · macOS 14+",
    platforms: "Las versiones para Windows y Linux llegarán más tarde.",
    ios: "iPhone — aún no listado",
  },
  footer: {
    line: "Un registro de trabajo para las notas que escriben tus agentes.",
    privacy: "Privacidad",
    terms: "Términos",
    feedback: "Comentarios",
    privacyBody: "La política de privacidad estará aquí.",
    termsBody: "Los términos de uso estarán aquí.",
    langLabel: "Idioma",
    system: "Seguir al sistema",
    copyright: "© 2026 StoatMD",
  },
  a11y: { lang: "Idioma", nav: "Navegación principal", preview: "Vista previa interactiva del cuaderno", skip: "Saltar al contenido" },
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
