/**
 * Migrations idempotentes des bases existantes (le schéma crée les tables
 * manquantes ; ici on complète les données). Version courante : 2.
 */
import type { Store } from "./db.js";
import { guessEnvelopeKind } from "./envelopes.js";

export const SCHEMA_VERSION = 2;

export const DEFAULT_SETTINGS_V2: [string, string][] = [
  ["envelope_underuse_threshold", "0.5"],      // alerte si un livret mieux rémunéré est rempli à moins de 50 %
  ["checking_buffer_months", "1"],             // mois de dépenses à garder sur les comptes courants
  ["recurring_exclude_categories", "Courses|Restaurants & sorties|Transport & carburant"],
];

export function migrate(store: Store): void {
  const v = Number(store.scalar<string | null>("SELECT value FROM settings WHERE key='schema_version'") ?? 1);
  if (v >= SCHEMA_VERSION) return;
  store.transaction(() => {
    if (v < 2) {
      for (const [k, val] of DEFAULT_SETTINGS_V2) store.run("INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)", [k, val]);
      const accounts = store.all<{ id: number; name: string; type: string }>("SELECT id, name, type FROM accounts");
      for (const a of accounts) {
        const kind = guessEnvelopeKind(a.name, a.type);
        if (kind) store.run("INSERT OR IGNORE INTO envelopes(account_id, kind) VALUES(?,?)", [a.id, kind]);
      }
    }
    store.run("INSERT INTO settings(key,value) VALUES('schema_version',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [String(SCHEMA_VERSION)]);
  });
}
