import { appearance } from "./appearance";

const fmtCache = new Map<string, Intl.NumberFormat>();
/** Formateur monétaire pour la devise choisie dans Paramètres (décimales plafonnées à celles de la devise, ex. 0 pour le yen). */
function moneyFormat(digits: number) {
  const key = appearance.currency + digits;
  let f = fmtCache.get(key);
  if (!f) {
    const max = new Intl.NumberFormat("fr-FR", { style: "currency", currency: appearance.currency }).resolvedOptions().maximumFractionDigits ?? 2;
    const d = Math.min(digits, max);
    f = new Intl.NumberFormat("fr-FR", { style: "currency", currency: appearance.currency, minimumFractionDigits: d, maximumFractionDigits: d });
    fmtCache.set(key, f);
  }
  return f;
}
/** Montant dans la devise d'affichage (nom historique : `eur`). */
export const eur = (v: number | null | undefined, digits = 2) =>
  v === null || v === undefined || Number.isNaN(v) ? "–" : moneyFormat(digits).format(v);
/** Symbole de la devise d'affichage (€, $, CHF…). */
export const cur = () => moneyFormat(0).formatToParts(0).find((p) => p.type === "currency")?.value ?? appearance.currency;
export const eur0 = (v: number | null | undefined) => eur(v, 0);
export const pct = (v: number | null | undefined, digits = 1) =>
  v === null || v === undefined || Number.isNaN(v) ? "–" : (v * 100).toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits }) + " %";
export const num = (v: number | null | undefined, max = 8) =>
  v === null || v === undefined ? "–" : v.toLocaleString("fr-FR", { maximumFractionDigits: max });
export const date = (d: string | null | undefined) => (d ? new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString("fr-FR") : "–");
export const month = (m: string | null | undefined) => (m ? new Date(m.slice(0, 7) + "-01T00:00:00").toLocaleDateString("fr-FR", { month: "short", year: "numeric" }) : "–");
export const monthLong = (m: string | null | undefined) => (m ? new Date(m.slice(0, 7) + "-01T00:00:00").toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "–");
export const sign = (v: number | null | undefined) => (v === null || v === undefined ? "" : v > 0 ? "pos" : v < 0 ? "neg" : "");
export const todayIso = () => new Date().toISOString().slice(0, 10);
export const thisMonth = () => todayIso().slice(0, 7);
