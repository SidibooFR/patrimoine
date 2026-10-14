import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import initSqlJs from "sql.js";
import { Store } from "../core/db.js";
import { createApi, type Api } from "../core/api.js";
import { officialRate, quinzaineInterest, guessEnvelopeKind } from "../core/envelopes.js";
import { detectFrequency, groupKey, prettyLabel } from "../core/recurring.js";
import { monthlyPayment } from "../core/goals.js";
import { payerKey } from "../core/refunds.js";
import { fetchYahooHistory, fetchCoinGeckoHistory, portfolioHistory } from "../core/history.js";
import { SCHEMA } from "../core/schema.js";

const FX = path.join(__dirname, "fixtures");
/** Les relevés réels ne sont pas versionnés : sans eux, les tests qui les lisent sont ignorés. */
const HAS_FX = fs.existsSync(path.join(FX, "revolut.csv"));
const FILES = ["bnp.xls", "export-operations-bourso-courant.xlsx", "export-operations-bourso-lep.xlsx", "revolut.csv"];

describe("enveloppes : calculs", () => {
  it("taux officiels successifs (JO)", () => {
    expect(officialRate("LEP", "2026-01-15")).toBe(0.027);
    expect(officialRate("LEP", "2026-10-14")).toBe(0.025);
    expect(officialRate("Livret A", "2026-03-01")).toBe(0.015);
    expect(officialRate("Livret A", "2026-08-01")).toBe(0.017);
    expect(officialRate("PEA", "2026-08-01")).toBeNull();
  });

  it("intérêts par quinzaine : solde constant, versement tardif, retrait", () => {
    const flat = (b: number) => () => b;
    const none = () => 0;
    const r3 = () => 0.03;
    // 1 000 € toute l'année à 3 % → 30 €
    expect(quinzaineInterest(2025, r3, flat(1000), none, "2025-12-31", 1000).total).toBeCloseTo(30, 2);
    // versement de 1 000 € le 5 janvier → compte à partir du 16 : 23 quinzaines
    const bal = (d: string) => (d >= "2025-01-05" ? 1000 : 0);
    expect(quinzaineInterest(2025, r3, bal, none, "2025-12-31", 1000).total).toBeCloseTo(28.75, 2);
    // retrait de 500 € le 10 juillet → la quinzaine du 1er juillet ne compte que 500
    const bal2 = (d: string) => (d >= "2025-07-10" ? 500 : 1000);
    const w = (a: string, b: string) => (a <= "2025-07-10" && "2025-07-10" <= b ? 500 : 0);
    expect(quinzaineInterest(2025, r3, bal2, w, "2025-12-31", 500).total).toBeCloseTo(22.5, 2);
    // projection : 100 € aujourd'hui + 10 €/mois programmés → la suite de l'année est estimée
    const proj = quinzaineInterest(2025, r3, flat(100), none, "2025-06-30", 100, 10);
    expect(proj.total).toBeGreaterThan(3);
    expect(proj.earned).toBeCloseTo(1.5, 2);
  });

  it("devine le type d'enveloppe d'un compte", () => {
    expect(guessEnvelopeKind("Boursobank – LEP", "Livret")).toBe("LEP");
    expect(guessEnvelopeKind("Revolut – Compte d'épargne", "Livret")).toBe("Compte rémunéré");
    expect(guessEnvelopeKind("BNP Livret A", "Livret")).toBe("Livret A");
    expect(guessEnvelopeKind("Trade Republic", "PEA")).toBe("PEA");
    expect(guessEnvelopeKind("BNP – Compte courant", "Courant")).toBeNull();
  });
});

