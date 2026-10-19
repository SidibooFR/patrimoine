/** Calculs de synthèse : budget, patrimoine, portefeuille, allocation, projection, tableau de bord. */
import type { Store } from "./db.js";
import { ASSET_CLASSES } from "./seed.js";
import type { AssetRow, Operation } from "./schema.js";
import { xirr, futureValue, monthsToGoal, round2, monthStart, addMonths, today } from "./finance.js";
import { refundAllocations } from "./refunds.js";
import { envelopesReport, type EnvelopesReport } from "./envelopes.js";
import { recurringReport, type RecurringReport } from "./recurring.js";
import { goalsReport, type GoalsReport } from "./goals.js";

export function setting(store: Store, key: string, def: string): string {
  return store.get<{ value: string }>("SELECT value FROM settings WHERE key=?", [key])?.value ?? def;
}
export function settingNum(store: Store, key: string, def: number): number {
  const v = Number(setting(store, key, String(def)));
  return Number.isFinite(v) ? v : def;
}

/** Charges pré-cochées quand le réglage `budget_fixed_categories` est absent. */
export const DEFAULT_FIXED = ["Loyer & charges", "Énergie, internet & téléphone", "Assurances", "Abonnements", "Crédits", "Impôts & taxes", "Frais bancaires"];

/** Charges fixes (réglage `budget_fixed_categories`, noms séparés par « | ») : à leur moyenne dans les scénarios, sans projection au rythme des jours dans le suivi du mois. Réglage absent → DEFAULT_FIXED, vide → aucune. */
export function fixedCategories(store: Store): string[] {
  const raw = setting(store, "budget_fixed_categories", "\u0000");
  if (raw === "\u0000") return DEFAULT_FIXED;
  return raw.split("|").map((x) => x.trim()).filter(Boolean);
}

/** Montant « budget » d'une opération : revenus positifs, dépenses/épargne positives aussi (valeur absolue), transferts 0. */
export function budgetAmount(kind: string | null, amount: number): number {
  if (kind === "Revenu") return amount;
  if (kind === "Dépense" || kind === "Épargne") return -amount;
  return 0;
}

// ---------------------------------------------------------------- Budget
export interface BudgetRow {
  category_id: number; name: string; kind: string; budget: number | null;
  months: number[]; total: number; average: number; gap: number | null;
  /** Remboursements rapprochés déduits de cette catégorie sur l'année (dépenses) ou retirés (catégorie Remboursements). */
  refunded: number;
}
export interface BudgetReport {
  year: number; rows: BudgetRow[]; monthsWithData: number;
  totals: { income: number[]; expense: number[]; savings: number[]; remaining: number[]; rate: (number | null)[] };
  yearTotals: { income: number; expense: number; savings: number; remaining: number; rate: number | null; avgExpense: number };
  /** Budget prévu : somme des montants mensuels saisis par nature, reste et taux d'épargne prévus, nombre de catégories budgétées. */
  plan: { income: number; expense: number; savings: number; remaining: number; rate: number | null; count: number };
  /** Nombre de budgets saisis l'année précédente (pour « Reprendre le budget N−1 »). */
  prevYearCount: number;
  uncategorized: number;
}

