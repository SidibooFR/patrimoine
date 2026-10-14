/**
 * Catégorisation automatique des opérations.
 *
 * 1. Règle par mot-clé : le mot-clé le plus long trouvé dans le libellé (ou le
 *    libellé brut) l'emporte — une règle précise bat une règle générale.
 * 2. Sinon : correspondance de la catégorie proposée par la banque.
 * 3. Sinon : non catégorisé (null).
 */
import type { Store } from "./db.js";

export function normalize(s: string): string {
  // minuscules, sans accents ; espaces insécables et multiples ramenés à un espace simple
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s\u00a0\u202f]+/g, " ");
}

export interface Categorizer {
  (tx: { label: string; raw_label?: string; bank_category?: string }): number | null;
}

export function buildCategorizer(store: Store): Categorizer {
  const rules = store
    .all<{ id: number; keyword: string; category_id: number }>("SELECT id, keyword, category_id FROM rules")
    .map((r) => ({ ...r, kw: normalize(r.keyword) }))
    .filter((r) => r.kw.trim().length > 0)
    .sort((a, b) => b.kw.length - a.kw.length || a.id - b.id);
  const bankMap = new Map<string, number>();
  for (const m of store.all<{ bank_label: string; category_id: number }>("SELECT bank_label, category_id FROM bank_category_map")) {
    bankMap.set(normalize(m.bank_label).trim(), m.category_id);
  }
  return (tx) => {
    const hay = normalize(tx.label) + " | " + normalize(tx.raw_label ?? "");
    for (const r of rules) {
      if (hay.includes(r.kw)) return r.category_id;
    }
    const bc = normalize(tx.bank_category ?? "").trim();
    if (bc && bankMap.has(bc)) return bankMap.get(bc)!;
    return null;
  };
}

/** Recalcule la catégorie de toutes les opérations non fixées à la main. */
export function recategorizeAll(store: Store): { updated: number; uncategorized: number } {
  const cat = buildCategorizer(store);
  const rows = store.all<{ id: number; label: string; raw_label: string; bank_category: string; category_id: number | null }>(
    "SELECT id, label, raw_label, bank_category, category_id FROM transactions WHERE category_manual = 0",
  );
  let updated = 0;
  store.transaction(() => {
    for (const r of rows) {
      const c = cat(r);
      if (c !== r.category_id) {
        store.run("UPDATE transactions SET category_id=? WHERE id=?", [c, r.id]);
        updated++;
      }
    }
  });
  const uncategorized = store.scalar<number>("SELECT COUNT(*) FROM transactions WHERE category_id IS NULL");
  return { updated, uncategorized };
}
