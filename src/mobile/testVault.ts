import type { VaultEntryDto, VaultFileDto } from "stoatmd/native";
import type { LocalVault } from "./library";

export function memoryVault() {
  let stamp = 1;
  const files = new Map<string, VaultFileDto>([["note.md", { content: "original", mtimeMs: stamp, createdMs: stamp }]]);
  const folders = new Set<string>();
  const writes: { path: string; content: string; expected: number | null }[] = [];
  let gate: Promise<void> | null = null;
  let failure = false;
  let draft: string | null = null;
  const vault: LocalVault = {
    async listRecursive(dir) {
      return [...files].map(([path, file]) => ({ path, name: path.split("/").pop()!, isDir: false, size: file.content.length, mtimeMs: file.mtimeMs }))
        .concat([...folders].map(path => ({ path, name: path.split("/").pop()!, isDir: true, size: 0, mtimeMs: 0 }))).filter(e => dir ? e.path.startsWith(`${dir}/`) : !e.path.split("/").some(p => p.startsWith("."))) as VaultEntryDto[];
    },
    async read(path) { const file = files.get(path); if (!file) throw new Error("missing"); return { ...file }; },
    async write(path, content, expected) {
      writes.push({ path, content, expected });
      if (gate) { const wait = gate; gate = null; await wait; }
      if (failure) throw new Error("disk full");
      const file = files.get(path)!;
      if (!file || expected !== file.mtimeMs) return { ok: false, conflict: true, mtimeMs: file?.mtimeMs ?? 0 };
      const mtimeMs = ++stamp;
      files.set(path, { ...file, content, mtimeMs });
      return { ok: true, conflict: false, mtimeMs };
    },
    async create(path, content) {
      if (files.has(path)) throw new Error("exists");
      const mtimeMs = ++stamp;
      files.set(path, { content, createdMs: mtimeMs, mtimeMs });
      return { ok: true, conflict: false, mtimeMs };
    },
    async ensureDir(path) { const parts = path.split("/"); for (let i = 1; i <= parts.length; i++) folders.add(parts.slice(0, i).join("/")); },
    async delete(path) { files.delete(path); },
    async saveDraft(json) { draft = json; },
    async readDraft() { return draft; },
    async clearDraft() { draft = null; },
    async rename(from, to) { if (files.has(to)) throw new Error("exists"); files.set(to, files.get(from)!); files.delete(from); },
    async searchContent(query) { return [...files].filter(([, file]) => file.content.includes(query)).map(([path]) => path); },
  };
  return { vault, files, folders, writes, block() { let release!: () => void; gate = new Promise(resolve => { release = resolve; }); return release; }, fail(value: boolean) { failure = value; } };
}
