import { describe, it, expect } from "vitest";
import { buildScenarios, type Scenario, type ScenarioKey } from "../core/budgetPlan.js";

const row = (id: number, name: string, kind: string, average: number) => ({ category_id: id, name, kind, average });
// R = 2000, C = 800 (Loyer), V = 1000 (Restaurants 600 + Courses 400), E : livrets 100, bourse 100, crypto 0
const ROWS = [row(1, "Salaire", "Revenu", 2000), row(2, "Loyer & charges", "Dépense", 800),
  row(3, "Restaurants & sorties", "Dépense", 600), row(4, "Courses", "Dépense", 400),
  row(5, "Épargne (livrets)", "Épargne", 100), row(6, "Investissement bourse", "Épargne", 100),
  row(7, "Investissement crypto", "Épargne", 0)];
const RICHE = ROWS.map((r) => (r.name === "Salaire" ? { ...r, average: 3000 } : r));
const FIXED = ["Loyer & charges"];
const get = (s: Scenario[], k: ScenarioKey) => s.find((x) => x.key === k)!;
const amt = (s: Scenario, id: number) => s.amounts.find((a) => a.category_id === id)?.amount;

describe("budgetPlan : scénarios", () => {
  it("Ma moyenne reprend les moyennes arrondies", () => {
    const m = get(buildScenarios(ROWS, FIXED), "moyenne");
    expect(m.k).toBe(1);
    expect(m.rate).toBeCloseTo(0.10, 6);
    expect(amt(m, 3)).toBe(600);
    expect(amt(m, 7)).toBeUndefined();
  });

  it("Équilibré : vise 20 % mais borné à −15 %", () => {
    const e = get(buildScenarios(ROWS, FIXED), "equilibre");
    expect(e.k).toBeCloseTo(0.85, 6);
    expect(e.rate).toBeCloseTo(0.175, 6);
    expect(amt(e, 2)).toBe(800);
    expect(amt(e, 3)).toBe(510);
    expect(amt(e, 5)).toBe(180);
    expect(amt(e, 6)).toBe(180);
  });

  it("Économe : t0 + 10 pts atteint sans dépasser −25 %", () => {
    const e = get(buildScenarios(ROWS, FIXED), "econome");
    expect(e.k).toBeCloseTo(0.8, 6);
    expect(e.rate).toBeCloseTo(0.20, 6);
  });

  it("Investissement : même k qu'Économe, surplus uniquement bourse et crypto", () => {
    const i = get(buildScenarios(ROWS, FIXED), "investissement");
    expect(i.k).toBeCloseTo(0.8, 6);
    expect(amt(i, 5)).toBe(100);
    expect(amt(i, 6)).toBe(300);
    expect(i.invest).toBe(300);
  });

  it("Loisirs : plancher de 10 % quand t0 = 10 %", () => {
    expect(get(buildScenarios(ROWS, FIXED), "loisirs").k).toBe(1);
  });

  it("Loisirs : +15 % quand le taux le permet", () => {
    const l = get(buildScenarios(RICHE, FIXED), "loisirs");
    expect(l.k).toBeCloseTo(1.15, 6);
    expect(amt(l, 5)).toBe(30);
    expect(amt(l, 6)).toBe(30);
  });

  it("Loisirs : jamais de montant négatif", () => {
    const rows = [row(1, "Salaire", "Revenu", 3000), row(2, "Loyer & charges", "Dépense", 800),
      row(3, "Restaurants & sorties", "Dépense", 600), row(4, "Courses", "Dépense", 1400),
      row(5, "Épargne (livrets)", "Épargne", 50), row(6, "Investissement bourse", "Épargne", 0)];
    const s = buildScenarios(rows, FIXED);
    expect(s.every((x) => x.amounts.every((a) => a.amount > 0))).toBe(true);
  });

  it("Équilibré ne bouge pas si le taux dépasse déjà 20 %", () => {
    expect(get(buildScenarios(RICHE, FIXED), "equilibre").k).toBe(1);
  });

  it("Revenus nuls : k = 1 et taux null partout", () => {
    const s = buildScenarios(ROWS.filter((r) => r.kind !== "Revenu"), FIXED);
    for (const x of s) { expect(x.k).toBe(1); expect(x.rate).toBeNull(); }
  });

  it("Moyenne négative : aucune proposition", () => {
    const m = get(buildScenarios([...ROWS, row(8, "Santé", "Dépense", -30)], FIXED), "moyenne");
    expect(amt(m, 8)).toBeUndefined();
  });

  it("Toujours 5 scénarios dans l'ordre", () => {
    expect(buildScenarios(ROWS, FIXED).map((x) => x.key)).toEqual(["moyenne", "equilibre", "econome", "loisirs", "investissement"]);
  });
});
