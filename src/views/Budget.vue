<script setup lang="ts">
import { onMounted, ref, watch, computed } from "vue";
import { api } from "../lib/api";
import { eur0, pct, sign, monthLong, date, month } from "../lib/format";
import { guard, notify } from "../lib/toast";
import type { BudgetReport, BudgetRow, BudgetMonthReport, BudgetMonthRow } from "../../core/reports";
import type { PrepareReport, ScenarioKey } from "../../core/budgetPlan";
import KpiCard from "../components/KpiCard.vue";
import PageHeader from "../components/PageHeader.vue";
import ScenarioModal from "./budget/ScenarioModal.vue";

const now = new Date();
const curYear = now.getFullYear(), curMonth = now.getMonth();
const year = ref(curYear);
const b = ref<BudgetReport>();
const m = ref<BudgetMonthReport>();
const prep = ref<PrepareReport>();
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const LABELS: Record<ScenarioKey, string> = { moyenne: "Ma moyenne", equilibre: "Équilibré", econome: "Économe", loisirs: "Loisirs", investissement: "Investissement" };
const scenarioLabel = computed(() => (b.value?.scenario ? LABELS[b.value.scenario as ScenarioKey] ?? b.value.scenario : null));

/** Mois suivi (0-11) : mois courant pour l'année en cours, décembre pour une année passée, janvier pour une année future. */
const defaultIdx = (y: number) => (y === curYear ? curMonth : y < curYear ? 11 : 0);
const trackIdx = ref(defaultIdx(curYear));
const trackMonth = computed(() => `${year.value}-${String(trackIdx.value + 1).padStart(2, "0")}`);

