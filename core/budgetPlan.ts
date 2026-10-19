// Assistant de budgétisation : propose des budgets mensuels par scénario à partir des moyennes réelles.
import type { Store } from "./db.js";
import { round2, today } from "./finance.js";
import { budgetAmount, fixedCategories } from "./reports.js";
export { DEFAULT_FIXED, fixedCategories } from "./reports.js";
import { refundAllocations } from "./refunds.js";

export type ScenarioKey = "moyenne" | "equilibre" | "econome" | "loisirs" | "investissement";
export interface AvgRow { category_id: number; name: string; kind: string; average: number }
export interface Scenario {
  key: ScenarioKey; label: string; hint: string;
  /** Facteur appliqué aux dépenses variables. */
  k: number;
  income: number;
  expense: number;
  /** Reste : revenus − dépenses. */
  savings: number;
  rate: number | null;
  /** Somme des montants proposés pour bourse + crypto. */
  invest: number;
  /** Montants mensuels arrondis à 10 €, uniquement > 0. */
  amounts: { category_id: number; amount: number }[];
}

const SCENARIOS: { key: ScenarioKey; label: string; hint: string }[] = [
  { key: "moyenne", label: "Ma moyenne", hint: "12 derniers mois" },
  { key: "equilibre", label: "Équilibré", hint: "Vise 20 % d'épargne" },
  { key: "econome", label: "Économe", hint: "+10 pts d'épargne, max 30 %" },
  { key: "loisirs", label: "Loisirs", hint: "+15 % de dépenses variables" },
  { key: "investissement", label: "Investissement", hint: "Surplus vers bourse & crypto" },
];

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const round10 = (x: number) => Math.round(x / 10) * 10;
const isInvest = (name: string) => /bourse|crypto/i.test(name);

/** Calcule les 5 scénarios : revenus et charges cochées à leur moyenne, variables × k, écart reporté sur l'épargne. */
export function buildScenarios(rows: AvgRow[], fixed: string[]): Scenario[] {
  const fixedSet = new Set(fixed);
  const sum = (rs: AvgRow[]) => rs.reduce((a, r) => a + r.average, 0);
  const isFixed = (r: AvgRow) => r.kind === "Dépense" && fixedSet.has(r.name);
  const R = sum(rows.filter((r) => r.kind === "Revenu"));
  const C = sum(rows.filter(isFixed));
  const V = sum(rows.filter((r) => r.kind === "Dépense" && !isFixed(r)));
  const savingsRows = rows.filter((r) => r.kind === "Épargne");
  const ok = R > 0 && V > 0;
  const t0 = R > 0 ? (R - C - V) / R : 0;
  const kFor = (T: number) => (R - C - T * R) / V;

  const kOf = (key: ScenarioKey): number => {
    if (!ok) return 1;
    switch (key) {
      case "moyenne": return 1;
      case "equilibre": return clamp(kFor(Math.max(t0, 0.20)), 0.85, 1);
      case "econome": case "investissement": return clamp(kFor(Math.max(t0, Math.min(t0 + 0.10, 0.30))), 0.75, 1);
      case "loisirs": return clamp(kFor(Math.max(Math.min(t0, 0.10), 0)), 1, 1.15);
    }
  };

  return SCENARIOS.map(({ key, label, hint }) => {
    const k = kOf(key);
    const value = new Map<number, number>();
    for (const r of rows) value.set(r.category_id, r.kind === "Dépense" && !isFixed(r) ? r.average * k : r.average);
    // Report de l'écart sur l'épargne, au prorata des moyennes (parts égales si toutes nulles)
    const delta = (1 - k) * V;
    const targets = key === "investissement" ? savingsRows.filter((r) => isInvest(r.name)) : savingsRows;
    if (delta !== 0 && targets.length) {
      const base = targets.map((r) => Math.max(0, r.average));
      const total = base.reduce((a, b) => a + b, 0);
      if (total > 0 || delta > 0) targets.forEach((r, i) => {
        const share = total > 0 ? base[i] / total : 1 / targets.length;
        value.set(r.category_id, Math.max(0, r.average + delta * share));
      });
    }
    // Sans revenus, un budget n'a pas de sens : aucune proposition
    const amounts = R <= 0 ? [] : rows.map((r) => ({ category_id: r.category_id, amount: round10(value.get(r.category_id) ?? 0) })).filter((a) => a.amount > 0);
    const expense = C + k * V;
    const investIds = new Set(savingsRows.filter((r) => isInvest(r.name)).map((r) => r.category_id));
    return {
      key, label, hint, k,
      income: round2(R), expense: round2(expense), savings: round2(R - expense),
      rate: R > 0 ? (R - expense) / R : null,
      invest: amounts.filter((a) => investIds.has(a.category_id)).reduce((s, a) => s + a.amount, 0),
      amounts,
    };
  });
}

