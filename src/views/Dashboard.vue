<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { api } from "../lib/api";
import { eur, eur0, pct, monthLong, date, sign } from "../lib/format";
import { theme, rgba } from "../lib/appearance";
import { guard } from "../lib/toast";
import Chart from "../components/Chart.vue";
import { CLASS_COLORS, PALETTE, eurTick, pctTick, eurTip } from "../lib/charts";
import type { Dashboard } from "../../core/reports";

const d = ref<Dashboard>();
onMounted(async () => { d.value = await guard(() => api.dashboard()); });

const nwChart = computed<any>(() => ({
  type: "line",
  data: { labels: d.value!.series.months.map((m) => new Date(m + "T00:00:00").toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })),
    datasets: [{ label: "Patrimoine", data: d.value!.series.total, borderColor: theme.navy, backgroundColor: rgba(theme.navy, .12), fill: true, tension: .25, spanGaps: true, pointRadius: 4 }] },
  options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: eurTip } } }, scales: { y: { ticks: { callback: eurTick } } } },
}));
const classChart = computed<any>(() => {
  const entries = Object.entries(d.value!.byClass).filter(([, v]) => v > 0);
  return { type: "doughnut", data: { labels: entries.map((e) => e[0]), datasets: [{ data: entries.map((e) => e[1]), backgroundColor: entries.map((e) => CLASS_COLORS[e[0]] ?? "#999") }] },
    options: { plugins: { legend: { position: "right" }, tooltip: { callbacks: { label: (c: any) => `${c.label} : ${eur0(c.parsed)}` } } }, cutout: "62%" } };
});
const budgetChart = computed<any>(() => ({
  type: "bar",
  data: { labels: d.value!.budgetSeries.months.map((m) => new Date(m + "-01T00:00:00").toLocaleDateString("fr-FR", { month: "short" })),
    datasets: [{ label: "Revenus", data: d.value!.budgetSeries.income, backgroundColor: PALETTE[1] }, { label: "Dépenses", data: d.value!.budgetSeries.expense, backgroundColor: PALETTE[4] }] },
  options: { plugins: { tooltip: { callbacks: { label: eurTip } } }, scales: { y: { ticks: { callback: eurTick } } } },
}));
const rateChart = computed<any>(() => ({
  type: "bar",
  data: { labels: budgetChart.value.data.labels, datasets: [{ label: "Taux d'épargne", data: d.value!.budgetSeries.rate, backgroundColor: d.value!.budgetSeries.rate.map((r) => (r ?? 0) < 0 ? PALETTE[4] : theme.accent) }] },
  options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => pct(c.parsed.y) } } }, scales: { y: { ticks: { callback: pctTick }, min: -1, max: 1 } } },
}));
</script>

