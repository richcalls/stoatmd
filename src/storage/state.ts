import { Storage, signal } from "nsh";
import type { SyncConnection } from "../sync/runtime";
import type { ProviderId } from "../sync/types";
import type { RemoteDir } from "../sync/provider";
import type { Receipt } from "./migration";
import { writePortableConnection } from "./portable";

export type Location = { kind: "local"; root: string } |
  { kind: ProviderId; remote: RemoteDir; account: string | null };
export type Cleanup = { source: Location; target: Location; receipts: Receipt[] };
export type ActiveStorage = { version: 1; root: string; connection: SyncConnection | null; cleanup: Cleanup | null };
export const ACTIVE_KEY = "storage.active";
export const storageBusy = signal(false);
export const activeStorage = signal<ActiveStorage | null>(null);

export async function readActiveStorage(): Promise<ActiveStorage | null> {
  const raw = await Storage.getItem(ACTIVE_KEY);
  if (!raw) return null;
  // A corrupt authoritative record must surface as an error, never reopen an old source.
  const value = JSON.parse(raw) as ActiveStorage;
  if (value.version !== 1 || typeof value.root !== "string" || !value.root ||
    (value.connection && value.connection.localRoot !== value.root)) throw new Error("Invalid storage record");
  activeStorage.set(value);
  return value;
}

export async function writeActiveStorage(value: ActiveStorage): Promise<void> {
  await Storage.setItem(ACTIVE_KEY, JSON.stringify(value));
  activeStorage.set(value);
  // iOS：把绑定同步给同一 Apple ID 的其他设备，新设备直接进库。
  writePortableConnection(value.connection);
}
