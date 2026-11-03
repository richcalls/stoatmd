import { host, Storage, signal } from "nsh";
import { Vault } from "stoatmd/native";
import { syncRuntime } from "../sync/runtime";

export type ReaderWidth = "comfortable" | "full";
export const READER_CONFIG_PATH = ".stoatmd.json";
const READER_WIDTH_KEY = "prefs.readerWidth";
const READER_CONFIG_VERSION = 1;

export const readerWidth = signal<ReaderWidth>("comfortable");
let activeRoot: string | null = null;

function validWidth(value: unknown): value is ReaderWidth {
  return value === "comfortable" || value === "full";
}

function parseReaderConfig(bytes: Uint8Array): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

/** Restore the device preference first, then apply this library's synced value. */
export async function restoreReaderWidth(root?: string | null): Promise<void> {
  const saved = await Storage.getItem(READER_WIDTH_KEY);
  const fallback: ReaderWidth = validWidth(saved) ? saved : "comfortable";
  if (!root) {
    readerWidth.set(fallback);
    return;
  }
  activeRoot = root;
  try {
    const bytes = new Uint8Array(Vault.open(root).readBytes(READER_CONFIG_PATH));
    const config = parseReaderConfig(bytes);
    const reader = config?.version === READER_CONFIG_VERSION && config.reader &&
      typeof config.reader === "object" ? config.reader as Record<string, unknown> : null;
    readerWidth.set(reader && validWidth(reader.width) ? reader.width : fallback);
  } catch {
    readerWidth.set(fallback);
  }
}

/** Update the setting and, when a library is active, write its portable config. */
export async function applyReaderWidth(value: ReaderWidth, root?: string | null): Promise<void> {
  if (!validWidth(value)) return;
  readerWidth.set(value);
  const encoded = String(value);
  if (host.params.settingsWindow === true) {
    await host.call("settings", { kind: "preference", key: READER_WIDTH_KEY, value: encoded });
    return;
  }
  await Storage.setItem(READER_WIDTH_KEY, encoded);
  const libraryRoot = root ?? activeRoot;
  if (libraryRoot) await writeSyncedReaderWidth(libraryRoot, value);
}

/** Main-window handler for settings-window preference changes. */
export async function persistReaderWidth(root: string | null, value: string): Promise<void> {
  const width: ReaderWidth = validWidth(value) ? value : "comfortable";
  readerWidth.set(width);
  if (root) await writeSyncedReaderWidth(root, width);
}

async function writeSyncedReaderWidth(root: string, width: ReaderWidth): Promise<void> {
  const vault = Vault.open(root);
  let config: Record<string, unknown> = {};
  try {
    config = parseReaderConfig(new Uint8Array(vault.readBytes(READER_CONFIG_PATH))) ?? {};
  } catch {
    // First write creates the portable config at the library root.
  }
  const current = config.reader && typeof config.reader === "object"
    ? config.reader as Record<string, unknown>
    : {};
  const next = new TextEncoder().encode(JSON.stringify({
    ...config,
    version: READER_CONFIG_VERSION,
    reader: { ...current, width },
  }, null, 2) + "\n");
  try {
    vault.writeBytes(READER_CONFIG_PATH, next);
  } catch {
    vault.createBytes(READER_CONFIG_PATH, next);
  }
  await syncRuntime.pushPaths([READER_CONFIG_PATH], true);
}
