import { keepRemainingOriginals, migrateStorage, prepareMigration, retryCleanup, storageMigration } from "../storage/runtime";
import { syncRuntime } from "../sync/runtime";
import { storageBusy } from "../storage/state";

/** The secondary engine replaces these operations with requests to the main engine. */
export const settingsStorage = {
  prepare: prepareMigration,
  migrate: migrateStorage,
  retryCleanup: async () => {
    if (storageBusy()) return;
    storageBusy.set(true);
    try { await syncRuntime.pause(); await retryCleanup(); }
    finally { storageMigration.phase.set("succeeded"); storageBusy.set(false); }
  },
  keepRemainingOriginals,
  cancel: async () => { if (!storageBusy()) storageMigration.phase.set("idle"); },
};
