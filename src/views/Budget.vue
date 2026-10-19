<script setup lang="ts">
import { onMounted, ref, watch, computed } from "vue";
import { api } from "../lib/api";
import { eur0, pct, sign, date, month } from "../lib/format";
import { PALETTE } from "../lib/charts";
import { guard, notify } from "../lib/toast";
import type { BudgetReport, BudgetRow } from "../../core/reports";
import type { PrepareReport, ScenarioKey } from "../../core/budgetPlan";
import KpiCard from "../components/KpiCard.vue";
import PageHeader from "../components/PageHeader.vue";
import ScenarioModal from "./budget/ScenarioModal.vue";
import TransactionsModal from "./budget/TransactionsModal.vue";

// ---------------------------------------------------------------- état
const now = new Date();
const curYear = now.getFullYear(), curMonth = now.getMonth(), today = now.getDate();
const curYm = `${curYear}-${String(curMonth + 1).padStart(2, "0")}`;
/** Mois affiché (AAAA-MM) : pilote la vue du mois et l'année de la vue annuelle. */
const ym = ref(curYm);
const year = computed(() => Number(ym.value.slice(0, 4)));
const mi = computed(() => Number(ym.value.slice(5, 7)) - 1);
const view = ref<"mois" | "annee">("mois");
const b = ref<BudgetReport>();
const bPrev = ref<BudgetReport>();
const prep = ref<PrepareReport>();
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MONTHS_LONG = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const LABELS: Record<ScenarioKey, string> = { moyenne: "Ma moyenne", equilibre: "Équilibré", econome: "Économe", loisirs: "Loisirs", investissement: "Investissement" };
const scenarioLabel = computed(() => (b.value?.scenario ? LABELS[b.value.scenario as ScenarioKey] ?? b.value.scenario : null));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const shiftYm = (v: string, n: number) => { const d = new Date(Date.UTC(Number(v.slice(0, 4)), Number(v.slice(5, 7)) - 1 + n, 1)); return d.toISOString().slice(0, 7); };
const daysIn = (v: string) => new Date(Number(v.slice(0, 4)), Number(v.slice(5, 7)), 0).getDate();
/** Signe explicite : +120 €, −45 €, ±0 €. */
const sgn = (v: number) => (Math.round(v) === 0 ? "±" : v > 0 ? "+" : "−") + eur0(Math.abs(v));

async function loadYear() {
  const [cur, prev] = await Promise.all([guard(() => api.budget(year.value)), mi.value === 0 ? guard(() => api.budget(year.value - 1)) : Promise.resolve(undefined)]);
  b.value = cur; bPrev.value = prev;
}
async function loadPrep() { prep.value = await guard(() => api.budgetPrepare()); }
async function load() { await Promise.all([loadYear(), loadPrep()]); }
onMounted(load);
watch(ym, (v, old) => { if (v.slice(0, 4) !== old.slice(0, 4) || v.slice(5) === "01" || old.slice(5) === "01") loadYear(); });

const showPlan = ref(false);
async function stopAuto() {
  if (await guard(() => api.setBudgetScenario(null)) === undefined) return;
  notify("Budget automatique arrêté : seuls tes montants saisis restent.");
  await load();
}

// ---------------------------------------------------------------- vue du mois : calculs
const isCur = computed(() => ym.value === curYm);
const future = computed(() => ym.value > curYm);
/** Lignes du mois précédent (décembre de l'année d'avant quand on est en janvier). */
const prevRow = (id: number): BudgetRow | undefined => (mi.value === 0 ? bPrev.value : b.value)?.rows.find((r) => r.category_id === id);
const prevIdx = computed(() => (mi.value === 0 ? 11 : mi.value - 1));
const sumKind = (kind: string, idx: number, rep: BudgetReport | undefined) => rep ? rep.rows.filter((r) => r.kind === kind).reduce((s, r) => s + r.months[idx], 0) : 0;
const inc = computed(() => sumKind("Revenu", mi.value, b.value));
const exp = computed(() => sumKind("Dépense", mi.value, b.value));
const sav = computed(() => sumKind("Épargne", mi.value, b.value));
const prevRep = computed(() => (mi.value === 0 ? bPrev.value : b.value));
const pinc = computed(() => sumKind("Revenu", prevIdx.value, prevRep.value));
const pexp = computed(() => sumKind("Dépense", prevIdx.value, prevRep.value));
const psav = computed(() => sumKind("Épargne", prevIdx.value, prevRep.value));
const hasData = computed(() => !future.value && inc.value + exp.value > 0);
const hasPrev = computed(() => pinc.value + pexp.value > 0);
const rate = computed(() => (inc.value ? (inc.value - exp.value) / inc.value : 0));
const prate = computed(() => (pinc.value ? (pinc.value - pexp.value) / pinc.value : 0));
const sumBudget = (kind: string) => b.value ? b.value.rows.filter((r) => r.kind === kind).reduce((s, r) => s + (r.monthBudgets[mi.value] ?? 0), 0) : 0;
const expB = computed(() => sumBudget("Dépense"));
const reste = computed(() => expB.value - exp.value);
const daysLeft = computed(() => (isCur.value ? daysIn(ym.value) - today + 1 : 0));
const vs = computed(() => (hasPrev.value ? ` vs ${MONTHS[prevIdx.value]}` : ""));
type Delta = { delta: string; dColor: string };
const delta = (d: number, goodUp: boolean): Delta => hasPrev.value
  ? { delta: sgn(d) + vs.value, dColor: Math.round(d) === 0 ? "" : (d > 0) === goodUp ? "pos" : "neg" }
  : { delta: "Pas de mois précédent", dColor: "" };

