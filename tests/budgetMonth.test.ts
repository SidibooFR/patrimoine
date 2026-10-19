import { describe, it, expect } from "vitest";
import { Store } from "../core/db.js";
import { createApi } from "../core/api.js";
import { budgetMonthReport, copyBudgets } from "../core/reports.js";

async function setup() {
  const store = await Store.open(null);
  const api = createApi(store);
  const cat = (n: string) => store.scalar<number>("SELECT id FROM categories WHERE name=?", [n])!;
  const account_id = store.scalar<number>("SELECT id FROM accounts LIMIT 1")!;
  const add = (date: string, name: string, amount: number) => api.addTransaction({ date, account_id, label: name, amount, category_id: cat(name) });
  return { store, api, cat, add };
}

describe("budget : totaux prévus et reprise N−1", () => {
  it("plan = somme des budgets saisis, reste et taux prévus", async () => {
    const { api, cat } = await setup();
    api.setBudget(cat("Salaire"), 2026, 2000);
    api.setBudget(cat("Loyer & charges"), 2026, 800);
    api.setBudget(cat("Courses"), 2026, 400);
    api.setBudget(cat("Épargne (livrets)"), 2026, 300);
    const b = api.budget(2026);
    expect(b.plan).toEqual({ income: 2000, expense: 1200, savings: 300, remaining: 800, rate: 0.4, count: 4 });
    expect(api.budget(2027).prevYearCount).toBe(4);
    expect(api.budget(2026).prevYearCount).toBe(0);
  });

  it("sans budget : plan vide et taux null", async () => {
    const { api } = await setup();
    expect(api.budget(2026).plan).toEqual({ income: 0, expense: 0, savings: 0, remaining: 0, rate: null, count: 0 });
  });

  it("copie sans écraser les montants déjà saisis", async () => {
    const { store, api, cat } = await setup();
    api.setBudget(cat("Salaire"), 2025, 2000);
    api.setBudget(cat("Courses"), 2025, 400);
    api.setBudget(cat("Courses"), 2026, 450);
    expect(copyBudgets(store, 2025, 2026)).toEqual({ copied: 1, skipped: 1 });
    const b = api.budget(2026);
    expect(b.rows.find((r) => r.name === "Salaire")?.budget).toBe(2000);
    expect(b.rows.find((r) => r.name === "Courses")?.budget).toBe(450);
    expect(copyBudgets(store, 2026, 2026)).toEqual({ copied: 0, skipped: 0 });
    expect(api.copyBudgets(2030, 2026)).toEqual({ copied: 0, skipped: 0 });
  });
});