export function budgetReport(store: Store, year: number): BudgetReport {
  const cats = store.all<{ id: number; name: string; kind: string }>("SELECT id, name, kind FROM categories ORDER BY sort, id");
  const budgets = new Map(store.all<{ category_id: number; monthly_amount: number }>("SELECT category_id, monthly_amount FROM budgets WHERE year=?", [year]).map((b) => [b.category_id, b.monthly_amount]));
  const sums = store.all<{ category_id: number; m: string; kind: string; total: number }>(
    `SELECT t.category_id, substr(t.date,6,2) AS m, c.kind, SUM(t.amount) AS total
     FROM transactions t JOIN categories c ON c.id = t.category_id
     WHERE substr(t.date,1,4) = ? GROUP BY t.category_id, m`, [String(year)]);
  const grid = new Map<number, number[]>();
  for (const s of sums) {
    const arr = grid.get(s.category_id) ?? Array(12).fill(0);
    arr[Number(s.m) - 1] += budgetAmount(s.kind, s.total);
    grid.set(s.category_id, arr);
  }
  // Remboursements rapprochés : retirés des revenus, déduits de la catégorie de la dépense d'origine
  const kindOf = new Map(cats.map((c) => [c.id, c.kind]));
  const refunded = new Map<number, number>();
  const allocs = refundAllocations(store);
  if (allocs.length) {
    const ph = allocs.map(() => "?").join(",");
    const src = new Map(store.all<{ id: number; date: string; category_id: number | null }>(`SELECT id, date, category_id FROM transactions WHERE id IN (${ph})`, allocs.map((a) => a.refund_id)).map((r) => [r.id, r]));
    const y = String(year);
    const bump = (cat: number, date: string, delta: number) => {
      const arr = grid.get(cat) ?? Array(12).fill(0);
      arr[Number(date.slice(5, 7)) - 1] += delta;
      grid.set(cat, arr);
      refunded.set(cat, (refunded.get(cat) ?? 0) + Math.abs(delta));
    };
    for (const a of allocs) {
      const r = src.get(a.refund_id);
      if (r?.category_id && r.date.startsWith(y)) bump(r.category_id, r.date, -budgetAmount(kindOf.get(r.category_id) ?? null, a.amount));
      if (a.date.startsWith(y)) bump(a.category_id, a.date, budgetAmount(kindOf.get(a.category_id) ?? null, a.amount));
    }
  }
  const income = Array(12).fill(0), expense = Array(12).fill(0), savings = Array(12).fill(0);
  const rows: BudgetRow[] = cats.map((c) => {
    const months = (grid.get(c.id) ?? Array(12).fill(0)).map(round2);
    months.forEach((v, i) => { if (c.kind === "Revenu") income[i] += v; else if (c.kind === "Dépense") expense[i] += v; else if (c.kind === "Épargne") savings[i] += v; });
    return { category_id: c.id, name: c.name, kind: c.kind, budget: budgets.get(c.id) ?? null, months, total: 0, average: 0, gap: null, refunded: round2(refunded.get(c.id) ?? 0) };
  });
  const withData = income.map((v, i) => v + expense[i] > 0).filter(Boolean).length;
  const n = Math.max(1, withData);
  for (const r of rows) {
    r.total = round2(r.months.reduce((a, b) => a + b, 0));
    r.average = round2(r.total / n);
    if (r.budget !== null) r.gap = round2(r.kind === "Revenu" ? r.average - r.budget : r.budget - r.average);
  }
  const remaining = income.map((v, i) => round2(v - expense[i]));
  const rate = income.map((v, i) => (v > 0 ? (v - expense[i]) / v : null));
  const yi = income.reduce((a, b) => a + b, 0), ye = expense.reduce((a, b) => a + b, 0), ys = savings.reduce((a, b) => a + b, 0);
  const planOf = (kind: string) => rows.filter((r) => r.kind === kind && r.budget !== null).reduce((s, r) => s + r.budget!, 0);
  const pi = planOf("Revenu"), pe = planOf("Dépense"), ps = planOf("Épargne");
  return {
    year, rows, monthsWithData: withData,
    totals: { income: income.map(round2), expense: expense.map(round2), savings: savings.map(round2), remaining, rate },
    yearTotals: { income: round2(yi), expense: round2(ye), savings: round2(ys), remaining: round2(yi - ye), rate: yi > 0 ? (yi - ye) / yi : null, avgExpense: round2(ye / n) },
    plan: { income: round2(pi), expense: round2(pe), savings: round2(ps), remaining: round2(pi - pe), rate: pi > 0 ? (pi - pe) / pi : null, count: rows.filter((r) => r.budget !== null).length },
    prevYearCount: store.scalar<number>("SELECT COUNT(*) FROM budgets WHERE year=?", [year - 1]),
    uncategorized: store.scalar<number>("SELECT COUNT(*) FROM transactions WHERE category_id IS NULL"),
  };
}