const kpis = computed(() => {
  const pts = (rate.value - prate.value) * 100;
  return [
    { label: "Revenus", val: eur0(inc.value), tone: "pos", ...delta(inc.value - pinc.value, true) },
    { label: "Dépenses", val: eur0(exp.value), tone: "neg", ...delta(exp.value - pexp.value, false) },
    { label: "Épargne placée", val: eur0(sav.value), tone: "", ...delta(sav.value - psav.value, true) },
    { label: "Taux d'épargne", val: pct(rate.value), tone: sign(rate.value), ...(hasPrev.value
      ? { delta: `${pts >= 0 ? "+" : "−"}${Math.abs(pts).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} pt${vs.value}`, dColor: pts >= 0 ? "pos" : "neg" }
      : { delta: "–", dColor: "" }) },
  ];
});

type Status = "over" | "near" | "ok" | "none";
interface CatMonth { id: number; name: string; r: number; b: number | null; p: number; avg: number; ratio: number; status: Status; over: number }
const exps = computed<CatMonth[]>(() => {
  if (!b.value) return [];
  const rank: Record<Status, number> = { over: 0, near: 1, ok: 2, none: 3 };
  return b.value.rows.filter((c) => c.kind === "Dépense").map((c) => {
    const r = c.months[mi.value], bud = c.monthBudgets[mi.value], p = prevRow(c.category_id)?.months[prevIdx.value] ?? 0;
    const ratio = bud ? r / bud : 0;
    const status: Status = bud === null ? "none" : r > bud ? "over" : ratio >= 0.9 ? "near" : "ok";
    return { id: c.category_id, name: c.name, r, b: bud, p, avg: c.average, ratio, status, over: bud === null ? -1 : r - bud };
  }).filter((x) => x.r > 0 || x.b !== null)
    .sort((x, y) => rank[x.status] - rank[y.status] || (x.status === "over" ? y.over - x.over : y.ratio - x.ratio) || y.r - x.r);
});
const overCount = computed(() => exps.value.filter((x) => x.status === "over").length);
const TAG: Record<Status, { text: string; cls: string }> = { over: { text: "Dépassé", cls: "neg" }, near: { text: "Presque atteint", cls: "warn" }, ok: { text: "", cls: "" }, none: { text: "", cls: "" } };
const resteText = (x: CatMonth) => (x.b === null ? "Sans budget" : x.r > x.b ? `Dépassé de ${eur0(x.r - x.b)}` : `${eur0(x.b - x.r)} restants`);
const resteTone = (x: CatMonth) => (x.b === null ? "" : x.r > x.b ? "neg" : x.status === "near" ? "warn" : "pos");
const paceLeft = computed(() => (isCur.value ? (today / daysIn(ym.value)) * 100 : 0));

/** Phrase de synthèse en tête de page. */
const hero = computed(() => {
  const ml = MONTHS_LONG[mi.value];
  if (isCur.value) return { a: "Il te reste ", b: eur0(reste.value), c: ` à dépenser d'ici le ${daysIn(ym.value)} ${ml}, soit environ ${eur0(Math.max(reste.value, 0) / daysLeft.value)} par jour.`, tone: sign(reste.value) };
  if (future.value) return { a: `Budget prévu pour ${ml} : `, b: eur0(expB.value), c: " de dépenses.", tone: "" };
  if (hasData.value) return { a: `${cap(ml)} terminé : `, b: reste.value >= 0 ? `${eur0(reste.value)} sous le budget` : `budget dépassé de ${eur0(-reste.value)}`, c: ".", tone: sign(reste.value) };
  return { a: `Aucune opération importée pour ${ml}.`, b: "", c: "", tone: "" };
});
const sub = computed(() => {
  const n = overCount.value, s = `${n} catégorie${n > 1 ? "s" : ""} au-dessus du budget`;
  const auto = b.value?.scenario ? ` · budget automatique « ${scenarioLabel.value} »` : "";
  if (isCur.value) return `Opérations jusqu'au ${today} ${MONTHS_LONG[mi.value]} · ${s}${auto}`;
  if (future.value) return `Mois à venir : tu peux déjà préparer son budget.${auto}`;
  if (hasData.value) return `Mois clos · ${s}${auto}`;
  return `Aucune opération importée pour ce mois.${auto}`;
});
const emptyMsg = computed(() => (future.value ? "Mois à venir : clique sur « Modifier » pour préparer son budget." : "Aucune opération importée pour ce mois."));

