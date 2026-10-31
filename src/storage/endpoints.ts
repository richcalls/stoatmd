import { Vault } from "stoatmd/native";
import { sha256Bytes } from "../sync/hash";
import type { RemoteDir, SyncProvider } from "../sync/provider";
import type { RemoteFile } from "../sync/types";
import { dirName } from "../sync/paths";
import type { Endpoint, Entry } from "./migration";

export function localEndpoint(vault: Vault): Endpoint {
  return {
    async list() { return vault.inventory().map(e => ({ path: e.path, directory: e.isDir,
      size: e.size, revision: `${e.mtimeMs}:${e.size}` })); },
    async read(path) { return new Uint8Array(vault.readBytes(path)); },
    async create(path, bytes) {
      const parent = dirName(path);
      if (parent) vault.ensureDir(parent);
      vault.createBytes(path, bytes);
    },
    async mkdir(path) { vault.ensureDir(path); },
    async remove(entry, hash) {
      const current = vault.inventory().find(e => e.path === entry.path);
      if (!current || `${current.mtimeMs}:${current.size}` !== entry.revision ||
        sha256Bytes(new Uint8Array(vault.readBytes(entry.path))) !== hash) throw new Error("Source changed");
      vault.trash(entry.path);
    },
  };
}

export function remoteEndpoint(provider: SyncProvider, root: RemoteDir): Endpoint {
  let files = new Map<string, RemoteFile>();
  return {
    async list() {
      const inventory = await provider.inventory(root);
      files = new Map(inventory.files.map(f => [f.path, f]));
      return [...inventory.directories.map(path => ({ path, directory: true, size: 0, revision: "" })),
        ...inventory.files.map(f => ({ path: f.path, directory: false, size: f.size, revision: `${f.id}:${f.rev}` }))];
    },
    async read(path) {
      let file = files.get(path);
      if (!file) {
        files = new Map((await provider.inventory(root)).files.map(f => [f.path, f]));
        file = files.get(path);
      }
      if (!file) throw new Error(`Missing remote file: ${path}`);
      return provider.downloadBytes(file);
    },
    async create(path, bytes) {
      const created = await provider.uploadBytes(root, path, bytes, { existing: null });
      files.set(path, created);
    },
    async mkdir(path) { await provider.ensureDirectory(root, path); },
    async remove(entry: Entry) {
      const current = (await provider.inventory(root)).files.find(f => f.path === entry.path);
      if (!current) return;
      if (`${current.id}:${current.rev}` !== entry.revision) throw new Error("Source changed");
      await provider.remove(current);
    },
  };
}
