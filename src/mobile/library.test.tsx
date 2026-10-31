import { expect, test } from "nsh/test";
import { mobileLibrary } from "./library";
import { memoryVault } from "./testVault";


test("mobile saves coalesce typing during writes and advance the expected revision", async () => {
  const memory = memoryVault();
  const lib = mobileLibrary(memory.vault);
  await lib.openNote("note.md");
  const release = memory.block();
  lib.edit("first");
  for (let i = 0; i < 40 && memory.writes.length === 0; i++) await Promise.resolve();
  lib.edit("second");
  lib.edit("latest 中文");
  expect(lib.saving()).toBe(true);
  expect(memory.writes.length).toBe(1);
  release();
  expect(await lib.flush()).toBe(true);
  expect(memory.files.get("note.md")!.content).toBe("latest 中文");
  expect(memory.writes.map(write => write.content)).toEqual(["first", "latest 中文"]);
  expect(memory.writes[1].expected).toBe(2);
  expect(lib.dirty()).toBe(false);
});

test("mobile conflict preserves the disk and editor, and saves both as separate files", async () => {
  const memory = memoryVault();
  const lib = mobileLibrary(memory.vault);
  await lib.openNote("note.md");
  memory.files.set("note.md", { content: "external", mtimeMs: 100, createdMs: 1 });
  lib.edit("my edits");
  expect(await lib.flush()).toBe(false);
  expect(lib.conflict()).toBe(true);
  expect(await lib.openNote("other.md")).toBe(false);
  expect(lib.note()!.content).toBe("my edits");
  expect(await lib.copy("copy", true)).toBe(true);
  expect(memory.files.get("note.md")!.content).toBe("external");
  expect(memory.files.get("note copy.md")!.content).toBe("my edits");
  expect(lib.conflict()).toBe(false);
});

test("mobile failed writes retain edits, block navigation and recover on retry", async () => {
  const memory = memoryVault();
  const lib = mobileLibrary(memory.vault);
  await lib.openNote("note.md");
  memory.fail(true);
  lib.edit("keep me");
  expect(await lib.flush()).toBe(false);
  expect(lib.dirty()).toBe(true);
  expect(await lib.createNote("")).toBe(false);
  expect(lib.error().includes("disk full")).toBe(true);
  memory.fail(false);
  expect(await lib.flush()).toBe(true);
  expect(memory.files.get("note.md")!.content).toBe("keep me");
});

test("mobile folder creation and rename validate names and keep note content", async () => {
  const memory = memoryVault();
  const lib = mobileLibrary(memory.vault);
  await lib.createFolder("", "Ideas");
  await lib.createNote("Ideas");
  lib.edit("# 标题\n\n正文");
  expect(await lib.renameNote("想法")).toBe(true);
  expect(memory.files.get("Ideas/想法.md")!.content).toBe("# 标题\n\n正文");
  let rejected = false;
  try { await lib.createFolder("", "../escape"); } catch { rejected = true; }
  expect(rejected).toBe(true);
  expect(memory.folders.has("../escape")).toBe(false);
});

// The native bridge can throw before returning a Promise.
test("mobile synchronous native write failures allow a later retry", async () => {
  const memory = memoryVault();
  let fail = true;
  const lib = mobileLibrary({ ...memory.vault, write(path, content, expected) {
    if (fail) throw new Error("native write failed");
    return memory.vault.write(path, content, expected);
  }});
  await lib.openNote("note.md");
  lib.edit("retained");
  expect(await lib.flush()).toBe(false);
  fail = false;
  expect(await lib.flush()).toBe(true);
  expect(memory.files.get("note.md")!.content).toBe("retained");
});

test("mobile restart recovers failed writes and clears the journal after saving", async () => {
  const memory = memoryVault();
  const first = mobileLibrary(memory.vault);
  await first.openNote("note.md");
  memory.fail(true);
  first.edit("恢复中文草稿");
  expect(await first.flush()).toBe(false);
  expect(JSON.parse((await memory.vault.readDraft())!).content).toBe("恢复中文草稿");
  memory.fail(false);
  const next = mobileLibrary(memory.vault);
  await next.refresh();
  await next.recover();
  expect(next.recovered()).toBe(true);
  expect(next.note()!.content).toBe("恢复中文草稿");
  expect(memory.files.get("note.md")!.content).toBe("恢复中文草稿");
  expect(await memory.vault.readDraft()).toBe(null);
});

test("mobile journals edits made after a conflict and keeps both across restart", async () => {
  const memory = memoryVault();
  const first = mobileLibrary(memory.vault);
  await first.openNote("note.md");
  memory.files.set("note.md", { content: "external", mtimeMs: 100, createdMs: 1 });
  first.edit("draft one");
  await first.flush();
  first.edit("draft two");
  // Wait for the queued journal, as an input-triggered write would settle.
  for (let i = 0; i < 20; i++) await Promise.resolve();
  const next = mobileLibrary(memory.vault);
  await next.refresh(); await next.recover();
  expect(next.conflict()).toBe(true);
  expect(next.note()!.content).toBe("draft two");
  await next.copy("copy", true);
  expect(memory.files.get("note.md")!.content).toBe("external");
  expect(memory.files.get("note copy.md")!.content).toBe("draft two");
  expect(await memory.vault.readDraft()).toBe(null);
});

