import { transferLibrary } from "./transfer";
import { signal } from "nsh";
import { Vault } from "stoatmd/native";
import { loadSyncConfig } from "../sync/config";
import { SyncError } from "../sync/provider";
import { syncRuntime, type SyncConnection } from "../sync/runtime";
import { localEndpoint, remoteEndpoint } from "./endpoints";
import { cleanupVerified, summarize, type Endpoint, type MigrationSummary,
  type MigrationProgress } from "./migration";
import { activeStorage, writeActiveStorage, storageBusy, type Cleanup, type Location } from "./state";

export type MigrationPhase = "idle" | "preparing" | "confirm" | "copying" | "verifying" |
  "cleaning" | "succeeded" | "failed";
export const storageMigration = {
  phase: signal<MigrationPhase>("idle"),
  target: signal<Location | null>(null),
  summary: signal<MigrationSummary | null>(null),
  keepOriginal: signal(true),
  progress: signal<MigrationProgress>({ stage: "copying", done: 0, total: 0 }),
  error: signal<string | null>(null),
  warning: signal<string | null>(null),
};

export function connectionLocation(conn: SyncConnection): Location {
  return { kind: conn.provider, account: conn.account,
    remote: { id: conn.remoteId, path: conn.remotePath, name: conn.remoteName } };
}

export async function endpointFor(location: Location): Promise<Endpoint> {
  if (location.kind === "local") return localEndpoint(Vault.open(location.root));
  return remoteEndpoint(await syncRuntime.providerFor(location.kind, location.account), location.remote);
}

function disallowOverlap(sourceRoot: string | null, source: Location | null, target: Location): void {
  if (target.kind === "local" && sourceRoot) {
    const a = sourceRoot.replace(/\\/g, "/").toLowerCase(), b = target.root.replace(/\\/g, "/").toLowerCase();
    if (a === b || a.startsWith(b + "/") || b.startsWith(a + "/")) {
      throw new Error("storage.error.overlap");
    }
  }
  if (source && source.kind !== "local" && target.kind === source.kind) {
    const a = source.remote.path.toLowerCase().replace(/^\/+|\/+$/g, "");
    const b = target.remote.path.toLowerCase().replace(/^\/+|\/+$/g, "");
    if (source.remote.id === target.remote.id || !a || !b || a === b ||
      a.startsWith(b + "/") || b.startsWith(a + "/")) throw new Error("storage.error.overlap");
  }
}

let preparedSource = "";
const sourceIdentity = (root: string | null) => JSON.stringify([root, syncRuntime.connection()]);

export async function prepareMigration(root: string | null, target: Location, isCurrent = () => true): Promise<void> {
  await syncRuntime.load();
  if (!isCurrent()) return;
  if (storageBusy()) return;
  if (activeStorage()?.cleanup) throw new Error("storage.error.pendingCleanup");
  if (target.kind !== "local" && loadSyncConfig(true).purchaseRequired) throw new SyncError("config", "purchase required");
  const source = syncRuntime.connection();
  if (target.kind === "local") target = { kind: "local", root: Vault.open(target.root).root };
  disallowOverlap(root, source ? connectionLocation(source) : null, target);
  storageMigration.phase.set("preparing");
  storageMigration.target.set(target);
  storageMigration.keepOriginal.set(true);
  storageMigration.error.set(null);
  storageMigration.warning.set(null);
  try {
    let entries = root ? await localEndpoint(Vault.open(root)).list() : [];
    if (source) {
      const remote = await (await endpointFor(connectionLocation(source))).list();
      // Confirmation counts include the offline copy and remote-only entries.
      const paths = new Set(entries.map(e => e.path));
      entries = [...entries, ...remote.filter(e => !paths.has(e.path))];
    }
    await (await endpointFor(target)).list();
    if (!isCurrent()) return;
    preparedSource = sourceIdentity(root);
    storageMigration.target.set(target);
    storageMigration.summary.set(summarize(entries));
    storageMigration.phase.set("confirm");
  } catch (err) {
    if (isCurrent()) { storageMigration.error.set(String(err)); storageMigration.phase.set("failed"); }
    throw err;
  }
}

