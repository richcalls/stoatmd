import type { Locale } from "./types";

export interface ComparisonCopy {
  title: string;
  intro: string;
  cards: { name: string; tag: string; body: string }[];
}

export const COMPARISON: Record<Locale, ComparisonCopy> = {
  en: {
    title: "Why keep looking for a better fit?",
    intro:
      "Different writing tools make different trade-offs. StoatMD keeps the file open, the cloud yours, and your agents within reach.",
    cards: [
      {
        name: "Obsidian",
        tag: "Subscription sync",
        body: "Its official sync is a subscription and a closed channel. Git on a phone is awkward, while layering iCloud onto a vault can make .git grow quickly.",
      },
      {
        name: "Typora",
        tag: "WYSIWYG writing",
        body: "A polished reading experience. StoatMD keeps the Markdown source and a separate preview, so the file stays ready for editors, diffs and agents.",
      },
      {
        name: "Apple-only tools",
        tag: "A focused ecosystem",
        body: "Native, lightweight writing can feel close to home. A cloud folder that a remote agent can reach keeps the same notebook useful across more setups.",
      },
      {
        name: "StoatMD",
        tag: "One purchase · your cloud",
        body: "Use Google Drive or Dropbox. Local writing stays free; one purchase unlocks sync. You and your personal agent can file Markdown in the same folder.",
      },
    ],
  },
  "zh-hans": {
    title: "为什么继续寻找更合适的笔记本？",
    intro:
      "不同工具有不同取舍。StoatMD 让文件保持开放，让云盘归你，也让 Agent 能够接续工作。",
    cards: [
      {
        name: "Obsidian",
        tag: "订阅同步",
        body: "官方同步需要订阅，并且属于封闭通道，远程 AI 很难直接接触。手机上用 Git 不够顺手，再叠加 iCloud，.git 容易快速膨胀。",
      },
      {
        name: "Typora",
        tag: "所见即所得",
        body: "成品阅读体验很舒服。StoatMD 保留纯 Markdown 源码与独立预览，文件本身可以交给其他编辑器、diff 和 Agent。",
      },
      {
        name: "苹果生态工具",
        tag: "专注的生态",
        body: "原生、轻量的写作体验很接近理想。让远程 Agent 也能访问同一个云盘文件夹，笔记可以在更多设备与工作流中延续。",
      },
      {
        name: "StoatMD",
        tag: "一次买断 · 你的云盘",
        body: "使用 Google Drive 或 Dropbox。本机写作永久免费，一次买断开启同步。你和 Personal Agent 都能把 Markdown 归档到同一个文件夹。",
      },
    ],
  },
  "zh-hant": {
    title: "為什麼繼續尋找更合適的筆記本？",
    intro:
      "不同工具有不同取捨。StoatMD 讓檔案保持開放，讓雲端硬碟歸你，也讓 Agent 能接續工作。",
    cards: [
      {
        name: "Obsidian",
        tag: "訂閱同步",
        body: "官方同步需要訂閱，並且屬於封閉通道，遠端 AI 很難直接接觸。在手機上使用 Git 不夠順手，再疊加 iCloud，.git 容易快速膨脹。",
      },
      {
        name: "Typora",
        tag: "所見即所得",
        body: "成品閱讀體驗很舒服。StoatMD 保留純 Markdown 原始碼與獨立預覽，檔案本身可以交給其他編輯器、diff 和 Agent。",
      },
      {
        name: "蘋果生態工具",
        tag: "專注的生態",
        body: "原生、輕量的寫作體驗很接近理想。讓遠端 Agent 也能存取同一個雲端資料夾，筆記可以在更多裝置與工作流程中延續。",
      },
      {
        name: "StoatMD",
        tag: "一次買斷 · 你的雲端硬碟",
        body: "使用 Google Drive 或 Dropbox。本機寫作永久免費，一次買斷開啟同步。你和 Personal Agent 都能把 Markdown 存進同一個資料夾。",
      },
    ],
  },
  ja: {
    title: "もっと自分に合うノートを探す理由は？",
    intro:
      "ツールごとに得意なことは違います。StoatMD はファイルを開いたまま、クラウドをあなたのものにし、エージェントにも届けます。",
    cards: [
      {
        name: "Obsidian",
        tag: "サブスク同期",
        body: "公式同期はサブスクリプションで、閉じた経路です。スマートフォンで Git を扱いにくく、iCloud と重ねると .git が大きくなりやすい点もあります。",
      },
      {
        name: "Typora",
        tag: "見たまま編集",
        body: "仕上がりを読む体験はとても快適です。StoatMD は Markdown のソースと独立したプレビューを保ち、他のエディタや diff、エージェントに渡せます。",
      },
      {
        name: "Apple のエコシステム",
        tag: "集中した環境",
        body: "ネイティブで軽い書き心地は魅力です。同じクラウドフォルダにリモートのエージェントもアクセスできれば、ノートを多くの環境で続けられます。",
      },
      {
        name: "StoatMD",
        tag: "買い切り · あなたのクラウド",
        body: "Google Drive または Dropbox を利用します。ローカルの執筆は無料のまま、一度の購入で同期を開放。あなたとエージェントが同じフォルダに Markdown を保存できます。",
      },
    ],
  },
  ko: {
    title: "나에게 맞는 노트를 찾고 있나요?",
    intro:
      "도구마다 선택하는 방식이 달라요. StoatMD는 파일을 열어 두고, 클라우드는 내 것으로 유지하며, 에이전트가 이어서 작업하게 해요.",
    cards: [
      {
        name: "Obsidian",
        tag: "구독 동기화",
        body: "공식 동기화는 구독 방식이고 닫힌 경로예요. 휴대폰에서 Git을 쓰기 불편하고 iCloud까지 겹치면 .git이 빠르게 커질 수 있어요.",
      },
      {
        name: "Typora",
        tag: "위지윅 편집",
        body: "완성된 글을 읽는 경험이 편안해요. StoatMD는 Markdown 소스와 별도의 미리보기를 보존해 다른 편집기, diff, 에이전트와 함께 쓸 수 있어요.",
      },
      {
        name: "Apple 생태계 도구",
        tag: "집중된 생태계",
        body: "가볍고 자연스러운 작성 경험이 매력적이에요. 원격 에이전트도 같은 클라우드 폴더에 접근하면 더 많은 환경에서 노트를 이어갈 수 있어요.",
      },
      {
        name: "StoatMD",
        tag: "한 번 구매 · 나의 클라우드",
        body: "Google Drive 또는 Dropbox를 사용해요. 로컬 작성은 계속 무료이고, 한 번 구매하면 동기화를 사용할 수 있어요. 나와 에이전트가 같은 폴더에 Markdown을 보관해요.",
      },
    ],
  },
  de: {
    title: "Warum weiter nach einem passenden Notizbuch suchen?",
    intro:
      "Jedes Werkzeug setzt andere Schwerpunkte. StoatMD hält die Datei offen, die Cloud bei dir und deine Agenten in Reichweite.",
    cards: [
      {
        name: "Obsidian",
        tag: "Sync im Abo",
        body: "Der offizielle Sync ist ein Abo und ein geschlossener Kanal. Git auf dem Smartphone ist umständlich; zusammen mit iCloud kann .git schnell wachsen.",
      },
      {
        name: "Typora",
        tag: "WYSIWYG",
        body: "Eine angenehme fertige Ansicht. StoatMD bewahrt die Markdown-Quelle und eine eigene Vorschau, damit die Datei für Editoren, Diffs und Agenten offen bleibt.",
      },
      {
        name: "Apple-Ökosystem",
        tag: "Ein fokussiertes Umfeld",
        body: "Native, leichte Schreibwerkzeuge fühlen sich vertraut an. Ein Cloud-Ordner, den auch ein entfernter Agent erreicht, trägt dein Notizbuch weiter.",
      },
      {
        name: "StoatMD",
        tag: "Ein Kauf · deine Cloud",
        body: "Nutze Google Drive oder Dropbox. Lokales Schreiben bleibt kostenlos; ein Kauf schaltet den Sync frei. Du und dein Agent legt Markdown im selben Ordner ab.",
      },
    ],
  },
  fr: {
    title: "Pourquoi chercher encore un carnet qui vous ressemble ?",
    intro:
      "Chaque outil fait des choix différents. StoatMD garde vos fichiers ouverts, votre cloud à vous et vos agents à portée de main.",
    cards: [
      {
        name: "Obsidian",
        tag: "Synchronisation par abonnement",
        body: "La synchronisation officielle passe par un abonnement et un canal fermé. Git est peu pratique sur mobile ; avec iCloud, .git peut vite prendre de l’ampleur.",
      },
      {
        name: "Typora",
        tag: "Édition WYSIWYG",
        body: "Une lecture finale très agréable. StoatMD conserve la source Markdown et un aperçu séparé, pour que le fichier reste disponible aux éditeurs, aux diffs et aux agents.",
      },
      {
        name: "Écosystème Apple",
        tag: "Un environnement concentré",
        body: "Une écriture native et légère peut sembler familière. Un dossier cloud accessible à un agent distant permet de poursuivre le même carnet dans davantage de contextes.",
      },
      {
        name: "StoatMD",
        tag: "Un achat · votre cloud",
        body: "Utilisez Google Drive ou Dropbox. L’écriture locale reste gratuite ; un achat active la synchronisation. Vous et votre agent rangez vos Markdown dans le même dossier.",
      },
    ],
  },
  es: {
    title: "¿Por qué seguir buscando un cuaderno que encaje contigo?",
    intro:
      "Cada herramienta toma decisiones distintas. StoatMD mantiene tus archivos abiertos, tu nube en tus manos y tus agentes cerca.",
    cards: [
      {
        name: "Obsidian",
        tag: "Sincronización por suscripción",
        body: "La sincronización oficial requiere una suscripción y funciona como un canal cerrado. Git resulta incómodo en el móvil y, junto con iCloud, .git puede crecer rápidamente.",
      },
      {
        name: "Typora",
        tag: "Edición WYSIWYG",
        body: "La lectura final es muy agradable. StoatMD conserva el código fuente Markdown y una vista previa separada, lista para editores, diffs y agentes.",
      },
      {
        name: "Ecosistema Apple",
        tag: "Un entorno concentrado",
        body: "La escritura nativa y ligera se siente cercana. Una carpeta en la nube a la que también llegue un agente remoto permite continuar el mismo cuaderno en más contextos.",
      },
      {
        name: "StoatMD",
        tag: "Una compra · tu nube",
        body: "Usa Google Drive o Dropbox. La escritura local sigue siendo gratuita; una compra activa la sincronización. Tú y tu agente guardáis Markdown en la misma carpeta.",
      },
    ],
  },
};
