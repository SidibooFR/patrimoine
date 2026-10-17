<script setup lang="ts">
import { computed } from "vue";
import { eur0, pct } from "../../lib/format";
import Chart from "../../components/Chart.vue";
import type { ChartConfiguration } from "chart.js";
import { PALETTE } from "../../lib/charts";
import type { PortfolioReport } from "../../../core/reports";

const props = defineProps<{ pf: PortfolioReport }>();

const weightChart = computed<ChartConfiguration<"doughnut">>(() => {
  const pos = props.pf.positions.filter((p) => p.value > 0).sort((a, b) => b.value - a.value);
  const top = pos.slice(0, 8); const rest = pos.slice(8).reduce((s, p) => s + p.value, 0);
  const labels = [...top.map((p) => p.name), ...(rest ? ["Autres"] : [])];
  return { type: "doughnut", data: { labels, datasets: [{ data: [...top.map((p) => p.value), ...(rest ? [rest] : [])], backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]) }] },
    options: { plugins: { legend: { position: "right" }, tooltip: { callbacks: { label: (c) => `${c.label} : ${eur0(c.parsed)}` } } }, cutout: "60%" } };
});
const byClass = computed(() => {
  const m = new Map<string, number>();
  for (const p of props.pf.positions) m.set(p.asset_class, (m.get(p.asset_class) ?? 0) + p.value);
  return [...m.entries()];
});
</script>

<template>
  <div class="card">
    <h3>Répartition</h3>
    <Chart :config="weightChart" :height="220" />
    <table class="mt-1"><tbody><tr v-for="[c, v] in byClass" :key="c"><td>{{ c }}</td><td class="num">{{ eur0(v) }}</td><td class="num muted">{{ pct(pf.totals.value ? v / pf.totals.value : null) }}</td></tr></tbody></table>
  </div>
</template>
