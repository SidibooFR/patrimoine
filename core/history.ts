/**
 * Historique des cours et évolution du portefeuille.
 *
 * - `price_history` garde un cours par actif et par jour : alimenté à chaque
 *   actualisation des cours, à chaque cours manuel saisi, et en une fois par
 *   `backfillPriceHistory` (Yahoo Finance depuis le premier achat, CoinGecko sur
 *   365 jours maximum, limite de l'API publique).
 * - `portfolioHistory` reconstitue la valeur jour par jour (quantités détenues ×
 *   dernier cours connu ; à défaut, prix de la dernière opération) et calcule la
 *   performance pondérée par le temps (TWR), indépendante du calendrier des versements.
 */
import type { Store } from "./db.js";
import { round2, today } from "./finance.js";

const UA = "Mozilla/5.0 (compatible; Patrimoine/1.0)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const addDays = (d: string, n: number) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

export function recordPrice(store: Store, assetId: number, date: string, price: number, source: string, keepManual = false): void {
  if (!(price > 0)) return;
  store.run(`INSERT INTO price_history(asset_id,date,price,source) VALUES(?,?,?,?)
             ON CONFLICT(asset_id,date) DO UPDATE SET price=excluded.price, source=excluded.source
             ${keepManual ? "WHERE price_history.source <> 'Manuel'" : ""}`, [assetId, date, price, source]);
}

/** Clôtures quotidiennes Yahoo Finance entre deux dates (EUR uniquement). */
export async function fetchYahooHistory(symbol: string, from: string, to: string = today()): Promise<{ points: [string, number][]; currency: string } | null> {
  const p1 = Math.floor(Date.parse(from + "T00:00:00Z") / 1000);
  const p2 = Math.floor(Date.parse(to + "T23:59:59Z") / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol.trim())}?period1=${p1}&period2=${p2}&interval=1d&events=history`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!res.ok) return null;
    const j: any = await res.json();
    const r = j?.chart?.result?.[0];
    const ts: number[] = r?.timestamp ?? [];
    const close: (number | null)[] = r?.indicators?.quote?.[0]?.close ?? [];
    const points: [string, number][] = [];
    ts.forEach((t, i) => { const c = close[i]; if (typeof c === "number" && c > 0) points.push([isoDay(t * 1000), c]); });
    return { points, currency: String(r?.meta?.currency ?? "") };
  } catch {
    return null;
  }
}

/** Cours quotidiens CoinGecko en euros (365 jours maximum avec l'API publique). */
export async function fetchCoinGeckoHistory(id: string, days: number): Promise<[string, number][] | null | "rate-limited"> {
  const d = Math.max(1, Math.min(365, Math.ceil(days)));
  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id.trim().toLowerCase())}/market_chart?vs_currency=eur&days=${d}&interval=daily`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (res.status === 429) return "rate-limited";
    if (!res.ok) return null;
    const j: any = await res.json();
    const byDay = new Map<string, number>();
    for (const [ms, p] of (j?.prices ?? []) as [number, number][]) if (p > 0) byDay.set(isoDay(ms), p);
    return [...byDay.entries()];
  } catch {
    return null;
  }
}

export interface BackfillResult { assets: number; points: number; failed: string[]; from: string | null }

/** Télécharge l'historique des cours de tous les actifs cotés depuis leur premier achat. */
export async function backfillPriceHistory(store: Store, opts: { coingeckoDelayMs?: number } = {}): Promise<BackfillResult> {
  const t = today();
  const assets = store.all<{ id: number; name: string; symbol: string; asset_class: string; first: string | null }>(
    `SELECT a.id, a.name, a.symbol, a.asset_class, (SELECT MIN(date) FROM operations o WHERE o.asset_id=a.id) AS first
     FROM assets a WHERE TRIM(a.symbol) <> ''`);
  const res: BackfillResult = { assets: 0, points: 0, failed: [], from: null };
  const delay = opts.coingeckoDelayMs ?? 2500;
  let geckoCalls = 0;
  for (const a of assets) {
    const from = addDays(a.first ?? addDays(t, -365), -7);
    if (!res.from || from < res.from) res.from = from;
    let points: [string, number][] | null = null;
    let source = "";
    if (a.asset_class === "Crypto") {
      if (geckoCalls++ > 0) await sleep(delay);
      const days = (Date.parse(t) - Date.parse(from)) / 86_400_000 + 1;
      let r = await fetchCoinGeckoHistory(a.symbol, days);
      if (r === "rate-limited") { await sleep(Math.max(delay * 12, 1000)); r = await fetchCoinGeckoHistory(a.symbol, days); }
      if (r && r !== "rate-limited") { points = r; source = "CoinGecko"; }
    } else {
      const r = await fetchYahooHistory(a.symbol, from, t);
      if (r && r.currency && r.currency !== "EUR") { res.failed.push(`${a.name} (coté en ${r.currency})`); continue; }
      if (r) { points = r.points; source = "Yahoo Finance"; }
    }
    if (!points || !points.length) { res.failed.push(a.name); continue; }
    store.transaction(() => { for (const [d, p] of points!) recordPrice(store, a.id, d, p, source, true); });
    res.assets++; res.points += points.length;
  }
  return res;
}

