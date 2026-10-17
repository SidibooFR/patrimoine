/**
 * API applicative : toutes les opérations exposées à l'interface (via IPC Electron)
 * et au serveur MCP. Une seule implémentation, deux façades.
 */
import { VERSION } from "./version.js";
import type { Store } from "./db.js";
import type { SqlValue } from "sql.js";
import type { Account, AssetRow, BankCategoryMapRow, Category, ImportAccountMapRow, OperationRow, RuleRow, Transaction, TransactionRow } from "./schema.js";
import { buildCategorizer, recategorizeAll } from "./categorize.js";
import { importFile, parseFile, type Source } from "./importers.js";
import { refreshPrices } from "./prices.js";
import { allocationReport, budgetReport, dashboard, envelopes, goals, networthReport, portfolioReport, projectionReport, recurring, setting, type ProjectionParams } from "./reports.js";
import { ENVELOPE_KINDS, ENVELOPE_KIND_NAMES, RATES_AS_OF, officialRate } from "./envelopes.js";
import { saveGoal, GOAL_SOURCES, type GoalInput } from "./goals.js";
import { linkRefund, refundsReport } from "./refunds.js";
import { backfillPriceHistory, portfolioHistory, recordPrice } from "./history.js";
import { lastStatementBalances } from "./balances.js";
import { today } from "./finance.js";
import { exportWorkbook } from "./export.js";
import { ASSET_CLASSES, ACCOUNT_TYPES, CATEGORY_KINDS } from "./seed.js";
import { round2 } from "./finance.js";

export interface TxFilter {
  from?: string; to?: string; account_id?: number; category_id?: number | null; // null = sans catégorie
  kind?: string; search?: string; source?: string; uncategorized?: boolean; limit?: number; offset?: number;
}

