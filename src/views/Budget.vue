<script setup lang="ts">
import { onMounted, ref, watch, computed } from "vue";
import { api } from "../lib/api";
import { eur0, pct, sign, monthLong } from "../lib/format";
import { guard, notify } from "../lib/toast";
import type { BudgetReport, BudgetRow, BudgetMonthReport, BudgetMonthRow } from "../../core/reports";
import KpiCard from "../components/KpiCard.vue";
import PageHeader from "../components/PageHeader.vue";
import ScenarioModal from "./budget/ScenarioModal.vue";

const now = new Date();
const curYear = now.getFullYear(), curMonth = now.getMonth();
const year = ref(curYear);
const b = ref<BudgetReport>();
const m = ref<BudgetMonthReport>();
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/** Mois suivi (0-11) : mois courant pour l'année en cours, décembre pour une année passée, janvier pour une année future. */
const defaultIdx = (y: number) => (y === curYear ? curMonth : y < curYear ? 11 : 0);
const trackIdx = ref(defaultIdx(curYear));
const trackMonth = computed(() => `${year.value}-${String(trackIdx.value + 1).padStart(2, "0")}`);

async function loadYear() { b.value = await guard(() => api.budget(year.value)); }
async function loadMonth() { m.value = await guard(() => api.budgetMonth(trackMonth.value)); }
async function load() { await Promise.all([loadYear(), loadMonth()]); }
onMounted(load);
watch(year, (y) => { trackIdx.value = defaultIdx(y); loadYear(); });
watch(trackMonth, loadMonth);

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

const groups = computed(() => {
  if (!b.value) return [];
  return ["Revenu", "Dépense", "Épargne"].map((k) => ({ kind: k, rows: b.value!.rows.filter((r) => r.kind === k && (r.total !== 0 || r.budget !== null)) }));
});
const hiddenCount = computed(() => b.value ? b.value.rows.filter((r) => r.kind !== "Transfert" && r.total === 0 && r.budget === null).length : 0);
const showAll = ref(false);
const groupsShown = computed(() => showAll.value && b.value ? ["Revenu", "Dépense", "Épargne"].map((k) => ({ kind: k, rows: b.value!.rows.filter((r) => r.kind === k) })) : groups.value);
const showPlan = ref(false);

/** Mois terminé (passé) pour l'année affichée. */
const monthDone = (i: number) => year.value < curYear || (year.value === curYear && i < curMonth);
/** Surligne un mois au-dessus du budget (dépense) ou, une fois le mois terminé, en dessous (revenu, épargne). */
function cellClass(r: BudgetRow, i: number) {
  const v = r.months[i];
  if (r.budget === null) return { muted: v === 0 };
  if (r.kind === "Dépense") return { over: v > r.budget, muted: v === 0 };
  return { under: monthDone(i) && v < r.budget, muted: v === 0 };
}

// ---------------------------------------------------------------- suivi du mois
const monthGroups = computed(() => {
  if (!m.value) return [];
  return [["Dépense", "Dépenses"], ["Revenu", "Revenus"], ["Épargne", "Épargne & investissements"]]
    .map(([kind, label]) => ({ kind, label, rows: m.value!.rows.filter((r) => r.kind === kind) }))
    .filter((g) => g.rows.length);
});
const STATUS: Record<BudgetMonthRow["status"], { text: string; tag: string }> = {
  ok: { text: "", tag: "" }, over: { text: "Dépassé", tag: "neg" }, warn: { text: "À surveiller", tag: "warn" }, under: { text: "Sous le budget", tag: "warn" },
};
const overCount = computed(() => m.value ? m.value.rows.filter((r) => r.status === "over").length : 0);
const inProgress = computed(() => !!m.value && m.value.days.elapsed > 0 && m.value.days.elapsed < m.value.days.total);
const summary = computed(() => {
  if (!m.value) return "";
  const e = m.value.totals.expense;
  const parts: string[] = [];
  if (e.budget > 0) parts.push(`Dépenses : ${eur0(e.actual)} sur ${eur0(e.budget)} budgétés (${pct(e.actual / e.budget, 0)})`);
  if (inProgress.value) parts.push(`jour ${m.value.days.elapsed}/${m.value.days.total}`);
  if (e.projected !== null && e.budget > 0) parts.push(`fin de mois estimée ${eur0(e.projected)}`);
  if (overCount.value) parts.push(`${overCount.value} catégorie(s) dépassée(s) de ${eur0(e.over)}`);
  if (m.value.untrackedTotal > 0) parts.push(`${eur0(m.value.untrackedTotal)} hors budget`);
  return parts.join(" · ");
});
const untrackedTitle = computed(() => m.value ? m.value.untracked.map((u) => `${u.name} : ${eur0(u.actual)}`).join("\n") : "");
</script>

