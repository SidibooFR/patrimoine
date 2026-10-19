// Assistant de budgétisation : propose des budgets mensuels par scénario à partir des moyennes réelles,
// des charges fixes et des objectifs d'épargne ; budget automatique quand un scénario est suivi ;
// synthèse « à prévoir » pour préparer les comptes.
import type { Store } from "./db.js";
import { round2, today } from "./finance.js";
import { budgetAmount, budgetReport, fixedCategories, goals, recurring, setting, type BudgetReport } from "./reports.js";
import { refundAllocations } from "./refunds.js";
import { currentBalances } from "./balances.js";
export { DEFAULT_FIXED, fixedCategories } from "./reports.js";

export type ScenarioKey = "moyenne" | "equilibre" | "econome" | "loisirs" | "investissement";
export interface AvgRow { category_id: number; name: string; kind: string; average: number }
/** Objectif à financer : versement mensuel nécessaire (onglet Objectifs) et catégorie d'épargne qui le porte. */
export interface GoalTarget { goal_id: number; name: string; monthly: number; category_id: number; target_date: string | null }
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
  /** Versements mensuels exigés par les objectifs, et part que le reste du scénario ne couvre pas. */
  goalsMonthly: number;
  goalsShortfall: number;
  /** Montants mensuels arrondis à 10 €, uniquement > 0. */
  amounts: { category_id: number; amount: number }[];
}

export const SCENARIOS: { key: ScenarioKey; label: string; hint: string }[] = [
  { key: "moyenne", label: "Ma moyenne", hint: "12 derniers mois" },
  { key: "equilibre", label: "Équilibré", hint: "Vise 20 % d'épargne" },
  { key: "econome", label: "Économe", hint: "+10 pts d'épargne, max 30 %" },
  { key: "loisirs", label: "Loisirs", hint: "+15 % de dépenses variables" },
  { key: "investissement", label: "Investissement", hint: "Surplus vers bourse & crypto" },
];
export const scenarioLabel = (key: ScenarioKey | null) => SCENARIOS.find((s) => s.key === key)?.label ?? null;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const round10 = (x: number) => Math.round(x / 10) * 10;
const isInvest = (name: string) => /bourse|crypto/i.test(name);

/**
 * Calcule les 5 scénarios : revenus et charges cochées à leur moyenne, variables × k, écart reporté sur l'épargne.
 * Les objectifs imposent un plancher au taux d'épargne (dans les bornes du scénario) et sont servis en premier
 * dans la répartition de l'épargne : la catégorie qui porte un objectif est montée au moins à son versement mensuel.
 */
