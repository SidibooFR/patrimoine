/**
 * Rapprochement des remboursements.
 *
 * Un remboursement (opération positive de la catégorie « Remboursements ») peut
 * être lié :
 *  - à une dépense précise → il est déduit de la catégorie de cette dépense,
 *    le mois de la dépense (ex. un ami rembourse sa part du restaurant) ;
 *  - à une catégorie → il est déduit de cette catégorie le mois du
 *    remboursement (ex. la colocataire rembourse chaque mois sa part du loyer) ;
 *  - automatiquement par une règle « payeur → catégorie ».
 * Les remboursements non liés restent comptés comme un revenu.
 */
import type { Store } from "./db.js";
import { normalize } from "./categorize.js";
import { merchantKey } from "./recurring.js";
import { round2 } from "./finance.js";

export interface RefundAllocation { refund_id: number; category_id: number; date: string; amount: number; via: "expense" | "category" | "rule" }

export function refundCategoryId(store: Store): number | null {
  return store.scalar<number | null>("SELECT id FROM categories WHERE name='Remboursements'") ?? null;
}

/** Clé « payeur » d'un remboursement (libellé sans les formules bancaires). */
export function payerKey(label: string): string {
  const n = normalize(label).replace(/paiement envoye par|virement (instantane )?recu( de)?|vir (inst|sepa)|virement de|\bmotif\b.*$|\bref\b.*$/g, " ");
  return merchantKey(n.replace(/\b(mlle|mme|madame|monsieur|mr|m|ou)\b/g, " "));
}

/** Toutes les imputations de remboursements (liens explicites puis règles). */
export function refundAllocations(store: Store): RefundAllocation[] {
  const out: RefundAllocation[] = [];
  const linked = store.all<{ refund_id: number; date: string; amount: number; expense_id: number | null; category_id: number | null; e_cat: number | null; e_date: string | null }>(
    `SELECT l.refund_id, r.date, r.amount, l.expense_id, l.category_id, e.category_id AS e_cat, e.date AS e_date
     FROM refund_links l JOIN transactions r ON r.id=l.refund_id LEFT JOIN transactions e ON e.id=l.expense_id`);
  const done = new Set<number>();
  for (const l of linked) {
    done.add(l.refund_id);
    if (l.expense_id && l.e_cat) out.push({ refund_id: l.refund_id, category_id: l.e_cat, date: l.e_date!, amount: l.amount, via: "expense" });
    else if (l.category_id) out.push({ refund_id: l.refund_id, category_id: l.category_id, date: l.date, amount: l.amount, via: "category" });
  }
  const rules = store.all<{ keyword: string; category_id: number }>("SELECT keyword, category_id FROM refund_rules")
    .map((r) => ({ ...r, kw: normalize(r.keyword).trim() })).filter((r) => r.kw).sort((a, b) => b.kw.length - a.kw.length);
  const cat = refundCategoryId(store);
  if (rules.length && cat) {
    for (const r of store.all<{ id: number; date: string; amount: number; label: string; raw_label: string }>(
      "SELECT id, date, amount, label, raw_label FROM transactions WHERE category_id=? AND amount>0", [cat])) {
      if (done.has(r.id)) continue;
      const hay = normalize(r.label) + " | " + normalize(r.raw_label);
      const rule = rules.find((x) => hay.includes(x.kw));
      if (rule) out.push({ refund_id: r.id, category_id: rule.category_id, date: r.date, amount: r.amount, via: "rule" });
    }
  }
  return out;
}

export interface RefundSuggestion { type: "expense" | "category"; expense_id?: number; category_id: number; category: string; date?: string; label?: string; amount?: number; share?: string; score: number; reason: string }
export interface RefundRow {
  id: number; date: string; amount: number; label: string; account: string; payer: string;
  link: null | { via: "expense" | "category" | "rule"; expense_id?: number; expense_label?: string; expense_date?: string; expense_amount?: number; category_id: number; category: string };
  suggestions: RefundSuggestion[];
  hint: string | null;
}
export interface RefundsReport {
  rows: RefundRow[];
  rules: { id: number; keyword: string; category_id: number; category: string; matches: number }[];
  totals: { count: number; amount: number; linked: number; linkedAmount: number; unlinked: number; unlinkedAmount: number };
  categoryId: number | null;
}

