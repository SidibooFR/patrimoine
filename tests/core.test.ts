import { describe, it, expect, beforeAll } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { Store } from "../core/db.js";
import { createApi, type Api } from "../core/api.js";
import { xirr, futureValue, monthsToGoal } from "../core/finance.js";
import { detectSource, parseBnp, parseBoursobank, parseRevolut } from "../core/importers.js";

const FX = path.join(__dirname, "fixtures");
/** Les relevés réels ne sont pas versionnés : sans eux, les tests qui les lisent sont ignorés. */
const HAS_FX = fs.existsSync(path.join(FX, "revolut.csv"));

describe("finance", () => {
  it("xirr retrouve un taux connu", () => {
    // 1000 placés, 1100 récupérés un an plus tard → 10 %
    const r = xirr([{ date: "2025-01-01", amount: -1000 }, { date: "2026-01-01", amount: 1100 }]);
    expect(r).toBeCloseTo(0.1, 3);
  });
  it("xirr null sans flux positif", () => {
    expect(xirr([{ date: "2025-01-01", amount: -1000 }])).toBeNull();
  });
  it("futureValue et monthsToGoal cohérents avec Excel", () => {
    // FV(6%/12, 120, -400, -3000) = 71 009,93 (Excel)
    expect(futureValue(0.06, 120, 400, 3000)).toBeCloseTo(71009.93, 1);
    // NPER(6%/12, -400, -3209.62, 100000) = 154,7 mois (Excel)
    const m = monthsToGoal(0.06, 400, 3209.62, 100000)!;
    expect(m).toBeCloseTo(154.7, 0);
  });
});

describe.skipIf(!HAS_FX)("parsers", () => {
  it("détecte les banques", () => {
    expect(detectSource(path.join(FX, "bnp.xls"))).toBe("bnp");
    expect(detectSource(path.join(FX, "export-operations-bourso-courant.xlsx"))).toBe("boursobank");
    expect(detectSource(path.join(FX, "revolut.csv"))).toBe("revolut");
  });
  it("BNP : 27 opérations, dates françaises converties", () => {
    const rows = parseBnp(path.join(FX, "bnp.xls"));
    expect(rows).toHaveLength(27);
    expect(rows[0]).toMatchObject({ date: "2026-10-08", amount: -110, bank_category: "Électricité, gaz" });
  });
  it("Boursobank : format 13 colonnes et 12 colonnes", () => {
    const cc = parseBoursobank(path.join(FX, "export-operations-bourso-courant.xlsx"));
    expect(cc).toHaveLength(103);
    expect(cc[0]).toMatchObject({ date: "2026-10-13", amount: -23.53, label: "Discord", accountKey: "BoursoBank", balance: 109.58 });
    const lep = parseBoursobank(path.join(FX, "export-operations-bourso-lep.xlsx"));
    expect(lep).toHaveLength(2);
    expect(lep[0]).toMatchObject({ date: "2026-10-12", amount: 10, accountKey: "LIVRET D'EPARGNE POPULAIRE", balance: 140.11, bank_category: "Virements reçus de comptes à comptes" });
  });
  it("Revolut : montant net de frais, produit, décodage HTML", () => {
    const rows = parseRevolut(path.join(FX, "revolut.csv"));
    expect(rows).toHaveLength(237);
    expect(rows[0]).toMatchObject({ date: "2026-07-01", accountKey: "Dépôt", amount: 0.02 });
    expect(rows[0].label).toContain("Compte d'épargne");
    const century = rows.find((r) => r.label === "To Century 21")!;
    expect(century.amount).toBe(-407.5);
    expect(century.accountKey).toBe("Valeur actuelle");
  });
});