// ---------------------------------------------------------------- Évolution du portefeuille

export interface HistoryPoint { date: string; value: number; invested: number; gain: number; byClass: Record<string, number>; coverage: number }
export interface PeriodReturn { label: string; from: string; twr: number | null; annualized: number | null; gain: number | null; reliable: boolean; reason: string | null }
export interface PortfolioHistory {
  points: HistoryPoint[];          // échantillonnés pour le graphique
  periods: PeriodReturn[];
  twrSinceStart: number | null;
  start: string | null;
  coverage: number | null;          // part de la valeur valorisée avec un vrai cours historique (moyenne)
  historyPoints: number;            // nombre de cours historiques en base
  approximateOps: number;           // opérations notées « approximative »
}

interface Op { date: string; kind: string; quantity: number; unit_price: number; fees: number }

export function portfolioHistory(store: Store, opts: { asOf?: string; maxPoints?: number } = {}): PortfolioHistory {
  const t = opts.asOf ?? today();
  const assets = store.all<{ id: number; asset_class: string; price: number | null; manual_price: number | null }>("SELECT id, asset_class, price, manual_price FROM assets");
  const ops = store.all<Op & { asset_id: number; note: string }>("SELECT asset_id, date, kind, quantity, unit_price, fees, note FROM operations ORDER BY date, id");
  const hist = store.all<{ asset_id: number; date: string; price: number }>("SELECT asset_id, date, price FROM price_history WHERE date <= ? ORDER BY asset_id, date", [t]);
  const empty: PortfolioHistory = { points: [], periods: [], twrSinceStart: null, start: null, coverage: null, historyPoints: hist.length, approximateOps: ops.filter((o) => /approximati/i.test(o.note)).length };
  if (!ops.length) return empty;
  const start = ops[0].date;
  const days: string[] = [];
  for (let d = start; d <= t; d = addDays(d, 1)) days.push(d);

  // Par actif : quantité, cours du jour (historique > dernière opération), flux externes
  const value = new Array(days.length).fill(0);
  const covered = new Array(days.length).fill(0);
  const flows = new Array(days.length).fill(0);   // + apport (achat), − retrait (vente, dividende)
  const invested = new Array(days.length).fill(0);
  const byClass: Record<string, number[]> = {};
  for (const a of assets) {
    const mine = ops.filter((o) => o.asset_id === a.id);
    if (!mine.length) continue;
    const hp = hist.filter((h) => h.asset_id === a.id);
    const cls = (byClass[a.asset_class] ??= new Array(days.length).fill(0));
    let qty = 0, oi = 0, hi = 0, lastOpPrice: number | null = null, lastHist: number | null = null, net = 0;
    for (let i = 0; i < days.length; i++) {
      const d = days[i];
      while (oi < mine.length && mine[oi].date <= d) {
        const o = mine[oi++];
        const gross = o.quantity * o.unit_price;
        if (o.kind === "Achat") { qty += o.quantity; flows[i] += gross + o.fees; net += gross + o.fees; lastOpPrice = o.unit_price; }
        else if (o.kind === "Vente") { qty -= o.quantity; flows[i] -= gross - o.fees; net -= gross - o.fees; lastOpPrice = o.unit_price; }
        else if (o.kind === "Dividende") flows[i] -= gross - o.fees;
        else { flows[i] += o.fees; net += o.fees; }
      }
      while (hi < hp.length && hp[hi].date <= d) lastHist = hp[hi++].price;
      let price = lastHist ?? lastOpPrice ?? 0;
      let real = lastHist !== null;
      if (d === t) { const cur = a.price ?? a.manual_price; if (cur !== null) { price = cur; real = true; } }
      const v = Math.max(0, qty) * price;
      value[i] += v; cls[i] += v; invested[i] += net;
      if (real) covered[i] += v;
    }
  }

  // TWR : rendement de chaque jour, flux supposés en fin de journée
  const ret: number[] = new Array(days.length).fill(0);
  for (let i = 1; i < days.length; i++) {
    ret[i] = value[i - 1] > 1e-9 ? (value[i] - flows[i]) / value[i - 1] - 1 : 0;
  }
  const twrBetween = (fromIdx: number): number | null => {
    if (fromIdx < 0 || fromIdx >= days.length - 1) return null;
    let g = 1;
    for (let i = fromIdx + 1; i < days.length; i++) g *= 1 + ret[i];
    return g - 1;
  };
  const idxOf = (d: string) => { const i = days.indexOf(d); return i >= 0 ? i : d < start ? -1 : days.length - 1; };
  const firstValued = value.findIndex((v) => v > 0);
  const year = t.slice(0, 4);
  const defs: [string, string][] = [
    ["1 mois", addDays(t, -30)], ["3 mois", addDays(t, -91)], ["Depuis le 1er janvier", `${Number(year) - 1}-12-31`], ["1 an", addDays(t, -365)],
  ];
  const last = days.length - 1;
  // Une performance de période n'a de sens que si de vrais cours couvrent la période
  // (sinon la hausse s'accumule sur le dernier jour, valorisé au cours actuel).
  const cov = value.map((v, i) => (v > 1e-9 ? covered[i] / v : 1));
  const minCoverage = (a: number, b: number) => { let m = 1; for (let i = a; i < b; i++) m = Math.min(m, cov[i]); return m; };
  const NO_HISTORY = "cours historiques manquants : télécharge l'historique des cours";
  const periods: PeriodReturn[] = defs.map(([label, from]) => {
    if (from < days[Math.max(0, firstValued)]) return { label, from, twr: null, annualized: null, gain: null, reliable: false, reason: "période antérieure au premier achat" };
    const i = idxOf(from);
    const flowSum = flows.slice(i + 1).reduce((s, f) => s + f, 0);
    const gain = round2(value[last] - value[i] - flowSum);
    if (minCoverage(i, last) < 0.8) return { label, from, twr: null, annualized: null, gain: null, reliable: false, reason: NO_HISTORY };
    return { label, from, twr: twrBetween(i), annualized: null, gain, reliable: true, reason: null };
  });
  const sinceIdx = Math.max(0, firstValued);
  const twrAll = twrBetween(sinceIdx);
  const spanDays = last - sinceIdx;
  const allReliable = minCoverage(sinceIdx, last) >= 0.8;
  periods.push({ label: "Depuis le début", from: days[sinceIdx], twr: twrAll, annualized: twrAll !== null && spanDays >= 365 ? Math.pow(1 + twrAll, 365 / spanDays) - 1 : null, gain: round2(value[last] - invested[last]), reliable: allReliable, reason: allReliable ? null : NO_HISTORY });

  // Échantillonnage pour le graphique
  const maxPoints = opts.maxPoints ?? 180;
  const step = Math.max(1, Math.ceil(days.length / maxPoints));
  const points: HistoryPoint[] = [];
  for (let i = 0; i < days.length; i++) {
    if (i % step !== 0 && i !== last) continue;
    points.push({
      date: days[i], value: round2(value[i]), invested: round2(invested[i]), gain: round2(value[i] - invested[i]),
      byClass: Object.fromEntries(Object.entries(byClass).map(([c, arr]) => [c, round2(arr[i])])),
      coverage: value[i] > 0 ? covered[i] / value[i] : 1,
    });
  }
  const valued = value.map((v, i) => (v > 0 ? covered[i] / v : null)).filter((x): x is number => x !== null);
  return {
    points, periods, twrSinceStart: twrAll, start: days[sinceIdx],
    coverage: valued.length ? valued.reduce((a, b) => a + b, 0) / valued.length : null,
    historyPoints: hist.length, approximateOps: empty.approximateOps,
  };
}
