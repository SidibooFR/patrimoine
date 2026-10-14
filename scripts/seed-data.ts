/**
 * Construit une base pré-remplie à partir des exports bancaires et des positions
 * fournis. Usage : node scripts/run-ts.mjs scripts/seed-data.ts <dossier exports> <fichier.sqlite>
 */
import fs from "node:fs";
import path from "node:path";
import { Store } from "../core/db.js";
import { createApi } from "../core/api.js";

const [dir, out] = process.argv.slice(2);
if (!dir || !out) { console.error("usage: seed-data <dossier exports> <base.sqlite>"); process.exit(1); }
if (fs.existsSync(out)) fs.unlinkSync(out);

async function main() {
const store = await Store.open(out);
const api = createApi(store);
for (const f of fs.readdirSync(dir)) {
  if (!/\.(xls|xlsx|csv)$/i.test(f)) continue;
  const r = api.importFile(path.join(dir, f));
  console.log(`${f}: ${r.inserted} insérées, ${r.duplicates} doublons, ${r.uncategorized} sans catégorie`);
}
const acc = Object.fromEntries(api.listAccounts().map((a) => [a.name, a.id]));

// Relevé de patrimoine d'octobre 2026 (soldes des exports + captures Revolut)
api.setSnapshotMonth("2026-10", {
  [acc["BNP – Compte courant"]]: 211.55, [acc["Revolut – Compte courant"]]: 81.16, [acc["Revolut – Compte d'épargne"]]: 897.87,
  [acc["Revolut – Crypto"]]: 1219.35, [acc["Revolut – Actions"]]: 550, [acc["Boursobank – Compte courant"]]: 109.58, [acc["Boursobank – LEP"]]: 140.11,
});

// ETF Revolut (capture du 14/10/2026)
const etf: [string, string][] = [
  ["Vanguard S&P 500 (VUAA)", "VUAA.DE"], ["Amundi MSCI World ex EMU (ACM9)", "ACM9.DE"], ["Amundi STOXX Europe 50 (AE50)", "AE50.DE"],
  ["Amundi MSCI Nordic (CN1G)", "CN1G.DE"], ["Amundi MSCI Semiconductors (LSMC)", "LSMC.DE"],
];
const etfId: Record<string, number> = {};
for (const [name, symbol] of etf) etfId[name] = api.saveAsset({ name, symbol, account_id: acc["Revolut – Actions"], asset_class: "Actions & ETF" });
const buys: [string, string, number, number][] = [
  ["2025-09-19", "Vanguard S&P 500 (VUAA)", 0.09253304, 108.07], ["2025-12-01", "Amundi MSCI World ex EMU (ACM9)", 0.06243171, 640.70],
  ["2026-01-12", "Amundi STOXX Europe 50 (AE50)", 1.42633005, 140.22], ["2026-01-12", "Amundi MSCI Nordic (CN1G)", 0.14716703, 679.50],
  ["2026-01-12", "Amundi MSCI Semiconductors (LSMC)", 1.33868808, 74.70], ["2026-01-12", "Vanguard S&P 500 (VUAA)", 0.87598044, 114.16],
];
for (const [date, name, quantity, unit_price] of buys) api.saveOperation({ date, asset_id: etfId[name], kind: "Achat", quantity, unit_price, fees: 0 });

// Cryptos Revolut : (nom, id CoinGecko, valeur €, P&L latent €, cours €) – capture du 14/10/2026
const cryptos: [string, string, number, number, number][] = [
  ["Bitcoin", "bitcoin", 543.84, 136.95, 74471.54], ["Ether", "ethereum", 205.63, 60.05, 2233.41], ["Aave", "aave", 43.81, 19.78, 143.086],
  ["Kava", "kava", 34.04, 11.54, 0.06181], ["Avalanche", "avalanche-2", 33.08, 10.58, 9.105], ["COTI", "coti", 32.55, 10.05, 0.010966],
  ["Litecoin", "litecoin", 30.45, 7.96, 54.785], ["POL (ex-MATIC)", "polygon-ecosystem-token", 29.87, 7.37, 0.0882], ["Celo", "celo", 29.81, 7.32, 0.08075],
  ["Solana", "solana", 29.69, 7.19, 95.635], ["Aptos", "aptos", 29.43, 6.94, 0.737], ["Polkadot", "polkadot", 29.35, 6.86, 1.0252],
  ["BNB", "binancecoin", 28.40, 5.91, 662.703], ["Flow", "flow", 25.93, 3.44, 0.02899], ["Ethereum Classic", "ethereum-classic", 25.47, 2.97, 7.253],
  ["Cosmos", "cosmos", 25.40, 2.90, 1.6115], ["Cronos", "crypto-com-chain", 21.87, -0.62, 0.052844], ["Stellar", "stellar", 20.73, -1.77, 0.169335],
];
for (const [name, symbol, value, pl, price] of cryptos) {
  const id = api.saveAsset({ name, symbol, account_id: acc["Revolut – Crypto"], asset_class: "Crypto", manual_price: price });
  const qty = Math.round((value / price) * 1e8) / 1e8;
  api.saveOperation({ date: "2026-07-06", asset_id: id, kind: "Achat", quantity: qty, unit_price: Math.round(((value - pl) / qty) * 1e6) / 1e6, fees: 0, note: "Position d'ouverture au PRU Revolut (date approximative)" });
}
// LEP alimenté par un virement programmé de 10 € par mois
const lep = api.envelopes().rows.find((r) => r.kind === "LEP");
if (lep) api.saveEnvelope({ id: lep.id, account_id: lep.account_id, kind: "LEP", monthly_deposit: 10 });

// Objectif de départ : l'épargne de précaution (montant calculé à partir des dépenses)
api.saveGoal({ name: "Épargne de précaution", source: "emergency" });

const d = api.dashboard();
console.log("Patrimoine :", d.networth.total, "€ · portefeuille :", d.portfolio.value, "€ · alertes :", d.alerts.map((a) => a.text));
store.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