const dayDiff = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86_400_000;
const SHARES: [number, string][] = [[1, "la totalité"], [2, "la moitié"], [3, "un tiers"], [4, "un quart"], [5, "un cinquième"], [6, "un sixième"]];

export function refundsReport(store: Store, opts: { year?: number } = {}): RefundsReport {
  const cat = refundCategoryId(store);
  const catNames = new Map(store.all<{ id: number; name: string }>("SELECT id, name FROM categories").map((c) => [c.id, c.name]));
  const where = opts.year ? `AND substr(t.date,1,4)='${opts.year}'` : "";
  const refunds = store.all<{ id: number; date: string; amount: number; label: string; account: string }>(
    `SELECT t.id, t.date, t.amount, t.label, a.name AS account FROM transactions t JOIN accounts a ON a.id=t.account_id
     WHERE t.amount>0 AND (t.category_id=? OR t.id IN (SELECT refund_id FROM refund_links)) ${where} ORDER BY t.date DESC, t.id DESC`, [cat ?? -1]);
  const allocs = new Map(refundAllocations(store).map((a) => [a.refund_id, a]));
  const links = new Map(store.all<{ refund_id: number; expense_id: number | null; category_id: number | null }>("SELECT * FROM refund_links").map((l) => [l.refund_id, l]));
  const expenses = store.all<{ id: number; date: string; amount: number; label: string; category_id: number; category: string }>(
    `SELECT t.id, t.date, t.amount, t.label, t.category_id, c.name AS category FROM transactions t JOIN categories c ON c.id=t.category_id
     WHERE c.kind='Dépense' AND t.amount<0`);
  const expById = new Map(expenses.map((e) => [e.id, e]));
  const refundedOf = new Map<number, number>();
  for (const r of store.all<{ expense_id: number; amount: number }>("SELECT l.expense_id, t.amount FROM refund_links l JOIN transactions t ON t.id=l.refund_id WHERE l.expense_id IS NOT NULL"))
    refundedOf.set(r.expense_id, (refundedOf.get(r.expense_id) ?? 0) + r.amount);
  // Historique par payeur : marchands et catégories déjà associés
  const history = new Map<string, { merchants: Map<string, number>; cats: Map<number, number> }>();
  for (const r of refunds) {
    const a = allocs.get(r.id);
    if (!a) continue;
    const p = payerKey(r.label);
    const h = history.get(p) ?? { merchants: new Map(), cats: new Map() };
    h.cats.set(a.category_id, (h.cats.get(a.category_id) ?? 0) + 1);
    const l = links.get(r.id);
    if (l?.expense_id) { const e = expById.get(l.expense_id); if (e) { const m = merchantKey(e.label); h.merchants.set(m, (h.merchants.get(m) ?? 0) + 1); } }
    history.set(p, h);
  }

  const hints = new Map<number, string>();
  const rows: RefundRow[] = refunds.map((r) => {
    const payer = payerKey(r.label);
    const a = allocs.get(r.id);
    const l = links.get(r.id);
    let link: RefundRow["link"] = null;
    if (a) {
      const e = l?.expense_id ? expById.get(l.expense_id) : undefined;
      link = { via: a.via, category_id: a.category_id, category: catNames.get(a.category_id) ?? "?", ...(e ? { expense_id: e.id, expense_label: e.label, expense_date: e.date, expense_amount: e.amount } : {}) };
    }
    const suggestions: RefundSuggestion[] = [];
    if (!a) {
      const h = history.get(payer);
      // Payeur « régulier » : même montant (±5 %) au moins 3 mois différents → plutôt une contribution à imputer à une catégorie
      const same = refunds.filter((x) => payerKey(x.label) === payer && Math.abs(x.amount - r.amount) / r.amount <= 0.05);
      const regular = new Set(same.map((x) => x.date.slice(0, 7))).size >= 3;
      for (const e of expenses) {
        const d = dayDiff(e.date, r.date);
        if (d < -3 || d > 45) continue;
        const left = -e.amount - (refundedOf.get(e.id) ?? 0);
        if (left < r.amount - 0.01) continue;
        const share = SHARES.find(([k]) => Math.abs(r.amount - -e.amount / k) <= (k === 1 ? 0.01 : 0.05));
        const known = h?.merchants.get(merchantKey(e.label)) ?? 0;
        if (!share && !known) continue;
        let score = share ? (share[0] === 1 ? 0.6 : share[0] === 2 ? 0.5 : 0.35) : 0.25;
        score += 0.3 * (1 - Math.min(45, Math.abs(d)) / 45);
        if (known) score += 0.3;
        if (regular && !known) score -= 0.3;
        if (score < 0.6) continue;
        suggestions.push({
          type: "expense", expense_id: e.id, category_id: e.category_id, category: e.category, date: e.date, label: e.label, amount: e.amount, share: share?.[1],
          score: round2(Math.min(1, score)),
          reason: [share ? `${share[1]} de ${(-e.amount).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €` : null, `${Math.abs(Math.round(d))} j ${d >= 0 ? "après la dépense" : "avant la dépense"}`, known ? "déjà associé à ce payeur" : null].filter(Boolean).join(" · "),
        });
      }
      if (regular) hints.set(r.id, `${same.length} versements de ce montant sur ${new Set(same.map((x) => x.date.slice(0, 7))).size} mois : contribution régulière, impute-la plutôt à une catégorie (ex. loyer, abonnement partagé)`);
      suggestions.sort((x, y) => y.score - x.score);
      suggestions.splice(3);
      if (h) {
        const [best] = [...h.cats.entries()].sort((x, y) => y[1] - x[1]);
        if (best && best[1] >= 2) suggestions.push({ type: "category", category_id: best[0], category: catNames.get(best[0]) ?? "?", score: 0.5, reason: `${best[1]} remboursements précédents de ce payeur imputés à cette catégorie` });
      }
    }
    return { id: r.id, date: r.date, amount: r.amount, label: r.label, account: r.account, payer, link, suggestions, hint: hints.get(r.id) ?? null };
  });
  const rules = store.all<{ id: number; keyword: string; category_id: number }>("SELECT * FROM refund_rules ORDER BY lower(keyword)").map((x) => ({
    ...x, category: catNames.get(x.category_id) ?? "?", matches: rows.filter((r) => r.link?.via === "rule" && normalize(r.label).includes(normalize(x.keyword).trim())).length,
  }));
  const linked = rows.filter((r) => r.link);
  return {
    rows, rules, categoryId: cat,
    totals: {
      count: rows.length, amount: round2(rows.reduce((s, r) => s + r.amount, 0)),
      linked: linked.length, linkedAmount: round2(linked.reduce((s, r) => s + r.amount, 0)),
      unlinked: rows.length - linked.length, unlinkedAmount: round2(rows.filter((r) => !r.link).reduce((s, r) => s + r.amount, 0)),
    },
  };
}

