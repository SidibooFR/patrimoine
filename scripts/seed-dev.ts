/**
 * Base de développement fictive, sans export bancaire : ~18 mois de relevés sur
 * les comptes par défaut (salaire, loyer, abonnements, courses, remboursements…),
 * portefeuille ETF + crypto avec historique de cours simulé, enveloppes, budgets,
 * relevés de patrimoine mensuels et objectifs. Données déterministes (graine fixe),
 * datées par rapport au jour courant pour que tableaux de bord et alertes restent vivants.
 *
 * Usage : node scripts/run-ts.mjs scripts/seed-dev.ts [base.sqlite] [--months N] [--seed N] [--force]
 * Par défaut : PATRIMOINE_DB, sinon <tmpdir>/patrimoine-dev.sqlite (la base de `npm run dev`).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Store } from "../core/db.js";
import { createApi } from "../core/api.js";
import { round2, today, addMonths } from "../core/finance.js";

// ---------------------------------------------------------------- arguments
const argv = process.argv.slice(2);
const flag = (name: string) => { const i = argv.indexOf(name); return i >= 0 ? argv.splice(i, 2)[1] : undefined; };
const MONTHS = Number(flag("--months") ?? 18);
const SEED = Number(flag("--seed") ?? 42);
const force = argv.includes("--force") ? (argv.splice(argv.indexOf("--force"), 1), true) : false;
const out = path.resolve(argv[0] ?? process.env.PATRIMOINE_DB ?? path.join(os.tmpdir(), "patrimoine-dev.sqlite"));

// Garde-fou : ne jamais écraser la vraie base de l'application par mégarde
const appDb = path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "Patrimoine", "patrimoine.sqlite");
if (path.resolve(appDb).toLowerCase() === out.toLowerCase() && !force) {
  console.error(`Refus d'écraser la base de l'application (${out}). Ajoute --force si c'est voulu.`);
  process.exit(1);
}
for (const f of [out, out + ".tmp"]) if (fs.existsSync(f)) fs.unlinkSync(f);

// ---------------------------------------------------------------- aléatoire déterministe
let state = SEED >>> 0;
const rnd = () => { state = (state + 0x6d2b79f5) >>> 0; let t = state; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const between = (a: number, b: number) => round2(a + rnd() * (b - a));
const pick = <T>(list: T[]): T => list[Math.floor(rnd() * list.length)];
const chance = (p: number) => rnd() < p;
const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());

// ---------------------------------------------------------------- dates
const TODAY = today();
const START = addMonths(TODAY.slice(0, 7) + "-01", -MONTHS);
const addDays = (d: string, n: number) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const dayOf = (month: string, day: number) => { const last = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).getUTCDate(); return `${month.slice(0, 8)}${String(Math.min(day, last)).padStart(2, "0")}`; };
const months: string[] = [];
for (let m = START; m <= TODAY; m = addMonths(m, 1)) months.push(m);
const days: string[] = [];
for (let d = START; d <= TODAY; d = addDays(d, 1)) days.push(d);
const weekday = (d: string) => new Date(d + "T00:00:00Z").getUTCDay();

async function main() {
  const store = await Store.open(out);
  const api = createApi(store);
  const acc = Object.fromEntries(api.listAccounts().map((a) => [a.name, a.id]));
  const BNP = acc["BNP – Compte courant"], REV = acc["Revolut – Compte courant"], REV_EP = acc["Revolut – Compte d'épargne"];
  const REV_CRYPTO = acc["Revolut – Crypto"], REV_ACT = acc["Revolut – Actions"], BOURSO = acc["Boursobank – Compte courant"], LEP = acc["Boursobank – LEP"];

  // ---------------------------------------------------------------- relevés
  type Tx = { date: string; account: number; label: string; amount: number; bank_category?: string };
  const txs: Tx[] = [];
  const add = (date: string, account: number, label: string, amount: number, bank_category = "") => {
    if (date >= START && date <= TODAY) txs.push({ date, account, label, amount: round2(amount), bank_category });
  };
  /** Virement entre deux comptes : une sortie et une entrée le même jour. */
  const transfer = (date: string, from: number, to: number, amount: number, label: string) => { add(date, from, label, -amount); add(date, to, label, amount); };

  months.forEach((m, i) => {
    const mm = Number(m.slice(5, 7));
    // Revenus
    add(dayOf(m, 27), BNP, "VIR SEPA LA POSTE RH SALAIRE", i < 12 ? 2150 : 2230);
    if (mm === 12) add(dayOf(m, 27), BNP, "VIR SEPA LA POSTE RH PRIME FIN D'ANNEE", 650);
    if (i < 6) add(dayOf(m, 6), BNP, "VIR CAF DU RHONE APL", 112);
    add(dayOf(m, 4), BNP, "VIR SEPA JULIE PETIT PART LOYER", 360); // colocataire : règle de remboursement → Loyer
    // Charges fixes
    add(dayOf(m, 5), BNP, "PRLV SEPA CENTURY 21 LOYER", -720);
    add(dayOf(m, 8), BNP, `PRLV SEPA ENGIE FACTURE ${100000 + i}`, -([12, 1, 2].includes(mm) ? between(80, 88) : [6, 7, 8].includes(mm) ? between(56, 62) : between(65, 74)));
    add(dayOf(m, 10), BNP, "PRLV SEPA FREE MOBILE", -15.99);
    add(dayOf(m, 11), BNP, "PRLV SEPA FREE TELECOM FREEBOX", -29.99);
    add(dayOf(m, 12), BNP, "PRLV SEPA AXA ASSURANCE HABITATION", -18.4);
    if (i < 10) add(dayOf(m, 15), BNP, `PRLV COFIDIS ECHEANCE ${i + 27}/36`, -142.5); // crédit soldé en cours de route
    add(dayOf(m, 15), BNP, "PRLV DGFIP IMPOT PRELEVEMENT A LA SOURCE", -96);
    add(dayOf(m, 2), BNP, "COMMISSIONS COTISATION ESPRIT LIBRE", -2.5);
    // Répartition entre comptes
    transfer(dayOf(m, 28), BNP, REV, 1150, "VIR INTERNE ALIMENTATION REVOLUT");
    transfer(dayOf(m, 28), BNP, BOURSO, 250, "VIR INTERNE ALIMENTATION BOURSOBANK");
    transfer(dayOf(m, 1), BOURSO, LEP, 100, "VIR INTERNE VERSEMENT LEP");
    transfer(dayOf(m, 1), REV, REV_EP, 120, "EUR Compte d'épargne");
    add(dayOf(m, 1), REV_EP, "Intérêts nets versés pour le mois", round2((3000 + i * 130) * 0.025 / 12));
    if (mm === 12) add(dayOf(m, 31), LEP, `Intérêts nets versés pour ${m.slice(0, 4)}`, round2((1500 + i * 50) * 0.027));
    // Abonnements (Revolut)
    add(dayOf(m, 3), REV, "NETFLIX.COM", i < MONTHS - 5 ? -13.49 : -14.99); // hausse de tarif récente
    add(dayOf(m, 7), REV, "SPOTIFY P1A2B3C4", -11.12);
    add(dayOf(m, 14), REV, "ANTHROPIC CLAUDE PRO", -21.6);
    add(dayOf(m, 18), REV, "APPLE.COM/BILL ICLOUD", -2.99);
    add(dayOf(m, 20), REV, "YOUTUBE PREMIUM GOOGLE", -12.99);
    if (mm === 3) add(dayOf(m, 9), REV, "AMAZON PRIME FR ABONNEMENT ANNUEL", -69.9);
    if (mm === 9) add(dayOf(m, 22), REV, "OVH SAS RENOUVELLEMENT DOMAINE", -14.39);
    // Investissements programmés
    add(dayOf(m, 3), REV, "Revolut Digital Assets Europe", -60);
    add(dayOf(m, 3), REV, "Revolut Securities Europe ETF", -150);
  });

  // Dépenses courantes au fil des jours
  const GROCERIES = ["CARREFOUR CITY", "LIDL", "AUCHAN SUPERMARCHE", "INTERMARCHE", "GRAND FRAIS", "BOULANGERIE LA BAGUETTE"];
  const RESTOS = ["MCDONALD'S", "UBER EATS", "DELIVEROO", "BUFFALO GRILL", "RAMEN KAZU", "BAGELSTEIN"];
  const FUEL = ["TOTALENERGIES", "ARAL STATION", "STATION U"];
  const SHOPPING: [string, number, number][] = [["GALERIES LAFAYETTE", 30, 120], ["FNAC", 15, 90], ["IKEA", 25, 180], ["LEROY MERLIN", 12, 85], ["STEAM PURCHASE", 5, 60]];
  const restaurantBills: { date: string; amount: number }[] = [];
  for (const d of days) {
    const wd = weekday(d);
    if (chance(wd === 6 ? 0.7 : 0.25)) add(d, REV, `CB ${pick(GROCERIES)} ${d.slice(8)}/${d.slice(5, 7)}`, -between(6, wd === 6 ? 85 : 35));
    if (chance(wd >= 5 ? 0.3 : 0.08)) {
      const amount = between(11, 68);
      add(d, REV, `CB ${pick(RESTOS)}`, -amount);
      if (amount > 40) restaurantBills.push({ date: d, amount });
    }
    if (chance(0.07)) add(d, REV, `CB ${pick(FUEL)}`, -between(38, 72));
    if (chance(0.03)) add(d, REV, "CB PHARMACIE DU CENTRE", -between(4, 32));
    if (chance(0.05)) { const [name, a, b] = pick(SHOPPING); add(d, REV, `CB ${name}`, -between(a, b)); }
    if (chance(0.02)) add(d, REV, "CB MARCHE DES PRODUCTEURS", -between(8, 30)); // aucune règle : reste sans catégorie
    if (chance(0.02)) add(d, BNP, "RETRAIT DAB BNP PARIBAS", -pick([20, 40, 50, 60]));
    // Boursobank : catégorie fournie par la banque (correspondance bancaire, et une catégorie non reconnue)
    if (chance(0.06)) add(d, BOURSO, "CB MONOPRIX", -between(9, 48), "Alimentation");
    if (chance(0.02)) add(d, BOURSO, "CB ANIMALIS", -between(12, 55), "Animaux");
  }
  // Un ami rembourse sa part de quelques restaurants (rapprochement dépense ↔ remboursement)
  for (const b of restaurantBills.filter((_, i) => i % 3 === 0)) add(addDays(b.date, 2), REV, "Paiement envoyé par CAMILLE DURAND", round2(b.amount / 2));
  // Vacances d'été : Airbnb partagé, remboursé par virement
  for (const m of months.filter((x) => x.slice(5, 7) === "07")) {
    add(dayOf(m, 9), REV, "CB AIRBNB * HMXYZ", -480);
    add(dayOf(m, 16), REV, "VIR SEPA LUCAS MARTIN REMBOURSEMENT AIRBNB", 240);
    add(dayOf(m, 12), REV, "CB SNCF CONNECT", -96.4);
  }

  // Soldes successifs par compte (comme dans les exports) et empreinte unique
  const SOURCE: Record<number, string> = { [BNP]: "bnp", [BOURSO]: "boursobank", [LEP]: "boursobank", [REV]: "revolut", [REV_EP]: "revolut" };
  const OPENING: Record<number, number> = { [BNP]: 1450, [BOURSO]: 180, [LEP]: 1500, [REV]: 1000, [REV_EP]: 3000 };
  const running: Record<number, number> = { ...OPENING };
  txs.sort((a, b) => a.date.localeCompare(b.date) || b.amount - a.amount);
  const balanceAt: Record<number, Map<string, number>> = {}; // solde en fin de journée, pour les relevés de patrimoine

  // ---------------------------------------------------------------- cours simulés
  type Spec = { name: string; symbol: string; account: number; cls: string; start: number; drift: number; vol: number };
  const SPECS: Spec[] = [
    { name: "Vanguard S&P 500 (VUAA)", symbol: "VUAA.DE", account: REV_ACT, cls: "Actions & ETF", start: 96, drift: 0.11, vol: 0.16 },
    { name: "Amundi MSCI World (CW8)", symbol: "CW8.PA", account: REV_ACT, cls: "Actions & ETF", start: 470, drift: 0.09, vol: 0.14 },
    { name: "iShares MSCI EM IMI (IS3N)", symbol: "IS3N.DE", account: REV_ACT, cls: "Actions & ETF", start: 29, drift: 0.05, vol: 0.18 },
    { name: "Bitcoin", symbol: "bitcoin", account: REV_CRYPTO, cls: "Crypto", start: 52000, drift: 0.35, vol: 0.55 },
    { name: "Ether", symbol: "ethereum", account: REV_CRYPTO, cls: "Crypto", start: 2600, drift: 0.1, vol: 0.7 },
    { name: "Solana", symbol: "solana", account: REV_CRYPTO, cls: "Crypto", start: 140, drift: 0.05, vol: 0.85 },
  ];
  const prices = new Map<string, Map<string, number>>();
  for (const s of SPECS) {
    const series = new Map<string, number>();
    let p = s.start;
    for (const d of days) { series.set(d, round2(p)); p *= Math.exp((s.drift - s.vol ** 2 / 2) / 365 + (s.vol / Math.sqrt(365)) * gauss()); }
    prices.set(s.name, series);
  }
  const priceOn = (name: string, d: string) => prices.get(name)!.get(d)!;

  store.transaction(() => {
    txs.forEach((t, i) => {
      running[t.account] = round2(running[t.account] + t.amount);
      (balanceAt[t.account] ??= new Map()).set(t.date, running[t.account]);
      const source = SOURCE[t.account];
      store.run(`INSERT INTO transactions(date,account_id,label,raw_label,bank_category,amount,source,balance,fingerprint) VALUES(?,?,?,?,?,?,?,?,?)`,
        [t.date, t.account, t.label, t.label, t.bank_category ?? "", t.amount, source, running[t.account], `dev:${source}:${t.account}:${i}`]);
    });

    // ---------------------------------------------------------------- portefeuille
    const assetId: Record<string, number> = {};
    for (const s of SPECS) {
      const id = store.run("INSERT INTO assets(name,symbol,account_id,asset_class,manual_price) VALUES(?,?,?,?,?)", [s.name, s.symbol, s.account, s.cls, priceOn(s.name, TODAY)]);
      assetId[s.name] = id;
      const pts = days.filter((d) => weekday(d) === 1 || d === TODAY);
      for (const d of pts) store.run("INSERT INTO price_history(asset_id,date,price,source) VALUES(?,?,?,?)", [id, d, priceOn(s.name, d), d === TODAY ? "Manuel" : "Simulé"]);
    }
    const buy = (date: string, name: string, eur: number, fees = 0, note = "") => {
      const unit = priceOn(name, date);
      api.saveOperation({ date, asset_id: assetId[name], kind: "Achat", quantity: Math.round((eur / unit) * 1e8) / 1e8, unit_price: unit, fees, note });
    };
    months.forEach((m, i) => {
      const d = dayOf(m, 3);
      if (d > TODAY) return;
      buy(d, "Vanguard S&P 500 (VUAA)", 90);
      buy(d, i % 2 ? "iShares MSCI EM IMI (IS3N)" : "Amundi MSCI World (CW8)", 60, 0.5);
      buy(d, "Bitcoin", 40);
      buy(d, "Ether", 20);
    });
    buy(dayOf(months[0], 20), "Solana", 300, 2.5, "Achat unique");
    const solQty = store.scalar<number>("SELECT quantity FROM operations WHERE asset_id=?", [assetId["Solana"]]);
    const sellDay = dayOf(months[Math.floor(months.length / 2)], 12);
    api.saveOperation({ date: sellDay, asset_id: assetId["Solana"], kind: "Vente", quantity: round2(solQty / 2 * 1e6) / 1e6, unit_price: priceOn("Solana", sellDay), fees: 1.5, note: "Prise de bénéfices partielle" });
    api.saveOperation({ date: dayOf(months[months.length - 3], 25), asset_id: assetId["Amundi MSCI World (CW8)"], kind: "Frais", quantity: 0, unit_price: 0, fees: 3.9, note: "Frais de garde" });

    // ---------------------------------------------------------------- relevés de patrimoine mensuels
    const ops = store.all<{ date: string; asset_id: number; kind: string; quantity: number }>("SELECT date, asset_id, kind, quantity FROM operations ORDER BY date");
    const cashOn = (account: number, d: string) => {
      let b = OPENING[account];
      for (const [date, v] of balanceAt[account] ?? []) if (date <= d) b = v;
      return b;
    };
    const portfolioOn = (account: number, d: string) => round2(SPECS.filter((s) => s.account === account).reduce((sum, s) => {
      const qty = ops.filter((o) => o.asset_id === assetId[s.name] && o.date <= d).reduce((q, o) => q + (o.kind === "Achat" ? o.quantity : o.kind === "Vente" ? -o.quantity : 0), 0);
      return sum + qty * priceOn(s.name, d);
    }, 0));
    for (const m of months) {
      const d = addDays(m, -1) < START ? m : addDays(m, -1); // solde de la veille du 1er du mois
      for (const a of [BNP, BOURSO, LEP, REV, REV_EP]) store.run("INSERT INTO snapshots(month,account_id,balance) VALUES(?,?,?)", [m, a, cashOn(a, d)]);
      for (const a of [REV_ACT, REV_CRYPTO]) store.run("INSERT INTO snapshots(month,account_id,balance) VALUES(?,?,?)", [m, a, portfolioOn(a, d)]);
    }

    // ---------------------------------------------------------------- règles propres aux libellés fictifs
    const cat = Object.fromEntries(api.listCategories().map((c) => [c.name, c.id]));
    const rules: [string, string][] = [
      ["VIR INTERNE", "Virement interne"], ["Revolut Securities", "Investissement bourse"], ["DGFIP", "Impôts & taxes"],
      ["JULIE PETIT", "Remboursements"], ["CAMILLE DURAND", "Remboursements"], ["SNCF", "Voyages"], ["RETRAIT DAB", "Divers"],
    ];
    for (const [keyword, c] of rules) api.saveRule({ keyword, category_id: cat[c] });
    api.saveRefundRule({ keyword: "JULIE PETIT", category_id: cat["Loyer & charges"] });

    // ---------------------------------------------------------------- budgets, enveloppes, objectifs, réglages
    const BUDGET: [string, number][] = [
      ["Loyer & charges", 720], ["Énergie, internet & téléphone", 120], ["Courses", 380], ["Transport & carburant", 130],
      ["Assurances", 20], ["Abonnements", 50], ["Tech, hébergement & IA", 25], ["Restaurants & sorties", 150], ["Loisirs", 50],
      ["Shopping", 80], ["Santé", 25], ["Impôts & taxes", 96], ["Épargne (livrets)", 220], ["Investissement bourse", 150], ["Investissement crypto", 60],
    ];
    const years = [...new Set(months.map((m) => Number(m.slice(0, 4))))];
    for (const y of years) for (const [c, amount] of BUDGET) api.setBudget(cat[c], y, amount);

    api.saveEnvelope({ account_id: LEP, kind: "LEP", opened_on: addDays(START, -400), monthly_deposit: 100 });
    api.saveEnvelope({ account_id: REV_EP, kind: "Compte rémunéré", rate: 0.025, monthly_deposit: 120 });

    api.saveGoal({ name: "Épargne de précaution", source: "emergency" });
    api.saveGoal({ name: "Voyage au Japon", source: "manual", target: 3500, target_date: addMonths(TODAY, 14), manual_amount: 900 });
    api.saveGoal({ name: "Apport immobilier", source: "account", account_id: REV_EP, target: 20000, target_date: addMonths(TODAY, 48) });
    api.saveGoal({ name: "Portefeuille actions 10 k€", source: "class", asset_class: "Actions & ETF", target: 10000 });

    for (const [k, v] of [["start_month", START], ["projection_monthly", "330"], ["next_deposit", "330"]]) api.setSetting(k, v);
  });

  const rc = api.recategorize();
  const rf = api.applyRefundSuggestions(0.75);
  // Quelques décisions sur les charges récurrentes détectées : un libellé choisi, un faux positif ignoré
  for (const r of api.recurring().items) {
    if (/NETFLIX/.test(r.label)) api.setRecurringStatus(r.key, "confirmed", "Netflix");
    if (/RETRAIT DAB/.test(r.label)) api.setRecurringStatus(r.key, "ignored");
  }
  const d = api.dashboard();
  console.log(`Base de dev : ${out}`);
  console.log(`${txs.length} opérations du ${START} au ${TODAY} · ${rc.uncategorized} sans catégorie · ${rf.linked} remboursement(s) rapproché(s)`);
  console.log(`Patrimoine : ${d.networth.total} € · portefeuille : ${d.portfolio.value} €`);
  store.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
