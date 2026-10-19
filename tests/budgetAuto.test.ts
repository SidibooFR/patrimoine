import { describe, it, expect } from "vitest";
import { buildScenarios, goalTargets, autoBudgets, effectiveBudget, budgetPrepare, setBudgetScenario, type Scenario, type ScenarioKey, type GoalTarget } from "../core/budgetPlan.js";
import { Store } from "../core/db.js";
import { createApi } from "../core/api.js";

const row = (id: number, name: string, kind: string, average: number) => ({ category_id: id, name, kind, average });
// R = 2000, C = 800 (Loyer), V = 1000, E : livrets 100, bourse 100, crypto 0 → t0 = 10 %
const ROWS = [row(1, "Salaire", "Revenu", 2000), row(2, "Loyer & charges", "Dépense", 800),
  row(3, "Restaurants & sorties", "Dépense", 600), row(4, "Courses", "Dépense", 400),
  row(5, "Épargne (livrets)", "Épargne", 100), row(6, "Investissement bourse", "Épargne", 100),
  row(7, "Investissement crypto", "Épargne", 0)];
const RICHE = ROWS.map((r) => (r.name === "Salaire" ? { ...r, average: 3000 } : r));
const FIXED = ["Loyer & charges"];
const goal = (monthly: number, category_id = 5, name = "Voyage au Japon"): GoalTarget => ({ goal_id: 1, name, monthly, category_id, target_date: "2027-10-01" });
const get = (s: Scenario[], k: ScenarioKey) => s.find((x) => x.key === k)!;
const amt = (s: Scenario, id: number) => s.amounts.find((a) => a.category_id === id)?.amount;

describe("budgetPlan : objectifs dans les scénarios", () => {
  it("sans objectif : comportement inchangé", () => {
    const a = buildScenarios(ROWS, FIXED), b = buildScenarios(ROWS, FIXED, []);
    expect(a).toEqual(b);
    expect(a.every((s) => s.goalsMonthly === 0 && s.goalsShortfall === 0)).toBe(true);
  });

  it("le surplus sert d'abord la catégorie qui porte l'objectif", () => {
    // Équilibré : k = 0,85 → surplus 150 ; livrets doit monter de 100 à 300 → reçoit tout le surplus (250)
    const e = get(buildScenarios(ROWS, FIXED, [goal(300)]), "equilibre");
    expect(e.k).toBeCloseTo(0.85, 6);
    expect(amt(e, 5)).toBe(250);
    expect(amt(e, 6)).toBe(100);
    expect(e.goalsMonthly).toBe(300);
    expect(e.goalsShortfall).toBe(0); // reste 350 ≥ 300
  });

  it("l'objectif relève la cible d'épargne, dans les bornes du scénario", () => {
    // Objectif 500 → cible 25 % ; Équilibré borné à −15 % (k = 0,85, reste 350 → il manque 150)
    const s = buildScenarios(ROWS, FIXED, [goal(500)]);
    expect(get(s, "equilibre").k).toBeCloseTo(0.85, 6);
    expect(get(s, "equilibre").goalsShortfall).toBe(150);
    // Économe : cible 25 % → k = 0,7 borné à 0,75 → reste 450, il manque 50 ; surplus 250 vers livrets (100 → 350)
    const ec = get(s, "econome");
    expect(ec.k).toBeCloseTo(0.75, 6);
    expect(ec.goalsShortfall).toBe(50);
    expect(amt(ec, 5)).toBe(350);
    expect(amt(ec, 6)).toBe(100);
    // Ma moyenne ne bouge pas mais signale le manque
    expect(get(s, "moyenne").k).toBe(1);
    expect(get(s, "moyenne").goalsShortfall).toBe(300);
  });

  it("Loisirs : l'objectif plafonne la hausse et protège sa catégorie", () => {
    // RICHE : t0 = 40 % ; objectif 100 sur livrets (moyenne 100) → la baisse d'épargne épargne livrets
    const l = get(buildScenarios(RICHE, FIXED, [goal(100)]), "loisirs");
    expect(l.k).toBeCloseTo(1.15, 6);
    expect(amt(l, 5)).toBe(100);
    expect(amt(l, 6)).toBe(30);
    // Objectif qui exige 35 % d'épargne : la hausse est limitée (k < 1,15), jamais de baisse
    const l2 = get(buildScenarios(RICHE, FIXED, [goal(1050)]), "loisirs");
    expect(l2.k).toBeCloseTo(1.15 - 0.0, 1);
    expect(l2.k).toBeLessThanOrEqual(1.15);
    expect(l2.k).toBeGreaterThanOrEqual(1);
    expect(l2.savings).toBeGreaterThanOrEqual(1050 - 1e-6);
  });

  it("Investissement : l'objectif livrets est servi avant le surplus bourse/crypto", () => {
    const i = get(buildScenarios(ROWS, FIXED, [goal(150)]), "investissement");
    // k = 0,8 → surplus 200 ; livrets 100 → 150 (50), puis 150 vers bourse (100 → 250)
    expect(amt(i, 5)).toBe(150);
    expect(amt(i, 6)).toBe(250);
    expect(i.invest).toBe(250);
  });
});

