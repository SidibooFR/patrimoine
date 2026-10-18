// Assistant de budgétisation : propose des budgets mensuels par scénario à partir des moyennes réelles.
import { round2 } from "./finance.js";

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

/** Charges pré-cochées quand le réglage `budget_fixed_categories` est absent. */
export const DEFAULT_FIXED = ["Loyer & charges", "Énergie, internet & téléphone", "Assurances", "Abonnements", "Crédits", "Impôts & taxes", "Frais bancaires"];

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
    const amounts = rows.map((r) => ({ category_id: r.category_id, amount: round10(value.get(r.category_id) ?? 0) })).filter((a) => a.amount > 0);
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
