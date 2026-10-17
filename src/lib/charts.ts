/** Palette et aides pour Chart.js. */
import type { TooltipItem } from "chart.js";
import { eur } from "./format";

export const PALETTE = ["#0b57d0", "#1e8e3e", "#e37400", "#9334e6", "#d93025", "#12a4af", "#80868b"];
export const CLASS_COLORS: Record<string, string> = { "Liquidités": "#12a4af", "Épargne sécurisée": "#1e8e3e", "Actions & ETF": "#0b57d0", "Crypto": "#e37400", "Autre": "#80868b" };
export const eurTick = (v: number | string) => eur(Number(v), 0);
export const pctTick = (v: number | string) => Math.round(Number(v) * 100) + " %";
export const eurTip = (ctx: TooltipItem<"line" | "bar">) => `${ctx.dataset.label ? ctx.dataset.label + " : " : ""}${eur(Number(ctx.parsed.y), 0)}`;
