/**
 * Détection des abonnements et charges récurrentes à partir des dépenses.
 *
 * 1. Clé marchand : libellé normalisé sans numéros, références ni mots de liaison.
 * 2. Par marchand, regroupement des montants voisins (±30 % du précédent), pour
 *    séparer deux abonnements d'un même marchand (ex. Amazon Prime et une mensualité).
 * 3. Un groupe est récurrent si les intervalles suivent une périodicité
 *    (hebdomadaire → annuelle) ou s'il tombe une fois par mois sur des mois consécutifs.
 *    Avec seulement deux occurrences, les montants doivent être quasi identiques.
 */
import type { Store } from "./db.js";
import { normalize } from "./categorize.js";
import { round2, today } from "./finance.js";

const STOP = new Set(["prelevement", "prlv", "paiement", "carte", "cb", "vir", "virement", "sepa", "inst", "instantane", "du", "de", "des", "le", "la", "les",
  "emetteur", "mdt", "motif", "mandat", "ref", "facture", "to", "from", "a", "au", "en", "par", "pour", "sur", "recurrent", "europe", "sa", "sas", "sarl", "ltd", "fr", "www", "com"]);

/** Mots significatifs d'un libellé (sans numéros, références ni mots de liaison). */
export function merchantWords(label: string): string[] {
  const tokens = normalize(label).replace(/[^a-z0-9 ]+/g, " ").split(" ").filter(Boolean);
  return tokens.filter((t) => !/\d/.test(t) && t.length >= 2 && !STOP.has(t));
}

/** Nom lisible et stable d'un payeur / bénéficiaire (3 premiers mots significatifs). */
export function merchantKey(label: string): string {
  return merchantWords(label).slice(0, 3).join(" ") || normalize(label).trim();
}

/**
 * Clé de regroupement des dépenses : le premier mot significatif (deux s'il est
 * très court), pour réunir « Free », « PRELEVEMENT FREE MOBILE » et « FREE TELECOM ».
 * Les abonnements distincts d'un même marchand sont ensuite séparés par montant.
 */
export function groupKey(label: string): string {
  const w = merchantWords(label);
  if (!w.length) return normalize(label).trim();
  return w[0].length <= 3 && w[1] ? `${w[0]} ${w[1]}` : w[0];
}

/** Libellé d'affichage : le libellé bancaire s'il est court et propre, sinon le marchand en clair. */
export function prettyLabel(label: string): string {
  const digitTokens = label.split(/\s+/).filter((t) => /\d/.test(t)).length;
  if (label.length <= 30 && digitTokens <= 1) return label;
  // Le nom du marchand précède « du », « émetteur », « motif »… dans les libellés de prélèvement
  const head = normalize(label).split(/\b(?:du|emetteur|motif|mdt|ref)\b/)[0];
  const w = merchantWords(head).slice(0, 2);
  const words = w.length ? w : merchantWords(label).slice(0, 1);
  return words.length ? words.map((x) => x[0].toUpperCase() + x.slice(1)).join(" ") : label.slice(0, 30);
}

export const PERIODS = [
  { name: "hebdomadaire", days: 7, perYear: 52 },
  { name: "mensuel", days: 30.44, perYear: 12 },
  { name: "bimestriel", days: 60.88, perYear: 6 },
  { name: "trimestriel", days: 91.31, perYear: 4 },
  { name: "semestriel", days: 182.6, perYear: 2 },
  { name: "annuel", days: 365.25, perYear: 1 },
] as const;
export type Frequency = (typeof PERIODS)[number]["name"];

export interface Occurrence { id: number; date: string; amount: number; label: string }
export interface Recurring {
  merchant: string; key: string; label: string; autoLabel: string;
  category: string | null; category_id: number | null; account: string;
  frequency: Frequency; perYear: number; count: number; first: string; last: string; next: string;
  lastAmount: number; avgAmount: number; monthly: number; annual: number;
  active: boolean; status: "auto" | "confirmed" | "ignored";
  change: { kind: "hausse" | "baisse"; from: number; to: number; pct: number; since: string } | null;
  occurrences: Occurrence[];
}
export interface RecurringReport {
  items: Recurring[];
  totals: { monthly: number; annual: number; count: number };
  byCategory: { category: string; monthly: number; annual: number; count: number }[];
  increases: Recurring[];
  excludedCategories: string[];
  since: string | null;
}

const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86_400_000;
const addDays = (d: string, n: number) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + Math.round(n)); return x.toISOString().slice(0, 10); };
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const monthIndex = (d: string) => Number(d.slice(0, 4)) * 12 + Number(d.slice(5, 7)) - 1;

/** Périodicité d'une série de dates, ou null. */
export function detectFrequency(dates: string[], amounts: number[]): (typeof PERIODS)[number] | null {
  const n = dates.length;
  if (n < 2) return null;
  const mean = amounts.reduce((a, b) => a + b, 0) / n;
  const cv = Math.sqrt(amounts.reduce((s, a) => s + (a - mean) ** 2, 0) / n) / mean;
  if (n === 2 && Math.abs(amounts[0] - amounts[1]) / Math.max(amounts[0], amounts[1]) > 0.02) return null;
  if (cv > 0.35) return null;
  const iv = dates.slice(1).map((d, i) => days(dates[i], d));
  const med = median(iv);
  for (const p of PERIODS) {
    if (p.name === "hebdomadaire" && (n < 3 || cv > 0.15)) continue;
    if (Math.abs(med - p.days) > 0.25 * p.days) continue;
    const regular = iv.filter((x) => Math.abs(x - p.days) <= 0.35 * p.days).length / iv.length;
    if (regular >= 0.6) return p;
  }
  // Une fois par mois (à une occurrence près) sur des mois consécutifs : mensuel
  const months = [...new Set(dates.map(monthIndex))].sort((a, b) => a - b);
  const consecutive = months.every((m, i) => i === 0 || m - months[i - 1] === 1);
  if (months.length >= 2 && consecutive && n <= months.length + 1 && (n >= 3 || cv < 0.02)) return PERIODS[1];
  return null;
}

