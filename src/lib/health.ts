/**
 * Step-1 persistence proof. A tiny key/value table that records how many times
 * the server has booted against this DB file. It survives restarts because the
 * row lives in SQLite on disk — the simplest possible demonstration that the
 * persistence layer is real. (Replaced by the real schema in Step 2; harmless
 * to leave alongside it.)
 */
import { getDb } from "./db";

export type HealthInfo = {
  boots: number;
  firstBootAt: string;
  lastBootAt: string;
};

let recordedThisProcess = false;

export function recordBoot(): HealthInfo {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS _health (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const now = new Date().toISOString();
  const get = db.prepare<[string], { value: string }>(
    "SELECT value FROM _health WHERE key = ?"
  );
  const set = db.prepare(
    "INSERT INTO _health (key, value) VALUES (?, ?) " +
      "ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  );

  if (!get.get("first_boot_at")) set.run("first_boot_at", now);

  // Count one boot per server process (not per request/render).
  if (!recordedThisProcess) {
    const prev = Number(get.get("boots")?.value ?? "0");
    set.run("boots", String(prev + 1));
    set.run("last_boot_at", now);
    recordedThisProcess = true;
  }

  return {
    boots: Number(get.get("boots")?.value ?? "0"),
    firstBootAt: get.get("first_boot_at")?.value ?? now,
    lastBootAt: get.get("last_boot_at")?.value ?? now,
  };
}
