import type { PGlite } from "@electric-sql/pglite";

// Vite glob: loads all migration SQL files as raw strings at build time.
const migrationModules = import.meta.glob("/src/db/migrations/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export interface MigrationResult {
  applied: string[];
  alreadyApplied: string[];
}

export async function applyMigrations(pg: PGlite): Promise<MigrationResult> {
  await pg.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  const rows = await pg.query<{ name: string }>("SELECT name FROM _migrations");
  const applied = new Set(rows.rows.map((r) => r.name));

  const files = Object.entries(migrationModules)
    .map(([path, sql]) => ({
      name: path.split("/").pop()!.replace(/\.sql$/, ""),
      sql,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const result: MigrationResult = { applied: [], alreadyApplied: [] };

  for (const file of files) {
    if (applied.has(file.name)) {
      result.alreadyApplied.push(file.name);
      continue;
    }
    await pg.exec("BEGIN");
    try {
      await pg.exec(file.sql);
      await pg.query("INSERT INTO _migrations (name) VALUES ($1)", [file.name]);
      await pg.exec("COMMIT");
      result.applied.push(file.name);
    } catch (err) {
      await pg.exec("ROLLBACK");
      throw new Error(`Migration ${file.name} failed: ${(err as Error).message}`);
    }
  }

  return result;
}

/**
 * Test-only: eagerly-imported migrations can't see files added after build, so
 * tests read them directly. Kept separate to avoid shipping fs code to browser.
 */
export function getMigrationFilesForTests(): { name: string; sql: string }[] {
  return Object.entries(migrationModules)
    .map(([path, sql]) => ({
      name: path.split("/").pop()!.replace(/\.sql$/, ""),
      sql,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
