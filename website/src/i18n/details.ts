import type { Locale } from "./types";

interface DetailCopy {
  title: string;
  items: { title: string; body: string }[];
  privacy: string;
  purchase: string;
}

export const DETAILS: Record<Locale, DetailCopy> = {
  en: {
    title: "Your notes. Your cloud. Your agents.",
    items: [
      {
        title: "Markdown, in full view.",
        body: "Write the actual source. Switch between source, split and reading views to keep the words and their formatting in sight.",
      },
      {
        title: "A folder you can keep.",
        body: "Open a folder of ordinary .md files and write offline. Bring them to other editors, track changes with Git, and make yourself at home with 25 themes and your choice of fonts.",
      },
      {
        title: "A place for your agents’ work.",
        body: "Give your personal agent access to the same Google Drive or Dropbox folder. Research, reading notes and daily summaries can arrive as Markdown, ready for you to pick up.",
      },
      {
        title: "You choose what to keep.",
        body: "When local and cloud edits conflict, choose the local version, the cloud version, or keep both. Every conflicting change gets your attention.",
      },
    ],
    privacy:
      "Your notes live on your device and in the cloud account you connect. Transfers go directly through Google Drive or Dropbox.",
    purchase:
      "One purchase unlocks sync. Connect your cloud account after purchase.",
  },
  "zh-hans": {
    title: "你的笔记。你的云盘。你的 Agent。",
    items: [
      {
        title: "源码与成文，都看得清。",
        body: "直接编辑真实 Markdown，在源码、分栏和阅读之间切换。一边推敲文字，一边确认排版，也方便 Agent 接着修改 .md。",
      },
      {
        title: "一个文件夹，始终归你。",
        body: "打开普通 .md 文件夹，离线也能写。随时用其他编辑器打开，用 Git 查看修改。再选一套喜欢的主题与字体，让 25 套主题陪你安心写作。",
      },
      {
        title: "让 Agent 的工作，有处安放。",
        body: "把同一个 Google Drive 或 Dropbox 文件夹授权给你的 Personal Agent。整理资料、摘录阅读、汇总日报，都能归档成 Markdown，等你接着写。",
      },
      {
        title: "有了冲突，由你决定。",
        body: "本地与云端同时改动时，清楚呈现冲突，让你选择保留本地、保留云端，或两边都留。每一份修改，都由你确认去处。",
      },
    ],
    privacy:
      "笔记保存在你的设备与所连接的云盘账号中，传输直接经过 Google Drive 或 Dropbox。",
    purchase: "一次购买，持续同步。购买完成后，再授权连接你的云盘。",
  },
  "zh-hant": {
    title: "你的筆記。你的雲端硬碟。你的 Agent。",
    items: [
      {
        title: "原始碼與成文，都看得清。",
        body: "直接編輯真正的 Markdown，在原始碼、分欄與閱讀之間切換。一邊推敲文字，一邊確認排版，也方便 Agent 接著修改 .md。",
      },
      {
        title: "一個資料夾，始終屬於你。",
        body: "開啟一般 .md 資料夾，離線也能寫。隨時用其他編輯器開啟，以 Git 查看修改。25 套主題與字型設定，讓寫作空間合乎你的習慣。",
      },
      {
        title: "讓 Agent 的成果，有處安放。",
        body: "將同一個 Google Drive 或 Dropbox 資料夾授權給你的 Personal Agent。整理資料、摘錄閱讀、彙整日報，都能存成 Markdown，等你接著寫。",
      },
      {
        title: "遇到衝突，由你決定。",
        body: "本機與雲端同時修改時，清楚呈現衝突，讓你選擇保留本機、保留雲端，或兩者皆保留。每一份修改，都由你確認去處。",
      },
    ],
    privacy:
      "筆記保存在你的裝置與所連接的雲端硬碟帳號中，傳輸直接透過 Google Drive 或 Dropbox。",
    purchase: "一次購買，持續同步。購買完成後，再授權連接你的雲端硬碟。",
  },
  ja: {
    title: "あなたのノート。あなたのクラウド。あなたのエージェント。",
    items: [
      {
        title: "Markdown を、そのまま。",
        body: "実際のソースを編集し、ソース・分割・閲覧を切り替え。文章と仕上がりを確かめながら書けて、エージェントも同じ .md を編集できます。",
      },
      {
        title: "ずっと手元に置けるフォルダ。",
        body: "通常の .md フォルダを開き、オフラインで執筆。他のエディタで開いたり、Git で変更を確認したり。25 種類のテーマとフォント設定で、自分らしい書く場所に。",
      },
      {
        title: "エージェントの成果も、ここに。",
        body: "同じ Google Drive や Dropbox のフォルダへのアクセスを、あなたのエージェントに許可。調査、読書メモ、日々の要約が Markdown として届き、その続きを書けます。",
      },
      {
        title: "競合したら、あなたが選ぶ。",
        body: "ローカルとクラウドの編集が競合したら、ローカル版、クラウド版、または両方を保存。変更の扱いを、一つずつ確認できます。",
      },
    ],
    privacy:
      "ノートの保存先は、あなたのデバイスと接続したクラウドアカウント。転送は Google Drive または Dropbox を直接経由します。",
    purchase:
      "一度の購入で同期を利用できます。購入後にクラウドアカウントを接続します。",
  },
  ko: {
    title: "나의 노트. 나의 클라우드. 나의 에이전트.",
    items: [
      {
        title: "Markdown을 그대로 편집하세요.",
        body: "실제 소스를 작성하고 소스·분할·읽기 보기를 전환하세요. 글과 서식을 함께 확인하고, 에이전트도 같은 .md 파일을 수정할 수 있어요.",
      },
      {
        title: "언제나 내 손안의 폴더.",
        body: "일반 .md 폴더를 열고 오프라인으로 작성하세요. 다른 편집기에서 열거나 Git으로 변경 사항을 확인할 수 있어요. 25가지 테마와 글꼴 설정으로 나만의 공간을 꾸미세요.",
      },
      {
        title: "에이전트의 작업도 한곳에.",
        body: "나의 에이전트에 같은 Google Drive 또는 Dropbox 폴더의 접근 권한을 주세요. 조사 자료, 독서 노트, 일일 요약을 Markdown으로 모아 이어서 쓸 수 있어요.",
      },
      {
        title: "충돌이 생기면 직접 선택하세요.",
        body: "로컬과 클라우드의 수정 내용이 충돌하면 로컬 버전, 클라우드 버전 또는 둘 다 보관할 수 있어요. 각 변경 사항을 확인하고 결정하세요.",
      },
    ],
    privacy:
      "노트는 내 기기와 연결한 클라우드 계정에 저장돼요. 전송은 Google Drive 또는 Dropbox를 직접 통해 이루어져요.",
    purchase:
      "한 번 구매하면 동기화를 사용할 수 있어요. 구매를 완료한 뒤 클라우드 계정을 연결하세요.",
  },
  de: {
    title: "Deine Notizen. Deine Cloud. Deine Agenten.",
    items: [
      {
        title: "Markdown im vollen Blick.",
        body: "Bearbeite den echten Quelltext. Wechsle zwischen Quelltext, geteilter Ansicht und Leseansicht, um Text und Formatierung im Blick zu behalten.",
      },
      {
        title: "Ein Ordner, der dir gehört.",
        body: "Öffne einen Ordner mit normalen .md-Dateien und schreibe offline. Nutze andere Editoren, verfolge Änderungen mit Git und richte deinen Schreibplatz mit 25 Themes und eigenen Schriftarten ein.",
      },
      {
        title: "Ein Zuhause für die Arbeit deiner Agenten.",
        body: "Gib deinem persönlichen Agenten Zugriff auf denselben Google-Drive- oder Dropbox-Ordner. Recherchen, Lesenotizen und Tagesberichte kommen als Markdown an, bereit zum Weiterschreiben.",
      },
      {
        title: "Du entscheidest, was bleibt.",
        body: "Bei Konflikten zwischen lokalen Änderungen und der Cloud wählst du die lokale Version, die Cloud-Version oder beide. Jede widersprüchliche Änderung wird dir zur Auswahl vorgelegt.",
      },
    ],
    privacy:
      "Deine Notizen liegen auf deinem Gerät und in deinem verbundenen Cloud-Konto. Die Übertragung erfolgt direkt über Google Drive oder Dropbox.",
    purchase:
      "Ein Kauf schaltet die Synchronisierung frei. Verbinde dein Cloud-Konto nach dem Kauf.",
  },
  fr: {
    title: "Vos notes. Votre cloud. Vos agents.",
    items: [
      {
        title: "Le Markdown sous tous ses angles.",
        body: "Écrivez directement dans le fichier source. Alternez entre source, vue partagée et lecture pour garder le texte et sa mise en forme sous les yeux.",
      },
      {
        title: "Un dossier qui vous appartient.",
        body: "Ouvrez un dossier de fichiers .md et écrivez hors ligne. Retrouvez-les dans un autre éditeur, suivez les modifications avec Git et personnalisez votre espace avec 25 thèmes et vos polices préférées.",
      },
      {
        title: "Une place pour le travail de vos agents.",
        body: "Autorisez votre agent personnel à accéder au même dossier Google Drive ou Dropbox. Recherches, notes de lecture et bilans quotidiens arrivent en Markdown, prêts à être repris.",
      },
      {
        title: "Vous choisissez quoi conserver.",
        body: "En cas de conflit entre les modifications locales et le cloud, choisissez la version locale, la version cloud ou les deux. Chaque conflit vous est présenté pour décision.",
      },
    ],
    privacy:
      "Vos notes restent sur votre appareil et dans le compte cloud connecté. Les transferts passent directement par Google Drive ou Dropbox.",
    purchase:
      "Un achat débloque la synchronisation. Connectez votre compte cloud une fois l’achat effectué.",
  },
  es: {
    title: "Tus notas. Tu nube. Tus agentes.",
    items: [
      {
        title: "Markdown a la vista.",
        body: "Edita el código fuente real. Alterna entre las vistas de código, dividida y lectura para tener a la vista el texto y su formato.",
      },
      {
        title: "Una carpeta que te pertenece.",
        body: "Abre una carpeta de archivos .md y escribe sin conexión. Úsalos en otros editores, revisa los cambios con Git y personaliza tu espacio con 25 temas y las fuentes que prefieras.",
      },
      {
        title: "Un lugar para el trabajo de tus agentes.",
        body: "Da a tu agente personal acceso a la misma carpeta de Google Drive o Dropbox. Las investigaciones, notas de lectura y resúmenes diarios llegan en Markdown, listos para continuar.",
      },
      {
        title: "Tú decides qué conservar.",
        body: "Si los cambios locales entran en conflicto con la nube, elige la versión local, la de la nube o ambas. Cada conflicto se presenta para que decidas.",
      },
    ],
    privacy:
      "Tus notas están en tu dispositivo y en la cuenta de nube conectada. Las transferencias pasan directamente por Google Drive o Dropbox.",
    purchase:
      "Una compra activa la sincronización. Conecta tu cuenta de nube después de comprar.",
  },
};