describe.skipIf(!HAS_FX)("import + rapports (base en mémoire)", () => {
  let api: Api;
  let store: Store;
  beforeAll(async () => {
    store = await Store.open(null);
    api = createApi(store);
  });

  it("importe les 4 exports, déduplique au second passage", () => {
    const files = ["bnp.xls", "export-operations-bourso-courant.xlsx", "export-operations-bourso-lep.xlsx", "revolut.csv"];
    const first = files.map((f) => api.importFile(path.join(FX, f)));
    expect(first.map((r) => r.inserted)).toEqual([27, 103, 2, 237]);
    const again = files.map((f) => api.importFile(path.join(FX, f)));
    expect(again.map((r) => r.inserted)).toEqual([0, 0, 0, 0]);
    expect(again.map((r) => r.duplicates)).toEqual([27, 103, 2, 237]);
    expect(api.listTransactions({ limit: 10000 }).total).toBe(369);
  });

  it("répartit sur les bons comptes et retrouve les variations de solde Revolut", () => {
    const acc = Object.fromEntries(api.listAccounts().map((a) => [a.name, a.id]));
    const sum = (name: string) => api.listTransactions({ account_id: acc[name], limit: 10000 }).sum;
    expect(sum("Revolut – Compte d'épargne")).toBeCloseTo(352.45, 2); // 897.87 - 545.42
    expect(sum("Revolut – Compte courant")).toBeCloseTo(72.56, 2);
    expect(api.listTransactions({ account_id: acc["Boursobank – LEP"], limit: 100 }).total).toBe(2);
    expect(sum("BNP – Compte courant")).toBeCloseTo(211.55, 2);
  });

  it("catégorise : virements internes, remboursements, loyer, salaire", () => {
    const cats = Object.fromEntries(api.listCategories().map((c) => [c.name, c.id]));
    const byCat = (n: string) => api.listTransactions({ category_id: cats[n], limit: 10000 });
    expect(byCat("Virement interne").total).toBeGreaterThanOrEqual(30);
    expect(byCat("Remboursements").total).toBeGreaterThanOrEqual(20);
    expect(byCat("Salaire").total).toBe(2);
    expect(byCat("Loyer & charges").total).toBe(6);
    // Le LEP reçoit « Virements reçus de comptes à comptes » → interne
    const lep = api.listTransactions({ search: "Creation Compte", limit: 10 }).rows;
    expect(lep.every((r) => r.category === "Virement interne")).toBe(true);
    const unc = api.listTransactions({ uncategorized: true, limit: 100 });
    expect(unc.total).toBeLessThanOrEqual(8);
  });

  it("budget : septembre à ~50 % d'épargne", () => {
    const b = api.budget(2026);
    expect(b.totals.income[8]).toBeCloseTo(2792.63, 1);
    expect(b.totals.rate[8]!).toBeGreaterThan(0.45);
    expect(b.rows.find((r) => r.name === "Loyer & charges")!.months[9]).toBeCloseTo(638, 1);
  });

  it("règle ajoutée → recatégorisation", () => {
    const cats = Object.fromEntries(api.listCategories().map((c) => [c.name, c.id]));
    api.saveRule({ keyword: "Papa Maman", category_id: cats["Cadeaux"] });
    const r = api.recategorize();
    expect(r.updated).toBeGreaterThanOrEqual(1);
    expect(api.listTransactions({ search: "Papa Maman" }).rows[0].category).toBe("Cadeaux");
  });

  it("catégorie manuelle non écrasée", () => {
    const cats = Object.fromEntries(api.listCategories().map((c) => [c.name, c.id]));
    const tx = api.listTransactions({ search: "Thouvenot" }).rows[0];
    api.updateTransaction(tx.id, { category_id: cats["Divers"] });
    api.recategorize();
    expect(api.listTransactions({ search: "Thouvenot" }).rows[0].category).toBe("Divers");
  });

  it("patrimoine, allocation, portefeuille, projection, tableau de bord", () => {
    const acc = Object.fromEntries(api.listAccounts().map((a) => [a.name, a.id]));
    api.setSnapshotMonth("2026-10", { [acc["BNP – Compte courant"]]: 211.55, [acc["Revolut – Compte courant"]]: 81.16, [acc["Revolut – Compte d'épargne"]]: 897.87, [acc["Revolut – Crypto"]]: 1219.35, [acc["Revolut – Actions"]]: 550, [acc["Boursobank – Compte courant"]]: 109.58, [acc["Boursobank – LEP"]]: 140.11 });
    const nw = api.networth();
    expect(nw.last!.total).toBeCloseTo(3209.62, 2);
    const al = api.allocation(400);
    expect(al.rows.find((r) => r.asset_class === "Crypto")!.action).toBe("Alléger");
    expect(al.rows.reduce((s, r) => s + r.deposit, 0)).toBeCloseTo(400, 1);

    const btc = api.saveAsset({ name: "Bitcoin", symbol: "bitcoin", account_id: acc["Revolut – Crypto"], asset_class: "Crypto", manual_price: 74471.54 });
    api.saveOperation({ date: "2026-07-06", asset_id: btc, kind: "Achat", quantity: 0.0073, unit_price: 55718.05, fees: 0 });
    const pf = api.portfolio();
    expect(pf.positions[0].value).toBeCloseTo(543.64, 1);
    expect(pf.positions[0].priceSource).toBe("Manuel");
    expect(pf.irr).not.toBeNull();

    const pr = api.projection({ initial: 3209.62, monthly: 400, rateMid: 0.06, goal: 100000 });
    expect(pr.goalYears).toBeCloseTo(12.9, 1);
    const d = api.dashboard();
    expect(d.networth.total).toBeCloseTo(3209.62, 2);
    expect(d.alerts.length).toBeGreaterThanOrEqual(5);
  });

  it("export Excel", async () => {
    const f = path.join(os.tmpdir(), `patrimoine-test-${Date.now()}.xlsx`);
    await api.exportExcel(f);
    expect(fs.statSync(f).size).toBeGreaterThan(20000);
    fs.unlinkSync(f);
  });

  it("persistance fichier et rechargement entre deux instances", async () => {
    const f = path.join(os.tmpdir(), `patrimoine-test-${Date.now()}.sqlite`);
    const s1 = await Store.open(f);
    const a1 = createApi(s1);
    const id = a1.saveAccount({ name: "Test", institution: "X" });
    const s2 = await Store.open(f);
    const a2 = createApi(s2);
    expect(a2.listAccounts().some((a) => a.id === id)).toBe(true);
    await new Promise((r) => setTimeout(r, 20));
    a2.saveAccount({ name: "Test 2" });
    expect(a1.listAccounts().some((a) => a.name === "Test 2")).toBe(true); // s1 recharge le fichier modifié
    s1.close(); s2.close(); fs.unlinkSync(f);
  });
});