const AS_OF = "2026-10-18";
const WINDOW = Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(2025, 9 + i, 15)).toISOString().slice(0, 10));
async function setup() {
  const store = await Store.open(null);
  const api = createApi(store);
  const cat = (n: string) => store.scalar<number>("SELECT id FROM categories WHERE name=?", [n])!;
  const acc = (n: string) => store.scalar<number>("SELECT id FROM accounts WHERE name=?", [n])!;
  const account_id = store.scalar<number>("SELECT id FROM accounts LIMIT 1")!;
  const add = (date: string, name: string, amount: number) => api.addTransaction({ date, account_id, label: name, amount, category_id: cat(name) });
  const history = () => { for (const d of WINDOW) { add(d, "Salaire", 2000); add(d, "Loyer & charges", -800); add(d, "Courses", -400); add(d, "Restaurants & sorties", -600); add(d, "Épargne (livrets)", -100); add(d, "Investissement bourse", -100); } };
  return { store, api, cat, acc, add, history };
}

describe("budgetPlan : objectifs → catégorie d'épargne", () => {
  it("manuel → livrets, compte LEP → livrets, classe Actions & ETF → bourse ; sans échéance ou archivé : ignoré", async () => {
    const { store, api, cat, acc } = await setup();
    api.saveGoal({ name: "Voyage au Japon", source: "manual", target: 5000, target_date: "2027-10-18" });
    api.saveGoal({ name: "Remplir le LEP", source: "account", account_id: acc("Boursobank – LEP"), target: 1200, target_date: "2027-10-18" });
    api.saveGoal({ name: "ETF monde", source: "class", asset_class: "Actions & ETF", target: 2400, target_date: "2028-10-18" });
    api.saveGoal({ name: "Un jour", source: "manual", target: 9999 });
    api.saveGoal({ name: "Vieux", source: "manual", target: 9999, target_date: "2027-01-01", archived: 1 });
    const t = goalTargets(store);
    expect(t.map((g) => g.name)).toEqual(["Voyage au Japon", "Remplir le LEP", "ETF monde"]);
    const by = (n: string) => t.find((g) => g.name === n)!;
    expect(by("Voyage au Japon").category_id).toBe(cat("Épargne (livrets)"));
    // Le versement vient de l'onglet Objectifs, calculé à la date du jour : ≈ 5 000 € / 12 mois
    expect(by("Voyage au Japon").monthly).toBeGreaterThan(400);
    expect(by("Voyage au Japon").monthly).toBeLessThan(440);
    expect(by("Remplir le LEP").category_id).toBe(cat("Épargne (livrets)"));
    expect(by("ETF monde").category_id).toBe(cat("Investissement bourse"));
    expect(by("ETF monde").monthly).toBeGreaterThan(95);
    expect(by("ETF monde").monthly).toBeLessThan(110);
  });
});

