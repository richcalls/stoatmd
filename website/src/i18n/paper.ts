import type { Locale } from "./types";

export interface PaperCopy {
  nav: [string, string, string];
  hero: [string, string];
  intro: string;
  cta: [string, string];
  note: string;
  caption: string;
  benefits: [string, string, string, string];
  sync: {
    title: string;
    body: string;
    folder: string;
    file: string;
    flow: [string, string, string];
    caption: string;
  };
  pricing: {
    title: string;
    local: string;
    localBody: string;
    sync: string;
    syncBody: string;
    note: string;
  };
  release: { title: string; body: string; ios: string; soon: string };
  footer: string;
  skip: string;
  preview: {
    label: string;
    demo: string;
    notebook: string;
    folder: string;
    saved: string;
    modes: [string, string, string];
    date: string;
    notes: [Note, Note, Note];
  };
}
export interface Note {
  title: string;
  intro: string;
  quote: string;
  heading: string;
  tasks: [string, string, string];
  ending: string;
}

const en: PaperCopy = {
  nav: ["The experience", "Sync", "Pricing"],
  hero: ["Give your ideas", "room to grow."],
  intro:
    "A quiet little Markdown notebook. Write locally, sync with your cloud, and let you and your agents pick up every thought.",
  cta: ["Explore the Mac app", "Step inside"],
  note: "Local writing, free forever. Cloud sync, one purchase.",
  caption: "One folder. Your whole notebook.",
  benefits: [
    "Ordinary .md files",
    "Write offline",
    "25 thoughtful themes",
    "Your own cloud",
  ],
  sync: {
    title: "Write here.\nCarry it with you.",
    body: "Connect Google Drive or Dropbox and give your notes a home in the cloud you already use. Your agents can read, organise and add to the same folder.",
    folder: "One folder, a connected workflow.",
    file: "A home for ideas.",
    flow: ["Your Mac", "Your cloud", "Your agents"],
    caption: "Open files. More possibilities.",
  },
  pricing: {
    title: "Write freely. Keep it yours.",
    local: "Local writing, free forever.",
    localBody:
      "Source, split and reading views. Offline writing. Themes and typography.",
    sync: "Cloud sync, one purchase.",
    syncBody:
      "Connect Google Drive or Dropbox. Share a folder with your agents.",
    note: "Sync pricing will be announced at launch.",
  },
  release: {
    title: "Made for Mac. Coming soon.",
    body: "We’re putting the finishing touches on the first release.",
    ios: "iPhone and iPad are planned after the Mac release.",
    soon: "Coming soon",
  },
  footer: "A little space for your words.",
  skip: "Skip to content",
  preview: {
    label: "Interactive notebook preview",
    demo: "Illustrative preview · try the notes and views",
    notebook: "My notebook",
    folder: "Everyday moments",
    saved: "Saved locally",
    modes: ["Source", "Split", "Read"],
    date: "2026-10-31",
    notes: [
      {
        title: "A little time for yourself",
        intro:
          "Morning light falls across the desk. The coffee is still warm. Open a fresh page and let your thoughts find their way into words.",
        quote: "Writing gives an idea a place to grow.",
        heading: "Small things for today",
        tasks: [
          "Finish the pages I left yesterday",
          "Make room for an unfinished idea",
          "Take a walk by the river at dusk",
        ],
        ending: "Start with this one line.",
      },
      {
        title: "A weekend walk",
        intro:
          "Leave the morning open. Take the long way through the neighbourhood and see what catches your eye.",
        quote: "A different route can lead to a new thought.",
        heading: "A gentle plan",
        tasks: [
          "Choose a path by the river",
          "Bring a notebook",
          "Stop somewhere for coffee",
        ],
        ending: "Leave a little room for a detour.",
      },
      {
        title: "Ideas still taking shape",
        intro:
          "Some thoughts arrive before their words. Keep them here until they are ready for another look.",
        quote: "A small beginning is still a beginning.",
        heading: "Things to explore",
        tasks: [
          "Capture the first thought",
          "Find one useful question",
          "Set aside an hour to try it",
        ],
        ending: "Come back with fresh eyes.",
      },
    ],
  },
};