async function loadYear() { b.value = await guard(() => api.budget(year.value)); }
async function loadMonth() { m.value = await guard(() => api.budgetMonth(trackMonth.value)); }
async function loadPrep() { prep.value = await guard(() => api.budgetPrepare()); }
async function load() { await Promise.all([loadYear(), loadMonth(), loadPrep()]); }
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
async function stopAuto() {
  if (await guard(() => api.setBudgetScenario(null)) === undefined) return;
  notify("Budget automatique arrêté : seuls tes montants saisis restent.");
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
const autoCount = computed(() => b.value ? b.value.rows.filter((r) => r.source === "auto").length : 0);

/** Mois terminé (passé) pour l'année affichée. */
const monthDone = (i: number) => year.value < curYear || (year.value === curYear && i < curMonth);
const isCur = (i: number) => year.value === curYear && i === curMonth;
const isFuture = (i: number) => year.value > curYear || (year.value === curYear && i > curMonth);
/** Surligne un mois au-dessus du budget (dépense) ou, une fois le mois terminé, en dessous (revenu, épargne) ; marque le mois courant et les mois à venir. */
function cellClass(r: BudgetRow, i: number) {
  const v = r.months[i];
  const base = { muted: v === 0, cur: isCur(i), future: isFuture(i) };
  if (r.budget === null) return base;
  if (r.kind === "Dépense") return { ...base, over: v > r.budget };
  return { ...base, under: monthDone(i) && v < r.budget };
}
const GROUP_LABEL: Record<string, string> = { Revenu: "Revenus", Dépense: "Dépenses", Épargne: "Épargne & investissements placés" };
const GROUP_TOTAL: Record<string, string> = { Revenu: "Total revenus", Dépense: "Total dépenses", Épargne: "Épargne placée" };
const kindTotals = (kind: string) => (kind === "Revenu" ? b.value!.totals.income : kind === "Dépense" ? b.value!.totals.expense : b.value!.totals.savings);
const kindPlan = (kind: string) => (kind === "Revenu" ? b.value!.plan.income : kind === "Dépense" ? b.value!.plan.expense : b.value!.plan.savings);
const kindYear = (kind: string) => (kind === "Revenu" ? b.value!.yearTotals.income : kind === "Dépense" ? b.value!.yearTotals.expense : b.value!.yearTotals.savings);
const gapText = (g: number | null) => (g === null ? "–" : (g > 0 ? "+" : "") + eur0(g));

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
  <PageHeader :title="`Budget ${year}`" sub="Réel par catégorie et par mois, calculé depuis les relevés. Suis un scénario pour un budget automatique, ou saisis tes montants dans la colonne jaune : ils restent prioritaires. Les mois hors budget sont surlignés.">
    <md-filled-button @click="showPlan = true">{{ b?.scenario ? "Changer de scénario" : "Proposer un budget" }}</md-filled-button>
    <md-outlined-button v-if="b && b.prevYearCount" :title="`Copie les budgets de ${year - 1} dans les cases vides de ${year}`" @click="copyPrev">Reprendre {{ year - 1 }}</md-outlined-button>
    <md-outlined-button @click="year--">‹ {{ year - 1 }}</md-outlined-button><md-outlined-button @click="year++">{{ year + 1 }} ›</md-outlined-button><md-outlined-button @click="showAll = !showAll">{{ showAll ? "Masquer les catégories vides" : `Afficher tout (${hiddenCount} vides)` }}</md-outlined-button>
  </PageHeader>
  <ScenarioModal v-if="showPlan" :year="year" @close="showPlan = false" @applied="load" />

  <p v-if="b && b.scenario" class="note mb-3" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
    <span class="tag">Automatique · {{ scenarioLabel }}</span>
    <span>{{ autoCount }} catégorie(s) suivent le scénario : montants recalculés sur les 12 derniers mois complets et tes objectifs, à chaque relevé importé. Saisis un montant pour le fixer, vide la case pour revenir à l'automatique.</span>
    <md-text-button class="small" style="margin-left:auto" @click="stopAuto">Arrêter</md-text-button>
  </p>

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

  <p v-if="b && !b.plan.count" class="note mb-3">Aucun budget pour {{ year }}. Clique sur « Proposer un budget » et suis un scénario : le budget se calcule tout seul à partir de tes relevés et de tes objectifs{{ b.prevYearCount ? `, ou reprends le budget de ${year - 1}` : "" }}. Tu pourras fixer n'importe quel montant dans la colonne jaune.</p>

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

  <div v-if="b && b.plan.count && m" class="card mb-3">
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
            <th class="num" style="background:var(--edit)" title="Montant mensuel prévu : ta saisie, ou le scénario suivi (italique)">Budget</th>
            <th class="num" :title="`Réel moyen par mois sur ${b.monthsWithData} mois avec des données`">Moy. réelle</th>
            <th class="num" title="Écart entre le budget et la moyenne réelle. Positif = mieux que prévu : dépense en dessous du budget, revenu ou épargne au-dessus.">Écart</th>
            <th v-for="(mo, i) in MONTHS" :key="mo" class="num" :class="{ cur: isCur(i), future: isFuture(i) }" :title="isCur(i) ? 'Mois en cours' : isFuture(i) ? 'Mois à venir' : ''">{{ mo }}</th>
            <th class="num">Total</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="g in groupsShown" :key="g.kind">
            <tr class="group"><td colspan="17">{{ GROUP_LABEL[g.kind] }}</td></tr>
            <tr v-for="r in g.rows" :key="r.category_id">
              <td>{{ r.name }} <span v-if="r.refunded" class="tag ok" :title="`Remboursements rapprochés : ${eur0(r.refunded)} sur l'année (onglet Remboursements)`">↺ {{ eur0(r.refunded) }}</span></td>
              <td class="num"><input class="cell" :class="{ auto: r.source === 'auto' }" type="number" step="10" :value="r.source === 'manuel' ? r.budget : ''" :placeholder="r.source === 'auto' ? String(r.budget) : '–'" :title="r.source === 'auto' ? `Automatique (scénario ${scenarioLabel}) : saisis un montant pour le fixer` : 'Budget mensuel prévu'" @change="setBudget(r, ($event.target as HTMLInputElement).value)" /></td>
              <td class="num">{{ eur0(r.average) }}</td>
              <td class="num gap" :class="sign(r.gap)">{{ gapText(r.gap) }}</td>
              <td v-for="(v, i) in r.months" :key="i" class="num" :class="cellClass(r, i)">{{ v === 0 ? "–" : eur0(v) }}</td>
              <td class="num"><b>{{ eur0(r.total) }}</b></td>
            </tr>
            <tr class="total">
              <td>{{ GROUP_TOTAL[g.kind] }}</td>
              <td class="num" title="Somme des budgets">{{ kindPlan(g.kind) ? eur0(kindPlan(g.kind)) : "" }}</td>
              <td class="num">{{ eur0(kindYear(g.kind) / b.monthsWithData) }}</td>
              <td class="num gap" :class="kindPlan(g.kind) ? sign(g.kind === 'Dépense' ? kindPlan(g.kind) - kindYear(g.kind) / b.monthsWithData : kindYear(g.kind) / b.monthsWithData - kindPlan(g.kind)) : ''">{{ kindPlan(g.kind) ? gapText(g.kind === "Dépense" ? kindPlan(g.kind) - kindYear(g.kind) / b.monthsWithData : kindYear(g.kind) / b.monthsWithData - kindPlan(g.kind)) : "–" }}</td>
              <td v-for="(v, i) in kindTotals(g.kind)" :key="i" class="num" :class="{ cur: isCur(i), future: isFuture(i), pos: g.kind === 'Revenu', neg: g.kind === 'Dépense' }">{{ eur0(v) }}</td>
              <td class="num">{{ eur0(kindYear(g.kind)) }}</td>
            </tr>
          </template>
          <tr class="total grand"><td title="Revenus − dépenses (l'épargne placée n'est pas déduite : elle fait partie du reste)">Reste (revenus − dépenses)</td><td class="num" :class="sign(b.plan.remaining)" title="Prévu : revenus − dépenses budgétés">{{ b.plan.income ? eur0(b.plan.remaining) : "" }}</td><td class="num" :class="sign(b.yearTotals.remaining)">{{ eur0(b.yearTotals.remaining / b.monthsWithData) }}</td><td class="num"></td><td v-for="(v, i) in b.totals.remaining" :key="i" class="num" :class="[sign(v), { cur: isCur(i), future: isFuture(i) }]">{{ eur0(v) }}</td><td class="num" :class="sign(b.yearTotals.remaining)">{{ eur0(b.yearTotals.remaining) }}</td></tr>
          <tr class="total grand"><td>Taux d'épargne</td><td class="num" :class="sign(b.plan.rate)" title="Taux d'épargne prévu">{{ b.plan.rate === null ? "" : pct(b.plan.rate, 0) }}</td><td class="num" :class="sign(b.yearTotals.rate)">{{ pct(b.yearTotals.rate, 0) }}</td><td class="num"></td><td v-for="(v, i) in b.totals.rate" :key="i" class="num" :class="[sign(v), { cur: isCur(i), future: isFuture(i) }]">{{ pct(v, 0) }}</td><td class="num" :class="sign(b.yearTotals.rate)">{{ pct(b.yearTotals.rate) }}</td></tr>
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
