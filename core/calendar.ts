/**
 * Calendrier des abonnements : pour un mois donné, les paiements réels déjà détectés
 * et les prélèvements prévus après le dernier paiement, selon la périodicité.
 * Fonction pure (types seulement) : utilisable telle quelle dans le renderer.
 */
import type { Recurring, Frequency } from "./recurring.js";

export interface CalendarEntry { key: string; label: string; account: string; frequency: Frequency; amount: number; date: string; paid: boolean }

/** Nombre de mois entre deux prélèvements (null : hebdomadaire, en jours). */
const MONTHS: Record<Frequency, number | null> = { hebdomadaire: null, mensuel: 1, bimestriel: 2, trimestriel: 3, semestriel: 6, annuel: 12 };

const iso = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

/** Dates prévues dans [from, to] après `last` : même jour du mois (ramené au dernier jour si besoin), ou tous les 7 jours. */
export function projectedDates(last: string, frequency: Frequency, from: string, to: string): string[] {
  const [y, m, d] = last.split("-").map(Number);
  const step = MONTHS[frequency];
  const out: string[] = [];
  // ponytail: ancré sur le jour du dernier paiement ; un prélèvement décalé par un week-end décale les suivants
  for (let k = 1; ; k++) {
    const date = step === null ? iso(y, m - 1, d + 7 * k) : iso(y, m - 1 + step * k, Math.min(d, lastDay(y, m - 1 + step * k)));
    if (date > to) return out;
    if (date >= from) out.push(date);
  }
}

/**
 * Paiements du mois `ym` (AAAA-MM), par date : réels pour tout abonnement non ignoré,
 * prévus seulement pour ceux encore en cours. Montant prévu = dernier montant payé.
 */
export function calendarMonth(items: Recurring[], ym: string): Record<string, CalendarEntry[]> {
  const [y, m] = ym.split("-").map(Number);
  const from = `${ym}-01`, to = iso(y, m - 1, lastDay(y, m - 1));
  const days: Record<string, CalendarEntry[]> = {};
  const add = (i: Recurring, date: string, amount: number, paid: boolean) =>
    (days[date] ??= []).push({ key: i.key, label: i.label, account: i.account, frequency: i.frequency, amount, date, paid });
  for (const i of items) {
    if (i.status === "ignored") continue;
    for (const o of i.occurrences) if (o.date >= from && o.date <= to) add(i, o.date, o.amount, true);
    if (i.active) for (const d of projectedDates(i.last, i.frequency, from, to)) add(i, d, i.lastAmount, false);
  }
  for (const l of Object.values(days)) l.sort((a, b) => b.amount - a.amount);
  return days;
}
