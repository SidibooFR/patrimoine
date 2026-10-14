/** Fonctions financières pures (sans base de données). */

export interface CashFlow { date: string; amount: number }

function days(a: string, b: string): number {
  return (Date.parse(b) - Date.parse(a)) / 86_400_000;
}

/** Taux de rendement interne annualisé (équivalent XIRR). null si non calculable. */
export function xirr(flows: CashFlow[]): number | null {
  const f = flows.filter((x) => x.amount !== 0).sort((a, b) => a.date.localeCompare(b.date));
  if (f.length < 2 || !f.some((x) => x.amount < 0) || !f.some((x) => x.amount > 0)) return null;
  const t0 = f[0].date;
  const npv = (r: number) => f.reduce((s, x) => s + x.amount / Math.pow(1 + r, days(t0, x.date) / 365), 0);
  // Bissection robuste sur [-0.9999, 10] puis affinage Newton
  let lo = -0.9999, hi = 10;
  let flo = npv(lo), fhi = npv(hi);
  if (Number.isNaN(flo) || Number.isNaN(fhi) || flo * fhi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fm = npv(mid);
    if (Math.abs(fm) < 1e-7 || hi - lo < 1e-9) return mid;
    if (flo * fm < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
  }
  return (lo + hi) / 2;
}

/** Valeur future avec versements mensuels (équivalent FV Excel, versements en fin de mois). */
export function futureValue(annualRate: number, months: number, monthly: number, initial: number): number {
  const r = annualRate / 12;
  if (Math.abs(r) < 1e-12) return initial + monthly * months;
  return initial * Math.pow(1 + r, months) + monthly * ((Math.pow(1 + r, months) - 1) / r);
}

/** Nombre de mois pour atteindre `goal` (équivalent NPER). null si jamais atteint. */
export function monthsToGoal(annualRate: number, monthly: number, initial: number, goal: number): number | null {
  if (initial >= goal) return 0;
  const r = annualRate / 12;
  if (Math.abs(r) < 1e-12) return monthly > 0 ? (goal - initial) / monthly : null;
  const num = Math.log((goal * r + monthly) / (initial * r + monthly));
  const den = Math.log(1 + r);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num / den;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function monthStart(date: string): string {
  return date.slice(0, 7) + "-01";
}

export function addMonths(month: string, n: number): string {
  const d = new Date(month + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7) + "-01";
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
