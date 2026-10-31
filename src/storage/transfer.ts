import { copyVerified, inventorySignature, verifySnapshot, type Endpoint, type Receipt, type MigrationProgress } from "./migration";
import { sha256Bytes } from "../sync/hash";

/** Prepare the complete library, including offline edits, before the sole durable commit. */
export async function transferLibrary(options: {
  original: Endpoint;
  cloud?: Endpoint | null;
  staging?: Endpoint;
  destination: Endpoint;
  offlineCache?: Endpoint;
  progress?: (p: MigrationProgress) => void;
  commit: (sourceReceipts: Receipt[]) => Promise<void>;
}): Promise<void> {
  const { original, cloud, staging, destination, offlineCache, progress, commit } = options;
  const localInventory = inventorySignature(await original.list());
  let source = original;
  let localReceipts: Receipt[] | null = null;
  let cloudReceipts: Receipt[] | null = null;
  let remoteInventory = "";
  if (cloud) {
    if (!staging) throw new Error("A cloud source requires a staging library");
    source = staging;
    localReceipts = await copyVerified(original, staging, progress);
    remoteInventory = inventorySignature(await cloud.list());
    cloudReceipts = await copyVerified(cloud, staging, progress);
  }
  const receipts = await copyVerified(source, destination, progress);
  if (offlineCache) await copyVerified(destination, offlineCache, progress);
  await verifySnapshot(original, localInventory, localReceipts ?? receipts);
  if (cloud && cloudReceipts) await verifySnapshot(cloud, remoteInventory, cloudReceipts);
  for (const receipt of receipts) {
    if (sha256Bytes(await destination.read(receipt.target)) !== receipt.hash) {
      throw new Error("storage.error.destinationChanged");
    }
  }
  const originals = cloudReceipts ? cloudReceipts.map(r => ({ ...r,
    target: receipts.find(next => next.source.path === r.target)!.target })) : receipts;
  await commit(originals);
}