const tick = (p: MigrationProgress) => {
  storageMigration.progress.set(p);
  storageMigration.phase.set(p.stage);
};

/** Source remains bound until every destination byte and the offline cache is verified. */
export async function migrateStorage(root: string | null, before: () => Promise<void>,
  activated: (root: string) => Promise<void>): Promise<void> {
  const target = storageMigration.target();
  if (!target || storageBusy()) return;
  storageBusy.set(true);
  storageMigration.error.set(null);
  storageMigration.warning.set(null);
  storageMigration.phase.set("copying");
  let committed = false;
  const caches: Vault[] = [];
  const cache = () => { const vault = Vault.createCache(); caches.push(vault); return vault; };
  let activeCache: string | null = null;
  try {
    await syncRuntime.pause();
    await before();
    if (preparedSource !== sourceIdentity(root)) throw new Error("storage.error.sourceChanged");
    if (activeStorage()?.cleanup) throw new Error("storage.error.pendingCleanup");
    disallowOverlap(root, syncRuntime.connection() ? connectionLocation(syncRuntime.connection()!) : null, target);
    if (target.kind !== "local" && loadSyncConfig(true).purchaseRequired) throw new SyncError("config", "purchase required");
    const conn = syncRuntime.connection();
    const originalRoot = root ?? cache().root;
    const original = localEndpoint(Vault.open(originalRoot));
    const sourceLocation: Location = conn ? connectionLocation(conn) : { kind: "local", root: originalRoot };
    const cloudSource = conn ? await endpointFor(sourceLocation) : null;
    const destination = await endpointFor(target);
    const nextVault = target.kind === "local" ? Vault.open(target.root) : cache();
    const next: SyncConnection | null = target.kind === "local" ? null : {
      provider: target.kind, account: target.account, remoteId: target.remote.id,
      remotePath: target.remote.path, remoteName: target.remote.name,
      localRoot: nextVault.root, connectedAt: Date.now(),
    };
    let cleanup: Cleanup | null = null;
    await transferLibrary({ original, cloud: cloudSource,
      staging: conn ? localEndpoint(cache()) : undefined,
      destination, offlineCache: target.kind === "local" ? undefined : localEndpoint(nextVault), progress: tick,
      commit: async receipts => {
        cleanup = storageMigration.keepOriginal() ? null : { source: sourceLocation, target, receipts };
        await syncRuntime.activate(nextVault.root, next, cleanup);
        committed = true;
        activeCache = nextVault.root;
      },
    });
    await activated(nextVault.root);
    if (cleanup) await retryCleanup();
    storageMigration.phase.set("succeeded");
  } catch (err) {
    if (committed) {
      storageMigration.warning.set(String(err));
      storageMigration.phase.set("succeeded");
    } else {
      storageMigration.error.set(err instanceof Error ? err.message : String(err));
      storageMigration.phase.set("failed");
    }
  } finally {
    for (const vault of caches) {
      if (vault.root !== activeCache) { try { vault.discardCache(); } catch { /* Retain a failed cache for recovery. */ } }
    }
    storageBusy.set(false);
  }
}

export async function retryCleanup(): Promise<void> {
  const active = activeStorage();
  if (!active?.cleanup) return;
  const cleanup = active.cleanup;
  const remaining = await cleanupVerified(await endpointFor(cleanup.source),
    await endpointFor(cleanup.target), cleanup.receipts, tick);
  await writeActiveStorage({ ...active, cleanup: remaining.length ? { ...cleanup, receipts: remaining } : null });
  storageMigration.warning.set(remaining.length ? "storage.cleanupWarning" : null);
}

export async function keepRemainingOriginals(): Promise<void> {
  const active = activeStorage();
  if (active) await writeActiveStorage({ ...active, cleanup: null });
  storageMigration.warning.set(null);
}