describe("charges récurrentes : détection", () => {
  it("périodicités", () => {
    expect(detectFrequency(["2026-01-05", "2026-02-05", "2026-03-06"], [9.99, 9.99, 9.99])?.name).toBe("mensuel");
    expect(detectFrequency(["2026-01-05", "2026-02-04"], [23, 23])?.name).toBe("mensuel");
    expect(detectFrequency(["2026-01-05", "2026-02-04"], [21.25, 23.9])).toBeNull(); // deux montants différents : pas assez sûr
    expect(detectFrequency(["2026-01-01", "2026-01-08", "2026-01-15", "2026-01-22"], [5, 5, 5, 5])?.name).toBe("hebdomadaire");
    expect(detectFrequency(["2025-01-10", "2026-01-11"], [69, 69])?.name).toBe("annuel");
    expect(detectFrequency(["2026-01-03", "2026-01-09", "2026-01-30"], [12, 80, 40])).toBeNull(); // courses
    // loyer payé en deux fois un mois puis une fois : mensuel
    expect(detectFrequency(["2026-07-07", "2026-07-30", "2026-08-01"], [407.5, 392.81, 407.5])?.name).toBe("mensuel");
  });
  it("regroupe les libellés d'un même marchand et nettoie l'affichage", () => {
    expect(groupKey("PRELEVEMENT FREE MOBILE DU 04/09/26 - EMETTEUR : FR83ZZZ459654")).toBe("free");
    expect(groupKey("Free")).toBe("free");
    expect(prettyLabel("PRELEVEMENT AXA DU 05/10/26 - EMETTEUR : FR14ZZZ - MOTIF : I CONTRA")).toBe("Axa");
    expect(prettyLabel("Discord")).toBe("Discord");
  });
});

describe("objectifs : calculs", () => {
  it("versement mensuel nécessaire", () => {
    expect(monthlyPayment(0, 1200, 12)).toBeCloseTo(100, 6);
    expect(monthlyPayment(1000, 1000, 12)).toBe(0);
    const m = monthlyPayment(0, 10000, 24, 0.025); // avec intérêts : un peu moins de 416,67
    expect(m).toBeLessThan(10000 / 24);
    expect(m).toBeGreaterThan(400);
    expect(monthlyPayment(200, 1000, 0)).toBe(800);
  });
});

describe("remboursements : clé payeur", () => {
  it("retrouve le même payeur selon la banque", () => {
    expect(payerKey("Vir Inst Mlle Melanie Ramaux")).toBe("melanie ramaux");
    expect(payerKey("VIREMENT INSTANTANE RECU DE MLLE MELANIE RAMAUX  MOTIF: VIREMENT DE MLLE MELANIE RAMAUX - REF : X")).toBe("melanie ramaux");
    expect(payerKey("Paiement envoyé par MADAME BLAIN ERIKA")).toBe("blain erika");
  });
});

