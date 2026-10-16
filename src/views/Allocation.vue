<script setup lang="ts">
import { onMounted, ref, computed, watch } from "vue";
import { api } from "../lib/api";
import { eur0, pct, sign, monthLong, cur } from "../lib/format";
import { theme, rgba } from "../lib/appearance";
import { guard } from "../lib/toast";
import Chart from "../components/Chart.vue";
import { CLASS_COLORS, pctTick } from "../lib/charts";
import type { AllocationReport } from "../../core/reports";
import KpiCard from "../components/KpiCard.vue";

const al = ref<AllocationReport>();
const deposit = ref<number>(400);
let first = true;
async function load() {
  al.value = await guard(() => api.allocation(first ? undefined : deposit.value));
  if (first && al.value) { deposit.value = al.value.nextDeposit; first = false; }
}
onMounted(load);
let t: any;
watch(deposit, () => { clearTimeout(t); t = setTimeout(async () => { await api.setSetting("next_deposit", String(deposit.value)); await load(); }, 300); });

async function setTarget(row: any, v: string) {
  await guard(() => api.setTarget(row.asset_class, Number(v) / 100));
  await load();
}
const chart = computed<any>(() => ({
  type: "bar",
  data: { labels: al.value!.rows.map((r) => r.asset_class), datasets: [
    { label: "Actuel", data: al.value!.rows.map((r) => r.pct ?? 0), backgroundColor: al.value!.rows.map((r) => CLASS_COLORS[r.asset_class] ?? "#999") },
    { label: "Cible", data: al.value!.rows.map((r) => r.target), backgroundColor: rgba(theme.navy, .25), borderColor: theme.navy, borderWidth: 1 }] },
  options: { plugins: { tooltip: { callbacks: { label: (c: any) => `${c.dataset.label} : ${pct(c.parsed.y)}` } } }, scales: { y: { ticks: { callback: pctTick }, max: 1 } } },
}));
const actionClass = (a: string | null) => (a === "Renforcer" ? "warn" : a === "Alléger" ? "" : a === "OK" ? "ok" : "");
</script>

<template>
  <div class="page-head">
    <div><h1>Allocation & rééquilibrage</h1><p class="sub">Répartition réelle (dernier relevé de patrimoine{{ al?.lastMonth ? " : " + monthLong(al.lastMonth) : "" }}) comparée à ta cible. Le prochain versement est orienté vers les classes sous leur cible : tu te rééquilibres sans vendre.</p></div>
  </div>

  <div v-if="al" class="grid" style="grid-template-columns: 1fr 420px">
    <div class="card">
      <table>
        <thead><tr><th>Classe d'actif</th><th class="num">Valeur</th><th class="num">% actuel</th><th class="num" style="background:var(--edit)">% cible</th><th class="num">Écart</th><th class="num">Écart {{ cur() }}</th><th>Action</th></tr></thead>
        <tbody>
          <tr v-for="r in al.rows" :key="r.asset_class">
            <td><span style="display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:8px" :style="{ background: CLASS_COLORS[r.asset_class] }"></span>{{ r.asset_class }}</td>
            <td class="num">{{ eur0(r.value) }}</td><td class="num">{{ pct(r.pct) }}</td>
            <td class="num"><input class="cell" type="number" min="0" max="100" step="1" :value="Math.round(r.target * 1000) / 10" @change="setTarget(r, ($event.target as HTMLInputElement).value)" /></td>
            <td class="num" :class="sign(r.gap)">{{ r.gap === null ? "–" : (r.gap > 0 ? "+" : "") + pct(r.gap) }}</td>
            <td class="num" :class="sign(r.gapEur)">{{ eur0(r.gapEur) }}</td>
            <td><span v-if="r.action" class="tag" :class="actionClass(r.action)">{{ r.action === "Renforcer" ? "▲ Renforcer" : r.action === "Alléger" ? "▼ Alléger" : "✓ OK" }}</span></td>
          </tr>
          <tr class="total"><td>Total</td><td class="num">{{ eur0(al.total) }}</td><td class="num">{{ al.total ? "100 %" : "–" }}</td>
            <td class="num" :class="Math.abs(al.targetSum - 1) > 1e-4 ? 'neg' : ''">{{ pct(al.targetSum, 0) }}</td><td colspan="3"><span v-if="Math.abs(al.targetSum - 1) > 1e-4" class="neg">La cible doit faire 100 %</span></td></tr>
        </tbody>
      </table>
      <p class="help mt-1">Tolérance d'écart : ±{{ pct(al.tolerance, 0) }} (modifiable dans Paramètres).</p>
      <Chart :config="chart" :height="240" />
    </div>

    <div>
      <div class="card">
        <h2>Où placer mon prochain versement ?</h2>
        <label class="field">Montant à placer ce mois-ci ({{ cur() }})<input v-model.number="deposit" type="number" step="50" min="0" /></label>
        <table class="mt-1">
          <thead><tr><th>Classe</th><th class="num">À placer</th></tr></thead>
          <tbody>
            <tr v-for="r in al.rows.filter((x) => x.deposit > 0)" :key="r.asset_class"><td>{{ r.asset_class }}</td><td class="num"><b>{{ eur0(r.deposit) }}</b></td></tr>
            <tr class="total"><td>Total</td><td class="num">{{ eur0(al.rows.reduce((s, r) => s + r.deposit, 0)) }}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="card mt-3">
        <h2>Épargne de précaution</h2>
        <KpiCard label="Disponible (liquidités + épargne sécurisée)" :value="eur0(al.emergency.available)" small />
        <KpiCard class="mt-1" :label="`Objectif : ${al.emergency.months} mois × ${eur0(al.emergency.avgExpense)} de dépenses moyennes`" :value="eur0(al.emergency.goal)" small />
        <div class="progress" style="margin:10px 0 6px"><span :style="{ width: Math.min(100, al.emergency.goal ? (al.emergency.available / al.emergency.goal) * 100 : 0) + '%', background: al.emergency.available >= al.emergency.goal ? 'var(--pos)' : 'var(--warn)' }"></span></div>
        <div :class="al.emergency.available >= al.emergency.goal ? 'pos' : 'warn'"><b>{{ al.emergency.status }}</b> · couverture : {{ al.emergency.coverage === null ? "–" : al.emergency.coverage.toFixed(1) + " mois" }}</div>
      </div>
    </div>
  </div>
</template>
