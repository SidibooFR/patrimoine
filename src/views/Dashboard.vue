<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { api } from "../lib/api";
import { eur, eur0, pct, monthLong, date, sign } from "../lib/format";
import { theme, rgba } from "../lib/appearance";
import { guard } from "../lib/toast";
import Chart from "../components/Chart.vue";
import type { ChartConfiguration } from "chart.js";
import { CLASS_COLORS, PALETTE, eurTick, pctTick, eurTip } from "../lib/charts";
import type { Dashboard } from "../../core/reports";
import KpiCard from "../components/KpiCard.vue";
import PageHeader from "../components/PageHeader.vue";

const d = ref<Dashboard>();
onMounted(async () => { d.value = await guard(() => api.dashboard()); });

const nwChart = computed<ChartConfiguration<"line">>(() => ({
  type: "line",
  data: { labels: d.value!.series.months.map((m) => new Date(m + "T00:00:00").toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })),
    datasets: [{ label: "Patrimoine", data: d.value!.series.total, borderColor: theme.navy, backgroundColor: rgba(theme.navy, .12), fill: true, tension: .25, spanGaps: true, pointRadius: 4 }] },
  options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: eurTip } } }, scales: { y: { ticks: { callback: eurTick } } } },
}));
const classChart = computed<ChartConfiguration<"doughnut">>(() => {
  const entries = Object.entries(d.value!.byClass).filter(([, v]) => v > 0);
  return { type: "doughnut", data: { labels: entries.map((e) => e[0]), datasets: [{ data: entries.map((e) => e[1]), backgroundColor: entries.map((e) => CLASS_COLORS[e[0]] ?? "#999") }] },
    options: { plugins: { legend: { position: "right" }, tooltip: { callbacks: { label: (c) => `${c.label} : ${eur0(c.parsed)}` } } }, cutout: "62%" } };
});
const budgetChart = computed<ChartConfiguration<"bar">>(() => ({
  type: "bar",
  data: { labels: d.value!.budgetSeries.months.map((m) => new Date(m + "-01T00:00:00").toLocaleDateString("fr-FR", { month: "short" })),
    datasets: [{ label: "Revenus", data: d.value!.budgetSeries.income, backgroundColor: PALETTE[1] }, { label: "Dépenses", data: d.value!.budgetSeries.expense, backgroundColor: PALETTE[4] }] },
  options: { plugins: { tooltip: { callbacks: { label: eurTip } } }, scales: { y: { ticks: { callback: eurTick } } } },
}));
const rateChart = computed<ChartConfiguration<"bar">>(() => ({
  type: "bar",
  data: { labels: budgetChart.value.data.labels, datasets: [{ label: "Taux d'épargne", data: d.value!.budgetSeries.rate, backgroundColor: d.value!.budgetSeries.rate.map((r) => (r ?? 0) < 0 ? PALETTE[4] : theme.accent) }] },
  options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => pct(c.parsed.y) } } }, scales: { y: { ticks: { callback: pctTick }, min: -1, max: 1 } } },
}));
</script>

