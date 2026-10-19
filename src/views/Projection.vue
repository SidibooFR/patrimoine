<script setup lang="ts">
import PageHeader from "../components/PageHeader.vue";
import { onMounted, ref, reactive, computed, watch } from "vue";
import { api } from "../lib/api";
import { eur0, cur } from "../lib/format";
import { theme } from "../lib/appearance";
import { guard } from "../lib/toast";
import Chart from "../components/Chart.vue";
import type { ChartConfiguration } from "chart.js";
import { PALETTE, eurTick, eurTip } from "../lib/charts";
import type { ProjectionReport } from "../../core/reports";
import type { GoalsReport } from "../../core/goals";

const pr = ref<ProjectionReport>();
const p = reactive({ initial: 0, monthly: 400, rateLow: 4, rateMid: 6, rateHigh: 8, inflation: 2, goal: 100000, years: 30, useNetworth: true });
const nwTotal = ref(0);
const goals = ref<GoalsReport>();

onMounted(async () => {
  const r = await api.projection();
  const s = await api.settings();
  nwTotal.value = r.params.initial;
  p.initial = r.params.initial; p.monthly = Number(s.projection_monthly ?? 400);
  p.rateLow = Number(s.projection_rate_low ?? 0.04) * 100; p.rateMid = Number(s.projection_rate_mid ?? 0.06) * 100; p.rateHigh = Number(s.projection_rate_high ?? 0.08) * 100;
  p.inflation = Number(s.projection_inflation ?? 0.02) * 100; p.goal = Number(s.projection_goal ?? 100000);
  pr.value = r;
  goals.value = await api.goals();
});
const activeGoals = computed(() => (goals.value?.goals ?? []).filter((g) => !g.archived && g.status !== "Atteint"));
let t: ReturnType<typeof setTimeout> | undefined;
watch(p, () => { clearTimeout(t); t = setTimeout(compute, 250); });
async function compute() {
  const initial = p.useNetworth ? nwTotal.value : p.initial;
  pr.value = await guard(() => api.projection({ initial, monthly: p.monthly, rateLow: p.rateLow / 100, rateMid: p.rateMid / 100, rateHigh: p.rateHigh / 100, inflation: p.inflation / 100, goal: p.goal, years: p.years }));
  for (const [k, v] of [["projection_monthly", p.monthly], ["projection_rate_low", p.rateLow / 100], ["projection_rate_mid", p.rateMid / 100], ["projection_rate_high", p.rateHigh / 100], ["projection_inflation", p.inflation / 100], ["projection_goal", p.goal]] as const) api.setSetting(k, String(v));
}
const chart = computed<ChartConfiguration<"line">>(() => ({
  type: "line",
  data: { labels: pr.value!.rows.map((r) => r.year), datasets: [
    { label: "Total versé", data: pr.value!.rows.map((r) => r.paid), borderColor: PALETTE[6], borderDash: [4, 4], pointRadius: 0 },
    { label: `Prudent ${p.rateLow} %`, data: pr.value!.rows.map((r) => r.low), borderColor: PALETTE[1], pointRadius: 0 },
    { label: `Central ${p.rateMid} %`, data: pr.value!.rows.map((r) => r.mid), borderColor: theme.accent, borderWidth: 3, pointRadius: 0 },
    { label: `Dynamique ${p.rateHigh} %`, data: pr.value!.rows.map((r) => r.high), borderColor: PALETTE[2], pointRadius: 0 },
    { label: "Objectif", data: pr.value!.rows.map(() => p.goal), borderColor: PALETTE[4], borderDash: [2, 4], pointRadius: 0, borderWidth: 1 }] },
  options: { plugins: { tooltip: { callbacks: { label: eurTip } } }, scales: { y: { ticks: { callback: eurTick } } }, interaction: { mode: "index", intersect: false } },
}));
</script>

