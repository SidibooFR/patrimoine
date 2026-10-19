import { describe, it, expect } from "vitest";
import { Store } from "../core/db.js";
import { createApi } from "../core/api.js";
import { budgetMonthReport, saveBudgetMonth } from "../core/reports.js";

async function setup() {
  const store = await Store.open(null);
  const api = createApi(store);
  const cat = (n: string) => store.scalar<number>("SELECT id FROM categories WHERE name=?", [n])!;
  const account_id = store.scalar<number>("SELECT id FROM accounts LIMIT 1")!;
  const add = (date: string, name: string, amount: number) => api.addTransaction({ date, account_id, label: name, amount, category_id: cat(name) });
  return { store, api, cat, add };
}

describe("budget : montant propre à un mois", () => {
  it("prime sur l'annuel, reporté jusqu'au mois de fin, null le retire", async () => {
    const { store, api, cat } = await setup();
    const courses = cat("Courses");
    api.setBudget(courses, 2026, 400);
    expect(api.saveBudgetMonth("2026-10", [{ category_id: courses, amount: 550 }], "2026-12")).toEqual({ saved: 1, months: 3 });
    const b = api.budget(2026);
    const r = b.rows.find((x) => x.category_id === courses)!;
    expect(r.budget).toBe(400);
    expect(r.monthBudgets.slice(8)).toEqual([400, 550, 550, 550]);
    expect(r.overrides).toBe(3);
    // Le suivi du mois lit le montant du mois
    expect(budgetMonthReport(store, "2026-11", "2026-11-10").rows.find((x) => x.category_id === courses)!.budget).toBe(550);
    expect(budgetMonthReport(store, "2026-09", "2026-11-10").rows.find((x) => x.category_id === courses)!.budget).toBe(400);
    // Retrait sur novembre seulement
    saveBudgetMonth(store, "2026-11", [{ category_id: courses, amount: null }]);
    expect(api.budget(2026).rows.find((x) => x.category_id === courses)!.monthBudgets.slice(9)).toEqual([550, 400, 550]);
  });

  it("sans budget annuel : le mois seul est budgété, suivi et grille cohérents", async () => {
    const { store, api, cat, add } = await setup();
    const loisirs = cat("Loisirs");
    saveBudgetMonth(store, "2026-10", [{ category_id: loisirs, amount: 80 }]);
    add("2026-10-05", "Loisirs", -95);
    const r = api.budget(2026).rows.find((x) => x.category_id === loisirs)!;
    expect(r.budget).toBeNull();
    expect(r.monthBudgets[9]).toBe(80);
    expect(budgetMonthReport(store, "2026-10", "2026-10-20").rows.find((x) => x.category_id === loisirs)).toMatchObject({ budget: 80, actual: 95, status: "over" });
    expect(budgetMonthReport(store, "2026-09", "2026-10-20").untracked).toEqual([]);
  });

  it("validation : format du mois, mois de fin, montant", async () => {
    const { store, cat } = await setup();
    const c = cat("Courses");
    expect(() => saveBudgetMonth(store, "2026-13", [{ category_id: c, amount: 1 }])).toThrow();
    expect(() => saveBudgetMonth(store, "2026-10", [{ category_id: c, amount: 1 }], "2026-09")).toThrow();
    expect(() => saveBudgetMonth(store, "2026-10", [{ category_id: c, amount: -5 }])).toThrow();
    expect(saveBudgetMonth(store, "2026-10", [])).toEqual({ saved: 0, months: 1 });
  });
});