export function createApi(store: Store) {
  const api = {
    // ------------------------------------------------------------ méta
    meta() {
      return {
        dbPath: store.file, assetClasses: ASSET_CLASSES, accountTypes: ACCOUNT_TYPES, categoryKinds: CATEGORY_KINDS, version: VERSION,
        envelopeKinds: ENVELOPE_KIND_NAMES.map((k) => ({ name: k, ceiling: ENVELOPE_KINDS[k].ceiling, ceilingOn: ENVELOPE_KINDS[k].ceilingOn, rate: officialRate(k, today()), help: ENVELOPE_KINDS[k].help })),
        ratesAsOf: RATES_AS_OF, goalSources: GOAL_SOURCES,
      };
    },
    settings() {
      const out: Record<string, string> = {};
      for (const r of store.all<{ key: string; value: string }>("SELECT key, value FROM settings")) out[r.key] = r.value;
      return out;
    },
    setSetting(key: string, value: string) {
      store.run("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [key, String(value)]);
      return api.settings();
    },

    // ------------------------------------------------------------ comptes
    listAccounts(includeArchived = false) {
      return store.all<Account>(
        `SELECT * FROM accounts ${includeArchived ? "" : "WHERE archived=0"} ORDER BY sort, id`);
    },
    saveAccount(a: { id?: number; name: string; institution?: string; type?: string; asset_class?: string; archived?: number }) {
      if (!a.name?.trim()) throw new Error("Le nom du compte est obligatoire");
      if (a.id) {
        store.run("UPDATE accounts SET name=?, institution=?, type=?, asset_class=?, archived=? WHERE id=?",
          [a.name.trim(), a.institution ?? "", a.type ?? "Courant", a.asset_class ?? "Liquidités", a.archived ?? 0, a.id]);
        return a.id;
      }
      const sort = store.scalar<number>("SELECT COALESCE(MAX(sort),0)+1 FROM accounts");
      return store.run("INSERT INTO accounts(name,institution,type,asset_class,sort) VALUES(?,?,?,?,?)",
        [a.name.trim(), a.institution ?? "", a.type ?? "Courant", a.asset_class ?? "Liquidités", sort]);
    },
    deleteAccount(id: number) {
      const n = store.scalar<number>("SELECT COUNT(*) FROM transactions WHERE account_id=?", [id]);
      if (n > 0) throw new Error(`Ce compte a ${n} opération(s). Archive-le plutôt que de le supprimer.`);
      store.run("DELETE FROM accounts WHERE id=?", [id]);
      return true;
    },

    // ------------------------------------------------------------ catégories
    listCategories() {
      return store.all<Category>("SELECT * FROM categories ORDER BY sort, id");
    },
    saveCategory(c: { id?: number; name: string; kind: string }) {
      if (!c.name?.trim()) throw new Error("Le nom de la catégorie est obligatoire");
      if (!(CATEGORY_KINDS as readonly string[]).includes(c.kind)) throw new Error(`Type inconnu : ${c.kind}`);
      if (c.id) { store.run("UPDATE categories SET name=?, kind=? WHERE id=?", [c.name.trim(), c.kind, c.id]); return c.id; }
      const sort = store.scalar<number>("SELECT COALESCE(MAX(sort),0)+1 FROM categories");
      return store.run("INSERT INTO categories(name,kind,sort) VALUES(?,?,?)", [c.name.trim(), c.kind, sort]);
    },
    deleteCategory(id: number) {
      store.run("DELETE FROM categories WHERE id=?", [id]);
      return true;
    },

    // ------------------------------------------------------------ opérations (relevés)
    listTransactions(f: TxFilter = {}) {
      const where: string[] = [];
      const p: SqlValue[] = [];
      if (f.from) { where.push("t.date >= ?"); p.push(f.from); }
      if (f.to) { where.push("t.date <= ?"); p.push(f.to); }
      if (f.account_id) { where.push("t.account_id = ?"); p.push(f.account_id); }
      if (f.uncategorized || f.category_id === null) where.push("t.category_id IS NULL");
      else if (f.category_id) { where.push("t.category_id = ?"); p.push(f.category_id); }
      if (f.kind) { where.push("c.kind = ?"); p.push(f.kind); }
      if (f.source) { where.push("t.source = ?"); p.push(f.source); }
      if (f.search) { where.push("(t.label LIKE ? OR t.raw_label LIKE ? OR t.note LIKE ?)"); const s = `%${f.search}%`; p.push(s, s, s); }
      const w = where.length ? "WHERE " + where.join(" AND ") : "";
      const total = store.scalar<number>(`SELECT COUNT(*) FROM transactions t LEFT JOIN categories c ON c.id=t.category_id ${w}`, p);
      const sum = store.scalar<number>(`SELECT COALESCE(SUM(t.amount),0) FROM transactions t LEFT JOIN categories c ON c.id=t.category_id ${w}`, p);
      const rows = store.all<TransactionRow>(
        `SELECT t.*, a.name AS account, c.name AS category, c.kind,
           (SELECT expense_id FROM refund_links WHERE refund_id=t.id) AS refund_expense_id,
           (SELECT category_id FROM refund_links WHERE refund_id=t.id) AS refund_category_id,
           (SELECT COALESCE(SUM(r.amount),0) FROM refund_links l JOIN transactions r ON r.id=l.refund_id WHERE l.expense_id=t.id) AS refunded
         FROM transactions t JOIN accounts a ON a.id=t.account_id LEFT JOIN categories c ON c.id=t.category_id
         ${w} ORDER BY t.date DESC, t.id DESC LIMIT ? OFFSET ?`, [...p, f.limit ?? 500, f.offset ?? 0]);
      return { total, sum: round2(sum), rows };
    },
    addTransaction(t: { date: string; account_id: number; label: string; amount: number; category_id?: number | null; note?: string }) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(t.date)) throw new Error("Date attendue au format AAAA-MM-JJ");
      if (!Number.isFinite(t.amount)) throw new Error("Montant invalide");
      let cat = t.category_id ?? null;
      const manual = cat !== null ? 1 : 0;
      if (cat === null) cat = buildCategorizer(store)({ label: t.label });
      return store.run("INSERT INTO transactions(date,account_id,label,raw_label,amount,category_id,category_manual,source,note) VALUES(?,?,?,?,?,?,?,'manuel',?)",
        [t.date, t.account_id, t.label.trim(), t.label.trim(), t.amount, cat, manual, t.note ?? ""]);
    },
    updateTransaction(id: number, patch: { date?: string; account_id?: number; label?: string; amount?: number; category_id?: number | null; note?: string }) {
      const cur = store.get<Transaction>("SELECT * FROM transactions WHERE id=?", [id]);
      if (!cur) throw new Error(`Opération ${id} introuvable`);
      const catChanged = patch.category_id !== undefined && patch.category_id !== cur.category_id;
      store.run("UPDATE transactions SET date=?, account_id=?, label=?, amount=?, category_id=?, category_manual=?, note=? WHERE id=?", [
        patch.date ?? cur.date, patch.account_id ?? cur.account_id, patch.label ?? cur.label, patch.amount ?? cur.amount,
        patch.category_id === undefined ? cur.category_id : patch.category_id, catChanged ? 1 : cur.category_manual, patch.note ?? cur.note, id]);
      return true;
    },
    deleteTransaction(id: number) { store.run("DELETE FROM transactions WHERE id=?", [id]); return true; },

    // ------------------------------------------------------------ import
    previewImport(file: string, source?: Source | null) {
      const { source: s, rows } = parseFile(file, source);
      return { source: s, count: rows.length, from: rows.reduce((m, r) => (r.date < m ? r.date : m), "9999"), to: rows.reduce((m, r) => (r.date > m ? r.date : m), "0000"), sample: rows.slice(0, 8), accounts: [...new Set(rows.map((r) => r.accountKey))] };
    },
    importFile(file: string, source?: Source | null) { return importFile(store, file, source); },
    listImportAccountMap() {
      return store.all<ImportAccountMapRow>("SELECT m.*, a.name AS account FROM import_account_map m JOIN accounts a ON a.id=m.account_id ORDER BY m.source, m.key");
    },
    saveImportAccountMap(m: { id?: number; source: string; key: string; account_id: number }) {
      if (m.id) { store.run("UPDATE import_account_map SET source=?, key=?, account_id=? WHERE id=?", [m.source, m.key, m.account_id, m.id]); return m.id; }
      return store.run("INSERT INTO import_account_map(source,key,account_id) VALUES(?,?,?) ON CONFLICT(source,key) DO UPDATE SET account_id=excluded.account_id", [m.source, m.key, m.account_id]);
    },
    deleteImportAccountMap(id: number) { store.run("DELETE FROM import_account_map WHERE id=?", [id]); return true; },

    // ------------------------------------------------------------ règles
    listRules() {
      return store.all<RuleRow>("SELECT r.*, c.name AS category FROM rules r JOIN categories c ON c.id=r.category_id ORDER BY lower(r.keyword)");
    },
    saveRule(r: { id?: number; keyword: string; category_id: number }) {
      if (!r.keyword?.trim()) throw new Error("Le mot-clé est obligatoire");
      if (r.id) { store.run("UPDATE rules SET keyword=?, category_id=? WHERE id=?", [r.keyword.trim(), r.category_id, r.id]); return r.id; }
      return store.run("INSERT INTO rules(keyword,category_id) VALUES(?,?)", [r.keyword.trim(), r.category_id]);
    },
    deleteRule(id: number) { store.run("DELETE FROM rules WHERE id=?", [id]); return true; },
    listBankCategoryMap() {
      return store.all<BankCategoryMapRow>("SELECT m.*, c.name AS category FROM bank_category_map m JOIN categories c ON c.id=m.category_id ORDER BY lower(m.bank_label)");
    },
    saveBankCategoryMap(m: { id?: number; bank_label: string; category_id: number }) {
      if (m.id) { store.run("UPDATE bank_category_map SET bank_label=?, category_id=? WHERE id=?", [m.bank_label.trim(), m.category_id, m.id]); return m.id; }
      return store.run("INSERT INTO bank_category_map(bank_label,category_id) VALUES(?,?) ON CONFLICT(bank_label) DO UPDATE SET category_id=excluded.category_id", [m.bank_label.trim(), m.category_id]);
    },
    deleteBankCategoryMap(id: number) { store.run("DELETE FROM bank_category_map WHERE id=?", [id]); return true; },
    recategorize() { return recategorizeAll(store); },
    /** Catégories bancaires rencontrées sans correspondance. */
    unmappedBankCategories() {
      return store.all<{ bank_category: string; n: number }>(
        `SELECT bank_category, COUNT(*) AS n FROM transactions t
         WHERE bank_category <> '' AND category_id IS NULL GROUP BY bank_category ORDER BY n DESC`);
    },

    // ------------------------------------------------------------ budget
    budget(year?: number) { return budgetReport(store, year ?? new Date().getFullYear()); },
    setBudget(category_id: number, year: number, monthly_amount: number | null) {
      if (monthly_amount === null) store.run("DELETE FROM budgets WHERE category_id=? AND year=?", [category_id, year]);
      else store.run("INSERT INTO budgets(category_id,year,monthly_amount) VALUES(?,?,?) ON CONFLICT(category_id,year) DO UPDATE SET monthly_amount=excluded.monthly_amount", [category_id, year, monthly_amount]);
      return true;
    },

    // ------------------------------------------------------------ patrimoine
    networth() { return networthReport(store); },
    setSnapshot(month: string, account_id: number, balance: number | null) {
      const m = month.slice(0, 7) + "-01";
      if (balance === null) store.run("DELETE FROM snapshots WHERE month=? AND account_id=?", [m, account_id]);
      else store.run("INSERT INTO snapshots(month,account_id,balance) VALUES(?,?,?) ON CONFLICT(month,account_id) DO UPDATE SET balance=excluded.balance", [m, account_id, balance]);
      return true;
    },
    setSnapshotMonth(month: string, balances: Record<string, number | null>) {
      store.transaction(() => { for (const [id, b] of Object.entries(balances)) api.setSnapshot(month, Number(id), b); });
      return true;
    },
    /** Propose les soldes du mois à partir du dernier solde connu dans les relevés importés. */
    suggestedBalances() {
      const out: Record<number, { balance: number; date: string }> = {};
      for (const [id, b] of lastStatementBalances(store)) out[id] = b;
      return out;
    },

    // ------------------------------------------------------------ portefeuille
    listAssets() {
      return store.all<AssetRow>("SELECT a.*, COALESCE(ac.name,'') AS account FROM assets a LEFT JOIN accounts ac ON ac.id=a.account_id ORDER BY a.asset_class, a.name");
    },
    saveAsset(a: { id?: number; name: string; symbol?: string; account_id?: number | null; asset_class?: string; manual_price?: number | null }) {
      if (!a.name?.trim()) throw new Error("Le nom de l'actif est obligatoire");
      const id = api._saveAsset(a);
      if (a.manual_price !== null && a.manual_price !== undefined && a.manual_price > 0) recordPrice(store, id, today(), a.manual_price, "Manuel", true);
      return id;
    },
    _saveAsset(a: { id?: number; name: string; symbol?: string; account_id?: number | null; asset_class?: string; manual_price?: number | null }): number {
      if (a.id) {
        store.run("UPDATE assets SET name=?, symbol=?, account_id=?, asset_class=?, manual_price=? WHERE id=?",
          [a.name.trim(), a.symbol?.trim() ?? "", a.account_id ?? null, a.asset_class ?? "Actions & ETF", a.manual_price ?? null, a.id]);
        return a.id;
      }
      return store.run("INSERT INTO assets(name,symbol,account_id,asset_class,manual_price) VALUES(?,?,?,?,?)",
        [a.name.trim(), a.symbol?.trim() ?? "", a.account_id ?? null, a.asset_class ?? "Actions & ETF", a.manual_price ?? null]);
    },
    deleteAsset(id: number) { store.run("DELETE FROM assets WHERE id=?", [id]); return true; },
    listOperations(asset_id?: number) {
      return store.all<OperationRow>(`SELECT o.*, a.name AS asset FROM operations o JOIN assets a ON a.id=o.asset_id ${asset_id ? "WHERE o.asset_id=?" : ""} ORDER BY o.date DESC, o.id DESC`, asset_id ? [asset_id] : []);
    },
    saveOperation(o: { id?: number; date: string; asset_id: number; kind: string; quantity: number; unit_price: number; fees?: number; note?: string }) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(o.date)) throw new Error("Date attendue au format AAAA-MM-JJ");
      if (!["Achat", "Vente", "Dividende", "Frais"].includes(o.kind)) throw new Error(`Type inconnu : ${o.kind}`);
      if (o.id) {
        store.run("UPDATE operations SET date=?, asset_id=?, kind=?, quantity=?, unit_price=?, fees=?, note=? WHERE id=?", [o.date, o.asset_id, o.kind, o.quantity, o.unit_price, o.fees ?? 0, o.note ?? "", o.id]);
        return o.id;
      }
      return store.run("INSERT INTO operations(date,asset_id,kind,quantity,unit_price,fees,note) VALUES(?,?,?,?,?,?,?)", [o.date, o.asset_id, o.kind, o.quantity, o.unit_price, o.fees ?? 0, o.note ?? ""]);
    },
    deleteOperation(id: number) { store.run("DELETE FROM operations WHERE id=?", [id]); return true; },
    portfolio() { return portfolioReport(store); },
    refreshPrices() { return refreshPrices(store); },
    portfolioHistory() { return portfolioHistory(store); },
    backfillPriceHistory() { return backfillPriceHistory(store); },
    priceHistory(asset_id: number) {
      return store.all<{ date: string; price: number; source: string }>("SELECT date, price, source FROM price_history WHERE asset_id=? ORDER BY date", [asset_id]);
    },
    addPricePoint(asset_id: number, date: string, price: number) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Date attendue au format AAAA-MM-JJ");
      if (!(price > 0)) throw new Error("Cours invalide");
      recordPrice(store, asset_id, date, price, "Manuel");
      return true;
    },

    // ------------------------------------------------------------ enveloppes (livrets, PEA)
    envelopes() { return envelopes(store); },
    saveEnvelope(e: { id?: number; account_id: number; kind: string; ceiling?: number | null; rate?: number | null; opened_on?: string | null; initial_deposits?: number; monthly_deposit?: number; note?: string }) {
      if (!ENVELOPE_KINDS[e.kind]) throw new Error(`Type d'enveloppe inconnu : ${e.kind} (${ENVELOPE_KIND_NAMES.join(", ")})`);
      if (!e.account_id) throw new Error("Choisis le compte rattaché");
      if (e.rate !== null && e.rate !== undefined && (e.rate < 0 || e.rate > 0.5)) throw new Error("Taux attendu en fraction (ex. 0.025 pour 2,5 %)");
      if (e.opened_on && !/^\d{4}-\d{2}-\d{2}$/.test(e.opened_on)) throw new Error("Date attendue au format AAAA-MM-JJ");
      const vals = [e.account_id, e.kind, e.ceiling ?? null, e.rate ?? null, e.opened_on || null, e.initial_deposits ?? 0, e.monthly_deposit ?? 0, e.note ?? ""];
      if (e.id) { store.run("UPDATE envelopes SET account_id=?, kind=?, ceiling=?, rate=?, opened_on=?, initial_deposits=?, monthly_deposit=?, note=? WHERE id=?", [...vals, e.id]); return e.id; }
      return store.run(`INSERT INTO envelopes(account_id,kind,ceiling,rate,opened_on,initial_deposits,monthly_deposit,note) VALUES(?,?,?,?,?,?,?,?)
        ON CONFLICT(account_id) DO UPDATE SET kind=excluded.kind, ceiling=excluded.ceiling, rate=excluded.rate, opened_on=excluded.opened_on,
        initial_deposits=excluded.initial_deposits, monthly_deposit=excluded.monthly_deposit, note=excluded.note`, vals);
    },
    deleteEnvelope(id: number) { store.run("DELETE FROM envelopes WHERE id=?", [id]); return true; },

    // ------------------------------------------------------------ abonnements et charges récurrentes
    recurring() { return recurring(store); },
    setRecurringStatus(key: string, status: "auto" | "confirmed" | "ignored", label?: string) {
      if (status === "auto" && !label) store.run("DELETE FROM recurring_overrides WHERE merchant=?", [key]);
      else store.run(`INSERT INTO recurring_overrides(merchant,status,label) VALUES(?,?,?)
        ON CONFLICT(merchant) DO UPDATE SET status=excluded.status, label=excluded.label`, [key, status === "auto" ? "confirmed" : status, label ?? ""]);
      return true;
    },

    // ------------------------------------------------------------ objectifs d'épargne
    goals() { return goals(store); },
    saveGoal(g: GoalInput) { return saveGoal(store, g); },
    deleteGoal(id: number) { store.run("DELETE FROM goals WHERE id=?", [id]); return true; },

    // ------------------------------------------------------------ remboursements
    refunds(year?: number) { return refundsReport(store, { year }); },
    linkRefund(refund_id: number, target: { expense_id?: number | null; category_id?: number | null }, remember = false) { return linkRefund(store, refund_id, target, remember); },
    unlinkRefund(refund_id: number) { store.run("DELETE FROM refund_links WHERE refund_id=?", [refund_id]); return true; },
    saveRefundRule(r: { id?: number; keyword: string; category_id: number }) {
      if (!r.keyword?.trim()) throw new Error("Le payeur (mot-clé) est obligatoire");
      if (r.id) { store.run("UPDATE refund_rules SET keyword=?, category_id=? WHERE id=?", [r.keyword.trim(), r.category_id, r.id]); return r.id; }
      return store.run("INSERT INTO refund_rules(keyword,category_id) VALUES(?,?) ON CONFLICT(keyword) DO UPDATE SET category_id=excluded.category_id", [r.keyword.trim(), r.category_id]);
    },
    deleteRefundRule(id: number) { store.run("DELETE FROM refund_rules WHERE id=?", [id]); return true; },
    /** Lie automatiquement les remboursements dont la meilleure suggestion dépasse `minScore`. */
    applyRefundSuggestions(minScore = 0.85) {
      const rep = refundsReport(store);
      let linked = 0;
      const used = new Map<number, number>();
      store.transaction(() => {
        for (const r of rep.rows) {
          const s = r.suggestions.find((x) => x.type === "category" || (used.get(x.expense_id!) ?? 0) + r.amount <= -x.amount! + 0.01);
          if (r.link || !s || s.score < minScore) continue;
          if (s.type === "expense") used.set(s.expense_id!, (used.get(s.expense_id!) ?? 0) + r.amount);
          linkRefund(store, r.id, s.type === "expense" ? { expense_id: s.expense_id } : { category_id: s.category_id });
          linked++;
        }
      });
      return { linked };
    },

    // ------------------------------------------------------------ allocation / projection / tableau de bord
    listTargets() { return store.all<{ asset_class: string; pct: number }>("SELECT * FROM targets ORDER BY rowid"); },
    setTarget(asset_class: string, pct: number) {
      store.run("INSERT INTO targets(asset_class,pct) VALUES(?,?) ON CONFLICT(asset_class) DO UPDATE SET pct=excluded.pct", [asset_class, pct]);
      return api.listTargets();
    },
    allocation(nextDeposit?: number) { return allocationReport(store, nextDeposit); },
    projection(p?: ProjectionParams) { return projectionReport(store, p); },
    dashboard() { return dashboard(store); },

    // ------------------------------------------------------------ export
    async exportExcel(file: string) { await exportWorkbook(store, api, file); return file; },
    startMonth() { return setting(store, "start_month", "2026-01-01"); },
  };
  return api;
}

export type Api = ReturnType<typeof createApi>;
export type ApiMethod = keyof Api;