describe.skipIf(!HAS_FX)("nouvelles fonctionnalités sur les exports réels", () => {
  let api: Api;
  let store: Store;
  let acc: Record<string, number>;
  let cats: Record<string, number>;
  beforeAll(async () => {
    store = await Store.open(null);
    api = createApi(store);
    for (const f of FILES) api.importFile(path.join(FX, f));
    acc = Object.fromEntries(api.listAccounts().map((a) => [a.name, a.id]));
    cats = Object.fromEntries(api.listCategories().map((c) => [c.name, c.id]));
  });

  it("enveloppes créées pour le LEP et le compte d'épargne, conseil de transfert vers le LEP", () => {
    const e = api.envelopes();
    const lep = e.rows.find((r) => r.kind === "LEP")!;
    expect(lep.account).toBe("Boursobank – LEP");
    expect(lep.balance).toBeCloseTo(140.11, 2);
    expect(lep.ceiling).toBe(10000);
    expect(lep.room).toBeCloseTo(9859.89, 2);
    expect(lep.rateSource).toBe("officiel");
    const sav = e.rows.find((r) => r.kind === "Compte rémunéré")!;
    expect(sav.balance).toBeCloseTo(897.87, 2);   // dernier solde du relevé Revolut, même avec deux opérations le 14/10
    expect(sav.interestAllTime).toBeGreaterThan(2);
    const move = e.moves.find((m) => m.from === "Revolut – Compte d'épargne" && m.to === "Boursobank – LEP");
    expect(move?.amount).toBeGreaterThan(800);
  });

  it("taux personnalisé et plafond modifiés", () => {
    const lep = api.envelopes().rows.find((r) => r.kind === "LEP")!;
    api.saveEnvelope({ id: lep.id, account_id: lep.account_id, kind: "LEP", rate: 0.03, ceiling: 12000, monthly_deposit: 10 });
    const after = api.envelopes().rows.find((r) => r.kind === "LEP")!;
    expect(after.rate).toBe(0.03);
    expect(after.rateSource).toBe("personnalisé");
    expect(after.ceiling).toBe(12000);
    api.saveEnvelope({ id: lep.id, account_id: lep.account_id, kind: "LEP", rate: null, ceiling: null, monthly_deposit: 10 });
    expect(() => api.saveEnvelope({ account_id: lep.account_id, kind: "Inconnu" })).toThrow();
  });

  it("abonnements : Discord en hausse, Free mensuel, courses exclues, ignorer un faux positif", () => {
    const r = api.recurring();
    const discord = r.items.find((i) => i.label === "Discord")!;
    expect(discord.frequency).toBe("mensuel");
    expect(discord.change).toMatchObject({ kind: "hausse", from: 19.99, to: 23.53 });
    const free = r.items.find((i) => i.merchant === "free")!;
    expect(free.lastAmount).toBe(49.99);
    expect(free.annual).toBeCloseTo(599.88, 2);
    expect(r.items.some((i) => i.category === "Courses")).toBe(false);
    expect(r.totals.monthly).toBeGreaterThan(100);
    const before = r.totals.count;
    api.setRecurringStatus(discord.key, "ignored");
    const r2 = api.recurring();
    expect(r2.totals.count).toBe(before - 1);
    expect(r2.items.find((i) => i.key === discord.key)!.status).toBe("ignored");
    api.setRecurringStatus(discord.key, "auto");
    expect(api.recurring().totals.count).toBe(before);
  });

  it("remboursement lié à la dépense : déduit du loyer, retiré des revenus", () => {
    const rf = api.refunds();
    const mel = rf.rows.find((r) => r.amount === 407.5)!;
    expect(mel.payer).toBe("melanie ramaux");
    const top = mel.suggestions[0];
    expect(top.type).toBe("expense");
    expect(top.amount).toBe(-407.5);
    expect(top.score).toBeGreaterThanOrEqual(0.85);
    const b0 = api.budget(2026);
    const rowOf = (b: typeof b0, n: string) => b.rows.find((x) => x.name === n)!;
    api.linkRefund(mel.id, { expense_id: top.expense_id });
    const b1 = api.budget(2026);
    expect(rowOf(b1, "Remboursements").months[7]).toBeCloseTo(rowOf(b0, "Remboursements").months[7] - 407.5, 2);
    expect(rowOf(b1, "Loyer & charges").months[7]).toBeCloseTo(rowOf(b0, "Loyer & charges").months[7] - 407.5, 2);
    expect(rowOf(b1, "Loyer & charges").refunded).toBeCloseTo(407.5, 2);
    expect(b1.totals.income[7]).toBeCloseTo(b0.totals.income[7] - 407.5, 2);
    // la dépense ne peut plus être proposée pour un second remboursement complet
    const tx = api.listTransactions({ search: "Century", limit: 50 }).rows.find((x) => x.id === top.expense_id)!;
    expect(tx.refunded).toBeCloseTo(407.5, 2);
    api.unlinkRefund(mel.id);
    expect(api.budget(2026).totals.income[7]).toBeCloseTo(b0.totals.income[7], 2);
  });

  it("règle payeur → catégorie pour les versements réguliers", () => {
    const rf = api.refunds();
    const erika = rf.rows.filter((r) => r.payer === "blain erika");
    expect(erika.length).toBeGreaterThanOrEqual(5);
    expect(erika.some((r) => r.hint?.includes("contribution régulière"))).toBe(true);
    const b0 = api.budget(2026);
    api.linkRefund(erika[0].id, { category_id: cats["Abonnements"] }, true);
    const after = api.refunds();
    expect(after.rules.find((x) => x.keyword === "blain erika")?.matches).toBe(erika.length);
    expect(after.rows.filter((r) => r.payer === "blain erika").every((r) => r.link?.via === "rule")).toBe(true);
    const b1 = api.budget(2026);
    const sum = erika.reduce((s, r) => s + r.amount, 0);
    expect(b1.yearTotals.income).toBeCloseTo(b0.yearTotals.income - sum, 2);
    expect(() => api.linkRefund(erika[0].id, {})).toThrow();
    api.deleteRefundRule(after.rules.find((x) => x.keyword === "blain erika")!.id);
  });

  it("objectifs : compte, précaution, statut et faisabilité", () => {
    api.setSnapshotMonth("2026-10", { [acc["BNP – Compte courant"]]: 211.55, [acc["Revolut – Compte courant"]]: 81.16, [acc["Revolut – Compte d'épargne"]]: 897.87, [acc["Boursobank – Compte courant"]]: 109.58, [acc["Boursobank – LEP"]]: 140.11 });
    const id1 = api.saveGoal({ name: "Remplir le LEP", source: "account", account_id: acc["Boursobank – LEP"], target: 10000, target_date: "2028-12-31" });
    const id2 = api.saveGoal({ name: "Précaution", source: "emergency" });
    const id3 = api.saveGoal({ name: "Voyage", source: "manual", target: 1500, manual_amount: 1500 });
    const g = api.goals();
    const lep = g.goals.find((x) => x.id === id1)!;
    expect(lep.current).toBeCloseTo(140.11, 2);
    expect(lep.rate).toBe(0.025);
    expect(lep.monthlyNeeded).toBeGreaterThan(300);
    const pre = g.goals.find((x) => x.id === id2)!;
    expect(pre.targetAuto).toBe(true);
    expect(pre.target).toBeGreaterThan(0);
    expect(pre.status).toBe("Sans échéance");
    expect(g.goals.find((x) => x.id === id3)!.status).toBe("Atteint");
    expect(g.totals.monthlyNeeded).toBeCloseTo(lep.monthlyNeeded!, 2);
    expect(() => api.saveGoal({ name: "X", source: "account", target: 100 })).toThrow();
    expect(() => api.saveGoal({ name: "X", target: -5 })).toThrow();
    const d = api.dashboard();
    expect(d.goals.length).toBe(3);
    expect(d.alerts.length).toBeGreaterThanOrEqual(6);
    expect(d.alerts.some((a) => a.text.startsWith("LEP rempli"))).toBe(true);
    expect(d.alerts.some((a) => a.text.includes("Discord"))).toBe(true);
  });

  it("export Excel avec les nouvelles feuilles", async () => {
    const f = path.join(os.tmpdir(), `patrimoine-features-${Date.now()}.xlsx`);
    await api.exportExcel(f);
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(f);
    const names = wb.worksheets.map((w) => w.name);
    for (const n of ["Livrets & PEA", "Abonnements", "Objectifs", "Remboursements", "Évolution portefeuille", "Historique des cours"]) expect(names).toContain(n);
    fs.unlinkSync(f);
  });
});