// ---------------------------------------------------------------- Suivi du mois (budget vs réel)
export type BudgetMonthStatus = "ok" | "warn" | "over" | "under";
export interface BudgetMonthRow {
  category_id: number; name: string; kind: string;
  budget: number; actual: number;
  /** Budget − réel (dépenses) ou réel − budget (revenus, épargne) : ce qu'il reste à dépenser / à atteindre. */
  remaining: number;
  /** Réel / budget. */
  ratio: number;
  /** Charge fixe (réglage `budget_fixed_categories`) : attendue au budget, pas de projection au rythme des jours. */
  fixed: boolean;
  /** Dépenses d'un mois en cours : réel extrapolé au rythme des jours écoulés (charge fixe : max(réel, budget)), sinon null. */
  projected: number | null;
  /** Dépense : over = budget dépassé, warn = rythme qui mène au dépassement ; revenu/épargne : under = mois terminé sous le budget. */
  status: BudgetMonthStatus;
}
export interface BudgetMonthReport {
  month: string; year: number;
  /** Jours écoulés (mois terminé → total, mois futur → 0) et jours du mois. */
  days: { elapsed: number; total: number };
  rows: BudgetMonthRow[];
  /** Dépenses du mois dans des catégories sans budget. */
  untracked: { category_id: number; name: string; actual: number }[];
  untrackedTotal: number;
  totals: {
    income: { budget: number; actual: number };
    expense: { budget: number; actual: number; projected: number | null; over: number };
    savings: { budget: number; actual: number };
  };
}

/** Suivi mensuel : pour chaque catégorie budgétée, réel du mois contre budget, rythme et projection de fin de mois. */
export function budgetMonthReport(store: Store, month: string, asOf = today()): BudgetMonthReport {
  const ym = month.slice(0, 7);
  const year = Number(ym.slice(0, 4)), mi = Number(ym.slice(5, 7)) - 1;
  const b = budgetReport(store, year);
  const total = new Date(Date.UTC(year, mi + 1, 0)).getUTCDate();
  const cur = asOf.slice(0, 7);
  const elapsed = ym < cur ? total : ym > cur ? 0 : Math.min(total, Number(asOf.slice(8, 10)));
  const inProgress = elapsed > 0 && elapsed < total;
  const fixedSet = new Set(fixedCategories(store));
  const rows: BudgetMonthRow[] = [];
  const untracked: BudgetMonthReport["untracked"] = [];
  for (const r of b.rows) {
    if (r.kind === "Transfert") continue;
    const actual = r.months[mi];
    if (r.budget === null) { if (r.kind === "Dépense" && actual > 0) untracked.push({ category_id: r.category_id, name: r.name, actual }); continue; }
    const budget = r.budget;
    const ratio = budget > 0 ? actual / budget : actual > 0 ? 1 : 0;
    const fixed = r.kind === "Dépense" && fixedSet.has(r.name);
    let projected: number | null = null, status: BudgetMonthStatus = "ok";
    if (r.kind === "Dépense") {
      // Charge fixe (loyer payé le 1er…) : attendue au budget. Variable : projection au rythme des jours écoulés,
      // signalée seulement à partir de la mi-mois (trop bruyante avant).
      if (inProgress) projected = fixed ? Math.max(actual, budget) : round2((actual / elapsed) * total);
      if (actual > budget) status = "over";
      else if (!fixed && projected !== null && projected > budget && elapsed / total >= 0.5) status = "warn";
    } else if (elapsed === total && actual < budget) status = "under";
    rows.push({ category_id: r.category_id, name: r.name, kind: r.kind, budget, actual, remaining: round2(r.kind === "Dépense" ? budget - actual : actual - budget), ratio, fixed, projected, status });
  }
  const sum = (kind: string, f: (r: BudgetMonthRow) => number) => round2(rows.filter((r) => r.kind === kind).reduce((s, r) => s + f(r), 0));
  const expActual = sum("Dépense", (r) => r.actual);
  return {
    month: ym, year, days: { elapsed, total }, rows,
    untracked, untrackedTotal: round2(untracked.reduce((s, u) => s + u.actual, 0)),
    totals: {
      income: { budget: sum("Revenu", (r) => r.budget), actual: sum("Revenu", (r) => r.actual) },
      expense: { budget: sum("Dépense", (r) => r.budget), actual: expActual, projected: inProgress ? sum("Dépense", (r) => r.projected ?? 0) : null, over: sum("Dépense", (r) => Math.max(0, r.actual - r.budget)) },
      savings: { budget: sum("Épargne", (r) => r.budget), actual: sum("Épargne", (r) => r.actual) },
    },
  };
}