export function buildScenarios(rows: AvgRow[], fixed: string[], goals: GoalTarget[] = []): Scenario[] {
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
  const G = goals.reduce((s, g) => s + g.monthly, 0);
  const tGoal = R > 0 ? G / R : 0;
  const goalByCat = new Map<number, number>();
  for (const g of goals) goalByCat.set(g.category_id, (goalByCat.get(g.category_id) ?? 0) + g.monthly);

  const kOf = (key: ScenarioKey): number => {
    if (!ok) return 1;
    switch (key) {
      case "moyenne": return 1;
      case "equilibre": return clamp(kFor(Math.max(t0, 0.20, tGoal)), 0.85, 1);
      case "econome": case "investissement": return clamp(kFor(Math.max(t0, Math.min(t0 + 0.10, 0.30), tGoal)), 0.75, 1);
      case "loisirs": return clamp(kFor(Math.max(Math.min(t0, 0.10), 0, tGoal)), 1, 1.15);
    }
  };

  return SCENARIOS.map(({ key, label, hint }) => {
    const k = kOf(key);
    const value = new Map<number, number>();
    for (const r of rows) value.set(r.category_id, r.kind === "Dépense" && !isFixed(r) ? r.average * k : r.average);
    let pool = (1 - k) * V;
    // 1) Les objectifs d'abord : chaque catégorie d'épargne est portée au moins à ce que ses objectifs exigent
    if (pool > 0 && goalByCat.size) {
      const deficits = savingsRows.map((r) => ({ id: r.category_id, d: Math.max(0, (goalByCat.get(r.category_id) ?? 0) - value.get(r.category_id)!) }));
      const need = deficits.reduce((s, x) => s + x.d, 0);
      if (need > 0) {
        const f = Math.min(1, pool / need);
        for (const x of deficits) value.set(x.id, value.get(x.id)! + x.d * f);
        pool -= Math.min(pool, need);
      }
    }
    // 2) Le reste du surplus au prorata des moyennes (parts égales si toutes nulles) ; en Loisirs la baisse est prise
    //    au prorata, sans passer sous 0 ni sous ce que les objectifs exigent
    const targets = key === "investissement" ? savingsRows.filter((r) => isInvest(r.name)) : savingsRows;
    if (pool !== 0 && targets.length) {
      const base = targets.map((r) => Math.max(0, r.average));
      const total = base.reduce((a, b) => a + b, 0);
      if (total > 0 || pool > 0) targets.forEach((r, i) => {
        const share = total > 0 ? base[i] / total : 1 / targets.length;
        const cur = value.get(r.category_id)!;
        const floor = pool < 0 ? Math.min(cur, goalByCat.get(r.category_id) ?? 0) : 0;
        value.set(r.category_id, Math.max(floor, cur + pool * share));
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
      goalsMonthly: round2(G), goalsShortfall: round2(Math.max(0, G - (R - expense))),
      amounts,
    };
  });
}

// ---------------------------------------------------------------- base glissante, objectifs et application
export interface BudgetScenarios {
  period: { from: string; to: string };
  fixedCandidates: { name: string; checked: boolean }[];
  /** Objectifs pris en compte (versement mensuel > 0). */
  goals: GoalTarget[];
  /** Scénario suivi (budget automatique), ou null. */
  followed: ScenarioKey | null;
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

/**
 * Objectifs actifs à financer (versement mensuel nécessaire > 0, calculé dans l'onglet Objectifs à partir du solde
 * actuel et de l'échéance), rattachés à une catégorie d'épargne : bourse ou crypto d'après la classe d'actif du compte
 * ou de la classe suivie, sinon la première catégorie d'épargne « livrets » (objectif manuel, précaution…).
 */
export function goalTargets(store: Store): GoalTarget[] {
  const cats = store.all<{ id: number; name: string }>("SELECT id, name FROM categories WHERE kind='Épargne' ORDER BY sort, id");
  if (!cats.length) return [];
  const bourse = cats.find((c) => /bourse|action|etf|pea/i.test(c.name)), crypto = cats.find((c) => /crypto/i.test(c.name));
  const livrets = cats.find((c) => !isInvest(c.name)) ?? cats[0];
  const classOf = new Map(store.all<{ id: number; asset_class: string }>("SELECT id, asset_class FROM accounts").map((a) => [a.id, a.asset_class]));
  return goals(store).goals
    .filter((g) => !g.archived && (g.monthlyNeeded ?? 0) > 0)
    .map((g) => {
      const cls = g.source === "account" && g.account_id ? classOf.get(g.account_id) : g.source === "class" ? g.asset_class : null;
      const category_id = cls === "Actions & ETF" && bourse ? bourse.id : cls === "Crypto" && crypto ? crypto.id : livrets.id;
      return { goal_id: g.id, name: g.name, monthly: g.monthlyNeeded!, category_id, target_date: g.target_date };
    });
}

/** Scénario suivi (réglage `budget_scenario`), ou null si le budget est entièrement manuel. */
export function followedScenario(store: Store): ScenarioKey | null {
  const v = setting(store, "budget_scenario", "");
  return SCENARIOS.some((s) => s.key === v) ? (v as ScenarioKey) : null;
}

export function budgetScenarios(store: Store, year: number, fixed?: string[], asOf = today()): BudgetScenarios {
  const names = fixed ?? fixedCategories(store);
  const { period, rows } = categoryAverages(store, asOf);
  const targets = goalTargets(store);
  const taken = new Set(store.all<{ category_id: number }>("SELECT category_id FROM budgets WHERE year=?", [year]).map((b) => b.category_id));
  return {
    period,
    fixedCandidates: store.all<{ name: string }>("SELECT name FROM categories WHERE kind='Dépense' ORDER BY sort, id").map((c) => ({ name: c.name, checked: names.includes(c.name) })),
    goals: targets,
    followed: followedScenario(store),
    scenarios: buildScenarios(rows, names, targets).map((s) => ({ ...s, fillable: s.amounts.filter((a) => !taken.has(a.category_id)).length })),
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

// ---------------------------------------------------------------- budget automatique (scénario suivi)
/**
 * Budgets automatiques pour l'année : montants du scénario suivi, recalculés à chaque appel sur les 12 derniers mois
 * complets et les objectifs du moment. Seules l'année en cours et les suivantes sont concernées ; le passé reste figé.
 */
export function autoBudgets(store: Store, year: number, asOf = today()): { scenario: ScenarioKey; amounts: Map<number, number> } | undefined {
  const key = followedScenario(store);
  if (!key || year < Number(asOf.slice(0, 4))) return undefined;
  const s = budgetScenarios(store, year, undefined, asOf).scenarios.find((x) => x.key === key)!;
  return { scenario: key, amounts: new Map(s.amounts.map((a) => [a.category_id, a.amount])) };
}

/** Rapport budget de l'année avec les montants automatiques du scénario suivi sur les catégories sans budget saisi. */
export function effectiveBudget(store: Store, year: number, asOf = today()): BudgetReport {
  return budgetReport(store, year, autoBudgets(store, year, asOf));
}

export function setBudgetScenario(store: Store, key: ScenarioKey | null): ScenarioKey | null {
  if (key !== null && !SCENARIOS.some((s) => s.key === key)) throw new Error(`Scénario inconnu : ${key}`);
  if (key === null) store.run("DELETE FROM settings WHERE key='budget_scenario'");
  else store.run("INSERT INTO settings(key,value) VALUES('budget_scenario',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [key]);
  return key;
}

// ---------------------------------------------------------------- à prévoir : préparer les comptes
export interface PrepareReport {
  year: number;
  scenario: ScenarioKey | null;
  /** Charges fixes et dépenses variables budgétées (à garder sur le compte courant). */
  fixed: { rows: { name: string; amount: number }[]; total: number };
  variable: { rows: { name: string; amount: number }[]; total: number };
  /** Épargne budgétée par catégorie (à virer), avec les objectifs qu'elle porte. */
  savings: { rows: { name: string; amount: number; goals: { name: string; monthly: number }[]; covered: boolean }[]; total: number };
  goals: { rows: (GoalTarget & { covered: boolean })[]; total: number; shortfall: number };
  income: { budget: number; average: number };
  /** Comptes courants : dernier solde connu contre un mois de dépenses budgétées. */
  checking: { accounts: { name: string; balance: number; date: string }[]; total: number | null; needed: number; margin: number | null };
  /** Prélèvements attendus dans les prochains jours (charges récurrentes actives). */
  upcoming: { rows: { label: string; date: string; amount: number; account: string }[]; total: number; days: number };
}

const addDays = (d: string, n: number) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

/** Synthèse « à prévoir chaque mois » : ce qu'il faut garder sur le compte courant, virer vers l'épargne, et les prélèvements imminents. */
export function budgetPrepare(store: Store, asOf = today()): PrepareReport {
  const year = Number(asOf.slice(0, 4));
  const b = effectiveBudget(store, year, asOf);
  const fixedSet = new Set(fixedCategories(store));
  const budgeted = b.rows.filter((r) => r.budget !== null && r.budget > 0);
  const pick = (f: (r: BudgetReport["rows"][number]) => boolean) => {
    const rows = budgeted.filter(f).map((r) => ({ name: r.name, amount: r.budget! }));
    return { rows, total: round2(rows.reduce((s, r) => s + r.amount, 0)) };
  };
  const fixed = pick((r) => r.kind === "Dépense" && fixedSet.has(r.name));
  const variable = pick((r) => r.kind === "Dépense" && !fixedSet.has(r.name));
  const targets = goalTargets(store);
  const savingsRows = b.rows.filter((r) => r.kind === "Épargne" && ((r.budget ?? 0) > 0 || targets.some((g) => g.category_id === r.category_id))).map((r) => {
    const gs = targets.filter((g) => g.category_id === r.category_id);
    const amount = r.budget ?? 0;
    return { name: r.name, amount, goals: gs.map((g) => ({ name: g.name, monthly: g.monthly })), covered: amount + 0.005 >= gs.reduce((s, g) => s + g.monthly, 0) };
  });
  const savingsTotal = round2(savingsRows.reduce((s, r) => s + r.amount, 0));
  const goalsTotal = round2(targets.reduce((s, g) => s + g.monthly, 0));
  const coveredCat = new Map(b.rows.map((r) => [r.category_id, savingsRows.find((s) => s.name === r.name)?.covered ?? false]));
  const accounts = store.all<{ id: number; name: string }>("SELECT id, name FROM accounts WHERE archived=0 AND type='Courant' ORDER BY sort, id");
  const balances = currentBalances(store);
  const checking = accounts.flatMap((a) => { const c = balances.get(a.id); return c ? [{ name: a.name, balance: c.balance, date: c.date }] : []; });
  const checkingTotal = checking.length ? round2(checking.reduce((s, a) => s + a.balance, 0)) : null;
  const needed = round2(fixed.total + variable.total);
  const DAYS = 30, until = addDays(asOf, DAYS);
  const upcoming = recurring(store).items
    .filter((i) => i.active && i.status !== "ignored" && i.next >= asOf && i.next <= until)
    .map((i) => ({ label: i.label, date: i.next, amount: round2(Math.abs(i.lastAmount)), account: i.account }))
    .sort((a, c) => a.date.localeCompare(c.date));
  return {
    year, scenario: followedScenario(store),
    fixed, variable,
    savings: { rows: savingsRows, total: savingsTotal },
    goals: { rows: targets.map((g) => ({ ...g, covered: coveredCat.get(g.category_id) ?? false })), total: goalsTotal, shortfall: round2(Math.max(0, goalsTotal - savingsTotal)) },
    income: { budget: b.plan.income, average: round2(b.yearTotals.income / Math.max(1, b.monthsWithData)) },
    checking: { accounts: checking, total: checkingTotal, needed, margin: checkingTotal === null ? null : round2(checkingTotal - needed) },
    upcoming: { rows: upcoming, total: round2(upcoming.reduce((s, u) => s + u.amount, 0)), days: DAYS },
  };
}