/** Regroupe les occurrences d'un marchand par montants voisins (ordre chronologique). */
function clusterByAmount(occ: Occurrence[]): Occurrence[][] {
  const clusters: Occurrence[][] = [];
  for (const o of occ) {
    const c = clusters.find((cl) => { const last = cl[cl.length - 1].amount; return Math.abs(o.amount - last) / Math.max(last, o.amount) <= 0.3; });
    if (c) c.push(o); else clusters.push([o]);
  }
  return clusters;
}

export function recurringReport(store: Store, opts: { excludeCategories?: string[]; asOf?: string } = {}): RecurringReport {
  const t = opts.asOf ?? today();
  const exclude = opts.excludeCategories ?? [];
  const rows = store.all<{ id: number; date: string; amount: number; label: string; category: string | null; category_id: number | null; kind: string | null; account: string }>(
    `SELECT t.id, t.date, t.amount, t.label, c.name AS category, t.category_id, c.kind, a.name AS account
     FROM transactions t JOIN accounts a ON a.id=t.account_id LEFT JOIN categories c ON c.id=t.category_id
     WHERE t.amount < 0 AND (c.kind IS NULL OR c.kind = 'Dépense') ORDER BY t.date, t.id`);
  const overrides = new Map(store.all<{ merchant: string; status: "confirmed" | "ignored"; label: string }>("SELECT * FROM recurring_overrides").map((o) => [o.merchant, o]));
  const byMerchant = new Map<string, typeof rows>();
  for (const r of rows) {
    if (r.category && exclude.includes(r.category)) continue;
    const k = groupKey(r.label);
    const l = byMerchant.get(k) ?? []; l.push(r); byMerchant.set(k, l);
  }
  const items: Recurring[] = [];
  for (const [merchant, list] of byMerchant) {
    const occ = list.map((r) => ({ id: r.id, date: r.date, amount: round2(-r.amount), label: r.label }));
    for (const cl of clusterByAmount(occ)) {
      const freq = detectFrequency(cl.map((o) => o.date), cl.map((o) => o.amount));
      if (!freq) continue;
      const last = cl[cl.length - 1];
      // Dernier changement de prix : montant actuel vs dernier montant différent (> 2 %)
      let change: Recurring["change"] = null;
      for (let i = cl.length - 2; i >= 0; i--) {
        const prev = cl[i].amount;
        if (Math.abs(last.amount - prev) / prev > 0.02 && Math.abs(last.amount - prev) >= 0.5) {
          const since = cl.slice(i + 1).find((o) => Math.abs(o.amount - last.amount) / last.amount <= 0.02)?.date ?? last.date;
          change = { kind: last.amount > prev ? "hausse" : "baisse", from: prev, to: last.amount, pct: (last.amount - prev) / prev, since };
          break;
        }
      }
      const src = list.find((r) => r.id === last.id)!;
      // Clé stable d'un abonnement : marchand + montant du premier paiement (sépare deux abonnements d'un même marchand)
      const key = `${merchant}|${Math.round(cl[0].amount)}`;
      const ov = overrides.get(key) ?? overrides.get(merchant);
      const autoLabel = prettyLabel(last.label);
      const avg = round2(cl.reduce((s, o) => s + o.amount, 0) / cl.length);
      items.push({
        merchant, key,
        label: ov?.label || autoLabel, autoLabel,
        category: src.category, category_id: src.category_id, account: src.account,
        frequency: freq.name, perYear: freq.perYear, count: cl.length, first: cl[0].date, last: last.date, next: addDays(last.date, freq.days),
        lastAmount: last.amount, avgAmount: avg, monthly: round2(last.amount * freq.perYear / 12), annual: round2(last.amount * freq.perYear),
        active: days(last.date, t) <= freq.days * 1.5 + 3,
        status: ov?.status ?? "auto", change, occurrences: cl,
      });
    }
  }
  items.sort((a, b) => Number(b.active) - Number(a.active) || b.annual - a.annual);
  const counted = items.filter((i) => i.active && i.status !== "ignored");
  const cats = new Map<string, { monthly: number; annual: number; count: number }>();
  for (const i of counted) {
    const c = cats.get(i.category ?? "Sans catégorie") ?? { monthly: 0, annual: 0, count: 0 };
    c.monthly += i.monthly; c.annual += i.annual; c.count++;
    cats.set(i.category ?? "Sans catégorie", c);
  }
  return {
    items,
    totals: { monthly: round2(counted.reduce((s, i) => s + i.monthly, 0)), annual: round2(counted.reduce((s, i) => s + i.annual, 0)), count: counted.length },
    byCategory: [...cats.entries()].map(([category, v]) => ({ category, monthly: round2(v.monthly), annual: round2(v.annual), count: v.count })).sort((a, b) => b.annual - a.annual),
    increases: counted.filter((i) => i.change?.kind === "hausse" && days(i.change.since, t) <= 90),
    excludedCategories: exclude,
    since: rows[0]?.date ?? null,
  };
}