/** Copie les budgets d'une année vers une autre, uniquement sur les catégories sans budget à l'arrivée. */
export function copyBudgets(store: Store, fromYear: number, toYear: number): { copied: number; skipped: number } {
  if (fromYear === toYear) return { copied: 0, skipped: 0 };
  return store.transaction(() => {
    const src = store.all<{ category_id: number; monthly_amount: number }>("SELECT category_id, monthly_amount FROM budgets WHERE year=?", [fromYear]);
    const taken = new Set(store.all<{ category_id: number }>("SELECT category_id FROM budgets WHERE year=?", [toYear]).map((x) => x.category_id));
    let copied = 0, skipped = 0;
    for (const s of src) {
      if (taken.has(s.category_id)) { skipped++; continue; }
      store.run("INSERT INTO budgets(category_id,year,monthly_amount) VALUES(?,?,?)", [s.category_id, toYear, s.monthly_amount]);
      copied++;
    }
    return { copied, skipped };
  });
}

// ---------------------------------------------------------------- Patrimoine
export interface SnapshotRow { month: string; balances: Record<number, number | null>; total: number | null; variation: number | null; variationPct: number | null; byClass: Record<string, number> }

export function networthReport(store: Store): { accounts: { id: number; name: string; asset_class: string }[]; rows: SnapshotRow[]; last: SnapshotRow | null } {
  const accounts = store.all<{ id: number; name: string; asset_class: string }>("SELECT id, name, asset_class FROM accounts WHERE archived=0 ORDER BY sort, id");
  const cls = new Map(accounts.map((a) => [a.id, a.asset_class]));
  const snaps = store.all<{ month: string; account_id: number; balance: number }>("SELECT month, account_id, balance FROM snapshots ORDER BY month");
  const byMonth = new Map<string, Record<number, number>>();
  for (const s of snaps) {
    const m = byMonth.get(s.month) ?? {};
    m[s.account_id] = s.balance;
    byMonth.set(s.month, m);
  }
  const months = [...byMonth.keys()].sort();
  // Complète la série mensuelle entre le premier mois de suivi et aujourd'hui
  const start = months[0] ?? setting(store, "start_month", monthStart(today()));
  const end = monthStart(today());
  const series: string[] = [];
  for (let m = start < end ? start : end; m <= end; m = addMonths(m, 1)) series.push(m);
  for (const m of months) if (!series.includes(m)) series.push(m);
  series.sort();
  const rows: SnapshotRow[] = [];
  let prev: number | null = null;
  for (const m of series) {
    const bal = byMonth.get(m) ?? {};
    const has = Object.keys(bal).length > 0;
    const total = has ? round2(Object.values(bal).reduce((a, b) => a + b, 0)) : null;
    const byClass: Record<string, number> = {};
    for (const c of ASSET_CLASSES) byClass[c] = 0;
    for (const [id, b] of Object.entries(bal)) { const c = cls.get(Number(id)) ?? "Autre"; byClass[c] = round2((byClass[c] ?? 0) + b); }
    const balances: Record<number, number | null> = {};
    for (const a of accounts) balances[a.id] = bal[a.id] ?? null;
    rows.push({
      month: m, balances, total,
      variation: total !== null && prev !== null ? round2(total - prev) : null,
      variationPct: total !== null && prev !== null && prev !== 0 ? (total - prev) / prev : null,
      byClass,
    });
    if (total !== null) prev = total;
  }
  const withData = rows.filter((r) => r.total !== null);
  return { accounts, rows, last: withData[withData.length - 1] ?? null };
}

// ---------------------------------------------------------------- Portefeuille
export interface Position {
  asset_id: number; name: string; symbol: string; account_id: number | null; account: string; asset_class: string;
  qtyBought: number; qtySold: number; qty: number; cost: number; pru: number | null; heldCost: number;
  price: number | null; priceSource: string; priceUpdatedAt: string | null;
  value: number; unrealized: number; unrealizedPct: number | null; realized: number; dividends: number; weight: number | null;
}
export interface PortfolioReport {
  positions: Position[];
  totals: { cost: number; heldCost: number; value: number; unrealized: number; unrealizedPct: number | null; realized: number; dividends: number };
  invested: number; recovered: number; gain: number; performance: number | null; irr: number | null;
  /** Fiabilité du TRI : durée couverte par les flux et opérations à date approximative. */
  irrInfo: { firstFlow: string | null; spanDays: number; reliable: boolean; approximateOps: number; note: string | null };
}

