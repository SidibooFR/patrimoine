import { describe, it, expect } from "vitest";
import { buildScenarios, categoryAverages, fixedCategories, budgetScenarios, applyBudgetScenario, DEFAULT_FIXED, type Scenario, type ScenarioKey } from "../core/budgetPlan.js";
import { Store } from "../core/db.js";
import { createApi } from "../core/api.js";

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

  it("Revenus nuls avec dépenses : aucune proposition", () => {
    const s = buildScenarios(ROWS.filter((r) => r.kind !== "Revenu"), FIXED);
    expect(s.every((x) => x.amounts.length === 0)).toBe(true);
  });

  it("Moyenne négative : aucune proposition", () => {
    const m = get(buildScenarios([...ROWS, row(8, "Santé", "Dépense", -30)], FIXED), "moyenne");
    expect(amt(m, 8)).toBeUndefined();
  });

  it("Toujours 5 scénarios dans l'ordre", () => {
    expect(buildScenarios(ROWS, FIXED).map((x) => x.key)).toEqual(["moyenne", "equilibre", "econome", "loisirs", "investissement"]);
  });
});

describe("budgetPlan : base et application", () => {
  const AS_OF = "2026-10-18";
  // Les 12 mois complets avant octobre 2026
  const WINDOW = Array.from({ length: 12 }, (_, i) => { const d = new Date(Date.UTC(2025, 9 + i, 15)); return d.toISOString().slice(0, 10); });
  async function setup() {
    const store = await Store.open(null);
    const api = createApi(store);
    const cat = (n: string) => store.scalar<number>("SELECT id FROM categories WHERE name=?", [n])!;
    const account_id = store.scalar<number>("SELECT id FROM accounts LIMIT 1")!;
    const add = (date: string, name: string, amount: number) => api.addTransaction({ date, account_id, label: name, amount, category_id: cat(name) });
    const avg = (name: string) => categoryAverages(store, AS_OF).rows.find((r) => r.name === name)?.average;
    return { store, api, cat, add, avg };
  }

  it("fenêtre de 12 mois complets, mois en cours exclu", async () => {
    const { store, add, avg } = await setup();
    for (const d of WINDOW) add(d, "Restaurants & sorties", -100);
    add("2026-10-05", "Restaurants & sorties", -9999);
    add("2025-09-15", "Restaurants & sorties", -9999);
    expect(categoryAverages(store, AS_OF).period).toEqual({ from: "2025-10", to: "2026-09" });
    expect(avg("Restaurants & sorties")).toBeCloseTo(100, 6);
  });

  it("dénominateur depuis le premier mois actif", async () => {
    const { add, avg } = await setup();
    for (const d of WINDOW.slice(6)) add(d, "Courses", -400);
    expect(avg("Courses")).toBeCloseTo(400, 6);
  });

  it("les remboursements rapprochés sont déduits dans la fenêtre", async () => {
    const { api, add, avg } = await setup();
    const exp = add("2026-03-10", "Santé", -100);
    const ref = add("2026-03-20", "Remboursements", 60);
    api.linkRefund(ref, { expense_id: exp });
    // Santé active depuis mars 2026 : 7 mois (mars → septembre)
    expect(avg("Santé")).toBeCloseTo(40 / 7, 2);
  });

  it("charges : défaut, réglage vide, nom inconnu", async () => {
    const { store, api } = await setup();
    expect(fixedCategories(store)).toEqual(DEFAULT_FIXED);
    api.setSetting("budget_fixed_categories", "");
    expect(fixedCategories(store)).toEqual([]);
    api.setSetting("budget_fixed_categories", "Loyer & charges|Inexistante");
    const c = budgetScenarios(store, 2026, undefined, AS_OF).fixedCandidates;
    expect(c.some((x) => x.name === "Inexistante")).toBe(false);
    expect(c.find((x) => x.name === "Loyer & charges")?.checked).toBe(true);
    expect(c.find((x) => x.name === "Courses")?.checked).toBe(false);
  });

  it("application : ne remplit que les cases vides, idempotente", async () => {
    const { store, api, cat, add } = await setup();
    for (const d of WINDOW) { add(d, "Salaire", 2000); add(d, "Restaurants & sorties", -300); }
    api.setBudget(cat("Restaurants & sorties"), 2026, 42);
    const r = applyBudgetScenario(store, 2026, "moyenne", undefined, AS_OF);
    expect(r).toEqual({ filled: 1, skipped: 1 });
    const b = (n: string) => store.scalar<number>("SELECT monthly_amount FROM budgets WHERE category_id=? AND year=2026", [cat(n)]);
    expect(b("Salaire")).toBe(2000);
    expect(b("Restaurants & sorties")).toBe(42);
    expect(applyBudgetScenario(store, 2026, "moyenne", undefined, AS_OF).filled).toBe(0);
  });

  it("aucune transaction n'est modifiée", async () => {
    const { store, add } = await setup();
    for (const d of WINDOW) { add(d, "Salaire", 2000); add(d, "Courses", -500); }
    const snap = () => JSON.stringify(store.all("SELECT * FROM transactions ORDER BY id"));
    const before = snap();
    applyBudgetScenario(store, 2026, "econome", undefined, AS_OF);
    expect(snap()).toBe(before);
  });

  it("dépense ponctuelle : moyennée depuis le début des données, pas depuis sa date", async () => {
    const { add, avg } = await setup();
    for (const d of WINDOW) add(d, "Salaire", 2000);
    add("2026-09-10", "Impôts & taxes", -1200);
    expect(avg("Impôts & taxes")).toBeCloseTo(100, 6);
  });

  it("Investissement sans historique bourse/crypto : le surplus y va quand même", async () => {
    const { store, cat, add } = await setup();
    for (const d of WINDOW) { add(d, "Salaire", 2000); add(d, "Restaurants & sorties", -1600); add(d, "Épargne (livrets)", -100); }
    const inv = budgetScenarios(store, 2026, [], AS_OF).scenarios.find((s) => s.key === "investissement")!;
    expect(inv.invest).toBeGreaterThan(0);
    expect(inv.amounts.some((a) => a.category_id === cat("Investissement bourse"))).toBe(true);
  });

  it("base vide : 5 scénarios, rien à remplir", async () => {
    const { store } = await setup();
    const s = budgetScenarios(store, 2026, undefined, AS_OF).scenarios;
    expect(s).toHaveLength(5);
    expect(s.every((x) => x.fillable === 0)).toBe(true);
  });
});
