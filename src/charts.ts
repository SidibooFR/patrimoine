/** Palette et aides pour Chart.js. */
export const PALETTE = ["#2f6fed", "#1a7f4b", "#c55a11", "#8064a2", "#c0392b", "#17a2b8", "#7f8c8d"];
export const CLASS_COLORS: Record<string, string> = { "Liquidités": "#17a2b8", "Épargne sécurisée": "#1a7f4b", "Actions & ETF": "#2f6fed", "Crypto": "#c55a11", "Autre": "#7f8c8d" };
export const eurTick = (v: number | string) => Number(v).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";
export const pctTick = (v: number | string) => Math.round(Number(v) * 100) + " %";
export const eurTip = (ctx: any) => `${ctx.dataset.label ? ctx.dataset.label + " : " : ""}${Number(ctx.parsed.y ?? ctx.parsed).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`;