// Répartition en anneau : six premières catégories + « Autres », couleurs de la palette commune
interface Seg { name: string; v: number; color: string; p: number }
function donut(items: { name: string; v: number }[]): { segs: Seg[]; conic: string } {
  const sorted = items.filter((x) => x.v > 0).slice().sort((a, c) => c.v - a.v);
  const total = sorted.reduce((s, x) => s + x.v, 0);
  const rest = sorted.slice(6).reduce((s, x) => s + x.v, 0);
  const list = [...sorted.slice(0, 6), ...(rest ? [{ name: "Autres", v: rest }] : [])];
  const segs = list.map((s, i) => ({ ...s, color: PALETTE[i % PALETTE.length], p: total ? s.v / total : 0 }));
  let acc = 0;
  const conic = segs.length ? "conic-gradient(" + segs.map((s) => { const a = acc * 100; acc += s.p; return `${s.color} ${a}% ${acc * 100}%`; }).join(",") + ")" : "conic-gradient(var(--surface-2) 0 100%)";
  return { segs, conic };
}
const expDonut = computed(() => donut(exps.value.map((x) => ({ name: x.name, v: x.r }))));
const incDonut = computed(() => donut(b.value ? b.value.rows.filter((r) => r.kind === "Revenu").map((r) => ({ name: r.name, v: r.months[mi.value] })) : []));
// Écarts au budget (barres divergentes)
const diverge = computed(() => {
  const dv = exps.value.filter((x) => x.b !== null).map((x) => ({ name: x.name, d: x.r - x.b! })).sort((a, c) => c.d - a.d);
  const dmax = Math.max(...dv.map((x) => Math.abs(x.d)), 1);
  return dv.map((x) => ({ name: x.name, txt: sgn(x.d), tone: x.d > 0 ? "neg" : x.d < 0 ? "pos" : "", lw: x.d < 0 ? (-x.d / dmax) * 100 : 0, rw: x.d > 0 ? (x.d / dmax) * 100 : 0 }));
});
// Taux d'épargne par mois (ligne)
const ratePts = computed(() => (b.value ? b.value.totals.rate.map((r, i) => (r === null ? null : { i, r })).filter((p): p is { i: number; r: number } => p !== null) : []));
const rmax = computed(() => Math.max(...ratePts.value.map((p) => p.r), 0.3) * 1.2);
const RX = (i: number) => (i / 11) * 600, RY = (r: number) => 100 - (Math.max(r, 0) / rmax.value) * 90;
const ratePath = computed(() => ratePts.value.map((p, j) => `${j ? "L" : "M"}${RX(p.i).toFixed(1)},${RY(p.r).toFixed(1)}`).join(" "));

// Opérations d'une catégorie
const tx = ref<CatMonth | null>(null);

// ---------------------------------------------------------------- vue du mois : édition
const edit = ref(false);
const draft = ref<Record<number, string>>({});
const propagate = ref(false);
function startEdit() {
  if (!b.value) return;
  draft.value = Object.fromEntries(b.value.rows.filter((r) => r.kind !== "Transfert").map((r) => [r.category_id, r.monthBudgets[mi.value] === null ? "" : String(r.monthBudgets[mi.value])]));
  propagate.value = false; edit.value = true;
}
const editGroups = computed(() => {
  if (!b.value) return [];
  return [["Dépense", "Dépenses"], ["Revenu", "Revenus"], ["Épargne", "Épargne & investissements placés"]].map(([kind, title]) => ({
    kind, title,
    rows: b.value!.rows.filter((r) => r.kind === kind).map((r) => ({ id: r.category_id, name: r.name, prev: prevRow(r.category_id)?.months[prevIdx.value] ?? 0, avg: Math.round(r.average / 5) * 5 })),
  }));
});
const draftSum = (kind: string) => b.value ? b.value.rows.filter((r) => r.kind === kind).reduce((s, r) => s + (Number(draft.value[r.category_id]) || 0), 0) : 0;
const solde = computed(() => draftSum("Revenu") - draftSum("Dépense") - draftSum("Épargne"));
async function save() {
  if (!b.value) return;
  const entries = b.value.rows.filter((r) => r.kind !== "Transfert").flatMap((r) => {
    const raw = (draft.value[r.category_id] ?? "").trim();
    const val = raw === "" ? null : Number(raw);
    const cur = r.monthBudgets[mi.value];
    if (val === cur || (val !== null && !Number.isFinite(val))) return [];
    // Vider une case revient au budget annuel : on retire le montant propre ; s'il n'y en avait pas, rien à faire
    if (val === null && r.overrides === 0) return [];
    return [{ category_id: r.category_id, amount: val }];
  });
  const r = await guard(() => api.saveBudgetMonth(ym.value, entries, propagate.value ? `${year.value}-12` : undefined));
  if (!r) return;
  notify(entries.length ? `${entries.length} budget(s) enregistré(s) pour ${MONTHS_LONG[mi.value]}${propagate.value ? " et les mois suivants" : ""}` : "Aucun changement");
  edit.value = false;
  await load();
}

