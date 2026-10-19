<script setup lang="ts">
import { computed } from "vue";
import { eur0, pct } from "../../lib/format";
import ApexChart from "../../components/ApexChart.vue";
import type { ApexOptions } from "apexcharts";
import { PALETTE } from "../../lib/charts";
import type { PortfolioReport } from "../../../core/reports";

const props = defineProps<{ pf: PortfolioReport }>();

const parts = computed(() => {
  const pos = props.pf.positions.filter((p) => p.value > 0).sort((a, b) => b.value - a.value);
  const top = pos.slice(0, 8); const rest = pos.slice(8).reduce((s, p) => s + p.value, 0);
  return [...top.map((p) => [p.name, p.value] as const), ...(rest ? [["Autres", rest] as const] : [])];
});
const series = computed(() => parts.value.map((p) => p[1]));
const options = computed<ApexOptions>(() => ({ labels: parts.value.map((p) => p[0]), colors: parts.value.map((_, i) => PALETTE[i % PALETTE.length]) }));
const byClass = computed(() => {
  const m = new Map<string, number>();
  for (const p of props.pf.positions) m.set(p.asset_class, (m.get(p.asset_class) ?? 0) + p.value);
  return [...m.entries()];
});
</script>

<template>
  <div class="card">
    <h3>Répartition</h3>
    <ApexChart v-if="series.length" type="donut" :series="series" :options="options" :height="220" />
    <table class="mt-1"><tbody><tr v-for="[c, v] in byClass" :key="c"><td>{{ c }}</td><td class="num">{{ eur0(v) }}</td><td class="num muted">{{ pct(pf.totals.value ? v / pf.totals.value : null) }}</td></tr></tbody></table>
  </div>
</template>
