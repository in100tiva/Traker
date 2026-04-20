import type { PGlite } from "@electric-sql/pglite";
import type { LiveNamespace } from "@electric-sql/pglite/live";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { applyMigrations } from "./migrator";

export type PGliteWithLive = PGlite & { live: LiveNamespace };
export type DB = PgliteDatabase;

export interface DbBundle {
  db: DB;
  pg: PGliteWithLive;
}

/**
 * Dynamically imports PGlite + drizzle so the ~13MB WASM bundle is deferred
 * until the DB is actually needed, keeping the initial paint fast.
 */
export async function createDb(dataDir?: string): Promise<DbBundle> {
  const [{ PGlite }, { live }, { drizzle }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("@electric-sql/pglite/live"),
    import("drizzle-orm/pglite"),
  ]);

  const pg = (await PGlite.create(dataDir, {
    extensions: { live },
  })) as PGliteWithLive;

  await applyMigrations(pg);
  const db = drizzle(pg);
  return { db, pg };
}

let dbPromise: Promise<DbBundle> | null = null;

/** Browser singleton backed by IndexedDB. */
export function getDb(): Promise<DbBundle> {
  if (!dbPromise) {
    dbPromise = createDb("idb://traker-db");
  }
  return dbPromise;
}

/** Resets the singleton. Used after import/restore so the UI picks up new data. */
export function resetDbSingleton(): void {
  dbPromise = null;
}
