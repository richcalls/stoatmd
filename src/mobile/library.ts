import { signal } from "nsh";
import type { VaultEntryDto, VaultFileDto, VaultWriteDto } from "stoatmd/native";
import { duplicateNotePath, nextUntitledPath, notesInFolder, renamedNotePath } from "../ui/vaultModel";

type MaybeAsync<T> = T | Promise<T>;
export interface LocalVault {
  listRecursive(dir: string): MaybeAsync<VaultEntryDto[]>;
  read(path: string): MaybeAsync<VaultFileDto>;
  write(path: string, content: string, expectedMtimeMs: number | null): MaybeAsync<VaultWriteDto>;
  create(path: string, content: string): MaybeAsync<VaultWriteDto>;
  ensureDir(path: string): MaybeAsync<void>;
  rename(from: string, to: string): MaybeAsync<void>;
  delete(path: string): MaybeAsync<void>;
  saveDraft(json: string): MaybeAsync<void>;
  readDraft(): MaybeAsync<string | null>;
  clearDraft(): MaybeAsync<void>;
  searchContent(query: string): Promise<string[]>;
}
export type MobileNote = VaultFileDto & { path: string; saved: string };
export type RecycledNote = { path: string; original: string; deletedAt: number };
const TRASH = ".stoatmd-trash";

/** One document, one ordered writer. Each committed input starts a write
 * immediately; edits arriving during it are coalesced into the next write. */
