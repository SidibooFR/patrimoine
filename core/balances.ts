/**
 * Soldes par compte : dernier solde connu (relevé importé, relevé de patrimoine
 * ou valeur du portefeuille) et reconstitution du solde jour par jour.
 */
import type { Store } from "./db.js";
import { round2 } from "./finance.js";

export interface CurrentBalance { balance: number; date: string; source: "relevé" | "patrimoine" | "portefeuille" }

/**
 * Dernier solde des relevés importés, par compte.
 * Plusieurs opérations le même jour : la dernière est celle dont le solde
 * n'est le « solde précédent » d'aucune autre (les exports ne sont pas tous
 * dans le même ordre : Revolut chronologique, BNP/Boursobank antichronologique).
 */
export function lastStatementBalances(store: Store): Map<number, { balance: number; date: string }> {
  const rows = store.all<{ account_id: number; date: string; amount: number; balance: number }>(
    `SELECT t.account_id, t.date, t.amount, t.balance FROM transactions t
     WHERE t.balance IS NOT NULL
       AND t.date = (SELECT MAX(date) FROM transactions WHERE account_id = t.account_id AND balance IS NOT NULL)
     ORDER BY t.account_id, t.id`);
  const byAcc = new Map<number, typeof rows>();
  for (const r of rows) { const l = byAcc.get(r.account_id) ?? []; l.push(r); byAcc.set(r.account_id, l); }
  const out = new Map<number, { balance: number; date: string }>();
  for (const [acc, list] of byAcc) {
    const prev = new Set(list.map((r) => round2(r.balance - r.amount)));
    const last = list.find((r) => !prev.has(round2(r.balance))) ?? list[list.length - 1];
    out.set(acc, { balance: round2(last.balance), date: last.date });
  }
  return out;
}

/** Valeur du portefeuille par compte (actifs rattachés à un compte, au cours actuel). */
export function portfolioValueByAccount(store: Store): Map<number, number> {
  const assets = store.all<{ id: number; account_id: number | null; price: number | null; manual_price: number | null }>(
    "SELECT id, account_id, price, manual_price FROM assets WHERE account_id IS NOT NULL");
  const out = new Map<number, number>();
  for (const a of assets) {
    const q = store.get<{ qty: number; cost: number; qb: number }>(
      `SELECT COALESCE(SUM(CASE kind WHEN 'Achat' THEN quantity WHEN 'Vente' THEN -quantity ELSE 0 END),0) AS qty,
              COALESCE(SUM(CASE kind WHEN 'Achat' THEN quantity*unit_price+fees WHEN 'Frais' THEN fees ELSE 0 END),0) AS cost,
              COALESCE(SUM(CASE kind WHEN 'Achat' THEN quantity ELSE 0 END),0) AS qb
       FROM operations WHERE asset_id=?`, [a.id])!;
    if (q.qty <= 1e-12) continue;
    const price = a.price ?? a.manual_price ?? (q.qb > 0 ? q.cost / q.qb : 0);
    out.set(a.account_id!, round2((out.get(a.account_id!) ?? 0) + q.qty * price));
  }
  return out;
}

/** Meilleur solde actuel connu pour chaque compte. */
export function currentBalances(store: Store): Map<number, CurrentBalance> {
  const statements = lastStatementBalances(store);
  const portfolio = portfolioValueByAccount(store);
  const snaps = store.all<{ account_id: number; month: string; balance: number }>(
    `SELECT s.account_id, s.month, s.balance FROM snapshots s
     WHERE s.month = (SELECT MAX(month) FROM snapshots WHERE account_id = s.account_id)`);
  const snapBy = new Map(snaps.map((s) => [s.account_id, s]));
  const accounts = store.all<{ id: number }>("SELECT id FROM accounts");
  const out = new Map<number, CurrentBalance>();
  for (const { id } of accounts) {
    const pv = portfolio.get(id);
    const st = statements.get(id);
    const sn = snapBy.get(id);
    if (pv !== undefined) out.set(id, { balance: pv, date: new Date().toISOString().slice(0, 10), source: "portefeuille" });
    else if (st && (!sn || st.date >= sn.month)) out.set(id, { ...st, source: "relevé" });
    else if (sn) out.set(id, { balance: sn.balance, date: sn.month, source: "patrimoine" });
  }
  return out;
}

/**
 * Solde en fin de journée pour chaque jour de [from, to], reconstitué à rebours
 * depuis le solde actuel connu et les opérations du compte.
 */
export function dailyBalances(store: Store, accountId: number, from: string, to: string, current?: CurrentBalance): Map<string, number> {
  const cur = current ?? currentBalances(store).get(accountId);
  const out = new Map<string, number>();
  if (!cur) return out;
  const txs = store.all<{ date: string; amount: number }>(
    "SELECT date, amount FROM transactions WHERE account_id=? ORDER BY date", [accountId]);
  // solde au jour J = solde connu (à cur.date) − opérations entre J (exclu) et cur.date (inclus) + opérations entre cur.date (exclu) et J (inclus)
  const days: string[] = [];
  for (let d = new Date(from + "T00:00:00Z"); d.toISOString().slice(0, 10) <= to; d.setUTCDate(d.getUTCDate() + 1)) days.push(d.toISOString().slice(0, 10));
  for (const day of days) {
    let b = cur.balance;
    for (const t of txs) {
      if (t.date > day && t.date <= cur.date) b -= t.amount;
      else if (t.date > cur.date && t.date <= day) b += t.amount;
    }
    out.set(day, round2(b));
  }
  return out;
}