describe("budget : suivi du mois", () => {
  it("mois en cours : dépassement, rythme, projection, hors budget", async () => {
    const { store, api, cat, add } = await setup();
    api.setBudget(cat("Salaire"), 2026, 2000);
    api.setBudget(cat("Courses"), 2026, 400);
    api.setBudget(cat("Restaurants & sorties"), 2026, 100);
    api.setBudget(cat("Loyer & charges"), 2026, 800);
    api.setBudget(cat("Épargne (livrets)"), 2026, 300);
    add("2026-10-02", "Salaire", 2000);
    add("2026-10-10", "Courses", -300);          // 300/400 au jour 20 → projection 465 > 400
    add("2026-10-05", "Restaurants & sorties", -120); // dépassé
    add("2026-10-01", "Loyer & charges", -800);  // charge fixe payée le 1er : pas de projection au rythme des jours
    add("2026-10-12", "Santé", -45);             // pas de budget
    const r = budgetMonthReport(store, "2026-10", "2026-10-20");
    expect(r.days).toEqual({ elapsed: 20, total: 31 });
    const row = (n: string) => r.rows.find((x) => x.name === n)!;
    expect(row("Courses")).toMatchObject({ actual: 300, remaining: 100, status: "warn", projected: 465 });
    expect(row("Courses").ratio).toBeCloseTo(0.75, 6);
    expect(row("Restaurants & sorties")).toMatchObject({ actual: 120, remaining: -20, status: "over" });
    expect(row("Loyer & charges")).toMatchObject({ fixed: true, projected: 800, status: "ok" });
    expect(row("Courses").fixed).toBe(false);
    // Revenus et épargne : pas de jugement tant que le mois n'est pas terminé
    expect(row("Salaire")).toMatchObject({ actual: 2000, remaining: 0, status: "ok", projected: null });
    expect(row("Épargne (livrets)")).toMatchObject({ actual: 0, remaining: -300, status: "ok" });
    expect(r.untracked).toEqual([{ category_id: cat("Santé"), name: "Santé", actual: 45 }]);
    expect(r.untrackedTotal).toBe(45);
    // 465 (Courses) + 186 (Restaurants) + 800 (Loyer)
    expect(r.totals.expense).toEqual({ budget: 1300, actual: 1220, projected: 1451, over: 20 });
    expect(r.totals.income).toEqual({ budget: 2000, actual: 2000 });
  });

  it("charge fixe non encore payée : attendue au budget ; décochée, elle redevient variable", async () => {
    const { store, api, cat, add } = await setup();
    api.setBudget(cat("Loyer & charges"), 2026, 800);
    add("2026-10-02", "Loyer & charges", -850);
    expect(budgetMonthReport(store, "2026-10", "2026-10-20").rows[0]).toMatchObject({ fixed: true, projected: 850, status: "over" });
    api.setBudget(cat("Loyer & charges"), 2026, 900);
    expect(budgetMonthReport(store, "2026-10", "2026-10-20").rows[0]).toMatchObject({ projected: 900, status: "ok" });
    api.setSetting("budget_fixed_categories", "");
    expect(budgetMonthReport(store, "2026-10", "2026-10-20").rows[0]).toMatchObject({ fixed: false, projected: 1317.5, status: "warn" });
  });

  it("projection trop bruyante avant la mi-mois : pas d'alerte", async () => {
    const { store, api, cat, add } = await setup();
    api.setBudget(cat("Courses"), 2026, 400);
    add("2026-10-02", "Courses", -150); // 150 au jour 3 → projection 1 550, mais mois à 10 %
    const row = budgetMonthReport(store, "2026-10", "2026-10-03").rows[0];
    expect(row.projected).toBe(1550);
    expect(row.status).toBe("ok");
  });

  it("mois terminé : épargne sous le budget, pas de projection", async () => {
    const { store, api, cat, add } = await setup();
    api.setBudget(cat("Courses"), 2026, 400);
    api.setBudget(cat("Épargne (livrets)"), 2026, 300);
    add("2026-09-10", "Courses", -380);
    add("2026-09-28", "Épargne (livrets)", -200);
    const r = budgetMonthReport(store, "2026-09", "2026-10-20");
    expect(r.days).toEqual({ elapsed: 30, total: 30 });
    const row = (n: string) => r.rows.find((x) => x.name === n)!;
    expect(row("Courses")).toMatchObject({ status: "ok", projected: null, remaining: 20 });
    expect(row("Épargne (livrets)")).toMatchObject({ actual: 200, remaining: -100, status: "under" });
    expect(r.totals.expense.projected).toBeNull();
  });

  it("mois futur : rien d'écoulé", async () => {
    const { store, api, cat } = await setup();
    api.setBudget(cat("Courses"), 2026, 400);
    const r = budgetMonthReport(store, "2026-12", "2026-10-20");
    expect(r.days).toEqual({ elapsed: 0, total: 31 });
    expect(r.rows[0]).toMatchObject({ actual: 0, status: "ok", projected: null });
  });

  it("api.budgetMonth sans argument : mois courant", async () => {
    const { api } = await setup();
    expect(api.budgetMonth().month).toBe(new Date().toISOString().slice(0, 7));
  });
});