// ---------------------------------------------------------------- vue de l'année (grille)
const groups = computed(() => {
  if (!b.value) return [];
  return ["Revenu", "Dépense", "Épargne"].map((k) => ({ kind: k, rows: b.value!.rows.filter((r) => r.kind === k && (r.total !== 0 || r.budget !== null || r.overrides)) }));
});
const hiddenCount = computed(() => b.value ? b.value.rows.filter((r) => r.kind !== "Transfert" && r.total === 0 && r.budget === null && !r.overrides).length : 0);
const showAll = ref(false);
const groupsShown = computed(() => showAll.value && b.value ? ["Revenu", "Dépense", "Épargne"].map((k) => ({ kind: k, rows: b.value!.rows.filter((r) => r.kind === k) })) : groups.value);
const autoCount = computed(() => b.value ? b.value.rows.filter((r) => r.source === "auto").length : 0);
async function setBudget(row: BudgetRow, v: string) {
  const n = v.trim() === "" ? null : Number(v);
  await guard(() => api.setBudget(row.category_id, year.value, n));
  await load();
}
async function copyPrev() {
  const r = await guard(() => api.copyBudgets(year.value - 1, year.value));
  if (!r) return;
  notify(`${r.copied} budget(s) repris de ${year.value - 1}` + (r.skipped ? ` (${r.skipped} déjà renseigné(s), conservé(s))` : ""));
  await load();
}
const monthDone = (i: number) => year.value < curYear || (year.value === curYear && i < curMonth);
const isCurCol = (i: number) => year.value === curYear && i === curMonth;
const isFutureCol = (i: number) => year.value > curYear || (year.value === curYear && i > curMonth);
function cellClass(r: BudgetRow, i: number) {
  const v = r.months[i], mb = r.monthBudgets[i];
  const base = { muted: v === 0, cur: isCurCol(i), future: isFutureCol(i) };
  if (mb === null) return base;
  if (r.kind === "Dépense") return { ...base, over: v > mb };
  return { ...base, under: monthDone(i) && v < mb };
}
const GROUP_LABEL: Record<string, string> = { Revenu: "Revenus", Dépense: "Dépenses", Épargne: "Épargne & investissements placés" };
const GROUP_TOTAL: Record<string, string> = { Revenu: "Total revenus", Dépense: "Total dépenses", Épargne: "Épargne placée" };
const kindTotals = (kind: string) => (kind === "Revenu" ? b.value!.totals.income : kind === "Dépense" ? b.value!.totals.expense : b.value!.totals.savings);
const kindPlan = (kind: string) => (kind === "Revenu" ? b.value!.plan.income : kind === "Dépense" ? b.value!.plan.expense : b.value!.plan.savings);
const kindYear = (kind: string) => (kind === "Revenu" ? b.value!.yearTotals.income : kind === "Dépense" ? b.value!.yearTotals.expense : b.value!.yearTotals.savings);
const gapText = (g: number | null) => (g === null ? "–" : (g > 0 ? "+" : "") + eur0(g));
</script>

