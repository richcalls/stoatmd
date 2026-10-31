import { sha256Bytes } from "../sync/hash";
import { joinPath, libraryPath } from "../sync/paths";

export type Entry = { path: string; directory: boolean; size: number; revision: string };
/** Endpoints always create exclusively; destination data is never overwritten. */
export type Endpoint = {
  list(): Promise<Entry[]>;
  read(path: string): Promise<Uint8Array>;
  create(path: string, content: Uint8Array): Promise<void>;
  mkdir(path: string): Promise<void>;
  remove(entry: Entry, hash: string): Promise<void>;
};
export type Receipt = { source: Entry; target: string; hash: string };
export type MigrationProgress = { stage: "copying" | "verifying" | "cleaning"; done: number; total: number };
export type MigrationSummary = { files: number; directories: number; bytes: number };

export function summarize(entries: Entry[]): MigrationSummary {
  return entries.reduce((s, e) => ({ files: s.files + (e.directory ? 0 : 1),
    directories: s.directories + (e.directory ? 1 : 0), bytes: s.bytes + e.size }),
    { files: 0, directories: 0, bytes: 0 });
}

function validated(entries: Entry[]): Entry[] {
  const seen = new Set<string>();
  for (const e of entries) {
    if (!libraryPath(e.path) || e.path !== e.path.normalize("NFC") || seen.has(e.path.toLowerCase())) {
      throw new Error(`Unsupported or duplicate library path: ${e.path}`);
    }
    seen.add(e.path.toLowerCase());
  }
  return entries;
}

export function inventorySignature(entries: Entry[]): string {
  return JSON.stringify(validated(entries).map(e => [e.path, e.directory, e.directory ? "" : e.revision, e.size])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
}

export async function verifySnapshot(source: Endpoint, inventory: string, receipts: Receipt[]): Promise<void> {
  for (const r of receipts) {
    if (sha256Bytes(await source.read(r.source.path)) !== r.hash) throw new Error("storage.error.sourceChanged");
  }
  if (inventorySignature(await source.list()) !== inventory) throw new Error("storage.error.sourceChanged");
}

/** Copy and verify a stable snapshot before the caller commits a storage binding.
 * A differing collision isolates the entire incoming library, keeping relative links intact.
 * The content-derived folder name lets interrupted copies adopt their verified partial data.
 */
export async function copyVerified(source: Endpoint, target: Endpoint,
  progress: (p: MigrationProgress) => void = () => {}): Promise<Receipt[]> {
  const entries = validated(await source.list());
  const snapshot = inventorySignature(entries);
  const existing = new Map(validated(await target.list()).map(e => [e.path.toLowerCase(), e]));
  const hashes = new Map<string, string>();
  const receipts: Receipt[] = [];
  const total = entries.filter(e => !e.directory).length;
  progress({ stage: "copying", done: 0, total });
  let collision = false;
  for (const entry of entries) {
    const hash = entry.directory ? "" : sha256Bytes(await source.read(entry.path));
    hashes.set(entry.path, hash);
    const hit = existing.get(entry.path.toLowerCase());
    if (hit && (hit.path !== entry.path || hit.directory !== entry.directory ||
      (!entry.directory && sha256Bytes(await target.read(hit.path)) !== hash))) collision = true;
  }
  const fingerprint = sha256Bytes(new TextEncoder().encode(JSON.stringify(
    entries.map(e => [e.path, e.directory, hashes.get(e.path)]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))))));
  const prefix = collision ? `Imported library ${fingerprint.slice(0, 16)}` : "";
  if (prefix) {
    const hit = existing.get(prefix.toLowerCase());
    if (hit && (!hit.directory || hit.path !== prefix)) throw new Error(`Destination changed: ${prefix}`);
    await target.mkdir(prefix);
  }
  const ordered = [...entries].sort((a, b) => a.path.split("/").length - b.path.split("/").length ||
    Number(b.directory) - Number(a.directory) || a.path.localeCompare(b.path));
  for (const entry of ordered) {
    const path = joinPath(prefix, entry.path);
    const hit = existing.get(path.toLowerCase());
    if (entry.directory) {
      if (hit && (!hit.directory || hit.path !== path)) throw new Error(`Destination changed: ${path}`);
      await target.mkdir(path);
      continue;
    }
    const hash = hashes.get(entry.path)!;
    const content = await source.read(entry.path);
    if (sha256Bytes(content) !== hash) throw new Error("storage.error.sourceChanged");
    if (hit) {
      if (hit.directory || hit.path !== path || sha256Bytes(await target.read(hit.path)) !== hash) {
        throw new Error(`Destination changed: ${path}`);
      }
    } else await target.create(path, content);
    receipts.push({ source: entry, target: path, hash });
    progress({ stage: "copying", done: receipts.length, total });
  }
  progress({ stage: "verifying", done: 0, total });
  for (let i = 0; i < receipts.length; i++) {
    const r = receipts[i]!;
    if (sha256Bytes(await target.read(r.target)) !== r.hash) throw new Error(`Verification failed: ${r.source.path}`);
    progress({ stage: "verifying", done: i + 1, total });
  }
  await verifySnapshot(source, snapshot, receipts);
  const final = new Map((await target.list()).map(e => [e.path, e]));
  for (const e of entries.filter(e => e.directory)) {
    if (!final.get(joinPath(prefix, e.path))?.directory) throw new Error(`Missing folder: ${e.path}`);
  }
  return receipts;
}

/** Cleanup is a separate, retryable phase after committing the new storage.
 * Changed files, missing destination copies, and unrelated files remain untouched.
 */
export async function cleanupVerified(source: Endpoint, target: Endpoint, receipts: Receipt[],
  progress: (p: MigrationProgress) => void = () => {}): Promise<Receipt[]> {
  const remaining: Receipt[] = [];
  for (let i = 0; i < receipts.length; i++) {
    const r = receipts[i]!;
    try {
      const current = (await source.list()).find(e => e.path === r.source.path);
      if (current) {
        if (current.directory || current.revision !== r.source.revision ||
          sha256Bytes(await source.read(current.path)) !== r.hash ||
          sha256Bytes(await target.read(r.target)) !== r.hash) throw new Error("File changed");
        await source.remove(current, r.hash);
      }
    } catch { remaining.push(r); }
    progress({ stage: "cleaning", done: i + 1, total: receipts.length });
  }
  return remaining;
}
