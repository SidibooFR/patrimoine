/**
 * Enveloppes réglementées et fiscales : plafonds, intérêts perçus et estimés,
 * et conseils de remplissage (sous-utilisation d'un livret mieux rémunéré).
 *
 * Livrets réglementés : intérêts calculés par quinzaine (1er et 16 du mois).
 * Un versement porte intérêt à partir de la quinzaine suivante ; un retrait
 * cesse de porter intérêt dès le début de la quinzaine où il a lieu. Les
 * intérêts sont capitalisés le 31 décembre.
 */
import type { Store } from "./db.js";
import { currentBalances, dailyBalances, type CurrentBalance } from "./balances.js";
import { round2, today } from "./finance.js";
import { normalize } from "./categorize.js";

export const RATES_AS_OF = "2026-08-01";

export interface EnvelopeKind {
  ceiling: number | null;
  /** « balance » : le plafond limite le solde (livrets) ; « deposits » : il limite le cumul des versements (PEA). */
  ceilingOn: "balance" | "deposits" | null;
  regulated: boolean;
  /** Historique des taux officiels nets (date d'effet, taux annuel). */
  rates: [string, number][];
  help: string;
}

// Taux officiels publiés au Journal officiel (Livret A / LDDS / LEP), plafonds légaux.
const LA_RATES: [string, number][] = [["2025-02-01", 0.024], ["2025-08-01", 0.017], ["2026-02-01", 0.015], ["2026-08-01", 0.017]];
export const ENVELOPE_KINDS: Record<string, EnvelopeKind> = {
  "LEP": { ceiling: 10000, ceilingOn: "balance", regulated: true, rates: [["2025-02-01", 0.035], ["2025-08-01", 0.027], ["2026-02-01", 0.025], ["2026-08-01", 0.025]], help: "Livret d'épargne populaire : sous conditions de revenus, exonéré d'impôt et de prélèvements sociaux." },
  "Livret A": { ceiling: 22950, ceilingOn: "balance", regulated: true, rates: LA_RATES, help: "Exonéré d'impôt et de prélèvements sociaux." },
  "LDDS": { ceiling: 12000, ceilingOn: "balance", regulated: true, rates: LA_RATES, help: "Livret de développement durable et solidaire : même taux que le Livret A, exonéré." },
  "Livret jeune": { ceiling: 1600, ceilingOn: "balance", regulated: true, rates: LA_RATES, help: "12-25 ans ; taux au moins égal à celui du Livret A (vérifie le taux de ta banque)." },
  "PEA": { ceiling: 150000, ceilingOn: "deposits", regulated: false, rates: [], help: "Plafond de versements 150 000 €. Après 5 ans, gains exonérés d'impôt sur le revenu (prélèvements sociaux seuls)." },
  "PEA-PME": { ceiling: 225000, ceilingOn: "deposits", regulated: false, rates: [], help: "Plafond commun PEA + PEA-PME de 225 000 €." },
  "Compte rémunéré": { ceiling: null, ceilingOn: null, regulated: false, rates: [], help: "Compte ou livret bancaire non réglementé : intérêts soumis au prélèvement forfaitaire. Indique le taux net, ou laisse vide pour utiliser le taux constaté." },
  "Assurance-vie": { ceiling: null, ceilingOn: null, regulated: false, rates: [], help: "Pas de plafond de versement." },
  "Autre": { ceiling: null, ceilingOn: null, regulated: false, rates: [], help: "" },
};
export const ENVELOPE_KIND_NAMES = Object.keys(ENVELOPE_KINDS);

/** Taux officiel en vigueur à une date. */
export function officialRate(kind: string, date: string): number | null {
  const rates = ENVELOPE_KINDS[kind]?.rates ?? [];
  let r: number | null = null;
  for (const [d, v] of rates) if (d <= date) r = v;
  return r;
}

/** Bornes des 24 quinzaines d'une année. */
export function quinzaines(year: number): { start: string; end: string }[] {
  const out: { start: string; end: string }[] = [];
  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, "0");
    const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
    out.push({ start: `${year}-${mm}-01`, end: `${year}-${mm}-15` });
    out.push({ start: `${year}-${mm}-16`, end: `${year}-${mm}-${String(last).padStart(2, "0")}` });
  }
  return out;
}

const addDays = (d: string, n: number) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

