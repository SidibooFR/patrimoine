/** Palette et aides pour les graphiques. */
import type { ApexOptions } from "apexcharts";
import { eur0 } from "./format";
import { appearance } from "./appearance";

export const PALETTE = ["#0b57d0", "#1e8e3e", "#e37400", "#9334e6", "#d93025", "#12a4af", "#80868b"];
export const CLASS_COLORS: Record<string, string> = { "Liquidités": "#12a4af", "Épargne sécurisée": "#1e8e3e", "Actions & ETF": "#0b57d0", "Crypto": "#e37400", "Autre": "#80868b" };
export const pctTick = (v: number | string) => Math.round(Number(v) * 100) + " %";

/** Montant abrégé dans la devise d'affichage (« 150 k€ », « 1,2 M€ »). */
export const moneyAxis = (v: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: appearance.currency, notation: "compact", minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(v);

const isPlain = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Fusion profonde sans mutation : les objets simples sont fusionnés, le reste de `extra` remplace `base`. */
export function mergeOptions<T extends object>(base: T, extra: T): T {
  const out = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(extra)) {
    const b = out[k];
    out[k] = isPlain(b) && isPlain(v) ? mergeOptions(b, v) : v;
  }
  return out as T;
}

export interface ChartUi { muted: string; line: string; font: string }

/** Options communes du style C ; chaque graphique les complète via `mergeOptions`. */
export function styleC(type: "area" | "line" | "bar" | "donut" | "rangeArea", zoom: boolean, ui: ChartUi): ApexOptions {
  const o: ApexOptions = {
    chart: {
      fontFamily: ui.font,
      foreColor: ui.muted,
      toolbar: zoom ? { show: true, tools: { download: false, selection: false, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true } } : { show: false },
      zoom: { enabled: zoom, type: "x" },
      // dynamicAnimation : les courbes glissent vers les nouvelles valeurs au lieu de repartir de zéro
      animations: { enabled: true, speed: 700, animateGradually: { enabled: false }, dynamicAnimation: { enabled: true, speed: 350 } },
    },
    grid: { borderColor: ui.line, strokeDashArray: 4 },
    xaxis: { axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: ui.muted } } },
    yaxis: { labels: { style: { colors: ui.muted }, formatter: moneyAxis } },
    dataLabels: { enabled: false },
    legend: { position: "top", horizontalAlign: "left", markers: { size: 5 } },
    tooltip: { shared: true, intersect: false, y: { formatter: (v: number) => eur0(v) } },
  };
  if (type === "area" || type === "line" || type === "rangeArea") {
    o.stroke = { curve: "smooth" };
    o.markers = { size: 0, hover: { size: 6 } };
    o.fill = { type: "gradient", gradient: { shade: "light", type: "vertical", opacityFrom: 0.25, opacityTo: 0, stops: [0, 95] } };
  }
  if (type === "bar") o.plotOptions = { bar: { borderRadius: 6, borderRadiusApplication: "end", borderRadiusWhenStacked: "last", columnWidth: "55%" } };
  if (type === "donut") {
    o.stroke = { width: 3, colors: ["#ffffff"] }; // liseré = fond des cartes (blanc)
    o.legend = { ...o.legend, position: "right" };
    o.plotOptions = { pie: { donut: { size: "68%", labels: { show: true, value: { formatter: (v) => eur0(Number(v)) }, total: { show: true, formatter: (w) => eur0((w.globals.seriesTotals as number[]).reduce((a, b) => a + b, 0)) } } } } };
  }
  return o;
}