describe("historique des cours et performance pondérée par le temps", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("TWR indépendant des versements, couverture des cours", async () => {
    const store = await Store.open(null);
    const api = createApi(store);
    const etf = api.saveAsset({ name: "ETF", symbol: "TEST.DE", asset_class: "Actions & ETF" });
    // 10 parts à 100 le 1er janvier, cours 110 le 1er février, nouvel achat de 10 parts à 110, cours 121 le 1er mars
    api.saveOperation({ date: "2026-01-01", asset_id: etf, kind: "Achat", quantity: 10, unit_price: 100 });
    api.saveOperation({ date: "2026-02-01", asset_id: etf, kind: "Achat", quantity: 10, unit_price: 110 });
    for (const [d, p] of [["2026-01-01", 100], ["2026-02-01", 110], ["2026-03-01", 121]] as const) api.addPricePoint(etf, d, p);
    const h = portfolioHistory(store, { asOf: "2026-03-01" });
    const all = h.periods.find((p) => p.label === "Depuis le début")!;
    expect(all.twr).toBeCloseTo(0.21, 6);            // +10 % puis +10 %, quel que soit le second versement
    expect(all.reliable).toBe(true);
    expect(all.gain).toBeCloseTo(20 * 121 - 2100, 2);
    expect(h.points[h.points.length - 1].value).toBeCloseTo(2420, 2);
    expect(h.points[h.points.length - 1].invested).toBeCloseTo(2100, 2);
    expect(h.coverage).toBeCloseTo(1, 6);
  });

  it("sans cours historique : période marquée non fiable", async () => {
    const store = await Store.open(null);
    const api = createApi(store);
    const btc = api.saveAsset({ name: "BTC", symbol: "bitcoin", asset_class: "Crypto" });
    api.saveOperation({ date: "2026-01-01", asset_id: btc, kind: "Achat", quantity: 1, unit_price: 100, note: "date approximative" });
    store.run("UPDATE assets SET manual_price=150 WHERE id=?", [btc]);
    const h = portfolioHistory(store, { asOf: "2026-06-01" });
    expect(h.periods.find((p) => p.label === "1 mois")!.reliable).toBe(false);
    expect(h.periods.find((p) => p.label === "1 mois")!.twr).toBeNull();
    expect(h.approximateOps).toBe(1);
    const pf = api.portfolio();
    expect(pf.irrInfo.reliable).toBe(false);
    expect(pf.irrInfo.approximateOps).toBe(1);
  });

  it("cours manuel enregistré dans l'historique ; actualisation web aussi", async () => {
    const store = await Store.open(null);
    const api = createApi(store);
    const id = api.saveAsset({ name: "ETH", symbol: "ethereum", asset_class: "Crypto", manual_price: 2000 });
    expect(api.priceHistory(id)).toHaveLength(1);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ethereum: { eur: 2100 } }), { status: 200 })));
    const r = await api.refreshPrices();
    expect(r.updated).toBe(1);
    const hist = api.priceHistory(id);
    expect(hist).toHaveLength(1);
    expect(hist[0]).toMatchObject({ price: 2100, source: "CoinGecko" });
  });

  it("lecture des réponses Yahoo et CoinGecko, téléchargement de l'historique", async () => {
    const yahoo = { chart: { result: [{ meta: { currency: "EUR" }, timestamp: [1767225600, 1767312000, 1767398400], indicators: { quote: [{ close: [100, null, 102.5] }] } }] } };
    const gecko = { prices: [[1767225600000, 90000], [1767268800000, 91000], [1767312000000, 92000]] };
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      calls.push(url);
      if (url.includes("yahoo")) return new Response(JSON.stringify(yahoo), { status: 200 });
      if (url.includes("unknown")) return new Response("{}", { status: 404 });
      return new Response(JSON.stringify(gecko), { status: 200 });
    }));
    const y = await fetchYahooHistory("VUAA.DE", "2026-01-01", "2026-01-03");
    expect(y!.points).toEqual([["2026-01-01", 100], ["2026-01-03", 102.5]]);
    const g = await fetchCoinGeckoHistory("bitcoin", 400);
    expect(calls[calls.length - 1]).toContain("days=365");
    expect(g).toEqual([["2026-01-01", 91000], ["2026-01-02", 92000]]); // un point par jour (le dernier)

    const store = await Store.open(null);
    const api = createApi(store);
    const a = api.saveAsset({ name: "VUAA", symbol: "VUAA.DE", asset_class: "Actions & ETF" });
    const b = api.saveAsset({ name: "BTC", symbol: "bitcoin", asset_class: "Crypto" });
    api.saveAsset({ name: "Inconnu", symbol: "unknown", asset_class: "Crypto" });
    api.saveOperation({ date: "2026-01-01", asset_id: a, kind: "Achat", quantity: 1, unit_price: 100 });
    api.saveOperation({ date: "2026-01-01", asset_id: b, kind: "Achat", quantity: 0.001, unit_price: 90000 });
    const { backfillPriceHistory } = await import("../core/history.js");
    const res = await backfillPriceHistory(store, { coingeckoDelayMs: 0 });
    expect(res.assets).toBe(2);
    expect(res.failed).toEqual(["Inconnu"]);
    expect(api.priceHistory(a).map((p) => p.price)).toEqual([100, 102.5]);
    expect(api.priceHistory(b)).toHaveLength(2);
  });
});