export function portfolioReport(store: Store): PortfolioReport {
  const assets = store.all<AssetRow>(`SELECT a.*, COALESCE(ac.name,'') AS account FROM assets a LEFT JOIN accounts ac ON ac.id=a.account_id ORDER BY a.asset_class, a.name`);
  const ops = store.all<Operation>("SELECT * FROM operations ORDER BY date, id");
  const positions: Position[] = [];
  const flows: { date: string; amount: number }[] = [];
  for (const a of assets) {
    const mine = ops.filter((o) => o.asset_id === a.id);
    let qb = 0, qs = 0, cost = 0, saleProceeds = 0, div = 0;
    for (const o of mine) {
      const gross = o.quantity * o.unit_price;
      if (o.kind === "Achat") { qb += o.quantity; cost += gross + o.fees; flows.push({ date: o.date, amount: -(gross + o.fees) }); }
      else if (o.kind === "Vente") { qs += o.quantity; saleProceeds += gross - o.fees; flows.push({ date: o.date, amount: gross - o.fees }); }
      else if (o.kind === "Dividende") { div += gross - o.fees; flows.push({ date: o.date, amount: gross - o.fees }); }
      else { cost += o.fees; flows.push({ date: o.date, amount: -o.fees }); }
    }
    const qty = qb - qs;
    const pru = qb > 0 ? cost / qb : null;
    const heldCost = pru !== null ? pru * qty : 0;
    const price = a.price ?? a.manual_price ?? null;
    const value = price !== null ? qty * price : heldCost;
    positions.push({
      asset_id: a.id, name: a.name, symbol: a.symbol, account_id: a.account_id, account: a.account, asset_class: a.asset_class,
      qtyBought: qb, qtySold: qs, qty, cost: round2(cost), pru, heldCost: round2(heldCost),
      price, priceSource: a.price !== null ? a.price_source || "Web" : a.manual_price !== null ? "Manuel" : "",
      priceUpdatedAt: a.price !== null ? a.price_updated_at : null,
      value: round2(value), unrealized: round2(value - heldCost), unrealizedPct: heldCost > 0 ? (value - heldCost) / heldCost : null,
      realized: round2(saleProceeds - (pru ?? 0) * qs), dividends: round2(div), weight: null,
    });
  }
  const t = positions.reduce((s, p) => ({ cost: s.cost + p.cost, heldCost: s.heldCost + p.heldCost, value: s.value + p.value, unrealized: s.unrealized + p.unrealized, realized: s.realized + p.realized, dividends: s.dividends + p.dividends }), { cost: 0, heldCost: 0, value: 0, unrealized: 0, realized: 0, dividends: 0 });
  for (const p of positions) p.weight = t.value > 0 ? p.value / t.value : null;
  const invested = -flows.filter((f) => f.amount < 0).reduce((s, f) => s + f.amount, 0);
  const recovered = flows.filter((f) => f.amount > 0).reduce((s, f) => s + f.amount, 0);
  const gain = t.value + recovered - invested;
  const irr = flows.length ? xirr([...flows, { date: today(), amount: t.value }]) : null;
  const firstFlow = flows.length ? flows.reduce((m, f) => (f.date < m ? f.date : m), flows[0].date) : null;
  const spanDays = firstFlow ? Math.round((Date.parse(today()) - Date.parse(firstFlow)) / 86_400_000) : 0;
  const approximateOps = ops.filter((o) => /approximati/i.test(o.note ?? "")).length;
  const notes: string[] = [];
  if (approximateOps) notes.push(`${approximateOps} opération(s) à date approximative : corrige les dates d'achat pour un TRI exact`);
  if (firstFlow && spanDays < 365) notes.push("moins d'un an d'historique : le TRI extrapole sur un an un gain de court terme");
  const irrInfo = { firstFlow, spanDays, reliable: !notes.length, approximateOps, note: notes.length ? notes.join(" ; ") : null };
  return {
    positions,
    totals: { ...t, cost: round2(t.cost), heldCost: round2(t.heldCost), value: round2(t.value), unrealized: round2(t.unrealized), unrealizedPct: t.heldCost > 0 ? t.unrealized / t.heldCost : null, realized: round2(t.realized), dividends: round2(t.dividends) },
    invested: round2(invested), recovered: round2(recovered), gain: round2(gain), performance: invested > 0 ? gain / invested : null, irr, irrInfo,
  };
}