describe("budgetPlan : budget automatique", () => {
  it("scénario suivi : catégories vides remplies, montants saisis prioritaires, passé figé", async () => {
    const { store, api, cat, history } = await setup();
    history();
    expect(autoBudgets(store, 2026, AS_OF)).toBeUndefined();
    expect(api.setBudgetScenario("equilibre")).toBe("equilibre");
    expect(() => api.setBudgetScenario("nimporte" as ScenarioKey)).toThrow();
    api.setBudget(cat("Courses"), 2026, 450);
    const b = effectiveBudget(store, 2026, AS_OF);
    expect(b.scenario).toBe("equilibre");
    const r = (n: string) => b.rows.find((x) => x.name === n)!;
    expect(r("Courses")).toMatchObject({ budget: 450, source: "manuel" });
    expect(r("Restaurants & sorties")).toMatchObject({ budget: 510, source: "auto" }); // 600 × 0,85
    expect(r("Loyer & charges")).toMatchObject({ budget: 800, source: "auto" });
    expect(r("Salaire")).toMatchObject({ budget: 2000, source: "auto" });
    expect(r("Santé")).toMatchObject({ budget: null, source: null });
    expect(b.plan.count).toBeGreaterThan(4);
    // L'année précédente ne reçoit rien d'automatique
    expect(effectiveBudget(store, 2025, AS_OF).rows.every((x) => x.source !== "auto")).toBe(true);
    expect(effectiveBudget(store, 2025, AS_OF).scenario).toBeNull();
    // Retour au manuel
    api.setBudgetScenario(null);
    expect(effectiveBudget(store, 2026, AS_OF).rows.filter((x) => x.source === "auto")).toHaveLength(0);
  });

  it("le budget automatique suit les relevés et les objectifs", async () => {
    const { store, api, add, history } = await setup();
    history();
    setBudgetScenario(store, "moyenne");
    const before = effectiveBudget(store, 2026, AS_OF).rows.find((x) => x.name === "Courses")!.budget;
    expect(before).toBe(400);
    for (const d of WINDOW) add(d, "Courses", -120); // les courses passent à 520 € / mois
    expect(effectiveBudget(store, 2026, AS_OF).rows.find((x) => x.name === "Courses")!.budget).toBe(520);
    // Un objectif de 5 000 € à 12 mois relève l'épargne livrets (100 → ~420) en Équilibré
    api.saveGoal({ name: "Voyage au Japon", source: "manual", target: 5000, target_date: "2027-10-18" });
    setBudgetScenario(store, "equilibre");
    const liv = effectiveBudget(store, 2026, AS_OF).rows.find((x) => x.name === "Épargne (livrets)")!;
    expect(liv.source).toBe("auto");
    expect(liv.budget).toBeGreaterThanOrEqual(250); // surplus −15 % de 1 120 = 168 → 100 + 168 ≈ 270
    expect(api.budgetScenarios(2026).scenarios.find((s) => s.key === "equilibre")!.goalsShortfall).toBeGreaterThan(0);
  });

  it("suivi du mois avec budget automatique", async () => {
    const { store, api, add, history, cat } = await setup();
    history();
    api.setBudgetScenario("moyenne");
    add("2026-10-10", "Courses", -450);
    const m = api.budgetMonth("2026-10");
    expect(m.rows.find((r) => r.category_id === cat("Courses"))).toMatchObject({ budget: 400, actual: 450, status: "over" });
  });
});

describe("budgetPlan : à prévoir chaque mois", () => {
  it("compte courant, épargne et objectifs, prélèvements imminents", async () => {
    const { store, api, add, acc, cat, history } = await setup();
    history();
    api.setBudgetScenario("moyenne");
    api.saveGoal({ name: "Voyage au Japon", source: "manual", target: 5000, target_date: "2027-10-18" });
    api.setSnapshotMonth("2026-10", { [acc("BNP – Compte courant")]: 1500 });
    const p = budgetPrepare(store, AS_OF);
    expect(p.scenario).toBe("moyenne");
    expect(p.fixed.rows.map((r) => r.name)).toEqual(["Loyer & charges"]);
    expect(p.fixed.total).toBe(800);
    expect(p.variable.total).toBe(1000);
    expect(p.checking.accounts.map((a) => a.name)).toEqual(["BNP – Compte courant"]);
    expect(p.checking).toMatchObject({ total: 1500, needed: 1800, margin: -300 });
    const liv = p.savings.rows.find((r) => r.name === "Épargne (livrets)")!;
    expect(liv.amount).toBe(100);
    expect(liv.goals.map((g) => g.name)).toEqual(["Voyage au Japon"]);
    expect(liv.covered).toBe(false);
    expect(p.goals.rows[0].covered).toBe(false);
    expect(p.goals.shortfall).toBeGreaterThan(200);
    expect(p.income).toEqual({ budget: 2000, average: 2000 });
    // Sans historique récurrent détectable d'abonnement : liste vide mais structure présente
    expect(p.upcoming.days).toBe(30);
    expect(Array.isArray(p.upcoming.rows)).toBe(true);
    expect(cat("Salaire")).toBeGreaterThan(0);
    void add;
  });

  it("sans budget ni compte : rapport vide mais valide", async () => {
    const { store } = await setup();
    const p = budgetPrepare(store, AS_OF);
    expect(p.fixed.total).toBe(0);
    expect(p.savings.rows).toEqual([]);
    expect(p.checking.total).toBeNull();
    expect(p.checking.margin).toBeNull();
  });
});