// ---------------------------------------------------------------- base glissante et application
export interface BudgetScenarios {
  period: { from: string; to: string };
  fixedCandidates: { name: string; checked: boolean }[];
  /** fillable = nombre de montants proposés sans budget existant pour l'année. */
  scenarios: (Scenario & { fillable: number })[];
}

/** "2026-10" + n mois → "AAAA-MM". */
function addMonths(ym: string, n: number): string {
  const d = new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}
const monthsBetween = (a: string, b: string) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7)) + 1;

/** Moyenne mensuelle par catégorie sur les 12 mois complets avant `asOf` (ou depuis le premier mois de données s'il est plus récent), remboursements rapprochés déduits (même logique que budgetReport). */
export function categoryAverages(store: Store, asOf: string): { period: { from: string; to: string }; rows: AvgRow[] } {
  const cur = asOf.slice(0, 7);
  const from = addMonths(cur, -12), to = addMonths(cur, -1);
  const inWindow = (date: string) => date.slice(0, 7) >= from && date.slice(0, 7) <= to;
  const cats = store.all<{ id: number; name: string; kind: string }>("SELECT id, name, kind FROM categories WHERE kind <> 'Transfert' ORDER BY sort, id");
  const kindOf = new Map(cats.map((c) => [c.id, c.kind]));
  const total = new Map<number, number>();
  const bump = (cat: number, v: number) => total.set(cat, (total.get(cat) ?? 0) + v);
  for (const s of store.all<{ category_id: number; total: number }>(
    "SELECT category_id, SUM(amount) AS total FROM transactions WHERE category_id IS NOT NULL AND date >= ? AND date < ? GROUP BY category_id",
    [from + "-01", cur + "-01"])) bump(s.category_id, budgetAmount(kindOf.get(s.category_id) ?? null, s.total));
  const allocs = refundAllocations(store);
  if (allocs.length) {
    const ph = allocs.map(() => "?").join(",");
    const src = new Map(store.all<{ id: number; date: string; category_id: number | null }>(`SELECT id, date, category_id FROM transactions WHERE id IN (${ph})`, allocs.map((a) => a.refund_id)).map((r) => [r.id, r]));
    for (const a of allocs) {
      const r = src.get(a.refund_id);
      if (r?.category_id && inWindow(r.date)) bump(r.category_id, -budgetAmount(kindOf.get(r.category_id) ?? null, a.amount));
      if (inWindow(a.date)) bump(a.category_id, budgetAmount(kindOf.get(a.category_id) ?? null, a.amount));
    }
  }
  // Dénominateur commun : depuis le premier mois de données (une dépense ponctuelle ou annuelle est lissée, pas gonflée)
  const f = store.scalar<string | null>("SELECT substr(MIN(date),1,7) FROM transactions WHERE category_id IS NOT NULL");
  const n = f && f <= to ? monthsBetween(f > from ? f : from, to) : 12;
  const rows: AvgRow[] = [];
  for (const c of cats) {
    // Les catégories d'épargne sans historique restent des cibles possibles (moyenne 0) pour y reporter un surplus
    if (total.has(c.id)) rows.push({ category_id: c.id, name: c.name, kind: c.kind, average: total.get(c.id)! / n });
    else if (c.kind === "Épargne") rows.push({ category_id: c.id, name: c.name, kind: c.kind, average: 0 });
  }
  return { period: { from, to }, rows };
}

export function budgetScenarios(store: Store, year: number, fixed?: string[], asOf = today()): BudgetScenarios {
  const names = fixed ?? fixedCategories(store);
  const { period, rows } = categoryAverages(store, asOf);
  const taken = new Set(store.all<{ category_id: number }>("SELECT category_id FROM budgets WHERE year=?", [year]).map((b) => b.category_id));
  return {
    period,
    fixedCandidates: store.all<{ name: string }>("SELECT name FROM categories WHERE kind='Dépense' ORDER BY sort, id").map((c) => ({ name: c.name, checked: names.includes(c.name) })),
    scenarios: buildScenarios(rows, names).map((s) => ({ ...s, fillable: s.amounts.filter((a) => !taken.has(a.category_id)).length })),
  };
}

/** Écrit le scénario dans `budgets` pour l'année, uniquement sur les catégories sans budget. Ne touche jamais aux transactions. */
export function applyBudgetScenario(store: Store, year: number, key: ScenarioKey, fixed?: string[], asOf = today()): { filled: number; skipped: number } {
  const s = budgetScenarios(store, year, fixed, asOf).scenarios.find((x) => x.key === key);
  if (!s) throw new Error(`Scénario inconnu : ${key}`);
  return store.transaction(() => {
    let filled = 0, skipped = 0;
    for (const a of s.amounts) {
      if (store.scalar<number>("SELECT COUNT(*) FROM budgets WHERE category_id=? AND year=?", [a.category_id, year])) { skipped++; continue; }
      store.run("INSERT INTO budgets(category_id,year,monthly_amount) VALUES(?,?,?)", [a.category_id, year, a.amount]);
      filled++;
    }
    return { filled, skipped };
  });
}