export function linkRefund(store: Store, refundId: number, target: { expense_id?: number | null; category_id?: number | null }, remember = false): boolean {
  const r = store.get<{ id: number; amount: number; label: string }>("SELECT id, amount, label FROM transactions WHERE id=?", [refundId]);
  if (!r) throw new Error(`Opération ${refundId} introuvable`);
  if (r.amount <= 0) throw new Error("Seule une opération positive (entrée d'argent) peut être un remboursement");
  if (target.expense_id) {
    const e = store.get<{ amount: number; category_id: number | null }>("SELECT amount, category_id FROM transactions WHERE id=?", [target.expense_id]);
    if (!e) throw new Error(`Dépense ${target.expense_id} introuvable`);
    if (e.amount >= 0) throw new Error("La dépense d'origine doit être une sortie d'argent");
    if (!e.category_id) throw new Error("Catégorise d'abord la dépense d'origine");
    store.run("INSERT INTO refund_links(refund_id, expense_id, category_id) VALUES(?,?,NULL) ON CONFLICT(refund_id) DO UPDATE SET expense_id=excluded.expense_id, category_id=NULL", [refundId, target.expense_id]);
  } else if (target.category_id) {
    if (remember) {
      const kw = payerKey(r.label);
      if (kw) store.run("INSERT INTO refund_rules(keyword, category_id) VALUES(?,?) ON CONFLICT(keyword) DO UPDATE SET category_id=excluded.category_id", [kw, target.category_id]);
      store.run("DELETE FROM refund_links WHERE refund_id=?", [refundId]);
    } else {
      store.run("INSERT INTO refund_links(refund_id, expense_id, category_id) VALUES(?,NULL,?) ON CONFLICT(refund_id) DO UPDATE SET expense_id=NULL, category_id=excluded.category_id", [refundId, target.category_id]);
    }
  } else throw new Error("Indique la dépense d'origine (expense_id) ou la catégorie (category_id)");
  return true;
}
