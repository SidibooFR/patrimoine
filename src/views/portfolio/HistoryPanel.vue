<script setup lang="ts">
import { computed } from "vue";
import { eur0, pct, date, sign } from "../../lib/format";
import { theme, rgba } from "../../lib/appearance";
import Chart from "../../components/Chart.vue";
import type { ChartConfiguration } from "chart.js";
import { PALETTE, eurTick, eurTip } from "../../lib/charts";
import type { PortfolioHistory } from "../../../core/history";

const props = defineProps<{ hist: PortfolioHistory }>();

const histChart = computed<ChartConfiguration<"line">>(() => {
  const pts = props.hist.points;
  return {
    type: "line",
    data: {
      labels: pts.map((p) => new Date(p.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" })),
      datasets: [
        { label: "Valeur", data: pts.map((p) => p.value), borderColor: theme.accent, backgroundColor: rgba(theme.accent, .10), fill: true, tension: .2, pointRadius: 0, borderWidth: 2 },
        { label: "Montant investi", data: pts.map((p) => p.invested), borderColor: PALETTE[6], borderDash: [5, 4], pointRadius: 0, borderWidth: 1.5, stepped: true },
      ],
    },
    options: { interaction: { mode: "index", intersect: false }, plugins: { tooltip: { callbacks: { label: eurTip } } }, scales: { y: { ticks: { callback: eurTick } }, x: { ticks: { maxTicksLimit: 8 } } } },
  };
});
</script>

<template>
  <div class="card">
    <div class="card-title"><h2>Évolution depuis le {{ date(hist.start) }}</h2>
      <span class="help">{{ hist.historyPoints }} cours historiques · {{ pct(hist.coverage, 0) }} de la valeur sur cours réels</span></div>
    <Chart :config="histChart" :height="400" />
  </div>
  <div class="card">
    <h3>Performance par période</h3>
    <table>
      <thead><tr><th>Période</th><th class="num">Perf.</th><th class="num">Gain</th></tr></thead>
      <tbody>
        <tr v-for="p in hist.periods" :key="p.label">
          <td>{{ p.label }}<div v-if="p.annualized !== null" class="help">soit {{ pct(p.annualized) }} / an</div></td>
          <td class="num" :class="p.reliable ? sign(p.twr) : 'muted'" :title="p.reason ?? ''">{{ p.twr === null ? "–" : pct(p.twr) }}<span v-if="!p.reliable && p.twr !== null"> *</span></td>
          <td class="num" :class="sign(p.gain)">{{ p.gain === null ? "–" : eur0(p.gain) }}</td>
        </tr>
      </tbody>
    </table>
    <p class="help mt-1">Performance pondérée par le temps : elle mesure tes placements sans être faussée par le moment de tes versements.</p>
    <p v-if="hist.periods.some((p) => !p.reliable && p.reason?.includes('historique'))" class="note warn" style="margin:8px 0 0;font-size:12px">Cours historiques manquants : clique sur « Historique des cours » pour des performances par période exactes.<span v-if="hist.periods.some((p) => p.twr !== null && !p.reliable)"> * estimation.</span></p>
    <p v-if="hist.approximateOps" class="note" style="margin:8px 0 0;font-size:12px">{{ hist.approximateOps }} achat(s) à date approximative : la performance de ces positions avant cette date est comptée le jour de l'achat. Corrige les dates (double-clic sur l'opération) pour un TRI juste.</p>
  </div>
</template>
