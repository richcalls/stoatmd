export type FolderId = "diary" | "projects" | "reading" | "writing" | "inspiration";

export type Folder = {
  id: FolderId;
  icon: "notebook" | "folder" | "book" | "pencil" | "lightbulb";
  labelKey: string;
};

export type Note = {
  id: string;
  folderId: FolderId;
  title: string;
  when: string;
  whenEn: string;
  body: string;
};

export const FOLDERS: Folder[] = [
  { id: "diary", icon: "notebook", labelKey: "folder.diary" },
  { id: "projects", icon: "folder", labelKey: "folder.projects" },
  { id: "reading", icon: "book", labelKey: "folder.reading" },
  { id: "writing", icon: "pencil", labelKey: "folder.writing" },
  { id: "inspiration", icon: "lightbulb", labelKey: "folder.inspiration" },
];

const FRAMEWORK_BODY = `# 写作的框架

## 为什么需要框架

好的文章不是灵感的堆砌，而是**结构**的展开。
框架让读者知道自己站在哪里，也让作者知道下一步写什么。

## 三个层次

- **骨架**：论点与顺序
- **肌肉**：例证与细节
- **皮肤**：语气与节奏

> 先写骨架，再填血肉。
> 润色永远放在最后。

在编辑器里用 \`Cmd + B\` 加粗，用 *斜体* 强调语气。

## 最小流程

1. 一句话论点
2. 三段支撑
3. 收束与回声
`;

/** 假数据：下一 PR 由 Vault 替换。 */
export const NOTES: Note[] = [
  {
    id: "n1",
    folderId: "writing",
    title: "写作的框架",
    when: "今天 10:24",
    whenEn: "Today 10:24",
    body: FRAMEWORK_BODY,
  },
  {
    id: "n2",
    folderId: "writing",
    title: "读书笔记 · 少即是多",
    when: "昨天",
    whenEn: "Yesterday",
    body: `# 读书笔记 · 少即是多\n\n删掉一半句子，意思往往更清楚。\n`,
  },
  {
    id: "n3",
    folderId: "writing",
    title: "项目备忘：本地优先",
    when: "周一",
    whenEn: "Mon",
    body: `# 本地优先\n\n本机文件夹是真相；同步是副本。\n`,
  },
  {
    id: "n4",
    folderId: "writing",
    title: "晨间三行",
    when: "10月26日",
    whenEn: "Oct 26",
    body: `# 晨间三行\n\n1. 昨夜梦到什么\n2. 今天只做一件事\n3. 一句不着急的话\n`,
  },
  {
    id: "n5",
    folderId: "writing",
    title: "引用收集",
    when: "10月24日",
    whenEn: "Oct 24",
    body: `# 引用收集\n\n> 写，是为了想清楚。\n`,
  },
  {
    id: "n6",
    folderId: "writing",
    title: "未命名笔记",
    when: "10月22日",
    whenEn: "Oct 22",
    body: `# 未命名笔记\n\n…\n`,
  },
];

export function notesInFolder(folderId: FolderId): Note[] {
  return NOTES.filter((n) => n.folderId === folderId);
}

export function noteById(id: string): Note | undefined {
  return NOTES.find((n) => n.id === id);
}
