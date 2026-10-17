/**
 * Objectifs d'épargne : montant courant (saisi, solde d'un compte, d'une classe
 * d'actif ou épargne de précaution), progression, versement mensuel nécessaire
 * pour tenir l'échéance, rythme constaté et date d'atteinte prévue.
 */
import type { Store } from "./db.js";
import { currentBalances } from "./balances.js";
import type { Goal } from "./schema.js";
import { round2, today, addMonths } from "./finance.js";

export const GOAL_SOURCES = ["manual", "account", "class", "emergency"] as const;
export type GoalSource = (typeof GOAL_SOURCES)[number];

export interface GoalInput { id?: number; name: string; target?: number | null; target_date?: string | null; source?: GoalSource; account_id?: number | null; asset_class?: string | null; manual_amount?: number; archived?: number }

export interface GoalRow {
  id: number; name: string; source: GoalSource; account_id: number | null; account: string | null; asset_class: string | null;
  target: number; targetAuto: boolean; target_date: string | null; manual_amount: number; archived: number;
  current: number; remaining: number; progress: number;
  monthsLeft: number | null; rate: number; monthlyNeeded: number | null;
  pace: number | null; projectedDate: string | null;
  status: "Atteint" | "En avance" | "En retard" | "Dans les temps" | "À financer" | "Sans échéance";
}
export interface GoalsReport {
  goals: GoalRow[];
  totals: { target: number; current: number; remaining: number; monthlyNeeded: number };
  capacity: number | null;  // épargne mensuelle moyenne de l'année (revenus − dépenses)
  margin: number | null;    // capacité − besoins des objectifs
}

const monthsBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / (86_400_000 * 30.4375);

/** Versement mensuel pour passer de `pv` à `fv` en `n` mois au taux mensuel `r`. */
export function monthlyPayment(pv: number, fv: number, n: number, annualRate = 0): number {
  if (n <= 0) return Math.max(0, fv - pv);
  const r = annualRate / 12;
  if (Math.abs(r) < 1e-9) return Math.max(0, (fv - pv) / n);
  const g = Math.pow(1 + r, n);
  return Math.max(0, ((fv - pv * g) * r) / (g - 1));
}