<template>
  <div v-if="d">
    <PageHeader title="Tableau de bord" :sub="`Au ${date(d.today)}`" />
    <div class="grid c3">
      <div class="card">
        <h3>Patrimoine</h3>
        <KpiCard label="Patrimoine total" :value="eur0(d.networth.total)" :hint="`Dernier relevé : ${monthLong(d.networth.lastMonth)}`" />
        <div class="grid c2 mt-2">
          <KpiCard label="Dernier mois" :value="eur0(d.networth.variation)" :tone="sign(d.networth.variation)" small />
          <KpiCard label="Depuis le début" :value="eur0(d.networth.sinceStart)" :tone="sign(d.networth.sinceStart)" small />
        </div>
        <KpiCard class="mt-2" label="Épargne de précaution" :value="d.networth.emergencyStatus" :tone="d.networth.emergencyStatus.startsWith('Objectif') ? 'pos' : 'warn'" small />
      </div>
      <div class="card">
        <h3>Budget · {{ monthLong(d.month.month) }}</h3>
        <div class="grid c2">
          <KpiCard label="Revenus" :value="eur0(d.month.income)" tone="pos" small />
          <KpiCard label="Dépenses" :value="eur0(d.month.expense)" tone="neg" small />
          <KpiCard label="Épargne placée" :value="eur0(d.month.savings)" small />
          <KpiCard label="Taux d'épargne" :value="pct(d.month.rate)" :tone="sign(d.month.rate)" small />
        </div>
        <KpiCard class="mt-2" label="Taux d'épargne moyen sur l'année" :value="pct(d.month.yearRate)" :tone="sign(d.month.yearRate)" small />
      </div>
      <div class="card">
        <h3>Investissements</h3>
        <KpiCard label="Valeur du portefeuille" :value="eur0(d.portfolio.value)" :hint="`Investi : ${eur0(d.portfolio.invested)}`" />
        <div class="grid c2 mt-2">
          <KpiCard label="Plus-value latente" :value="eur(d.portfolio.unrealized)" :tone="sign(d.portfolio.unrealized)" small />
          <KpiCard label="Performance" :value="pct(d.portfolio.performance)" :tone="sign(d.portfolio.performance)" small />
        </div>
        <KpiCard class="mt-2" :value="pct(d.portfolio.irr)" :tone="sign(d.portfolio.irr)" small>
          <template #label>Rendement annualisé (TRI) <span v-if="!d.portfolio.irrReliable" class="tag warn" :title="d.portfolio.irrNote ?? ''">peu fiable</span></template>
        </KpiCard>
      </div>
    </div>

    <div class="grid c3 mt-3">
      <router-link to="/abonnements" class="card link-card">
        <h3>Abonnements &amp; charges fixes</h3>
        <KpiCard :hint="`${d.recurring.count} prélèvement(s) · ${eur0(d.recurring.annual)} par an`">
          {{ eur(d.recurring.monthly) }}<small class="muted" style="font-size:13px;font-weight:400"> / mois</small>
        </KpiCard>
        <div v-for="i in d.recurring.increases" :key="i.label" class="tag neg mt-1"><i class="fa-solid fa-caret-up" aria-hidden="true"></i> {{ i.label }} +{{ pct(i.pct, 0) }}</div>
      </router-link>
      <router-link to="/enveloppes" class="card link-card">
        <h3>Livrets &amp; PEA</h3>
        <KpiCard :value="eur0(d.envelopes.balance)" :hint="`intérêts estimés cette année : ${eur(d.envelopes.estimateThisYear)} · place restante ${eur0(d.envelopes.room)}`" />
        <div v-if="d.envelopes.missed > 0" class="tag warn mt-1">+{{ eur(d.envelopes.missed) }} / an possibles</div>
      </router-link>
      <router-link to="/objectifs" class="card link-card">
        <h3>Objectifs</h3>
        <div v-for="g in d.goals.slice(0, 3)" :key="g.id" style="margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;font-size:13px"><span>{{ g.name }}</span><span class="muted">{{ eur0(g.current) }} / {{ eur0(g.target) }}</span></div>
          <md-linear-progress :class="g.status === 'Atteint' ? 'done' : g.status === 'En retard' ? 'late' : ''" :value="Math.min(1, Math.max(0.01, g.progress))"></md-linear-progress>
        </div>
        <div v-if="!d.goals.length" class="help">Aucun objectif : fixe-toi un montant et une date.</div>
      </router-link>
    </div>

    <div class="card mt-3">
      <h3>Points d'attention</h3>
      <ul class="alerts"><li v-for="a in d.alerts" :key="a.text" :class="a.level"><i class="fa-solid" :class="a.level === 'ok' ? 'fa-check' : 'fa-triangle-exclamation'" aria-hidden="true"></i> {{ a.text }}</li></ul>
    </div>

    <div class="grid c2 mt-3">
      <div class="card"><h3>Évolution du patrimoine</h3><Chart :config="nwChart" /></div>
      <div class="card"><h3>Répartition actuelle</h3><Chart :config="classChart" /></div>
      <div class="card"><h3>Revenus vs dépenses</h3><Chart :config="budgetChart" /></div>
      <div class="card"><h3>Taux d'épargne mensuel</h3><Chart :config="rateChart" /></div>
    </div>
  </div>
</template>
