/** Apparence de l'interface : couleur principale, police, taille du texte et devise d'affichage. */
import { reactive } from "vue";
import { Chart } from "chart.js";

export const DEFAULT_ACCENT = "#0b57d0";
const LEGACY_ACCENT = "#2f6fed"; // ancien bleu par défaut, remplacé par celui de Material 3
export const ACCENT_PRESETS = [
  { name: "Bleu", color: DEFAULT_ACCENT }, { name: "Vert", color: "#146c2e" }, { name: "Violet", color: "#6750a4" },
  { name: "Bordeaux", color: "#b3261e" }, { name: "Orange", color: "#b05a00" }, { name: "Graphite", color: "#444746" },
];
const SANS = "system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif";
export const FONTS: { id: string; name: string; stack: string }[] = [
  { id: "roboto", name: "Roboto (par défaut)", stack: `"Roboto Variable", Roboto, ${SANS}` },
  { id: "system", name: "Système", stack: SANS },
  { id: "segoe", name: "Segoe UI", stack: `"Segoe UI", ${SANS}` },
  { id: "arial", name: "Arial", stack: "Arial, Helvetica, sans-serif" },
  { id: "verdana", name: "Verdana", stack: "Verdana, Geneva, sans-serif" },
  { id: "tahoma", name: "Tahoma", stack: "Tahoma, Verdana, sans-serif" },
  { id: "trebuchet", name: "Trebuchet MS", stack: "\"Trebuchet MS\", Helvetica, sans-serif" },
  { id: "calibri", name: "Calibri", stack: `Calibri, Carlito, ${SANS}` },
  { id: "georgia", name: "Georgia (serif)", stack: "Georgia, \"Times New Roman\", serif" },
  { id: "consolas", name: "Consolas (chasse fixe)", stack: "Consolas, \"Courier New\", monospace" },
];
export const SCALES = [
  { value: 0.85, name: "Très petite" }, { value: 0.92, name: "Petite" }, { value: 1, name: "Normale" },
  { value: 1.1, name: "Grande" }, { value: 1.25, name: "Très grande" },
];
export const CURRENCIES = [
  { code: "EUR", name: "Euro" }, { code: "USD", name: "Dollar américain" }, { code: "GBP", name: "Livre sterling" },
  { code: "CHF", name: "Franc suisse" }, { code: "CAD", name: "Dollar canadien" }, { code: "JPY", name: "Yen" },
  { code: "XOF", name: "Franc CFA (BCEAO)" }, { code: "XAF", name: "Franc CFA (BEAC)" }, { code: "MAD", name: "Dirham marocain" },
  { code: "TND", name: "Dinar tunisien" }, { code: "DZD", name: "Dinar algérien" },
];

export interface Appearance { accent: string; font: string; scale: number; currency: string }
export const DEFAULT_FONT = "roboto";
const DEFAULTS: Appearance = { accent: DEFAULT_ACCENT, font: DEFAULT_FONT, scale: 1, currency: "EUR" };

/** Préférences actives + couleurs dérivées (réactives : les vues et graphiques se mettent à jour). */
export const appearance = reactive<Appearance>({ ...DEFAULTS });
export const theme = reactive({ accent: DEFAULT_ACCENT, navy: "#0842a0" });

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const toHex = (rgb: number[]) => "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
/** Mélange `a` et `b` (t = part de `a`). */
export const mix = (a: string, b: string, t: number) => { const x = hex(a), y = hex(b); return toHex(x.map((v, i) => v * t + y[i] * (1 - t))); };
export const rgba = (c: string, a: number) => `rgba(${hex(c).join(",")},${a})`;

const CACHE = "patrimoine.appearance";
const valid = /^#[0-9a-f]{6}$/i;

/** Lit les préférences depuis les réglages de la base (clés `ui_*` et `currency`). */
export function fromSettings(s: Record<string, string>): Appearance {
  const scale = Number(s.ui_scale);
  return {
    accent: valid.test(s.ui_accent ?? "") && s.ui_accent.toLowerCase() !== LEGACY_ACCENT ? s.ui_accent : DEFAULTS.accent,
    font: FONTS.some((f) => f.id === s.ui_font) ? s.ui_font : DEFAULTS.font,
    scale: scale >= 0.7 && scale <= 1.5 ? scale : DEFAULTS.scale,
    currency: /^[A-Z]{3}$/.test(s.currency ?? "") ? s.currency : DEFAULTS.currency,
  };
}

export function applyAppearance(p: Appearance) {
  Object.assign(appearance, p);
  theme.accent = p.accent;
  theme.navy = mix(p.accent, "#000000", 0.75);
  const root = document.documentElement.style;
  root.setProperty("--accent", p.accent);
  root.setProperty("--accent-hover", mix(p.accent, "#000000", 0.8));
  root.setProperty("--accent-soft", mix(p.accent, "#ffffff", 0.18));
  root.setProperty("--on-accent-soft", mix(p.accent, "#000000", 0.35));
  root.setProperty("--accent-tint", rgba(p.accent, 0.08));
  const stack = FONTS.find((f) => f.id === p.font)?.stack ?? SANS;
  root.setProperty("--font", stack);
  Chart.defaults.font.family = stack;
  // Zoom natif sous Electron (mise en page exacte), zoom CSS dans le navigateur de dev.
  if (window.patrimoine?.setZoom) { window.patrimoine.setZoom(p.scale); root.removeProperty("zoom"); } else root.setProperty("zoom", String(p.scale));
  try { localStorage.setItem(CACHE, JSON.stringify(p)); } catch { /* stockage indisponible */ }
}

/** Applique immédiatement la dernière apparence connue (évite le flash au démarrage). */
export function applyCachedAppearance() {
  let cached: Partial<Appearance> = {};
  try { cached = JSON.parse(localStorage.getItem(CACHE) ?? "{}"); } catch { /* ignoré */ }
  applyAppearance({ ...DEFAULTS, ...cached });
}