export function goalsReport(store: Store, ctx: { emergencyGoal: number; emergencyAvailable: number; capacity: number | null; rates: Map<number, number | null> }): GoalsReport {
  const t = today();
  const balances = currentBalances(store);
  const accounts = store.all<{ id: number; name: string; asset_class: string }>("SELECT id, name, asset_class FROM accounts WHERE archived=0");
  const accName = new Map(accounts.map((a) => [a.id, a.name]));
  const goals = store.all<Goal>("SELECT * FROM goals ORDER BY archived, sort, id");
  const from90 = new Date(Date.parse(t) - 90 * 86_400_000).toISOString().slice(0, 10);

  // Rythme : flux net mensuel moyen sur 90 jours vers un ensemble de comptes (hors virements entre eux)
  const pace = (ids: number[]): number | null => {
    if (!ids.length) return null;
    const ph = ids.map(() => "?").join(",");
    const span = store.get<{ first: string | null }>(`SELECT MIN(date) AS first FROM transactions WHERE account_id IN (${ph})`, ids)?.first;
    if (!span || monthsBetween(span, t) < 2) return null;
    const sum = store.scalar<number>(`SELECT COALESCE(SUM(amount),0) FROM transactions WHERE account_id IN (${ph}) AND date > ?`, [...ids, from90]);
    return round2(sum / (90 / 30.4375));
  };

  const rows: GoalRow[] = goals.map((g) => {
    let current = g.manual_amount ?? 0;
    let ids: number[] = [];
    if (g.source === "account" && g.account_id) { ids = [g.account_id]; current = balances.get(g.account_id)?.balance ?? 0; }
    else if (g.source === "class" && g.asset_class) { ids = accounts.filter((a) => a.asset_class === g.asset_class).map((a) => a.id); current = ids.reduce((s, id) => s + (balances.get(id)?.balance ?? 0), 0); }
    else if (g.source === "emergency") { ids = accounts.filter((a) => a.asset_class === "Liquidités" || a.asset_class === "Épargne sécurisée").map((a) => a.id); current = ctx.emergencyAvailable; }
    const targetAuto = g.source === "emergency" && (g.target === null || g.target === undefined);
    const target = targetAuto ? ctx.emergencyGoal : g.target ?? 0;
    current = round2(current);
    const remaining = round2(Math.max(0, target - current));
    const progress = target > 0 ? Math.min(1, Math.max(0, current / target)) : 0;
    const monthsLeft = g.target_date ? Math.max(0, round2(monthsBetween(t, g.target_date))) : null;
    const rate = g.source === "account" && g.account_id ? ctx.rates.get(g.account_id) ?? 0 : 0;
    const monthlyNeeded = monthsLeft !== null && remaining > 0 ? round2(monthlyPayment(current, target, Math.max(monthsLeft, 0), rate)) : remaining > 0 ? null : 0;
    const p = g.source === "manual" ? null : pace(ids);
    const projectedDate = remaining <= 0 ? t : p && p > 0 ? addMonths(t, Math.ceil(remaining / p)) : null;
    let status: GoalRow["status"];
    if (remaining <= 0) status = "Atteint";
    else if (!g.target_date) status = "Sans échéance";
    else if (!projectedDate) status = "À financer";
    else status = projectedDate <= g.target_date.slice(0, 7) + "-01" ? (monthlyNeeded !== null && p !== null && p >= monthlyNeeded * 1.15 ? "En avance" : "Dans les temps") : "En retard";
    return {
      id: g.id, name: g.name, source: g.source, account_id: g.account_id, account: g.account_id ? accName.get(g.account_id) ?? null : null, asset_class: g.asset_class,
      target: round2(target), targetAuto, target_date: g.target_date, manual_amount: g.manual_amount, archived: g.archived,
      current, remaining, progress, monthsLeft, rate, monthlyNeeded, pace: p, projectedDate, status,
    };
  });
  const active = rows.filter((r) => !r.archived);
  const monthlyNeeded = round2(active.reduce((s, r) => s + (r.monthlyNeeded ?? 0), 0));
  return {
    goals: rows,
    totals: { target: round2(active.reduce((s, r) => s + r.target, 0)), current: round2(active.reduce((s, r) => s + r.current, 0)), remaining: round2(active.reduce((s, r) => s + r.remaining, 0)), monthlyNeeded },
    capacity: ctx.capacity, margin: ctx.capacity === null ? null : round2(ctx.capacity - monthlyNeeded),
  };
}

export function saveGoal(store: Store, g: GoalInput): number {
  if (!g.name?.trim()) throw new Error("Le nom de l'objectif est obligatoire");
  const source = g.source ?? "manual";
  if (!GOAL_SOURCES.includes(source)) throw new Error(`Source inconnue : ${source}`);
  if (source !== "emergency" && !(Number(g.target) > 0)) throw new Error("Le montant visé doit être positif");
  if (source === "account" && !g.account_id) throw new Error("Choisis le compte suivi");
  if (source === "class" && !g.asset_class) throw new Error("Choisis la classe d'actif suivie");
  if (g.target_date && !/^\d{4}-\d{2}-\d{2}$/.test(g.target_date)) throw new Error("Date attendue au format AAAA-MM-JJ");
  const vals = [g.name.trim(), g.target ?? null, g.target_date || null, source, source === "account" ? g.account_id ?? null : null, source === "class" ? g.asset_class ?? null : null, g.manual_amount ?? 0, g.archived ?? 0];
  if (g.id) {
    store.run("UPDATE goals SET name=?, target=?, target_date=?, source=?, account_id=?, asset_class=?, manual_amount=?, archived=? WHERE id=?", [...vals, g.id]);
    return g.id;
  }
  const sort = store.scalar<number>("SELECT COALESCE(MAX(sort),0)+1 FROM goals");
  return store.run("INSERT INTO goals(name,target,target_date,source,account_id,asset_class,manual_amount,archived,sort) VALUES(?,?,?,?,?,?,?,?,?)", [...vals, sort]);
}