// ---------------------------------------------------------------- Allocation
export interface AllocationRow { asset_class: string; value: number; pct: number | null; target: number; gap: number | null; gapEur: number; action: "Renforcer" | "Alléger" | "OK" | null; deposit: number }
export interface AllocationReport {
  lastMonth: string | null; total: number; tolerance: number; rows: AllocationRow[]; targetSum: number;
  nextDeposit: number;
  emergency: { avgExpense: number; months: number; goal: number; available: number; coverage: number | null; status: string };
}

export function allocationReport(store: Store, nextDeposit?: number): AllocationReport {
  const nw = networthReport(store);
  const tol = settingNum(store, "allocation_tolerance", 0.05);
  const deposit = nextDeposit ?? settingNum(store, "next_deposit", 400);
  const targets = new Map(store.all<{ asset_class: string; pct: number }>("SELECT asset_class, pct FROM targets").map((t) => [t.asset_class, t.pct]));
  const total = nw.last?.total ?? 0;
  const rows: AllocationRow[] = ASSET_CLASSES.map((c) => {
    const value = nw.last?.byClass[c] ?? 0;
    const target = targets.get(c) ?? 0;
    const pct = total > 0 ? value / total : null;
    const gap = pct === null ? null : pct - target;
    return { asset_class: c, value, pct, target, gap, gapEur: round2(value - target * total), action: gap === null ? null : gap < -tol ? "Renforcer" : gap > tol ? "Alléger" : "OK", deposit: 0 };
  });
  // Répartition du prochain versement : en priorité vers les classes sous leur cible
  const lacks = rows.map((r) => Math.max(0, r.target * (total + deposit) - r.value));
  const lackSum = lacks.reduce((a, b) => a + b, 0);
  rows.forEach((r, i) => {
    if (lackSum === 0) r.deposit = round2(deposit * r.target);
    else if (lackSum >= deposit) r.deposit = round2((lacks[i] / lackSum) * deposit);
    else r.deposit = round2(lacks[i] + (deposit - lackSum) * r.target);
  });
  const year = new Date().getFullYear();
  const b = budgetReport(store, year);
  const avgExpense = b.yearTotals.avgExpense;
  const months = settingNum(store, "emergency_months", 6);
  const goal = round2(avgExpense * months);
  const available = round2((nw.last?.byClass["Liquidités"] ?? 0) + (nw.last?.byClass["Épargne sécurisée"] ?? 0));
  const coverage = avgExpense > 0 ? available / avgExpense : null;
  const status = avgExpense === 0 ? "Aucune dépense enregistrée" : available >= goal ? "Objectif atteint" : `À compléter : ${round2(goal - available).toLocaleString("fr-FR")} €`;
  return { lastMonth: nw.last?.month ?? null, total, tolerance: tol, rows, targetSum: [...targets.values()].reduce((a, b) => a + b, 0), nextDeposit: deposit, emergency: { avgExpense, months, goal, available, coverage, status } };
}

// ---------------------------------------------------------------- Projection
export interface ProjectionParams { initial?: number; monthly?: number; rateLow?: number; rateMid?: number; rateHigh?: number; inflation?: number; goal?: number; years?: number }
export interface ProjectionReport {
  params: Required<ProjectionParams>;
  rows: { year: number; n: number; paid: number; low: number; mid: number; high: number; midReal: number; gain: number }[];
  goalYears: number | null; goalYear: number | null;
}