<template>
  <!-- Bandeau d'édition du budget du mois -->
  <div v-if="edit" class="edit-banner">
    <span style="font-weight:500">Modification du budget · {{ MONTHS_LONG[mi] }} {{ year }}</span>
    <label v-if="mi < 11"><md-checkbox :checked="propagate" @change="propagate = ($event.target as HTMLInputElement).checked"></md-checkbox>Reporter aussi sur {{ MONTHS[mi + 1] }} → déc.</label>
    <span class="solde">Solde prévu <b :class="sign(solde)">{{ eur0(solde) }}</b></span>
    <md-outlined-button @click="edit = false">Annuler</md-outlined-button>
    <md-filled-button @click="save">Enregistrer</md-filled-button>
  </div>

  <PageHeader :title="view === 'mois' ? `Budget · ${cap(MONTHS_LONG[mi])} ${year}` : `Budget ${year}`"
    :sub="view === 'mois' ? sub : 'Réel par catégorie et par mois, calculé depuis les relevés. Suis un scénario pour un budget automatique, ou saisis tes montants dans la colonne jaune : ils restent prioritaires.'">
    <div class="seg"><button :class="{ on: view === 'mois' }" @click="view = 'mois'">Mois</button><button :class="{ on: view === 'annee' }" @click="view = 'annee'">Année</button></div>
    <template v-if="view === 'mois'">
      <md-outlined-button :disabled="edit" @click="ym = shiftYm(ym, -1)">‹ {{ MONTHS[prevIdx] }}</md-outlined-button>
      <md-outlined-button :disabled="edit" @click="ym = shiftYm(ym, 1)">{{ MONTHS[(mi + 1) % 12] }} ›</md-outlined-button>
      <template v-if="!edit">
        <md-outlined-button @click="startEdit">✎ Modifier</md-outlined-button>
        <md-filled-button @click="showPlan = true">Proposer un budget</md-filled-button>
      </template>
    </template>
    <template v-else>
      <md-filled-button @click="showPlan = true">{{ b?.scenario ? "Changer de scénario" : "Proposer un budget" }}</md-filled-button>
      <md-outlined-button v-if="b && b.prevYearCount" :title="`Copie les budgets de ${year - 1} dans les cases vides de ${year}`" @click="copyPrev">Reprendre {{ year - 1 }}</md-outlined-button>
      <md-outlined-button @click="ym = shiftYm(ym, -12)">‹ {{ year - 1 }}</md-outlined-button><md-outlined-button @click="ym = shiftYm(ym, 12)">{{ year + 1 }} ›</md-outlined-button>
      <md-outlined-button @click="showAll = !showAll">{{ showAll ? "Masquer les catégories vides" : `Afficher tout (${hiddenCount} vides)` }}</md-outlined-button>
    </template>
  </PageHeader>
  <ScenarioModal v-if="showPlan" :year="year" @close="showPlan = false" @applied="load" />
  <TransactionsModal v-if="tx" :category-id="tx.id" :name="tx.name" :month="ym" :real="tx.r" :budget="tx.b" @close="tx = null" />

  <!-- ============================================================ Vue du mois -->
  <template v-if="view === 'mois' && b">
    <template v-if="!edit">
      <p class="hero">{{ hero.a }}<b :class="hero.tone">{{ hero.b }}</b>{{ hero.c }}</p>
      <div class="grid c4 mb-3">
        <KpiCard v-for="k in kpis" :key="k.label" :label="k.label" :value="k.val" :tone="k.tone" card>
          <template #hint><span :class="k.dColor">{{ k.delta }}</span></template>
        </KpiCard>
      </div>

      <template v-if="hasData">
        <div class="grid mb-3" style="grid-template-columns:repeat(auto-fit,minmax(380px,1fr))">
          <div class="card">
            <h2 class="card-h">Répartition des dépenses</h2>
            <div class="donut-wrap">
              <div class="donut" :style="{ background: expDonut.conic }"><div class="hole"><span class="help">Total</span><span style="font-size:20px;font-weight:500;font-variant-numeric:tabular-nums">{{ eur0(exp) }}</span></div></div>
              <div class="donut-legend">
                <div v-for="s in expDonut.segs" :key="s.name"><span class="sw" :style="{ background: s.color }"></span><span class="nm">{{ s.name }}</span><span style="font-weight:500">{{ eur0(s.v) }}</span><span class="muted" style="text-align:right">{{ Math.round(s.p * 100) }} %</span></div>
              </div>
            </div>
          </div>
          <div class="card">
            <h2 class="card-h">Répartition des revenus</h2>
            <div class="donut-wrap">
              <div class="donut" :style="{ background: incDonut.conic }"><div class="hole"><span class="help">Total</span><span style="font-size:20px;font-weight:500;font-variant-numeric:tabular-nums">{{ eur0(inc) }}</span></div></div>
              <div class="donut-legend">
                <div v-for="s in incDonut.segs" :key="s.name"><span class="sw" :style="{ background: s.color }"></span><span class="nm">{{ s.name }}</span><span style="font-weight:500">{{ eur0(s.v) }}</span><span class="muted" style="text-align:right">{{ Math.round(s.p * 100) }} %</span></div>
                <p v-if="!incDonut.segs.length" class="muted" style="margin:0">Aucun revenu ce mois.</p>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-title" style="align-items:baseline;flex-wrap:wrap;gap:4px 12px;margin-bottom:10px"><h2 class="card-h" style="margin:0">Écart au budget</h2><div class="help" style="display:flex;gap:14px"><span class="pos">← sous le budget</span><span class="neg">au-dessus →</span></div></div>
            <div class="diverge">
              <div v-for="x in diverge" :key="x.name">
                <span class="nm">{{ x.name }}</span>
                <div class="l"><i :style="{ width: x.lw + '%' }"></i></div>
                <div class="r"><i :style="{ width: x.rw + '%' }"></i></div>
                <span class="v" :class="x.tone">{{ x.txt }}</span>
              </div>
              <p v-if="!diverge.length" class="muted" style="margin:0">Aucune catégorie budgétée ce mois : clique sur « Modifier » ou « Proposer un budget ».</p>
            </div>
          </div>
        </div>

        <div class="mb-3">
          <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:12px"><h2 class="card-h" style="margin:0">Par catégorie</h2><span class="help">triées par dépassement · repère = avancée du mois</span></div>
          <div class="bgrid">
            <div v-for="x in exps" :key="x.id" class="bcard clickable" :class="{ over: x.status === 'over' }" title="Voir les opérations" @click="tx = x">
              <div class="head"><span class="name">{{ x.name }}</span><span v-if="TAG[x.status].text" class="tag" :class="TAG[x.status].cls">{{ TAG[x.status].text }}</span></div>
              <div class="amounts"><span class="real">{{ eur0(x.r) }}</span><span class="of">sur {{ x.b === null ? "—" : eur0(x.b) }}</span></div>
              <div class="bar" :class="x.status">
                <i :style="{ width: (x.b ? Math.min(x.ratio, 1) * 100 : 0) + '%' }"></i>
                <span v-if="isCur && x.b !== null" class="pace" :style="{ left: paceLeft + '%' }"></span>
              </div>
              <div class="foot"><span :class="resteTone(x)">{{ resteText(x) }}</span><span :class="delta(x.r - x.p, false).dColor">{{ hasPrev ? `${sgn(x.r - x.p)}${vs}` : "" }}</span></div>
            </div>
          </div>
        </div>

        <div class="card mb-3">
          <h2 class="card-h" style="margin-bottom:20px">Taux d'épargne par mois</h2>
          <div class="rate-chart">
            <svg viewBox="0 0 600 100" preserveAspectRatio="none"><path :d="ratePath" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"></path></svg>
            <template v-for="p in ratePts" :key="p.i">
              <span class="dot" :class="{ on: p.i === mi }" :style="{ left: (p.i / 11) * 100 + '%', top: RY(p.r) + '%' }"></span>
              <span class="lbl" :class="{ on: p.i === mi }" :style="{ left: (p.i / 11) * 100 + '%', top: RY(p.r) + '%' }">{{ Math.round(p.r * 100) }} %</span>
            </template>
            <div class="axis"></div>
          </div>
          <div class="rate-months"><span v-for="(mo, i) in MONTHS" :key="mo" :class="{ on: i === mi }" :style="{ left: (i / 11) * 100 + '%' }">{{ mo }}</span></div>
        </div>
      </template>
      <div v-else class="empty-box mb-3">{{ emptyMsg }}</div>
    </template>

    <!-- Mode édition : budget du mois par catégorie -->
    <div v-else style="display:flex;flex-direction:column;gap:20px">
      <div v-for="g in editGroups" :key="g.kind">
        <h2 class="card-h" style="margin-bottom:12px">{{ g.title }}</h2>
        <div class="bgrid edit">
          <div v-for="r in g.rows" :key="r.id" class="bcard" style="gap:8px;padding:14px 16px">
            <span class="name">{{ r.name }}</span>
            <input v-model="draft[r.id]" class="amount" type="number" step="10" min="0" placeholder="–" />
            <div class="chips">
              <button type="button" :disabled="!hasPrev" :title="`Reprendre le réel de ${MONTHS_LONG[prevIdx]}`" @click="draft[r.id] = String(Math.round(r.prev))">{{ hasPrev ? `${MONTHS[prevIdx]} ${eur0(r.prev)}` : "–" }}</button>
              <button type="button" :title="`Moyenne mensuelle ${year}`" @click="draft[r.id] = String(r.avg)">moy. {{ eur0(r.avg) }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>

  <!-- ============================================================ Vue de l'année -->
  <template v-else-if="b">
    <p v-if="b.scenario" class="note mb-3" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <span class="tag">Automatique · {{ scenarioLabel }}</span>
      <span>{{ autoCount }} catégorie(s) suivent le scénario : montants recalculés sur les 12 derniers mois complets et tes objectifs, à chaque relevé importé. Saisis un montant pour le fixer, vide la case pour revenir à l'automatique.</span>
      <md-text-button class="small" style="margin-left:auto" @click="stopAuto">Arrêter</md-text-button>
    </p>

    <div class="grid c4 mb-3">
      <KpiCard :label="`Revenus ${year}`" :value="eur0(b.yearTotals.income)" tone="pos" card
        :hint="`${eur0(b.yearTotals.income / b.monthsWithData)} / mois en moyenne` + (b.plan.income ? ` · budget ${eur0(b.plan.income)}` : '')" />
      <KpiCard :label="`Dépenses ${year}`" :value="eur0(b.yearTotals.expense)" tone="neg" card
        :hint="`${eur0(b.yearTotals.avgExpense)} / mois en moyenne` + (b.plan.expense ? ` · budget ${eur0(b.plan.expense)}` : '')" />
      <KpiCard label="Reste (revenus − dépenses)" :value="eur0(b.yearTotals.remaining)" :tone="sign(b.yearTotals.remaining)" card
        :hint="b.plan.income ? `Prévu : ${eur0(b.plan.remaining)} / mois` : undefined" />
      <KpiCard card :label="`Taux d'épargne ${year}`" :value="pct(b.yearTotals.rate)" :tone="sign(b.yearTotals.rate)">
        <template v-if="b.plan.rate !== null || b.uncategorized" #hint>
          <span v-if="b.plan.rate !== null">Prévu : {{ pct(b.plan.rate) }}</span>
          <span v-if="b.uncategorized" class="warn">{{ b.plan.rate !== null ? " · " : "" }}{{ b.uncategorized }} opération(s) sans catégorie non comptées</span>
        </template>
      </KpiCard>
    </div>

    <p v-if="!b.plan.count" class="note mb-3">Aucun budget pour {{ year }}. Clique sur « Proposer un budget » et suis un scénario : le budget se calcule tout seul à partir de tes relevés et de tes objectifs{{ b.prevYearCount ? `, ou reprends le budget de ${year - 1}` : "" }}. Tu pourras fixer n'importe quel montant dans la colonne jaune.</p>

    <!-- À prévoir chaque mois : préparer les comptes (toujours sur l'année en cours) -->
    <div v-if="prep && year === curYear && (prep.fixed.rows.length || prep.variable.rows.length || prep.savings.rows.length)" class="card prep mb-3">
      <div class="card-title">
        <h3>À prévoir chaque mois</h3>
        <span class="help">Revenus budgétés {{ eur0(prep.income.budget) }} · moyenne {{ eur0(prep.income.average) }} / mois</span>
      </div>
      <div class="grid c3">
        <div>
          <h3>Compte courant</h3>
          <ul>
            <li v-for="r in prep.fixed.rows" :key="r.name"><span>{{ r.name }}</span><span class="num">{{ eur0(r.amount) }}</span></li>
            <li><span>Charges fixes</span><span class="num">{{ eur0(prep.fixed.total) }}</span></li>
            <li :title="prep.variable.rows.map((r) => `${r.name} : ${eur0(r.amount)}`).join('\n')"><span>Dépenses variables ({{ prep.variable.rows.length }} catégories)</span><span class="num">{{ eur0(prep.variable.total) }}</span></li>
            <li class="sum"><span>À garder pour un mois</span><span class="num">{{ eur0(prep.checking.needed) }}</span></li>
            <li v-if="prep.checking.total !== null" class="sub"><span>Solde actuel : {{ prep.checking.accounts.map((a) => `${a.name} ${eur0(a.balance)}`).join(" + ") }} ({{ date(prep.checking.accounts[0].date) }})</span></li>
            <li v-if="prep.checking.margin !== null" class="sum"><span>{{ prep.checking.margin >= 0 ? "Marge après un mois de dépenses" : "Il manque pour un mois de dépenses" }}</span><span class="num" :class="sign(prep.checking.margin)">{{ eur0(Math.abs(prep.checking.margin)) }}</span></li>
            <li v-else class="sub"><span>Solde des comptes courants inconnu : importe un relevé ou saisis un relevé de patrimoine.</span></li>
          </ul>
        </div>
        <div>
          <h3>Épargne &amp; objectifs à virer</h3>
          <ul>
            <template v-for="r in prep.savings.rows" :key="r.name">
              <li><span>{{ r.name }} <span v-if="!r.covered" class="tag warn">objectifs non couverts</span></span><span class="num">{{ eur0(r.amount) }}</span></li>
              <li v-for="g in r.goals" :key="g.name" class="sub"><span>↳ {{ g.name }}</span><span class="num">{{ eur0(g.monthly) }} / mois</span></li>
            </template>
            <li v-if="!prep.savings.rows.length" class="sub"><span>Aucune épargne budgétée.</span></li>
            <li class="sum"><span>À virer chaque mois</span><span class="num">{{ eur0(prep.savings.total) }}</span></li>
            <li v-if="prep.goals.shortfall > 0" class="sub warn"><span>Tes objectifs demandent {{ eur0(prep.goals.total) }} / mois : il manque {{ eur0(prep.goals.shortfall) }}. Choisis un scénario plus économe ou décale une échéance dans Objectifs.</span></li>
            <li v-else-if="prep.goals.total > 0" class="sub"><span>Objectifs couverts : {{ eur0(prep.goals.total) }} / mois{{ prep.goals.rows[0].target_date ? `, prochaine échéance ${month(prep.goals.rows.map((g) => g.target_date).filter(Boolean).sort()[0])}` : "" }}.</span></li>
          </ul>
        </div>
        <div>
          <h3>Prélèvements sous {{ prep.upcoming.days }} jours</h3>
          <ul>
            <li v-for="u in prep.upcoming.rows" :key="u.label + u.date" :title="u.account"><span><span class="muted">{{ date(u.date).slice(0, 5) }}</span> {{ u.label }}</span><span class="num">{{ eur0(u.amount) }}</span></li>
            <li v-if="!prep.upcoming.rows.length" class="sub"><span>Aucune charge récurrente attendue (onglet Récurrentes).</span></li>
            <li v-else class="sum"><span>Total</span><span class="num">{{ eur0(prep.upcoming.total) }}</span></li>
          </ul>
        </div>
      </div>
    </div>

    <div class="card pad0">
      <div class="table-wrap">
        <table class="budget-grid">
          <thead>
            <tr class="groups">
              <th></th>
              <th colspan="3" class="num">Par mois : prévu vs réel</th>
              <th colspan="12" class="num">Réel {{ year }}, mois par mois</th>
              <th class="num">Année</th>
            </tr>
            <tr>
              <th>Catégorie</th>
              <th class="num" style="background:var(--edit)" title="Montant mensuel prévu pour l'année : ta saisie, ou le scénario suivi (italique). Un mois peut avoir son propre montant via la vue Mois › Modifier.">Budget</th>
              <th class="num" :title="`Réel moyen par mois sur ${b.monthsWithData} mois avec des données`">Moy. réelle</th>
              <th class="num" title="Écart entre le budget et la moyenne réelle. Positif = mieux que prévu : dépense en dessous du budget, revenu ou épargne au-dessus.">Écart</th>
              <th v-for="(mo, i) in MONTHS" :key="mo" class="num" :class="{ cur: isCurCol(i), future: isFutureCol(i) }" :title="isCurCol(i) ? 'Mois en cours' : isFutureCol(i) ? 'Mois à venir' : ''">{{ mo }}</th>
              <th class="num">Total</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="g in groupsShown" :key="g.kind">
              <tr class="group"><td colspan="17">{{ GROUP_LABEL[g.kind] }}</td></tr>
              <tr v-for="r in g.rows" :key="r.category_id">
                <td>{{ r.name }} <span v-if="r.refunded" class="tag ok" :title="`Remboursements rapprochés : ${eur0(r.refunded)} sur l'année (onglet Remboursements)`">↺ {{ eur0(r.refunded) }}</span><span v-if="r.overrides" class="tag" :title="`${r.overrides} mois avec un montant propre (vue Mois › Modifier)`">{{ r.overrides }} mois ajusté(s)</span></td>
                <td class="num"><input class="cell" :class="{ auto: r.source === 'auto' }" type="number" step="10" :value="r.source === 'manuel' ? r.budget : ''" :placeholder="r.source === 'auto' ? String(r.budget) : '–'" :title="r.source === 'auto' ? `Automatique (scénario ${scenarioLabel}) : saisis un montant pour le fixer` : 'Budget mensuel prévu'" @change="setBudget(r, ($event.target as HTMLInputElement).value)" /></td>
                <td class="num">{{ eur0(r.average) }}</td>
                <td class="num gap" :class="sign(r.gap)">{{ gapText(r.gap) }}</td>
                <td v-for="(v, i) in r.months" :key="i" class="num" :class="cellClass(r, i)" :title="r.monthBudgets[i] !== null && r.monthBudgets[i] !== r.budget ? `Budget du mois : ${eur0(r.monthBudgets[i])}` : ''">{{ v === 0 ? "–" : eur0(v) }}</td>
                <td class="num"><b>{{ eur0(r.total) }}</b></td>
              </tr>
              <tr class="total">
                <td>{{ GROUP_TOTAL[g.kind] }}</td>
                <td class="num" title="Somme des budgets">{{ kindPlan(g.kind) ? eur0(kindPlan(g.kind)) : "" }}</td>
                <td class="num">{{ eur0(kindYear(g.kind) / b.monthsWithData) }}</td>
                <td class="num gap" :class="kindPlan(g.kind) ? sign(g.kind === 'Dépense' ? kindPlan(g.kind) - kindYear(g.kind) / b.monthsWithData : kindYear(g.kind) / b.monthsWithData - kindPlan(g.kind)) : ''">{{ kindPlan(g.kind) ? gapText(g.kind === "Dépense" ? kindPlan(g.kind) - kindYear(g.kind) / b.monthsWithData : kindYear(g.kind) / b.monthsWithData - kindPlan(g.kind)) : "–" }}</td>
                <td v-for="(v, i) in kindTotals(g.kind)" :key="i" class="num" :class="{ cur: isCurCol(i), future: isFutureCol(i), pos: g.kind === 'Revenu', neg: g.kind === 'Dépense' }">{{ eur0(v) }}</td>
                <td class="num">{{ eur0(kindYear(g.kind)) }}</td>
              </tr>
            </template>
            <tr class="total grand"><td title="Revenus − dépenses (l'épargne placée n'est pas déduite : elle fait partie du reste)">Reste (revenus − dépenses)</td><td class="num" :class="sign(b.plan.remaining)" title="Prévu : revenus − dépenses budgétés">{{ b.plan.income ? eur0(b.plan.remaining) : "" }}</td><td class="num" :class="sign(b.yearTotals.remaining)">{{ eur0(b.yearTotals.remaining / b.monthsWithData) }}</td><td class="num"></td><td v-for="(v, i) in b.totals.remaining" :key="i" class="num" :class="[sign(v), { cur: isCurCol(i), future: isFutureCol(i) }]">{{ eur0(v) }}</td><td class="num" :class="sign(b.yearTotals.remaining)">{{ eur0(b.yearTotals.remaining) }}</td></tr>
            <tr class="total grand"><td>Taux d'épargne</td><td class="num" :class="sign(b.plan.rate)" title="Taux d'épargne prévu">{{ b.plan.rate === null ? "" : pct(b.plan.rate, 0) }}</td><td class="num" :class="sign(b.yearTotals.rate)">{{ pct(b.yearTotals.rate, 0) }}</td><td class="num"></td><td v-for="(v, i) in b.totals.rate" :key="i" class="num" :class="[sign(v), { cur: isCurCol(i), future: isFutureCol(i) }]">{{ pct(v, 0) }}</td><td class="num" :class="sign(b.yearTotals.rate)">{{ pct(b.yearTotals.rate) }}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="legend">
        <span><i class="sw" style="background:var(--edit)"></i>Budget saisi</span>
        <span v-if="b.scenario"><i class="sw" style="background:var(--accent-tint)"></i>Budget automatique ({{ scenarioLabel }})</span>
        <span><i class="sw" style="background:var(--neg-soft)"></i>Mois au-dessus du budget (dépense)</span>
        <span><i class="sw" style="background:var(--warn-soft)"></i>Mois terminé sous le budget (revenu, épargne)</span>
        <span v-if="year === curYear"><i class="sw" style="background:var(--accent-tint);border-color:var(--accent)"></i>Mois en cours</span>
        <span>Écart : <b class="pos">+</b> mieux que prévu, <b class="neg">−</b> moins bien</span>
      </div>
    </div>
  </template>
</template>
