<script setup lang="ts">
import { computed } from "vue";
import { eur0, pct, date, sign } from "../../lib/format";
import { theme } from "../../lib/appearance";
import ApexChart from "../../components/ApexChart.vue";
import type { ApexOptions } from "apexcharts";
import { PALETTE } from "../../lib/charts";
import type { PortfolioHistory } from "../../../core/history";

const props = defineProps<{ hist: PortfolioHistory }>();

const series = computed(() => [
  { name: "Valeur", data: props.hist.points.map((p) => p.value) },
  { name: "Montant investi", data: props.hist.points.map((p) => p.invested) }]);
const options = computed<ApexOptions>(() => ({
  colors: [theme.accent, PALETTE[6]],
  // montant investi : en escalier, pointillés, sans remplissage
  stroke: { curve: ["smooth", "stepline"], width: [2, 1.5], dashArray: [0, 5] },
  fill: { type: ["gradient", "solid"], opacity: [1, 0] },
  xaxis: { categories: props.hist.points.map((p) => new Date(p.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" })), tickAmount: 8 },
}));
</script>

<template>
  <div class="card">
    <div class="card-title"><h2>Évolution depuis le {{ date(hist.start) }}</h2>
      <span class="help">{{ hist.historyPoints }} cours historiques · {{ pct(hist.coverage, 0) }} de la valeur sur cours réels</span></div>
    <ApexChart type="area" zoom :series="series" :options="options" :height="400" />
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