/**
 * Intérêts d'une année selon la règle des quinzaines.
 * `balanceAt(jour)` : solde en fin de journée (passé connu) ; au-delà d'aujourd'hui,
 * le solde est supposé constant, augmenté du versement programmé du 1er de chaque mois.
 */
export function quinzaineInterest(year: number, rateAt: (date: string) => number, balanceAt: (day: string) => number | undefined,
  withdrawalsBetween: (from: string, to: string) => number, asOf: string, currentBalance: number, monthlyDeposit = 0): { total: number; earned: number } {
  let total = 0, earned = 0;
  let projected = currentBalance;
  for (const q of quinzaines(year)) {
    let base: number;
    if (q.start <= asOf) {
      const start = balanceAt(addDays(q.start, -1)) ?? 0;
      base = start - withdrawalsBetween(q.start, q.end <= asOf ? q.end : asOf);
    } else {
      // versement du 1er : porte intérêt à partir du 16
      if (q.start.endsWith("-16") && monthlyDeposit > 0) projected += monthlyDeposit;
      base = projected;
    }
    const i = Math.max(0, base) * rateAt(q.start) / 24;
    total += i;
    if (q.end <= asOf) earned += i;
  }
  return { total: round2(total), earned: round2(earned) };
}

export interface EnvelopeRow {
  id: number; account_id: number; account: string; kind: string; help: string;
  balance: number | null; balanceDate: string | null; balanceSource: string | null;
  ceiling: number | null; ceilingOn: "balance" | "deposits" | null; deposits: number | null;
  used: number | null; room: number | null; fill: number | null;
  rate: number | null; rateSource: "officiel" | "personnalisé" | "constaté" | null;
  interestThisYear: number; interestLastYear: number; interestAllTime: number;
  estimateThisYear: number | null; estimateAtCeiling: number | null;
  opened_on: string | null; fiveYears: string | null; initial_deposits: number; monthly_deposit: number; note: string;
}

export interface EnvelopeMove { from_account_id: number; from: string; to_account_id: number; to: string; amount: number; fromRate: number; toRate: number; gainPerYear: number }

export interface EnvelopesReport {
  ratesAsOf: string; year: number;
  rows: EnvelopeRow[];
  totals: { balance: number; room: number; interestThisYear: number; estimateThisYear: number };
  moves: EnvelopeMove[];
  missed: number;  // gain annuel possible en appliquant les conseils
  hasPea: boolean;
  alerts: { level: "ok" | "warn"; text: string }[];
}

function isInterest(label: string, category: string | null): boolean {
  return category === "Intérêts d'épargne" || normalize(label).includes("interet");
}

/** Taux net constaté à partir des intérêts versés (comptes à intérêts quotidiens ou mensuels). */
function observedRate(store: Store, accountId: number, cur: CurrentBalance | undefined): number | null {
  const t = today();
  const from = addDays(t, -365);
  const rows = store.all<{ date: string; amount: number; label: string; category: string | null }>(
    `SELECT t.date, t.amount, t.label, c.name AS category FROM transactions t LEFT JOIN categories c ON c.id=t.category_id
     WHERE t.account_id=? AND t.date>=? AND t.amount>0 ORDER BY t.date`, [accountId, from]);
  const ints = rows.filter((r) => isInterest(r.label, r.category));
  if (ints.length < 2) return null;
  const first = ints[0].date, last = ints[ints.length - 1].date;
  const span = (Date.parse(last) - Date.parse(first)) / 86_400_000 + 1;
  if (span < 30) return null;
  const bal = dailyBalances(store, accountId, first, last, cur);
  const avg = [...bal.values()].reduce((a, b) => a + b, 0) / Math.max(1, bal.size);
  if (avg <= 0) return null;
  const total = ints.reduce((s, r) => s + r.amount, 0);
  return total / avg * 365 / span;
}

