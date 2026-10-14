/** Export Excel complet (exceljs). Toutes les données + synthèses, en valeurs. */
import ExcelJS from "exceljs";
import type { Store } from "./db.js";
import type { Api } from "./api.js";

const EUR = '#,##0.00 "€";-#,##0.00 "€";"-"';
const PCT = "0.0%";

function sheet(wb: ExcelJS.Workbook, name: string, columns: { header: string; key: string; width?: number; fmt?: string }[]) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 16, style: c.fmt ? { numFmt: c.fmt } : {} }));
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3A5F" } };
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return ws;
}

export async function exportWorkbook(store: Store, api: Api, file: string): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Patrimoine";
  const year = new Date().getFullYear();

  // Tableau de bord
  const d = api.dashboard();
  const dash = wb.addWorksheet("Tableau de bord");
  dash.columns = [{ width: 42 }, { width: 18 }];
  const kv = (k: string, v: unknown, fmt?: string) => { const r = dash.addRow([k, v as any]); if (fmt) r.getCell(2).numFmt = fmt; };
  kv("Date", d.today);
  kv("Patrimoine total", d.networth.total, EUR); kv("Dernier relevé", d.networth.lastMonth); kv("Variation dernier mois", d.networth.variation, EUR);
  kv("Épargne de précaution", d.networth.emergencyStatus);
  kv("Revenus du mois", d.month.income, EUR); kv("Dépenses du mois", d.month.expense, EUR); kv("Taux d'épargne du mois", d.month.rate, PCT); kv("Taux d'épargne de l'année", d.month.yearRate, PCT);
  kv("Valeur du portefeuille", d.portfolio.value, EUR); kv("Total investi", d.portfolio.invested, EUR); kv("Plus-value latente", d.portfolio.unrealized, EUR);
  kv("Performance totale", d.portfolio.performance, PCT); kv("Rendement annualisé (TRI)", d.portfolio.irr, PCT);
  dash.addRow([]); dash.addRow(["Points d'attention"]).font = { bold: true };
  for (const a of d.alerts) dash.addRow([(a.level === "ok" ? "✓ " : "⚠ ") + a.text]);
  dash.getColumn(1).font = { bold: false };

  // Relevés
  const tx = api.listTransactions({ limit: 1_000_000 });
  const ws = sheet(wb, "Relevés", [
    { header: "Date", key: "date", width: 12 }, { header: "Compte", key: "account", width: 28 }, { header: "Libellé", key: "label", width: 44 },
    { header: "Catégorie banque", key: "bank_category", width: 26 }, { header: "Montant", key: "amount", width: 13, fmt: EUR },
    { header: "Catégorie", key: "category", width: 26 }, { header: "Type", key: "kind", width: 11 }, { header: "Source", key: "source", width: 11 },
    { header: "Solde", key: "balance", width: 13, fmt: EUR }, { header: "Note", key: "note", width: 24 },
  ]);
  for (const r of [...tx.rows].reverse()) ws.addRow({ ...r, category: r.category ?? "?" });

  // Budget
  const b = api.budget(year);
  const bw = sheet(wb, `Budget ${year}`, [
    { header: "Catégorie", key: "name", width: 28 }, { header: "Type", key: "kind", width: 11 }, { header: "Budget / mois", key: "budget", fmt: EUR },
    ...Array.from({ length: 12 }, (_, i) => ({ header: new Date(year, i, 1).toLocaleDateString("fr-FR", { month: "short" }), key: `m${i}`, width: 11, fmt: EUR })),
    { header: "Total", key: "total", fmt: EUR }, { header: "Moyenne / mois", key: "average", fmt: EUR }, { header: "Écart vs budget", key: "gap", fmt: EUR },
  ]);
  for (const r of b.rows) bw.addRow({ ...r, ...Object.fromEntries(r.months.map((v, i) => [`m${i}`, v])) });
  const addTot = (name: string, arr: number[]) => { const row = bw.addRow({ name, ...Object.fromEntries(arr.map((v, i) => [`m${i}`, v])), total: arr.reduce((a, c) => a + c, 0) }); row.font = { bold: true }; };
  bw.addRow([]); addTot("Total revenus", b.totals.income); addTot("Total dépenses", b.totals.expense); addTot("Épargne placée", b.totals.savings); addTot("Reste", b.totals.remaining);
  const rr = bw.addRow({ name: "Taux d'épargne", ...Object.fromEntries(b.totals.rate.map((v, i) => [`m${i}`, v])) }); rr.font = { bold: true };
  for (let i = 0; i < 12; i++) rr.getCell(4 + i).numFmt = PCT;

  // Patrimoine
  const nw = api.networth();
  const pw = sheet(wb, "Patrimoine", [
    { header: "Mois", key: "month", width: 12 }, ...nw.accounts.map((a) => ({ header: a.name, key: `a${a.id}`, fmt: EUR })),
    { header: "Total", key: "total", fmt: EUR }, { header: "Variation", key: "variation", fmt: EUR }, { header: "Variation %", key: "variationPct", fmt: PCT },
    ...Object.keys(nw.rows[0]?.byClass ?? {}).map((c) => ({ header: c, key: `c_${c}`, fmt: EUR })),
  ]);
  for (const r of nw.rows) pw.addRow({ month: r.month.slice(0, 7), ...Object.fromEntries(Object.entries(r.balances).map(([id, v]) => [`a${id}`, v])), total: r.total, variation: r.variation, variationPct: r.variationPct, ...Object.fromEntries(Object.entries(r.byClass).map(([c, v]) => [`c_${c}`, r.total === null ? null : v])) });

  // Opérations & portefeuille
  const ow = sheet(wb, "Opérations", [
    { header: "Date", key: "date", width: 12 }, { header: "Actif", key: "asset", width: 30 }, { header: "Type", key: "kind", width: 11 },
    { header: "Quantité", key: "quantity", fmt: "#,##0.########" }, { header: "Prix unitaire", key: "unit_price", fmt: '#,##0.00#### "€"' }, { header: "Frais", key: "fees", fmt: EUR }, { header: "Note", key: "note", width: 24 },
  ]);
  for (const o of [...api.listOperations()].reverse()) ow.addRow(o);
  const pf = api.portfolio();
  const fw = sheet(wb, "Portefeuille", [
    { header: "Actif", key: "name", width: 30 }, { header: "Symbole", key: "symbol", width: 14 }, { header: "Compte", key: "account", width: 24 }, { header: "Classe", key: "asset_class", width: 16 },
    { header: "Quantité", key: "qty", fmt: "#,##0.########" }, { header: "PRU", key: "pru", fmt: '#,##0.00#### "€"' }, { header: "Prix de revient", key: "heldCost", fmt: EUR },
    { header: "Cours", key: "price", fmt: '#,##0.00#### "€"' }, { header: "Source cours", key: "priceSource", width: 14 }, { header: "Valeur", key: "value", fmt: EUR },
    { header: "Plus-value latente", key: "unrealized", fmt: EUR }, { header: "Plus-value %", key: "unrealizedPct", fmt: PCT }, { header: "Plus-value réalisée", key: "realized", fmt: EUR },
    { header: "Dividendes", key: "dividends", fmt: EUR }, { header: "Poids", key: "weight", fmt: PCT },
  ]);
  for (const p of pf.positions) fw.addRow(p);
  fw.addRow([]); fw.addRow({ name: "TOTAL", heldCost: pf.totals.heldCost, value: pf.totals.value, unrealized: pf.totals.unrealized, unrealizedPct: pf.totals.unrealizedPct, realized: pf.totals.realized, dividends: pf.totals.dividends }).font = { bold: true };
  fw.addRow({ name: "Total investi", value: pf.invested }); fw.addRow({ name: "Total récupéré", value: pf.recovered }); fw.addRow({ name: "Gain total", value: pf.gain });
  const perf = fw.addRow({ name: "Performance totale", value: pf.performance }); perf.getCell("value").numFmt = PCT;
  const irr = fw.addRow({ name: "Rendement annualisé (TRI)", value: pf.irr }); irr.getCell("value").numFmt = PCT;

  // Allocation
  const al = api.allocation();
  const aw = sheet(wb, "Allocation", [
    { header: "Classe", key: "asset_class", width: 20 }, { header: "Valeur", key: "value", fmt: EUR }, { header: "% actuel", key: "pct", fmt: PCT }, { header: "% cible", key: "target", fmt: PCT },
    { header: "Écart", key: "gap", fmt: PCT }, { header: "Écart €", key: "gapEur", fmt: EUR }, { header: "Action", key: "action", width: 12 }, { header: `Prochain versement (${al.nextDeposit} €)`, key: "deposit", fmt: EUR, width: 24 },
  ]);
  for (const r of al.rows) aw.addRow(r);
  aw.addRow([]); aw.addRow(["Épargne de précaution"]).font = { bold: true };
  aw.addRow(["Dépenses moyennes / mois", al.emergency.avgExpense]).getCell(2).numFmt = EUR;
  aw.addRow(["Objectif", al.emergency.goal]).getCell(2).numFmt = EUR;
  aw.addRow(["Disponible", al.emergency.available]).getCell(2).numFmt = EUR;
  aw.addRow(["Couverture (mois)", al.emergency.coverage]).getCell(2).numFmt = "0.0";
  aw.addRow(["Statut", al.emergency.status]);

  // Projection
  const pr = api.projection();
  const prw = sheet(wb, "Projection", [
    { header: "Année", key: "year", width: 8 }, { header: "Total versé", key: "paid", fmt: EUR }, { header: "Prudent", key: "low", fmt: EUR }, { header: "Central", key: "mid", fmt: EUR },
    { header: "Dynamique", key: "high", fmt: EUR }, { header: "Central (€ d'aujourd'hui)", key: "midReal", fmt: EUR, width: 22 }, { header: "Gains (central)", key: "gain", fmt: EUR },
  ]);
  for (const r of pr.rows) prw.addRow(r);

  // Livrets & PEA
  const env = api.envelopes();
  const ew = sheet(wb, "Livrets & PEA", [
    { header: "Compte", key: "account", width: 28 }, { header: "Type", key: "kind", width: 16 }, { header: "Solde", key: "balance", fmt: EUR },
    { header: "Versements (PEA)", key: "deposits", fmt: EUR }, { header: "Plafond", key: "ceiling", fmt: EUR }, { header: "Place restante", key: "room", fmt: EUR },
    { header: "Remplissage", key: "fill", fmt: PCT }, { header: "Taux net", key: "rate", fmt: "0.00%" }, { header: "Source du taux", key: "rateSource", width: 14 },
    { header: `Intérêts perçus ${env.year}`, key: "interestThisYear", fmt: EUR, width: 18 }, { header: `Intérêts estimés ${env.year}`, key: "estimateThisYear", fmt: EUR, width: 18 },
    { header: "Intérêts au plafond / an", key: "estimateAtCeiling", fmt: EUR, width: 20 }, { header: "Ouverture", key: "opened_on", width: 12 }, { header: "5 ans (PEA)", key: "fiveYears", width: 12 },
  ]);
  for (const r of env.rows) ew.addRow(r);
  if (env.moves.length) {
    ew.addRow([]); ew.addRow(["Transferts conseillés"]).font = { bold: true };
    for (const m of env.moves) ew.addRow([`${m.from} → ${m.to}`, "", m.amount, "", "", "", "", m.toRate, "", m.gainPerYear]);
  }

  // Abonnements
  const rec = api.recurring();
  const recw = sheet(wb, "Abonnements", [
    { header: "Libellé", key: "label", width: 28 }, { header: "Catégorie", key: "category", width: 24 }, { header: "Compte", key: "account", width: 24 },
    { header: "Fréquence", key: "frequency", width: 13 }, { header: "Dernier montant", key: "lastAmount", fmt: EUR }, { header: "Par mois", key: "monthly", fmt: EUR },
    { header: "Par an", key: "annual", fmt: EUR }, { header: "Dernier paiement", key: "last", width: 14 }, { header: "Prochain", key: "next", width: 12 },
    { header: "En cours", key: "activeTxt", width: 10 }, { header: "Statut", key: "status", width: 11 }, { header: "Évolution", key: "changeTxt", width: 26 },
  ]);
  for (const i of rec.items) recw.addRow({ ...i, activeTxt: i.active ? "oui" : "non", changeTxt: i.change ? `${i.change.kind} ${i.change.from} → ${i.change.to} € (${Math.round(i.change.pct * 100)} %)` : "" });
  recw.addRow([]); recw.addRow({ label: "TOTAL (en cours)", monthly: rec.totals.monthly, annual: rec.totals.annual }).font = { bold: true };

  // Objectifs
  const gl = api.goals();
  const gw = sheet(wb, "Objectifs", [
    { header: "Objectif", key: "name", width: 26 }, { header: "Montant visé", key: "target", fmt: EUR }, { header: "Actuel", key: "current", fmt: EUR },
    { header: "Progression", key: "progress", fmt: PCT }, { header: "Reste", key: "remaining", fmt: EUR }, { header: "Échéance", key: "target_date", width: 12 },
    { header: "À verser / mois", key: "monthlyNeeded", fmt: EUR }, { header: "Rythme / mois", key: "pace", fmt: EUR }, { header: "Atteint vers", key: "projectedDate", width: 12 },
    { header: "Statut", key: "status", width: 14 },
  ]);
  for (const g of gl.goals.filter((x) => !x.archived)) gw.addRow(g);
  gw.addRow([]); gw.addRow({ name: "Besoin mensuel total", monthlyNeeded: gl.totals.monthlyNeeded }).font = { bold: true };
  gw.addRow({ name: "Capacité d'épargne mensuelle", monthlyNeeded: gl.capacity });

  // Remboursements
  const rf = api.refunds();
  const rfw = sheet(wb, "Remboursements", [
    { header: "Date", key: "date", width: 12 }, { header: "Payeur", key: "payer", width: 24 }, { header: "Montant", key: "amount", fmt: EUR },
    { header: "Rapproché via", key: "via", width: 14 }, { header: "Dépense d'origine", key: "expense", width: 40 }, { header: "Déduit de", key: "category", width: 24 },
  ]);
  for (const r of [...rf.rows].reverse()) rfw.addRow({ ...r, via: r.link?.via ?? "", expense: r.link?.expense_label ? `${r.link.expense_date} · ${r.link.expense_label} (${r.link.expense_amount} €)` : "", category: r.link?.category ?? "" });

  // Historique du portefeuille et des cours
  const ph = api.portfolioHistory();
  const hw = sheet(wb, "Évolution portefeuille", [{ header: "Date", key: "date", width: 12 }, { header: "Valeur", key: "value", fmt: EUR }, { header: "Montant investi", key: "invested", fmt: EUR }, { header: "Gain", key: "gain", fmt: EUR }]);
  for (const p of ph.points) hw.addRow(p);
  hw.addRow([]); hw.addRow(["Performance (TWR)"]).font = { bold: true };
  for (const p of ph.periods) { const row = hw.addRow([p.label, p.twr, p.gain, p.reliable ? "" : p.reason ?? ""]); row.getCell(2).numFmt = PCT; row.getCell(3).numFmt = EUR; }
  const cw0 = sheet(wb, "Historique des cours", [{ header: "Actif", key: "asset", width: 30 }, { header: "Date", key: "date", width: 12 }, { header: "Cours", key: "price", fmt: '#,##0.00#### "€"' }, { header: "Source", key: "source", width: 16 }]);
  for (const r of store.all<any>("SELECT a.name AS asset, h.date, h.price, h.source FROM price_history h JOIN assets a ON a.id=h.asset_id ORDER BY a.name, h.date")) cw0.addRow(r);

  // Référentiels
  const cw = sheet(wb, "Comptes", [{ header: "Compte", key: "name", width: 30 }, { header: "Établissement", key: "institution" }, { header: "Type", key: "type" }, { header: "Classe", key: "asset_class", width: 18 }]);
  for (const a of api.listAccounts(true)) cw.addRow(a);
  const rw = sheet(wb, "Règles", [{ header: "Mot-clé", key: "keyword", width: 30 }, { header: "Catégorie", key: "category", width: 28 }]);
  for (const r of api.listRules()) rw.addRow(r);
  const mw = sheet(wb, "Catégories banque", [{ header: "Catégorie banque", key: "bank_label", width: 44 }, { header: "Ma catégorie", key: "category", width: 28 }]);
  for (const m of api.listBankCategoryMap()) mw.addRow(m);

  await wb.xlsx.writeFile(file);
}