<template>
  <PageHeader title="Projection" sub="Simulation à intérêts composés. Les rendements sont des hypothèses, pas des promesses : les marchés connaissent des années négatives." />
  <div v-if="pr" class="grid" style="grid-template-columns: 300px 1fr">
    <div class="card">
      <h2>Hypothèses</h2>
      <div class="form" style="grid-template-columns: 1fr">
        <md-outlined-text-field v-model.number="p.initial" :label="`Capital de départ (${cur()})`" type="number" step="100" :disabled="p.useNetworth"></md-outlined-text-field>
        <label class="check help"><md-checkbox :checked="p.useNetworth" @change="p.useNetworth = ($event.target as HTMLInputElement).checked"></md-checkbox>Patrimoine actuel ({{ eur0(nwTotal) }})</label>
        <md-outlined-text-field v-model.number="p.monthly" :label="`Versement mensuel (${cur()})`" type="number" step="50"></md-outlined-text-field>
        <md-outlined-text-field v-model.number="p.rateLow" label="Rendement prudent (%/an)" type="number" step="0.5"></md-outlined-text-field>
        <md-outlined-text-field v-model.number="p.rateMid" label="Rendement central (%/an)" type="number" step="0.5"></md-outlined-text-field>
        <md-outlined-text-field v-model.number="p.rateHigh" label="Rendement dynamique (%/an)" type="number" step="0.5"></md-outlined-text-field>
        <md-outlined-text-field v-model.number="p.inflation" label="Inflation (%/an)" type="number" step="0.5"></md-outlined-text-field>
        <md-outlined-text-field v-model.number="p.goal" :label="`Objectif de patrimoine (${cur()})`" type="number" step="10000"></md-outlined-text-field>
        <md-outlined-text-field v-model.number="p.years" label="Horizon (années)" type="number" min="1" max="50"></md-outlined-text-field>
      </div>
      <div class="note mt-2">
        <b>Objectif {{ eur0(p.goal) }}</b> atteint en <b>{{ pr.goalYears === null ? "jamais" : pr.goalYears.toFixed(1) + " ans" }}</b><span v-if="pr.goalYear"> (vers {{ pr.goalYear }})</span> dans le scénario central.
      </div>
      <div v-if="goals && activeGoals.length" class="note" :class="p.monthly >= goals.totals.monthlyNeeded ? 'ok' : 'warn'" style="margin-top:10px">
        Tes objectifs d'épargne demandent <b>{{ eur0(goals.totals.monthlyNeeded) }} / mois</b> ({{ activeGoals.map((g) => g.name).join(", ") }}).
        <template v-if="p.monthly >= goals.totals.monthlyNeeded">Ton versement de {{ eur0(p.monthly) }} les couvre.</template>
        <template v-else>Ton versement de {{ eur0(p.monthly) }} ne les couvre pas : il manque {{ eur0(goals.totals.monthlyNeeded - p.monthly) }} par mois.</template>
        <router-link to="/objectifs">Voir les objectifs</router-link>
      </div>
    </div>
    <div class="card"><Chart :config="chart" :height="380" /></div>
  </div>
  <div v-if="pr" class="card pad0 mt-3">
    <div class="table-wrap" style="max-height:420px">
      <table>
        <thead><tr><th>Année</th><th class="num">Total versé</th><th class="num">Prudent</th><th class="num">Central</th><th class="num">Dynamique</th><th class="num">Central en {{ cur() }} d'aujourd'hui</th><th class="num">Gains (central)</th></tr></thead>
        <tbody><tr v-for="r in pr.rows" :key="r.year" :style="r.mid >= p.goal ? 'background:var(--ok-soft)' : ''"><td>{{ r.year }}</td><td class="num">{{ eur0(r.paid) }}</td><td class="num">{{ eur0(r.low) }}</td><td class="num"><b>{{ eur0(r.mid) }}</b></td><td class="num">{{ eur0(r.high) }}</td><td class="num">{{ eur0(r.midReal) }}</td><td class="num pos">{{ eur0(r.gain) }}</td></tr></tbody>
      </table>
    </div>
  </div>
</template>