<template>
  <div v-if="d">
    <div class="page-head"><div><h1>Tableau de bord</h1><p class="sub">Au {{ date(d.today) }}</p></div></div>
    <div class="grid c3">
      <div class="card">
        <h3>Patrimoine</h3>
        <div class="kpi"><span class="label">Patrimoine total</span><span class="value">{{ eur0(d.networth.total) }}</span>
          <span class="hint">Dernier relevé : {{ monthLong(d.networth.lastMonth) }}</span></div>
        <div class="grid c2" style="margin-top:12px">
          <div class="kpi"><span class="label">Dernier mois</span><span class="value small" :class="sign(d.networth.variation)">{{ eur0(d.networth.variation) }}</span></div>
          <div class="kpi"><span class="label">Depuis le début</span><span class="value small" :class="sign(d.networth.sinceStart)">{{ eur0(d.networth.sinceStart) }}</span></div>
        </div>
        <div class="kpi" style="margin-top:12px"><span class="label">Épargne de précaution</span><span class="value small" :class="d.networth.emergencyStatus.startsWith('Objectif') ? 'pos' : 'warn'">{{ d.networth.emergencyStatus }}</span></div>
      </div>
      <div class="card">
        <h3>Budget · {{ monthLong(d.month.month) }}</h3>
        <div class="grid c2">
          <div class="kpi"><span class="label">Revenus</span><span class="value small pos">{{ eur0(d.month.income) }}</span></div>
          <div class="kpi"><span class="label">Dépenses</span><span class="value small neg">{{ eur0(d.month.expense) }}</span></div>
          <div class="kpi"><span class="label">Épargne placée</span><span class="value small">{{ eur0(d.month.savings) }}</span></div>
          <div class="kpi"><span class="label">Taux d'épargne</span><span class="value small" :class="sign(d.month.rate)">{{ pct(d.month.rate) }}</span></div>
        </div>
        <div class="kpi" style="margin-top:12px"><span class="label">Taux d'épargne moyen sur l'année</span><span class="value small" :class="sign(d.month.yearRate)">{{ pct(d.month.yearRate) }}</span></div>
      </div>
      <div class="card">
        <h3>Investissements</h3>
        <div class="kpi"><span class="label">Valeur du portefeuille</span><span class="value">{{ eur0(d.portfolio.value) }}</span><span class="hint">Investi : {{ eur0(d.portfolio.invested) }}</span></div>
        <div class="grid c2" style="margin-top:12px">
          <div class="kpi"><span class="label">Plus-value latente</span><span class="value small" :class="sign(d.portfolio.unrealized)">{{ eur(d.portfolio.unrealized) }}</span></div>
          <div class="kpi"><span class="label">Performance</span><span class="value small" :class="sign(d.portfolio.performance)">{{ pct(d.portfolio.performance) }}</span></div>
        </div>
        <div class="kpi" style="margin-top:12px"><span class="label">Rendement annualisé (TRI) <span v-if="!d.portfolio.irrReliable" class="tag warn" :title="d.portfolio.irrNote ?? ''">peu fiable</span></span><span class="value small" :class="sign(d.portfolio.irr)">{{ pct(d.portfolio.irr) }}</span></div>
      </div>
    </div>

    <div class="grid c3" style="margin-top:16px">
      <router-link to="/abonnements" class="card link-card">
        <h3>Abonnements &amp; charges fixes</h3>
        <div class="kpi"><span class="value">{{ eur(d.recurring.monthly) }}<small class="muted" style="font-size:13px;font-weight:400"> / mois</small></span>
          <span class="hint">{{ d.recurring.count }} prélèvement(s) · {{ eur0(d.recurring.annual) }} par an</span></div>
        <div v-for="i in d.recurring.increases" :key="i.label" class="tag neg" style="margin-top:8px">▲ {{ i.label }} +{{ pct(i.pct, 0) }}</div>
      </router-link>
      <router-link to="/enveloppes" class="card link-card">
        <h3>Livrets &amp; PEA</h3>
        <div class="kpi"><span class="value">{{ eur0(d.envelopes.balance) }}</span><span class="hint">intérêts estimés cette année : {{ eur(d.envelopes.estimateThisYear) }} · place restante {{ eur0(d.envelopes.room) }}</span></div>
        <div v-if="d.envelopes.missed > 0" class="tag warn" style="margin-top:8px">+{{ eur(d.envelopes.missed) }} / an possibles</div>
      </router-link>
      <router-link to="/objectifs" class="card link-card">
        <h3>Objectifs</h3>
        <div v-for="g in d.goals.slice(0, 3)" :key="g.id" style="margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;font-size:13px"><span>{{ g.name }}</span><span class="muted">{{ eur0(g.current) }} / {{ eur0(g.target) }}</span></div>
          <div class="progress"><span :class="g.status === 'Atteint' ? 'done' : g.status === 'En retard' ? 'late' : ''" :style="{ width: Math.max(1, g.progress * 100) + '%' }"></span></div>
        </div>
        <div v-if="!d.goals.length" class="help">Aucun objectif : fixe-toi un montant et une date.</div>
      </router-link>
    </div>

    <div class="card" style="margin-top:16px">
      <h3>Points d'attention</h3>
      <ul class="alerts"><li v-for="a in d.alerts" :key="a.text" :class="a.level">{{ a.level === "ok" ? "✓" : "⚠" }} {{ a.text }}</li></ul>
    </div>

    <div class="grid c2" style="margin-top:16px">
      <div class="card"><h3>Évolution du patrimoine</h3><Chart :config="nwChart" /></div>
      <div class="card"><h3>Répartition actuelle</h3><Chart :config="classChart" /></div>
      <div class="card"><h3>Revenus vs dépenses</h3><Chart :config="budgetChart" /></div>
      <div class="card"><h3>Taux d'épargne mensuel</h3><Chart :config="rateChart" /></div>
    </div>
  </div>
</template>