export function envelopesReport(store: Store, opts: { underuseThreshold?: number; bufferMonths?: number; avgExpense?: number } = {}): EnvelopesReport {
  const t = today();
  const year = Number(t.slice(0, 4));
  const balances = currentBalances(store);
  const envs = store.all<any>(`SELECT e.*, a.name AS account FROM envelopes e JOIN accounts a ON a.id=e.account_id WHERE a.archived=0 ORDER BY a.sort, a.id`);
  const rows: EnvelopeRow[] = [];
  for (const e of envs) {
    const k = ENVELOPE_KINDS[e.kind] ?? ENVELOPE_KINDS["Autre"];
    const cur = balances.get(e.account_id);
    const txs = store.all<{ date: string; amount: number; label: string; category: string | null; kind: string | null }>(
      `SELECT t.date, t.amount, t.label, c.name AS category, c.kind FROM transactions t LEFT JOIN categories c ON c.id=t.category_id WHERE t.account_id=? ORDER BY t.date`, [e.account_id]);
    const interest = txs.filter((x) => x.amount > 0 && isInterest(x.label, x.category));
    const sumYear = (y: number) => round2(interest.filter((x) => x.date.startsWith(String(y))).reduce((s, x) => s + x.amount, 0));
    const ceiling = e.ceiling ?? k.ceiling;
    // Versements : pour un PEA, cumul des entrées hors revenus (dividendes, intérêts)
    const deposits = k.ceilingOn === "deposits"
      ? round2(e.initial_deposits + txs.filter((x) => x.amount > 0 && x.kind !== "Revenu" && !isInterest(x.label, x.category)).reduce((s, x) => s + x.amount, 0))
      : null;
    const balance = cur?.balance ?? null;
    const used = k.ceilingOn === "deposits" ? deposits : balance;
    const room = ceiling !== null && used !== null ? round2(Math.max(0, ceiling - used)) : null;
    // Taux : personnalisé > officiel > constaté
    let rate: number | null = e.rate;
    let rateSource: EnvelopeRow["rateSource"] = rate !== null ? "personnalisé" : null;
    if (rate === null && k.rates.length) { rate = officialRate(e.kind, t); rateSource = "officiel"; }
    if (rate === null && k.ceilingOn !== "deposits") { rate = observedRate(store, e.account_id, cur); rateSource = rate !== null ? "constaté" : null; }
    const rateAt = (d: string) => (e.rate === null && k.rates.length ? officialRate(e.kind, d) ?? 0 : rate ?? 0);

    let estimate: number | null = null;
    if (rate !== null && balance !== null) {
      const bal = dailyBalances(store, e.account_id, `${year - 1}-12-31`, t, cur);
      const lastKnown = (day: string) => {
        if (bal.has(day)) return bal.get(day);
        return day < `${year - 1}-12-31` ? 0 : balance;
      };
      const withdrawals = (a: string, b: string) => -txs.filter((x) => x.amount < 0 && x.date >= a && x.date <= b).reduce((s, x) => s + x.amount, 0);
      if (k.regulated) {
        estimate = quinzaineInterest(year, rateAt, lastKnown, withdrawals, t, balance, e.monthly_deposit).total;
      } else {
        // Intérêts versés au fil de l'eau : perçus depuis le 1er janvier + reste de l'année au taux actuel
        const daysLeft = (Date.parse(`${year}-12-31`) - Date.parse(t)) / 86_400_000;
        estimate = round2(sumYear(year) + Math.max(0, balance) * rate * daysLeft / 365);
      }
    }
    const fiveYears = e.opened_on && (e.kind === "PEA" || e.kind === "PEA-PME") ? `${Number(e.opened_on.slice(0, 4)) + 5}${e.opened_on.slice(4)}` : null;
    rows.push({
      id: e.id, account_id: e.account_id, account: e.account, kind: e.kind, help: k.help,
      balance, balanceDate: cur?.date ?? null, balanceSource: cur?.source ?? null,
      ceiling, ceilingOn: k.ceilingOn, deposits, used, room, fill: ceiling && used !== null ? Math.min(1, used / ceiling) : null,
      rate, rateSource,
      interestThisYear: sumYear(year), interestLastYear: sumYear(year - 1), interestAllTime: round2(interest.reduce((s, x) => s + x.amount, 0)),
      estimateThisYear: estimate, estimateAtCeiling: ceiling !== null && rate !== null && k.ceilingOn === "balance" ? round2(ceiling * rate) : null,
      opened_on: e.opened_on, fiveYears, initial_deposits: e.initial_deposits, monthly_deposit: e.monthly_deposit, note: e.note,
    });
  }

  // ---- Conseils : remplir d'abord les livrets les mieux rémunérés
  const threshold = opts.underuseThreshold ?? 0.5;
  const bufferMonths = opts.bufferMonths ?? 1;
  const avgExpense = opts.avgExpense ?? 0;
  const targets = rows.filter((r) => r.ceilingOn === "balance" && r.rate !== null && (r.room ?? 0) > 0).sort((a, b) => b.rate! - a.rate!);
  // Sources : comptes rémunérés moins bien payés (non plafonnés), puis l'excédent des comptes courants
  const sources: { account_id: number; name: string; available: number; rate: number }[] = [];
  for (const r of rows) if (r.ceilingOn === null && r.balance && r.balance > 0) sources.push({ account_id: r.account_id, name: r.account, available: r.balance, rate: r.rate ?? 0 });
  const envAccounts = new Set(rows.map((r) => r.account_id));
  const checking = store.all<{ id: number; name: string }>("SELECT id, name FROM accounts WHERE archived=0 AND type='Courant'").filter((a) => !envAccounts.has(a.id));
  const checkingTotal = checking.reduce((s, a) => s + Math.max(0, balances.get(a.id)?.balance ?? 0), 0);
  let surplus = Math.max(0, checkingTotal - bufferMonths * avgExpense);
  for (const a of [...checking].sort((x, y) => (balances.get(y.id)?.balance ?? 0) - (balances.get(x.id)?.balance ?? 0))) {
    const b = Math.max(0, balances.get(a.id)?.balance ?? 0);
    const take = Math.min(b, surplus);
    if (take >= 1) { sources.push({ account_id: a.id, name: a.name, available: take, rate: 0 }); surplus -= take; }
  }
  sources.sort((a, b) => a.rate - b.rate);
  const moves: EnvelopeMove[] = [];
  for (const tg of targets) {
    let room = tg.room!;
    for (const s of sources) {
      if (room < 1) break;
      if (s.available < 1 || s.rate >= tg.rate! - 1e-6) continue;
      const amount = Math.floor(Math.min(room, s.available));
      if (amount < 1) continue;
      moves.push({ from_account_id: s.account_id, from: s.name, to_account_id: tg.account_id, to: tg.account, amount, fromRate: s.rate, toRate: tg.rate!, gainPerYear: round2(amount * (tg.rate! - s.rate)) });
      s.available -= amount; room -= amount;
    }
  }
  const missed = round2(moves.reduce((s, m) => s + m.gainPerYear, 0));
  const pct = (v: number) => (v * 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " %";
  const eur = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";
  const alerts: EnvelopesReport["alerts"] = [];
  for (const tg of targets) {
    if ((tg.fill ?? 0) >= threshold) continue;
    const mv = moves.filter((m) => m.to_account_id === tg.account_id);
    const amount = mv.reduce((s, m) => s + m.amount, 0);
    const gain = mv.reduce((s, m) => s + m.gainPerYear, 0);
    if (amount >= 50) {
      alerts.push({ level: "warn", text: `${tg.kind} rempli à ${Math.round((tg.fill ?? 0) * 100)} % : y placer ${eur(amount)} (depuis ${[...new Set(mv.map((m) => m.from))].join(", ")}) rapporterait ~${eur(gain)} de plus par an à ${pct(tg.rate!)} net` });
    }
  }
  if (!alerts.length && rows.length) alerts.push({ level: "ok", text: "Livrets réglementés bien utilisés" });
  return {
    ratesAsOf: RATES_AS_OF, year, rows,
    totals: {
      balance: round2(rows.reduce((s, r) => s + (r.balance ?? 0), 0)),
      room: round2(rows.filter((r) => r.ceilingOn === "balance").reduce((s, r) => s + (r.room ?? 0), 0)),
      interestThisYear: round2(rows.reduce((s, r) => s + r.interestThisYear, 0)),
      estimateThisYear: round2(rows.reduce((s, r) => s + (r.estimateThisYear ?? 0), 0)),
    },
    moves, missed, hasPea: rows.some((r) => r.kind === "PEA"), alerts,
  };
}

/** Devine le type d'enveloppe d'un compte à partir de son nom et de son type. */
export function guessEnvelopeKind(name: string, type: string): string | null {
  const n = normalize(name);
  if (/\blep\b|epargne populaire/.test(n)) return "LEP";
  if (/\bldds?\b|developpement durable/.test(n)) return "LDDS";
  if (/livret a\b/.test(n)) return "Livret A";
  if (/livret jeune/.test(n)) return "Livret jeune";
  if (/pea.?pme/.test(n)) return "PEA-PME";
  if (type === "PEA" || /\bpea\b/.test(n)) return "PEA";
  if (type === "Assurance-vie") return "Assurance-vie";
  if (type === "Livret") return "Compte rémunéré";
  return null;
}
