import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

const DDL = `
  CREATE TABLE IF NOT EXISTS habits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    color text NOT NULL DEFAULT '#22c55e',
    created_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS completions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    date date NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE UNIQUE INDEX IF NOT EXISTS uniq_habit_date
    ON completions (habit_id, date);
`;

export type DB = ReturnType<typeof drizzle>;

export async function createDb(dataDir?: string): Promise<DB> {
  const pg = new PGlite(dataDir);
  await pg.exec(DDL);
  return drizzle(pg);
}

let dbInstance: Promise<DB> | null = null;

/**
 * Browser singleton backed by IndexedDB. Tests should call createDb() directly
 * (no arg = in-memory) instead of getDb().
 */
export function getDb(): Promise<DB> {
  if (!dbInstance) {
    dbInstance = createDb("idb://traker-db");
  }
  return dbInstance;
}