export function projectionReport(store: Store, p: ProjectionParams = {}): ProjectionReport {
  const nw = networthReport(store);
  const params: Required<ProjectionParams> = {
    initial: p.initial ?? nw.last?.total ?? 0,
    monthly: p.monthly ?? settingNum(store, "projection_monthly", 400),
    rateLow: p.rateLow ?? settingNum(store, "projection_rate_low", 0.04),
    rateMid: p.rateMid ?? settingNum(store, "projection_rate_mid", 0.06),
    rateHigh: p.rateHigh ?? settingNum(store, "projection_rate_high", 0.08),
    inflation: p.inflation ?? settingNum(store, "projection_inflation", 0.02),
    goal: p.goal ?? settingNum(store, "projection_goal", 100000),
    years: p.years ?? 30,
  };
  const y0 = new Date().getFullYear();
  const rows = [];
  for (let n = 0; n <= params.years; n++) {
    const mid = futureValue(params.rateMid, 12 * n, params.monthly, params.initial);
    rows.push({
      year: y0 + n, n, paid: round2(params.initial + params.monthly * 12 * n),
      low: round2(futureValue(params.rateLow, 12 * n, params.monthly, params.initial)),
      mid: round2(mid), high: round2(futureValue(params.rateHigh, 12 * n, params.monthly, params.initial)),
      midReal: round2(mid / Math.pow(1 + params.inflation, n)), gain: round2(mid - (params.initial + params.monthly * 12 * n)),
    });
  }
  const m = monthsToGoal(params.rateMid, params.monthly, params.initial, params.goal);
  return { params, rows, goalYears: m === null ? null : round2(m / 12), goalYear: m === null ? null : y0 + Math.ceil(m / 12) };
}

// ---------------------------------------------------------------- Enveloppes, charges récurrentes, objectifs
export function envelopes(store: Store): EnvelopesReport {
  const b = budgetReport(store, new Date().getFullYear());
  return envelopesReport(store, {
    underuseThreshold: settingNum(store, "envelope_underuse_threshold", 0.5),
    bufferMonths: settingNum(store, "checking_buffer_months", 1),
    avgExpense: b.yearTotals.avgExpense,
  });
}

export function recurring(store: Store): RecurringReport {
  const exclude = setting(store, "recurring_exclude_categories", "").split("|").map((x) => x.trim()).filter(Boolean);
  return recurringReport(store, { excludeCategories: exclude });
}

export function goals(store: Store, env?: EnvelopesReport): GoalsReport {
  const al = allocationReport(store);
  const e = env ?? envelopes(store);
  const b = budgetReport(store, new Date().getFullYear());
  // Capacité d'épargne : moyenne des mois terminés (le mois en cours est incomplet), sinon de tous les mois
  const cur = new Date().getMonth();
  const done = b.totals.income.map((v, i) => ({ i, v, e: b.totals.expense[i] })).filter((m) => m.i < cur && m.v + m.e > 0);
  const pool = done.length ? done : b.totals.income.map((v, i) => ({ i, v, e: b.totals.expense[i] })).filter((m) => m.v + m.e > 0);
  const capacity = pool.length ? round2(pool.reduce((s, m) => s + m.v - m.e, 0) / pool.length) : null;
  return goalsReport(store, {
    emergencyGoal: al.emergency.goal, emergencyAvailable: al.emergency.available, capacity,
    rates: new Map(e.rows.map((r) => [r.account_id, r.rate])),
  });
}

// ---------------------------------------------------------------- Tableau de bord
export interface Dashboard {
  today: string;
  networth: { total: number | null; lastMonth: string | null; variation: number | null; sinceStart: number | null; emergencyStatus: string };
  month: { month: string; income: number; expense: number; savings: number; rate: number | null; yearRate: number | null };
  portfolio: { value: number; invested: number; unrealized: number; performance: number | null; irr: number | null; irrReliable: boolean; irrNote: string | null };
  alerts: { level: "ok" | "warn"; text: string }[];
  series: { months: string[]; total: (number | null)[] };
  byClass: Record<string, number>;
  budgetSeries: { months: string[]; income: number[]; expense: number[]; rate: (number | null)[] };
  recurring: { monthly: number; annual: number; count: number; increases: { label: string; from: number; to: number; pct: number }[] };
  envelopes: { balance: number; room: number; estimateThisYear: number; missed: number };
  goals: { id: number; name: string; progress: number; current: number; target: number; status: string; target_date: string | null }[];
}