export function mobileLibrary(vault: LocalVault) {
  const entries = signal<VaultEntryDto[]>([]);
  const note = signal<MobileNote | null>(null);
  const error = signal("");
  const conflict = signal(false);
  const saving = signal(false);
  const recovered = signal(false);
  const recycled = signal<RecycledNote[]>([]);
  let pending: Promise<boolean> | null = null;
  let journal: Promise<void> = Promise.resolve();
  const persist = (snapshot: MobileNote) => {
    journal = journal.catch(() => {}).then(() => vault.saveDraft(JSON.stringify(snapshot)));
    return journal;
  };
  const clearJournal = () => {
    journal = journal.catch(() => {}).then(() => vault.clearDraft());
    return journal;
  };
  const dirty = () => !!note() && note()!.content !== note()!.saved;
  const refresh = async () => {
    const next = await vault.listRecursive("");
    if (JSON.stringify(next) !== JSON.stringify(entries())) entries.set(next);
  };

  const flush = (): Promise<boolean> => {
    if (pending) return pending;
    if (conflict()) return Promise.resolve(false);
    if (!dirty()) return Promise.resolve(true);
    saving.set(true);
    error.set("");
    pending = Promise.resolve().then(async () => {
      try {
        do {
          while (dirty()) {
            const snapshot = note()!;
            await persist(snapshot);
            const result = await vault.write(snapshot.path, snapshot.content, snapshot.mtimeMs);
            if (!result.ok || result.conflict) { conflict.set(true); await journal; return false; }
            note.set({ ...note()!, mtimeMs: result.mtimeMs, saved: snapshot.content });
          }
          await clearJournal();
        } while (dirty());
        return true;
      } catch (err) {
        error.set(String(err));
        return false;
      } finally {
        saving.set(false);
        pending = null;
      }
    });
    return pending;
  };
  const edit = (content: string) => {
    if (!note()) return;
    note.set({ ...note()!, content });
    void persist(note()!).catch(err => error.set(String(err)));
    void flush();
  };
  const openNote = async (path: string) => {
    if (!await flush()) return false;
    const file = await vault.read(path);
    note.set({ ...file, path, saved: file.content });
    conflict.set(false);
    error.set("");
    recovered.set(false);
    return true;
  };
  const createNote = async (folder: string) => {
    if (!await flush()) return false;
    await refresh();
    const path = nextUntitledPath(folder, notesInFolder(entries()));
    await vault.create(path, "");
    await openNote(path);
    await refresh();
    return true;
  };
  const renameNote = async (name: string) => {
    if (!await flush() || !note()) return false;
    const result = renamedNotePath(note()!.path, name);
    if (!result.ok) throw new Error(`rename.error.${result.error}`);
    if (result.path !== note()!.path) await vault.rename(note()!.path, result.path);
    note.set({ ...note()!, path: result.path });
    await refresh();
    return true;
  };
  const copy = async (suffix: string, resolveConflict = false) => {
    if (!note() || (!resolveConflict && !await flush())) return false;
    if (pending) await pending;
    await refresh();
    const current = note()!;
    const path = duplicateNotePath(current.path, entries().map(e => e.path), suffix);
    const result = await vault.create(path, current.content);
    note.set({ ...current, path, mtimeMs: result.mtimeMs, saved: current.content });
    conflict.set(false);
    error.set("");
    await clearJournal();
    recovered.set(false);
    await refresh();
    return true;
  };
  const reload = async () => {
    if (pending) await pending;
    const current = note();
    if (!current) return;
    const file = await vault.read(current.path);
    note.set({ ...file, path: current.path, saved: file.content });
    conflict.set(false);
    error.set("");
    await clearJournal();
    recovered.set(false);
  };
  const createFolder = async (parent: string, input: string) => {
    const name = input.trim().normalize("NFC");
    if (!name || name.startsWith(".") || /[/\\\0]/.test(name)) throw new Error("rename.error.invalid");
    await refresh();
    const path = parent ? `${parent}/${name}` : name;
    if (entries().some(e => e.path.toLowerCase() === path.toLowerCase())) throw new Error("rename.error.exists");
    await vault.ensureDir(path);
    await refresh();
  };
  const recover = async () => {
    const json = await vault.readDraft();
    if (!json) return;
    const draft = JSON.parse(json) as MobileNote;
    if (!draft || typeof draft.path !== "string" || !draft.path || draft.path.split("/").some(p => !p || p === "." || p === ".." || p.startsWith(".")) ||
        !/\.(md|markdown)$/i.test(draft.path) || typeof draft.content !== "string" || typeof draft.saved !== "string" ||
        typeof draft.mtimeMs !== "number" || typeof draft.createdMs !== "number") throw new Error("Invalid recovery journal");
    const exists = entries().some(e => e.path === draft.path && !e.isDir);
    const disk = exists ? await vault.read(draft.path) : null;
    if (disk?.content === draft.content) { await clearJournal(); return; }
    note.set(draft);
    recovered.set(true);
    conflict.set(!disk || disk.content !== draft.saved);
    if (disk) note.set({ ...draft, mtimeMs: disk.mtimeMs });
    if (!conflict()) await flush();
  };
  // Reconcile on a foreground timer. A changed editor snapshot wins over an
  // in-flight disk read; dirty content is preserved for conflict resolution.
  const reconcile = async () => {
    if (pending) return;
    const snapshot = note();
    await refresh();
    if (!snapshot || note() !== snapshot || pending || conflict()) return;
    const exists = entries().some(e => e.path === snapshot.path && !e.isDir);
    if (!exists) { conflict.set(true); return; }
    const disk = await vault.read(snapshot.path);
    if (note() !== snapshot || pending) return;
    if (disk.content !== snapshot.saved) {
      if (dirty()) conflict.set(true);
      else note.set({ ...disk, path: snapshot.path, saved: disk.content });
    } else if (disk.mtimeMs !== snapshot.mtimeMs) note.set({ ...snapshot, mtimeMs: disk.mtimeMs });
  };
  const move = async (folder: string) => {
    if (!await flush() || !note()) return false;
    await refresh();
    if (folder && !entries().some(e => e.path === folder && e.isDir)) throw new Error("rename.error.invalid");
    const current = note()!;
    const target = [folder, current.path.split("/").pop()].filter(Boolean).join("/");
    if (target === current.path) return true;
    if (entries().some(e => e.path.toLowerCase() === target.toLowerCase())) throw new Error("rename.error.exists");
    await vault.rename(current.path, target);
    note.set({ ...current, path: target });
    await refresh();
    return true;
  };
  const loadTrash = async () => {
    await vault.ensureDir(TRASH);
    recycled.set((await vault.listRecursive(TRASH)).filter(e => !e.isDir).map(e => {
      const parts = e.path.split("/");
      return { path: e.path, original: parts.slice(2).join("/"), deletedAt: Number(parts[1].split("-")[0]) };
    }).sort((a, b) => b.deletedAt - a.deletedAt));
  };
  const recycle = async () => {
    if (!await flush() || !note()) return false;
    const current = note()!;
    const target = `${TRASH}/${Date.now()}-${Math.random().toString(36).slice(2)}/${current.path}`;
    await vault.ensureDir(target.split("/").slice(0, -1).join("/"));
    await vault.rename(current.path, target);
    note.set(null);
    recovered.set(false);
    await refresh();
    return true;
  };
  const restore = async (path: string, suffix: string) => {
    await loadTrash();
    const item = recycled().find(e => e.path === path);
    if (!item) throw new Error("rename.error.invalid");
    await refresh();
    const occupied = entries().map(e => e.path.toLowerCase());
    const target = occupied.includes(item.original.toLowerCase()) ? duplicateNotePath(item.original, entries().map(e => e.path), suffix) : item.original;
    const parent = target.split("/").slice(0, -1).join("/");
    if (parent) await vault.ensureDir(parent);
    await vault.rename(item.path, target);
    await refresh();
    await loadTrash();
    return target;
  };
  const removePermanently = async (path: string) => {
    await loadTrash();
    if (!recycled().some(e => e.path === path)) throw new Error("rename.error.invalid");
    await vault.delete(path);
    await loadTrash();
  };
  const importNote = async (folder: string, name: string, content: string) => {
    if (!await flush()) return false;
    await refresh();
    if (folder && !entries().some(e => e.path === folder && e.isDir)) throw new Error("rename.error.invalid");
    const result = renamedNotePath("import.md", name);
    if (!result.ok) throw new Error(`rename.error.${result.error}`);
    let path = [folder, result.path].filter(Boolean).join("/");
    if (entries().some(e => e.path.toLowerCase() === path.toLowerCase())) path = duplicateNotePath(path, entries().map(e => e.path), "import");
    await vault.create(path, content.replace(/^\uFEFF/, ""));
    await openNote(path);
    await refresh();
    return true;
  };
  return { vault, entries, note, error, conflict, saving, recovered, recycled, dirty, refresh, flush, edit, openNote, createNote, renameNote, copy, reload, createFolder,
    recover, reconcile, move, loadTrash, recycle, restore, removePermanently, importNote };
}
export type MobileLibrary = ReturnType<typeof mobileLibrary>;