test("mobile recovery handles deleted originals and already-saved journals", async () => {
  const memory = memoryVault();
  await memory.vault.saveDraft(JSON.stringify({ path: "gone.md", content: "draft", saved: "old", mtimeMs: 1, createdMs: 1 }));
  const lib = mobileLibrary(memory.vault);
  await lib.refresh(); await lib.recover();
  expect(lib.conflict()).toBe(true);
  await lib.copy("recovered", true);
  expect(memory.files.get("gone recovered.md")!.content).toBe("draft");
  await memory.vault.saveDraft(JSON.stringify({ ...lib.note()! }));
  const again = mobileLibrary(memory.vault);
  await again.refresh(); await again.recover();
  expect(again.note()).toBe(null);
  expect(await memory.vault.readDraft()).toBe(null);
});

test("mobile reload discards the recovery journal after a conflict", async () => {
  const memory = memoryVault();
  const lib = mobileLibrary(memory.vault);
  await lib.openNote("note.md");
  memory.files.set("note.md", { content: "external", mtimeMs: 100, createdMs: 1 });
  lib.edit("draft"); await lib.flush(); await lib.reload();
  expect(lib.note()!.content).toBe("external");
  expect(await memory.vault.readDraft()).toBe(null);
});

test("mobile move saves content, rejects collisions, and blocks on failed saves", async () => {
  const memory = memoryVault();
  const lib = mobileLibrary(memory.vault);
  await lib.openNote("note.md"); await lib.createFolder("", "Ideas");
  lib.edit("moved");
  expect(await lib.move("Ideas")).toBe(true);
  expect(memory.files.get("Ideas/note.md")!.content).toBe("moved");
  await memory.vault.create("note.md", "occupied");
  let rejected = false;
  try { await lib.move(""); } catch { rejected = true; }
  expect(rejected).toBe(true);
  memory.fail(true); lib.edit("unsaved");
  expect(await lib.move("")).toBe(false);
  expect(await lib.recycle()).toBe(false);
  expect(memory.files.get("note.md")!.content).toBe("occupied");
});

test("mobile recycle survives restart, restores nested paths and preserves collisions", async () => {
  const memory = memoryVault();
  const first = mobileLibrary(memory.vault);
  await first.createFolder("", "Ideas"); await first.openNote("note.md"); await first.move("Ideas");
  expect(await first.recycle()).toBe(true);
  expect(first.entries().some(e => e.path.includes(".stoatmd-trash"))).toBe(false);
  const next = mobileLibrary(memory.vault);
  await next.loadTrash();
  expect(next.recycled().length).toBe(1);
  await memory.vault.create("Ideas/note.md", "occupied");
  const restored = await next.restore(next.recycled()[0].path, "copy");
  expect(restored).toBe("Ideas/note copy.md");
  expect(memory.files.get(restored)!.content).toBe("original");
  expect(memory.files.get("Ideas/note.md")!.content).toBe("occupied");
  expect(next.recycled().length).toBe(0);
  await next.openNote(restored); await next.recycle(); await next.loadTrash();
  await next.removePermanently(next.recycled()[0].path);
  expect(next.recycled().length).toBe(0);
  let rejected = false;
  try { await next.removePermanently("Ideas/note.md"); } catch { rejected = true; }
  expect(rejected).toBe(true);
  expect(memory.files.has("Ideas/note.md")).toBe(true);
});

test("mobile import strips BOM, preserves extensions and avoids case-insensitive collisions", async () => {
  const memory = memoryVault();
  const lib = mobileLibrary(memory.vault);
  expect(await lib.importNote("", "NOTE.md", "\uFEFF# Imported")).toBe(true);
  expect(lib.note()!.path).toBe("NOTE import.md");
  expect(lib.note()!.content).toBe("# Imported");
  expect(memory.files.get("note.md")!.content).toBe("original");
  await lib.importNote("", "中文.markdown", "正文");
  expect(lib.note()!.path).toBe("中文.markdown");
  let rejected = false;
  try { await lib.importNote("", "../escape.md", "bad"); } catch { rejected = true; }
  expect(rejected).toBe(true);
});

test("mobile external changes reload clean documents and preserve unsaved edits", async () => {
  const memory = memoryVault();
  const lib = mobileLibrary(memory.vault);
  await lib.openNote("note.md");
  memory.files.set("note.md", { content: "external", mtimeMs: 100, createdMs: 1 });
  await lib.reconcile();
  expect(lib.note()!.content).toBe("external");
  memory.fail(true); lib.edit("unsaved"); await lib.flush();
  memory.files.set("note.md", { content: "external again", mtimeMs: 101, createdMs: 1 });
  await lib.reconcile();
  expect(lib.conflict()).toBe(true);
  expect(lib.note()!.content).toBe("unsaved");
});

test("mobile reconciliation never overwrites edits made during a disk read", async () => {
  const memory = memoryVault();
  let resume: (() => void) | null = null;
  let reading = false;
  const lib = mobileLibrary({ ...memory.vault, async read(path) {
    const value = await memory.vault.read(path);
    if (reading) await new Promise<void>(resolve => { resume = resolve; });
    return value;
  }});
  await lib.openNote("note.md");
  reading = true;
  const checking = lib.reconcile();
  for (let i = 0; i < 20 && !resume; i++) await Promise.resolve();
  lib.edit("new edit");
  resume!(); await checking; await lib.flush();
  expect(lib.note()!.content).toBe("new edit");
  expect(memory.files.get("note.md")!.content).toBe("new edit");
});