<template>
  <PageHeader :title="`Budget ${year}`" sub="Réel par catégorie et par mois, calculé depuis les relevés. Saisis un budget mensuel dans la colonne jaune : les mois qui le dépassent sont surlignés et le suivi du mois t'indique où tu en es.">
    <md-filled-button @click="showPlan = true">Proposer un budget</md-filled-button>
    <md-outlined-button v-if="b && b.prevYearCount" :title="`Copie les budgets de ${year - 1} dans les cases vides de ${year}`" @click="copyPrev">Reprendre {{ year - 1 }}</md-outlined-button>
    <md-outlined-button @click="year--">‹ {{ year - 1 }}</md-outlined-button><md-outlined-button @click="year++">{{ year + 1 }} ›</md-outlined-button><md-outlined-button @click="showAll = !showAll">{{ showAll ? "Masquer les catégories vides" : `Afficher tout (${hiddenCount} vides)` }}</md-outlined-button>
  </PageHeader>
  <ScenarioModal v-if="showPlan" :year="year" @close="showPlan = false" @applied="load" />

  <div v-if="b" class="grid c4 mb-3">
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

  <p v-if="b && !b.plan.count" class="note mb-3">Aucun budget saisi pour {{ year }}. Clique sur « Proposer un budget » pour partir de tes moyennes{{ b.prevYearCount ? `, ou reprends le budget de ${year - 1}` : "" }} ; tu pourras retoucher chaque montant dans la colonne jaune.</p>

  <div v-else-if="b && m" class="card mb-3">
    <div class="card-title">
      <h3>Suivi · {{ monthLong(m.month) }}</h3>
      <div class="row-actions">
        <md-icon-button class="small" aria-label="Mois précédent" :disabled="trackIdx === 0" @click="trackIdx--">‹</md-icon-button>
        <md-icon-button class="small" aria-label="Mois suivant" :disabled="trackIdx === 11" @click="trackIdx++">›</md-icon-button>
      </div>
    </div>
    <p v-if="summary" class="help" style="margin:0 0 12px">{{ summary }}</p>
    <p v-if="m.days.elapsed === 0" class="muted" style="margin:0">Ce mois n'a pas commencé : le réel se remplira avec les relevés.</p>
    <div v-else class="table-wrap">
      <table>
        <thead><tr><th>Catégorie</th><th class="num">Budget</th><th class="num">Réel</th><th class="track-bar"></th><th class="num">Reste</th><th v-if="inProgress" class="num" title="Réel extrapolé au rythme des jours écoulés">Fin de mois</th><th></th></tr></thead>
        <tbody>
          <template v-for="g in monthGroups" :key="g.kind">
            <tr v-if="monthGroups.length > 1"><td :colspan="inProgress ? 7 : 6" style="background:var(--surface-2);font-weight:500;color:var(--text)">{{ g.label }}</td></tr>
            <tr v-for="r in g.rows" :key="r.category_id">
              <td>{{ r.name }}</td>
              <td class="num">{{ eur0(r.budget) }}</td>
              <td class="num" :class="{ muted: r.actual === 0 }">{{ eur0(r.actual) }}</td>
              <td class="track-bar"><md-linear-progress :class="r.status === 'ok' ? '' : r.status === 'over' ? 'over' : 'low'" :value="Math.min(1, r.ratio)" :title="pct(r.ratio, 0)"></md-linear-progress></td>
              <td class="num" :class="sign(r.remaining)">{{ eur0(r.remaining) }}</td>
              <td v-if="inProgress" class="num muted">{{ r.projected === null ? "–" : eur0(r.projected) }}</td>
              <td><span v-if="STATUS[r.status].text" class="tag" :class="STATUS[r.status].tag">{{ STATUS[r.status].text }}</span></td>
            </tr>
          </template>
          <tr v-if="m.untracked.length" class="muted">
            <td :title="untrackedTitle">Hors budget ({{ m.untracked.length }} catégorie(s))</td>
            <td class="num">–</td>
            <td class="num">{{ eur0(m.untrackedTotal) }}</td>
            <td :colspan="inProgress ? 4 : 3" class="help">{{ m.untracked.map((u) => u.name).join(", ") }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div v-if="b" class="card pad0">
    <div class="table-wrap">
      <table>
        <thead><tr><th>Catégorie</th><th class="num" style="background:var(--edit)">Budget / mois</th><th v-for="(mo, i) in MONTHS" :key="mo" class="num" :style="i === curMonth && year === curYear ? 'color:var(--accent)' : ''">{{ mo }}</th><th class="num">Total</th><th class="num">Moy. / mois</th><th class="num">Écart</th></tr></thead>
        <tbody>
          <template v-for="g in groupsShown" :key="g.kind">
            <tr><td colspan="17" style="background:var(--surface-2);font-weight:500;color:var(--text)">{{ g.kind === "Revenu" ? "Revenus" : g.kind === "Dépense" ? "Dépenses" : "Épargne & investissements placés" }}</td></tr>
            <tr v-for="r in g.rows" :key="r.category_id">
              <td>{{ r.name }} <span v-if="r.refunded" class="tag ok" :title="`Remboursements rapprochés : ${eur0(r.refunded)} sur l'année (onglet Remboursements)`">↺ {{ eur0(r.refunded) }}</span></td>
              <td class="num"><input class="cell" type="number" step="10" :value="r.budget ?? ''" placeholder="–" @change="setBudget(r, ($event.target as HTMLInputElement).value)" /></td>
              <td v-for="(v, i) in r.months" :key="i" class="num" :class="cellClass(r, i)">{{ v === 0 ? "–" : eur0(v) }}</td>
              <td class="num"><b>{{ eur0(r.total) }}</b></td><td class="num">{{ eur0(r.average) }}</td>
              <td class="num" :class="sign(r.gap)">{{ r.gap === null ? "–" : eur0(r.gap) }}</td>
            </tr>
          </template>
          <tr class="total"><td>Total revenus</td><td class="num" title="Somme des budgets saisis">{{ b.plan.income ? eur0(b.plan.income) : "" }}</td><td v-for="(v, i) in b.totals.income" :key="i" class="num pos">{{ eur0(v) }}</td><td class="num">{{ eur0(b.yearTotals.income) }}</td><td class="num">{{ eur0(b.yearTotals.income / b.monthsWithData) }}</td><td></td></tr>
          <tr class="total"><td>Total dépenses</td><td class="num" title="Somme des budgets saisis">{{ b.plan.expense ? eur0(b.plan.expense) : "" }}</td><td v-for="(v, i) in b.totals.expense" :key="i" class="num neg">{{ eur0(v) }}</td><td class="num">{{ eur0(b.yearTotals.expense) }}</td><td class="num">{{ eur0(b.yearTotals.avgExpense) }}</td><td></td></tr>
          <tr class="total"><td>Épargne placée</td><td class="num" title="Somme des budgets saisis">{{ b.plan.savings ? eur0(b.plan.savings) : "" }}</td><td v-for="(v, i) in b.totals.savings" :key="i" class="num">{{ eur0(v) }}</td><td class="num">{{ eur0(b.yearTotals.savings) }}</td><td></td><td></td></tr>
          <tr class="total"><td>Reste</td><td class="num" :class="sign(b.plan.remaining)" title="Revenus − dépenses budgétés">{{ b.plan.income ? eur0(b.plan.remaining) : "" }}</td><td v-for="(v, i) in b.totals.remaining" :key="i" class="num" :class="sign(v)">{{ eur0(v) }}</td><td class="num" :class="sign(b.yearTotals.remaining)">{{ eur0(b.yearTotals.remaining) }}</td><td></td><td></td></tr>
          <tr class="total"><td>Taux d'épargne</td><td class="num" :class="sign(b.plan.rate)" title="Taux d'épargne prévu">{{ b.plan.rate === null ? "" : pct(b.plan.rate, 0) }}</td><td v-for="(v, i) in b.totals.rate" :key="i" class="num" :class="sign(v)">{{ pct(v, 0) }}</td><td class="num" :class="sign(b.yearTotals.rate)">{{ pct(b.yearTotals.rate) }}</td><td></td><td></td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