describe("migration d'une base existante (version 1)", () => {
  it("ajoute les tables, les réglages et les enveloppes sans toucher aux données", async () => {
    const SQL = await initSqlJs({ locateFile: (f: string) => path.join(process.cwd(), "node_modules", "sql.js", "dist", f) });
    // Base v1 : schéma d'origine (sans les nouvelles tables) avec deux comptes
    const v1Schema = SCHEMA.slice(0, SCHEMA.indexOf("-- Enveloppes réglementées"));
    const db = new SQL.Database();
    db.exec(v1Schema);
    db.exec(`INSERT INTO categories(name,kind) VALUES('Salaire','Revenu');
             INSERT INTO accounts(name,institution,type,asset_class) VALUES('Boursobank – LEP','Boursobank','Livret','Épargne sécurisée'),('Mon PEA','X','PEA','Actions & ETF');`);
    const f = path.join(os.tmpdir(), `patrimoine-v1-${Date.now()}.sqlite`);
    fs.writeFileSync(f, Buffer.from(db.export()));
    const store = await Store.open(f);
    const api = createApi(store);
    const e = api.envelopes();
    expect(e.rows.map((r) => r.kind).sort()).toEqual(["LEP", "PEA"]);
    expect(api.settings().schema_version).toBe("2");
    expect(api.settings().recurring_exclude_categories).toContain("Courses");
    expect(api.listCategories()).toHaveLength(1); // pas de réinitialisation
    store.close();
    const again = await Store.open(f); // seconde ouverture : rien à refaire
    expect(createApi(again).envelopes().rows).toHaveLength(2);
    again.close(); fs.unlinkSync(f);
  });
});