const zhHans: PaperCopy = {
  nav: ["体验", "同步", "定价"],
  hero: ["让想法，", "安静地生长。"],
  intro:
    "一款轻盈的 Markdown 笔记本。本地写作，云盘同步，让你和 Agent 接续每一个想法。",
  cta: ["探索 Mac 版", "走进写作空间"],
  note: "本地使用永久免费 · 云盘同步一次买断",
  caption: "一个文件夹，就是你的整个笔记本。",
  benefits: [
    "普通 .md 文件",
    "离线也能安心写",
    "25 套舒适主题",
    "连接你自己的云盘",
  ],
  sync: {
    title: "写在这里。\n延续到每一处。",
    body: "连接 Google Drive 或 Dropbox，把熟悉的云盘变成笔记的家。你的 Agent，也能在同一文件夹整理资料、归档灵感。",
    folder: "一个文件夹，串起你的工作流。",
    file: "想法，自有去处。",
    flow: ["你的 Mac", "你的云盘", "你的 Agent"],
    caption: "普通文件，连接更多可能。",
  },
  pricing: {
    title: "安心写。自在拥有。",
    local: "本地写作，永久免费。",
    localBody: "源码、分栏与阅读。离线使用。自由调整主题与字体。",
    sync: "云盘同步，一次买断。",
    syncBody: "连接 Google Drive 或 Dropbox，与 Agent 共用同一文件夹。",
    note: "同步售价将在发布时公布。",
  },
  release: {
    title: "正在为 Mac 打磨。即将见面。",
    body: "首个版本正在做最后的打磨。",
    ios: "iPhone 与 iPad 版计划在 Mac 首发后推出。",
    soon: "即将推出",
  },
  footer: "给想法一个家。",
  skip: "跳到正文",
  preview: {
    label: "交互式笔记本预览",
    demo: "界面示意 · 可切换笔记与视图",
    notebook: "我的笔记本",
    folder: "日常碎片",
    saved: "已保存到本地",
    modes: ["源码", "分栏", "阅读"],
    date: "2026-10-31",
    notes: [
      {
        title: "留一点时间，给自己",
        intro:
          "早晨的光落在桌上，咖啡还冒着热气。打开一页空白，把脑海里的声音，一行一行写下来。",
        quote: "写下来，是给想法一个慢慢生长的地方。",
        heading: "今天，想做的小事",
        tasks: [
          "读完昨天留下的几页书",
          "整理一个还没成形的想法",
          "傍晚，去河边走一走",
        ],
        ending: "就从这一行开始。",
      },
      {
        title: "周末的散步计划",
        intro:
          "把早晨留白，沿着熟悉的街道多走一段。看看路边新开的花，记住一点日常的光。",
        quote: "换一条路，也许就遇见一个新想法。",
        heading: "一个轻松的计划",
        tasks: ["选一条河边的小路", "带上随身的笔记本", "找一家小店喝杯咖啡"],
        ending: "给偶然的绕路，留一点时间。",
      },
      {
        title: "还没成形的好点子",
        intro:
          "有些念头比文字来得更早。先把它们留在这里，等下一次翻开，再慢慢想清楚。",
        quote: "一个小小的开始，也值得被留下。",
        heading: "下一步，可以很小",
        tasks: [
          "记录最初的想法",
          "找到一个值得追问的问题",
          "留出一小时，动手试试",
        ],
        ending: "带着新的眼光，再回来看看。",
      },
    ],
  },
};
const zhHant: PaperCopy = {
  nav: ["體驗", "同步", "定價"],
  hero: ["讓想法，", "靜靜地生長。"],
  intro:
    "一款輕盈的 Markdown 筆記本。本機寫作，雲端硬碟同步，讓你和 Agent 接續每一個想法。",
  cta: ["探索 Mac 版", "走進寫作空間"],
  note: "本機使用永久免費 · 雲端同步一次買斷",
  caption: "一個資料夾，就是你的整本筆記。",
  benefits: [
    "一般 .md 檔案",
    "離線也能安心寫",
    "25 套舒適主題",
    "連接自己的雲端硬碟",
  ],
  sync: {
    title: "寫在這裡。\n延續到每一處。",
    body: "連接 Google Drive 或 Dropbox，把熟悉的雲端硬碟變成筆記的家。你的 Agent，也能在同一個資料夾整理資料、收藏靈感。",
    folder: "一個資料夾，串起你的工作流程。",
    file: "想法，自有去處。",
    flow: ["你的 Mac", "你的雲端硬碟", "你的 Agent"],
    caption: "一般檔案，連接更多可能。",
  },
  pricing: {
    title: "安心寫。自在擁有。",
    local: "本機寫作，永久免費。",
    localBody: "原始碼、分欄與閱讀。離線使用。自由調整主題與字型。",
    sync: "雲端同步，一次買斷。",
    syncBody: "連接 Google Drive 或 Dropbox，與 Agent 共用同一個資料夾。",
    note: "同步售價將於推出時公布。",
  },
  release: {
    title: "正在為 Mac 打磨。即將見面。",
    body: "首個版本正在進行最後的調整。",
    ios: "iPhone 與 iPad 版預計於 Mac 首發後推出。",
    soon: "即將推出",
  },
  footer: "給想法一個家。",
  skip: "跳至正文",
  preview: {
    label: "互動式筆記本預覽",
    demo: "介面示意 · 可切換筆記與檢視方式",
    notebook: "我的筆記本",
    folder: "日常片刻",
    saved: "已儲存於本機",
    modes: ["原始碼", "分欄", "閱讀"],
    date: "2026-10-31",
    notes: [
      {
        title: "留一點時間，給自己",
        intro:
          "晨光落在桌上，咖啡還冒著熱氣。打開一頁空白，把腦海裡的聲音，一行一行寫下來。",
        quote: "寫下來，是給想法一個慢慢生長的地方。",
        heading: "今天，想做的小事",
        tasks: [
          "讀完昨天留下的幾頁書",
          "整理一個還沒成形的想法",
          "傍晚，去河邊走一走",
        ],
        ending: "就從這一行開始。",
      },
      {
        title: "週末的散步計畫",
        intro:
          "把早晨留白，沿著熟悉的街道多走一段。看看路邊新開的花，記住一點日常的光。",
        quote: "換一條路，也許就遇見一個新想法。",
        heading: "一個輕鬆的計畫",
        tasks: ["選一條河邊的小路", "帶上隨身的筆記本", "找一家小店喝杯咖啡"],
        ending: "給偶然的繞路，留一點時間。",
      },
      {
        title: "還沒成形的好點子",
        intro:
          "有些念頭比文字來得更早。先把它們留在這裡，等下一次翻開，再慢慢想清楚。",
        quote: "一個小小的開始，也值得被留下。",
        heading: "下一步，可以很小",
        tasks: [
          "記錄最初的想法",
          "找到一個值得追問的問題",
          "留出一小時，動手試試",
        ],
        ending: "帶著新的眼光，再回來看看。",
      },
    ],
  },
};
const ja: PaperCopy = {
  nav: ["使い心地", "同期", "料金"],
  hero: ["アイデアが、", "静かに育つ場所。"],
  intro:
    "軽やかな Markdown ノート。手元で書き、自分のクラウドで同期。あなたもエージェントも、同じアイデアの続きを書けます。",
  cta: ["Mac 版について", "書く空間を体験"],
  note: "ローカルでの執筆はずっと無料。クラウド同期は買い切り。",
  caption: "ひとつのフォルダが、あなたのノートに。",
  benefits: [
    "普通の .md ファイル",
    "オフラインでも書ける",
    "25 種類のテーマ",
    "自分のクラウドと接続",
  ],
  sync: {
    title: "ここで書く。\nどこでも、続きを。",
    body: "Google Drive や Dropbox に接続して、いつものクラウドをノートの居場所に。エージェントも同じフォルダで資料やアイデアを整理できます。",
    folder: "ひとつのフォルダで、作業がつながる。",
    file: "アイデアの居場所。",
    flow: ["あなたの Mac", "あなたのクラウド", "エージェント"],
    caption: "開かれたファイルから、広がる可能性。",
  },
  pricing: {
    title: "気軽に書く。ずっと手元に。",
    local: "ローカル執筆はずっと無料。",
    localBody:
      "ソース・分割・閲覧の表示。オフライン執筆。テーマとフォントの設定。",
    sync: "クラウド同期は買い切り。",
    syncBody:
      "Google Drive や Dropbox に接続。エージェントと同じフォルダを共有。",
    note: "同期の価格はリリース時にお知らせします。",
  },
  release: {
    title: "Mac のために。まもなく公開。",
    body: "最初のリリースに向けて、仕上げを進めています。",
    ios: "iPhone・iPad 版は Mac 版の公開後に予定しています。",
    soon: "近日公開",
  },
  footer: "言葉に、小さな居場所を。",
  skip: "本文へ移動",
  preview: {
    label: "操作できるノートのプレビュー",
    demo: "画面イメージ · ノートと表示を切り替えられます",
    notebook: "マイノート",
    folder: "日々のかけら",
    saved: "ローカルに保存済み",
    modes: ["ソース", "分割", "閲覧"],
    date: "2026-10-31",
    notes: [
      {
        title: "自分のための、少しの時間",
        intro:
          "朝の光が机に差し込み、コーヒーはまだ温かい。新しいページを開いて、頭の中の声を一行ずつ書き留める。",
        quote: "書くことは、アイデアが育つ場所をつくること。",
        heading: "今日、したい小さなこと",
        tasks: [
          "昨日読みかけた本の続きを読む",
          "まだ形のないアイデアを整理する",
          "夕暮れに川沿いを歩く",
        ],
        ending: "この一行から、始めよう。",
      },
      {
        title: "週末の散歩計画",
        intro:
          "朝には余白を残しておこう。いつもの道を少し遠回りして、目に留まったものを覚えておく。",
        quote: "違う道が、新しい考えにつながることもある。",
        heading: "気ままな予定",
        tasks: [
          "川沿いの道を選ぶ",
          "ノートを持っていく",
          "小さな店でコーヒーを飲む",
        ],
        ending: "寄り道のための時間も、少しだけ。",
      },
      {
        title: "まだ形のないアイデア",
        intro:
          "言葉より先に浮かぶ考えもある。ここに置いて、また読み返す日にゆっくり育てよう。",
        quote: "小さな始まりにも、居場所がある。",
        heading: "小さな次の一歩",
        tasks: [
          "最初の考えを書き留める",
          "問いをひとつ見つける",
          "一時間だけ試してみる",
        ],
        ending: "新しい目で、また見に来よう。",
      },
    ],
  },
};
const ko: PaperCopy = {
  nav: ["사용 경험", "동기화", "요금"],
  hero: ["생각이 조용히", "자라는 공간."],
  intro:
    "가벼운 Markdown 노트. 로컬에서 쓰고 내 클라우드로 동기화하세요. 나와 에이전트가 같은 생각을 이어갈 수 있어요.",
  cta: ["Mac 앱 살펴보기", "글쓰기 공간 체험"],
  note: "로컬 글쓰기는 평생 무료. 클라우드 동기화는 한 번 구매.",
  caption: "폴더 하나가 나만의 노트가 됩니다.",
  benefits: [
    "일반 .md 파일",
    "오프라인 글쓰기",
    "편안한 테마 25종",
    "내 클라우드 연결",
  ],
  sync: {
    title: "여기서 쓰고,\n어디서든 이어가세요.",
    body: "Google Drive 또는 Dropbox를 연결해 익숙한 클라우드를 노트의 집으로 만드세요. 에이전트도 같은 폴더에서 자료와 생각을 정리할 수 있어요.",
    folder: "폴더 하나로 이어지는 작업 흐름.",
    file: "생각이 머무는 곳.",
    flow: ["내 Mac", "내 클라우드", "내 에이전트"],
    caption: "열린 파일에서 시작되는 가능성.",
  },
  pricing: {
    title: "편하게 쓰고, 온전히 간직하세요.",
    local: "로컬 글쓰기는 평생 무료.",
    localBody: "소스·분할·읽기 화면. 오프라인 글쓰기. 테마와 글꼴 설정.",
    sync: "클라우드 동기화는 한 번 구매.",
    syncBody: "Google Drive 또는 Dropbox 연결. 에이전트와 같은 폴더 공유.",
    note: "동기화 가격은 출시 시 공개됩니다.",
  },
  release: {
    title: "Mac을 위해 다듬고 있어요.",
    body: "첫 출시를 앞두고 마지막 손질 중입니다.",
    ios: "iPhone 및 iPad 버전은 Mac 출시 이후 예정입니다.",
    soon: "출시 예정",
  },
  footer: "나의 글을 위한 작은 공간.",
  skip: "본문으로 이동",
  preview: {
    label: "인터랙티브 노트 미리보기",
    demo: "예시 화면 · 노트와 보기 모드를 바꿔보세요",
    notebook: "내 노트",
    folder: "일상의 조각",
    saved: "로컬에 저장됨",
    modes: ["소스", "분할", "읽기"],
    date: "2026-10-31",
    notes: [
      {
        title: "나를 위한 작은 시간",
        intro:
          "아침 햇살이 책상 위로 내려앉고, 커피는 아직 따뜻해요. 새 페이지를 열어 머릿속의 목소리를 한 줄씩 적어봅니다.",
        quote: "글을 쓰는 건 생각이 자랄 자리를 내어주는 일.",
        heading: "오늘 하고 싶은 작은 일",
        tasks: [
          "어제 읽던 책 몇 쪽 마저 읽기",
          "아직 모양 없는 생각 정리하기",
          "해 질 무렵 강가 산책하기",
        ],
        ending: "바로 이 한 줄부터 시작해요.",
      },
      {
        title: "주말 산책 계획",
        intro:
          "아침을 비워두세요. 익숙한 동네를 조금 돌아 걸으며 눈에 들어오는 것을 기억해요.",
        quote: "다른 길에서 새로운 생각을 만날 수도 있어요.",
        heading: "느긋한 계획",
        tasks: [
          "강가의 작은 길 고르기",
          "노트 챙기기",
          "작은 가게에서 커피 마시기",
        ],
        ending: "우연한 샛길을 위한 시간도 조금.",
      },
      {
        title: "아직 자라는 아이디어",
        intro:
          "어떤 생각은 말보다 먼저 찾아와요. 여기에 두었다가 다시 펼칠 때 천천히 다듬어봐요.",
        quote: "작은 시작도 남겨둘 가치가 있어요.",
        heading: "작은 다음 단계",
        tasks: [
          "처음 떠오른 생각 적기",
          "더 알아보고 싶은 질문 찾기",
          "한 시간 동안 직접 해보기",
        ],
        ending: "새로운 시선으로 다시 만나요.",
      },
    ],
  },
};
const de: PaperCopy = {
  nav: ["Einblicke", "Synchronisation", "Preise"],
  hero: ["Raum für Ideen.", "Zeit zum Wachsen."],
  intro:
    "Ein leichtes Markdown-Notizbuch. Lokal schreiben, mit der eigenen Cloud synchronisieren und Gedanken gemeinsam mit deinen Agenten weiterführen.",
  cta: ["Die Mac-App entdecken", "Notizbuch erkunden"],
  note: "Lokal schreiben: dauerhaft kostenlos. Cloud-Sync: einmal kaufen.",
  caption: "Ein Ordner. Dein ganzes Notizbuch.",
  benefits: [
    "Gewöhnliche .md-Dateien",
    "Auch offline schreiben",
    "25 durchdachte Designs",
    "Deine eigene Cloud",
  ],
  sync: {
    title: "Hier schreiben.\nÜberall weiterdenken.",
    body: "Verbinde Google Drive oder Dropbox und gib deinen Notizen ein Zuhause in deiner vertrauten Cloud. Deine Agenten können im selben Ordner lesen, ordnen und ergänzen.",
    folder: "Ein Ordner verbindet deinen Arbeitsablauf.",
    file: "Ein Zuhause für Ideen.",
    flow: ["Dein Mac", "Deine Cloud", "Deine Agenten"],
    caption: "Offene Dateien. Neue Möglichkeiten.",
  },
  pricing: {
    title: "Frei schreiben. Selbst behalten.",
    local: "Lokal schreiben, dauerhaft kostenlos.",
    localBody:
      "Quelltext-, geteilte und Leseansicht. Offline schreiben. Designs und Schriften anpassen.",
    sync: "Cloud-Sync, einmal kaufen.",
    syncBody:
      "Google Drive oder Dropbox verbinden. Einen Ordner mit deinen Agenten teilen.",
    note: "Der Sync-Preis wird zum Start bekannt gegeben.",
  },
  release: {
    title: "Für den Mac. Bald erhältlich.",
    body: "Wir geben der ersten Version den letzten Schliff.",
    ios: "iPhone und iPad sind nach dem Mac-Start geplant.",
    soon: "Demnächst",
  },
  footer: "Ein kleiner Ort für deine Worte.",
  skip: "Zum Inhalt springen",
  preview: {
    label: "Interaktive Notizbuch-Vorschau",
    demo: "Beispielansicht · Notizen und Ansichten ausprobieren",
    notebook: "Mein Notizbuch",
    folder: "Alltagsmomente",
    saved: "Lokal gespeichert",
    modes: ["Quelltext", "Geteilt", "Lesen"],
    date: "2026-10-31",
    notes: [
      {
        title: "Ein wenig Zeit für dich",
        intro:
          "Morgenlicht fällt auf den Schreibtisch. Der Kaffee ist noch warm. Öffne eine neue Seite und lass deine Gedanken Worte finden.",
        quote: "Schreiben gibt einer Idee einen Ort zum Wachsen.",
        heading: "Kleine Dinge für heute",
        tasks: [
          "Die letzten Seiten von gestern lesen",
          "Einer unfertigen Idee Raum geben",
          "Am Abend am Fluss spazieren gehen",
        ],
        ending: "Fang mit dieser einen Zeile an.",
      },
      {
        title: "Ein Spaziergang am Wochenende",
        intro:
          "Lass den Morgen offen. Nimm den längeren Weg durch dein Viertel und schau, was dir auffällt.",
        quote: "Ein anderer Weg kann zu einem neuen Gedanken führen.",
        heading: "Ein entspannter Plan",
        tasks: [
          "Einen Weg am Fluss wählen",
          "Ein Notizbuch mitnehmen",
          "Unterwegs einen Kaffee trinken",
        ],
        ending: "Lass ein wenig Zeit für einen Umweg.",
      },
      {
        title: "Ideen, die noch wachsen",
        intro:
          "Manche Gedanken kommen vor den Worten. Bewahre sie hier auf, bis du sie mit frischem Blick weiterdenken kannst.",
        quote: "Auch ein kleiner Anfang ist ein Anfang.",
        heading: "Dinge zum Ausprobieren",
        tasks: [
          "Den ersten Gedanken festhalten",
          "Eine gute Frage finden",
          "Eine Stunde zum Ausprobieren nehmen",
        ],
        ending: "Komm mit frischem Blick zurück.",
      },
    ],
  },
};
const fr: PaperCopy = {
  nav: ["Découvrir", "Synchronisation", "Tarifs"],
  hero: ["Vos idées méritent", "un peu d’espace."],
  intro:
    "Un carnet Markdown tout en légèreté. Écrivez en local, synchronisez avec votre cloud et reprenez le fil de vos idées avec vos agents.",
  cta: ["Découvrir l’app Mac", "Explorer le carnet"],
  note: "Écriture locale gratuite, pour toujours. Synchronisation en achat unique.",
  caption: "Un dossier. Tout votre carnet.",
  benefits: [
    "De simples fichiers .md",
    "Écriture hors ligne",
    "25 thèmes soignés",
    "Votre propre cloud",
  ],
  sync: {
    title: "Écrivez ici.\nContinuez partout.",
    body: "Connectez Google Drive ou Dropbox pour retrouver vos notes dans votre cloud habituel. Vos agents peuvent lire, organiser et enrichir le même dossier.",
    folder: "Un dossier qui relie votre travail.",
    file: "Un lieu pour vos idées.",
    flow: ["Votre Mac", "Votre cloud", "Vos agents"],
    caption: "Des fichiers ouverts. De nouvelles possibilités.",
  },
  pricing: {
    title: "Écrivez librement. Gardez vos mots.",
    local: "Écriture locale gratuite, pour toujours.",
    localBody:
      "Vues source, partagée et lecture. Écriture hors ligne. Thèmes et typographie.",
    sync: "Synchronisation en achat unique.",
    syncBody:
      "Connectez Google Drive ou Dropbox. Partagez un dossier avec vos agents.",
    note: "Le prix de la synchronisation sera annoncé au lancement.",
  },
  release: {
    title: "Pour Mac. Bientôt disponible.",
    body: "Nous apportons les dernières touches à la première version.",
    ios: "Les versions iPhone et iPad sont prévues après le lancement sur Mac.",
    soon: "Bientôt",
  },
  footer: "Un petit espace pour vos mots.",
  skip: "Aller au contenu",
  preview: {
    label: "Aperçu interactif du carnet",
    demo: "Interface d’illustration · essayez les notes et les vues",
    notebook: "Mon carnet",
    folder: "Instants du quotidien",
    saved: "Enregistré en local",
    modes: ["Source", "Partagée", "Lecture"],
    date: "2026-10-31",
    notes: [
      {
        title: "Un peu de temps pour soi",
        intro:
          "La lumière du matin éclaire le bureau. Le café est encore chaud. Ouvrez une page et laissez vos pensées devenir des mots.",
        quote: "Écrire offre à une idée un endroit où grandir.",
        heading: "Petites choses pour aujourd’hui",
        tasks: [
          "Finir les pages laissées hier",
          "Faire une place à une idée en devenir",
          "Marcher au bord de l’eau ce soir",
        ],
        ending: "Commencez par cette première ligne.",
      },
      {
        title: "Une promenade ce week-end",
        intro:
          "Gardez la matinée libre. Traversez le quartier par le chemin le plus long et observez ce qui attire votre regard.",
        quote: "Un autre chemin peut faire naître une nouvelle idée.",
        heading: "Un programme tout doux",
        tasks: [
          "Choisir un sentier au bord de l’eau",
          "Emporter un carnet",
          "S’arrêter pour un café",
        ],
        ending: "Gardez un peu de temps pour un détour.",
      },
      {
        title: "Des idées qui prennent forme",
        intro:
          "Certaines pensées précèdent les mots. Gardez-les ici pour les retrouver plus tard avec un regard neuf.",
        quote: "Même un petit début mérite sa place.",
        heading: "Quelques pistes à explorer",
        tasks: [
          "Noter la première pensée",
          "Trouver une question utile",
          "Prendre une heure pour essayer",
        ],
        ending: "Revenez avec un regard neuf.",
      },
    ],
  },
};
const es: PaperCopy = {
  nav: ["Descubrir", "Sincronización", "Precios"],
  hero: ["Dale a tus ideas", "espacio para crecer."],
  intro:
    "Un ligero cuaderno Markdown. Escribe en local, sincroniza con tu nube y continúa cada idea junto a tus agentes.",
  cta: ["Descubre la app para Mac", "Explora el cuaderno"],
  note: "Escritura local gratis para siempre. Sincronización con un solo pago.",
  caption: "Una carpeta. Todo tu cuaderno.",
  benefits: [
    "Archivos .md de siempre",
    "Escribe sin conexión",
    "25 temas cuidados",
    "Tu propia nube",
  ],
  sync: {
    title: "Escribe aquí.\nContinúa donde estés.",
    body: "Conecta Google Drive o Dropbox y da a tus notas un hogar en la nube que ya usas. Tus agentes pueden leer, organizar y añadir ideas en la misma carpeta.",
    folder: "Una carpeta que conecta tu trabajo.",
    file: "Un hogar para tus ideas.",
    flow: ["Tu Mac", "Tu nube", "Tus agentes"],
    caption: "Archivos abiertos. Más posibilidades.",
  },
  pricing: {
    title: "Escribe libremente. Conserva tus ideas.",
    local: "Escritura local, gratis para siempre.",
    localBody:
      "Vistas de código, dividida y lectura. Escritura sin conexión. Temas y tipografía.",
    sync: "Sincronización con un solo pago.",
    syncBody:
      "Conecta Google Drive o Dropbox. Comparte una carpeta con tus agentes.",
    note: "El precio de la sincronización se anunciará en el lanzamiento.",
  },
  release: {
    title: "Para Mac. Muy pronto.",
    body: "Estamos dando los últimos retoques a la primera versión.",
    ios: "Las versiones para iPhone y iPad están previstas después del lanzamiento para Mac.",
    soon: "Próximamente",
  },
  footer: "Un pequeño espacio para tus palabras.",
  skip: "Ir al contenido",
  preview: {
    label: "Vista previa interactiva del cuaderno",
    demo: "Interfaz ilustrativa · prueba las notas y las vistas",
    notebook: "Mi cuaderno",
    folder: "Momentos cotidianos",
    saved: "Guardado en local",
    modes: ["Código", "Dividida", "Lectura"],
    date: "2026-10-31",
    notes: [
      {
        title: "Un poco de tiempo para ti",
        intro:
          "La luz de la mañana ilumina el escritorio. El café sigue caliente. Abre una página nueva y deja que tus pensamientos encuentren sus palabras.",
        quote: "Escribir le da a una idea un lugar donde crecer.",
        heading: "Pequeñas cosas para hoy",
        tasks: [
          "Terminar las páginas pendientes de ayer",
          "Dar espacio a una idea en formación",
          "Pasear junto al río al atardecer",
        ],
        ending: "Empieza con esta primera línea.",
      },
      {
        title: "Un paseo de fin de semana",
        intro:
          "Deja la mañana libre. Toma el camino largo por el barrio y observa lo que te llama la atención.",
        quote: "Un camino distinto puede llevar a una idea nueva.",
        heading: "Un plan tranquilo",
        tasks: [
          "Elegir un sendero junto al río",
          "Llevar un cuaderno",
          "Parar a tomar un café",
        ],
        ending: "Deja un poco de tiempo para un desvío.",
      },
      {
        title: "Ideas que van tomando forma",
        intro:
          "Algunos pensamientos llegan antes que las palabras. Guárdalos aquí hasta que puedas volver a mirarlos con calma.",
        quote: "Un pequeño comienzo también merece su lugar.",
        heading: "Cosas por explorar",
        tasks: [
          "Anotar la primera idea",
          "Encontrar una buena pregunta",
          "Reservar una hora para probar",
        ],
        ending: "Vuelve con una mirada nueva.",
      },
    ],
  },
};

export const PAPER: Record<Locale, PaperCopy> = {
  en,
  "zh-hans": zhHans,
  "zh-hant": zhHant,
  ja,
  ko,
  de,
  fr,
  es,
};