export function dashboard(store: Store): Dashboard {
  const t = today();
  const nw = networthReport(store);
  const al = allocationReport(store);
  const pf = portfolioReport(store);
  const year = Number(t.slice(0, 4));
  const b = budgetReport(store, year);
  const mi = Number(t.slice(5, 7)) - 1;
  const withData = nw.rows.filter((r) => r.total !== null);
  const alerts: Dashboard["alerts"] = [];
  const push = (ok: boolean, okText: string, warnText: string) => alerts.push({ level: ok ? "ok" : "warn", text: ok ? okText : warnText });
  push(Math.abs(al.targetSum - 1) < 1e-4, "Allocation cible cohérente (100 %)", `Ton allocation cible fait ${Math.round(al.targetSum * 100)} % au lieu de 100 % (Paramètres)`);
  push(!al.rows.some((r) => r.action === "Renforcer" || r.action === "Alléger"), "Allocation dans la tolérance", "Allocation hors tolérance : voir l'onglet Allocation");
  push(b.uncategorized === 0, "Toutes les opérations sont catégorisées", `${b.uncategorized} opération(s) à catégoriser : filtre « Sans catégorie » dans Relevés`);
  const lastSnap = nw.last?.month ?? null;
  const stale = !lastSnap || (Date.parse(t) - Date.parse(lastSnap)) / 86_400_000 > 45;
  push(!stale, "Relevé de patrimoine à jour", lastSnap ? "Dernier relevé de patrimoine ancien : saisis les soldes du mois" : "Aucun relevé de patrimoine saisi");
  const staleAssets = pf.positions.filter((p) => p.qty > 0 && p.price === null).length;
  push(staleAssets === 0, "Tous les actifs ont un cours", `${staleAssets} actif(s) sans cours : actualise les cours dans Portefeuille`);
  const env = envelopes(store);
  for (const a of env.alerts) alerts.push(a);
  const rec = recurring(store);
  const eur2 = (v: number) => v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  push(!rec.increases.length, "Aucune hausse de prix récente sur tes abonnements",
    "Hausse de prix : " + rec.increases.map((i) => `${i.label} ${eur2(i.change!.from)} → ${eur2(i.change!.to)} (+${Math.round(i.change!.pct * 100)} %)`).join(", "));
  const gl = goals(store, env);
  const late = gl.goals.filter((g) => !g.archived && g.status === "En retard");
  if (late.length) alerts.push({ level: "warn", text: `Objectif${late.length > 1 ? "s" : ""} en retard : ${late.map((g) => `« ${g.name} » (${eur2(g.monthlyNeeded ?? 0)}/mois nécessaires)`).join(", ")}` });
  return {
    today: t,
    networth: { total: nw.last?.total ?? null, lastMonth: lastSnap, variation: nw.last?.variation ?? null, sinceStart: withData.length > 1 ? round2(withData[withData.length - 1].total! - withData[0].total!) : null, emergencyStatus: al.emergency.status },
    month: { month: monthStart(t), income: b.totals.income[mi], expense: b.totals.expense[mi], savings: b.totals.savings[mi], rate: b.totals.rate[mi], yearRate: b.yearTotals.rate },
    portfolio: { value: pf.totals.value, invested: pf.invested, unrealized: pf.totals.unrealized, performance: pf.performance, irr: pf.irr, irrReliable: pf.irrInfo.reliable, irrNote: pf.irrInfo.note },
    alerts,
    series: { months: nw.rows.map((r) => r.month), total: nw.rows.map((r) => r.total) },
    byClass: nw.last?.byClass ?? {},
    budgetSeries: { months: Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`), income: b.totals.income, expense: b.totals.expense, rate: b.totals.rate },
    recurring: { monthly: rec.totals.monthly, annual: rec.totals.annual, count: rec.totals.count, increases: rec.increases.map((i) => ({ label: i.label, from: i.change!.from, to: i.change!.to, pct: i.change!.pct })) },
    envelopes: { balance: env.totals.balance, room: env.totals.room, estimateThisYear: env.totals.estimateThisYear, missed: env.missed },
    goals: gl.goals.filter((g) => !g.archived).map((g) => ({ id: g.id, name: g.name, progress: g.progress, current: g.current, target: g.target, status: g.status, target_date: g.target_date })),
  };
}
