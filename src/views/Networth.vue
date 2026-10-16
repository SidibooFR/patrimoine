<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { api } from "../lib/api";
import { eur0, pct, sign, month, thisMonth, date } from "../lib/format";
import { guard, notify } from "../lib/toast";
import Chart from "../components/Chart.vue";
import { CLASS_COLORS, eurTick, eurTip } from "../lib/charts";

const nw = ref<Awaited<ReturnType<typeof api.networth>>>();
const suggested = ref<Record<number, { balance: number; date: string }>>({});
const editMonth = ref(thisMonth());
const draft = ref<Record<number, string>>({});

async function load() {
  nw.value = await guard(() => api.networth());
  suggested.value = await api.suggestedBalances();
  fillDraft();
}
function fillDraft() {
  const row = nw.value?.rows.find((r) => r.month.startsWith(editMonth.value));
  draft.value = {};
  for (const a of nw.value?.accounts ?? []) draft.value[a.id] = row?.balances[a.id] == null ? "" : String(row.balances[a.id]);
}
onMounted(load);

async function save() {
  const balances: Record<string, number | null> = {};
  for (const [id, v] of Object.entries(draft.value)) balances[id] = v.trim() === "" ? null : Number(String(v).replace(",", "."));
  await guard(() => api.setSnapshotMonth(editMonth.value, balances), `Relevé de ${month(editMonth.value)} enregistré`);
  await load();
}
function useSuggested() {
  let n = 0;
  for (const [id, s] of Object.entries(suggested.value)) { draft.value[Number(id)] = String(s.balance); n++; }
  notify(`${n} solde(s) repris des relevés importés`);
}
function copyPrevious() {
  const prev = [...(nw.value?.rows ?? [])].filter((r) => r.total !== null && r.month < editMonth.value + "-01").pop();
  if (!prev) return notify("Aucun relevé précédent", true);
  for (const a of nw.value!.accounts) draft.value[a.id] = prev.balances[a.id] == null ? "" : String(prev.balances[a.id]);
}
const draftTotal = computed(() => Object.values(draft.value).reduce((s, v) => s + (Number(String(v).replace(",", ".")) || 0), 0));
const rowsDesc = computed(() => [...(nw.value?.rows ?? [])].reverse());
const classes = computed(() => Object.keys(nw.value?.rows[0]?.byClass ?? {}));

const chart = computed<any>(() => ({
  type: "bar",
  data: { labels: nw.value!.rows.map((r) => month(r.month)),
    datasets: classes.value.map((c) => ({ label: c, data: nw.value!.rows.map((r) => (r.total === null ? null : r.byClass[c])), backgroundColor: CLASS_COLORS[c] ?? "#999", stack: "a" })) },
  options: { plugins: { tooltip: { callbacks: { label: eurTip } } }, scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: eurTick } } } },
}));
</script>

<template>
  <div class="page-head">
    <div><h1>Patrimoine</h1><p class="sub">Une fois par mois, enregistre le solde de chaque compte. C'est ce relevé qui alimente l'évolution, la répartition et l'allocation.</p></div>
  </div>

  <div v-if="nw" class="grid" style="grid-template-columns: 380px 1fr">
    <div class="card">
      <div class="card-title"><h2 style="margin:0">Relevé du mois</h2><input v-model="editMonth" type="month" @change="fillDraft" /></div>
      <table>
        <tbody>
          <tr v-for="a in nw.accounts" :key="a.id">
            <td><div>{{ a.name }}</div><div class="help" v-if="suggested[a.id]">Relevés : {{ eur0(suggested[a.id].balance) }} au {{ date(suggested[a.id].date) }}</div></td>
            <td class="num" style="width:130px"><input v-model="draft[a.id]" class="cell" type="text" inputmode="decimal" placeholder="–" /></td>
          </tr>
          <tr class="total"><td>Total</td><td class="num">{{ eur0(draftTotal) }}</td></tr>
        </tbody>
      </table>
      <div class="toolbar" style="margin-top:12px">
        <button class="primary" @click="save">Enregistrer</button>
        <button @click="useSuggested" title="Reprend le dernier solde connu de chaque compte importé">Soldes des relevés</button>
        <button @click="copyPrevious">Copier le mois précédent</button>
      </div>
      <p class="help">Les comptes d'investissement (crypto, actions) ne sont pas dans les exports : reprends la valeur affichée par l'application de ton courtier.</p>
    </div>
    <div class="card"><h3>Répartition par classe d'actif</h3><Chart :config="chart" :height="360" /></div>
  </div>

  <div v-if="nw" class="card pad0" style="margin-top:16px">
    <div class="table-wrap">
      <table>
        <thead><tr><th>Mois</th><th v-for="a in nw.accounts" :key="a.id" class="num">{{ a.name }}</th><th class="num">Total</th><th class="num">Variation</th><th class="num">%</th><th v-for="c in classes" :key="c" class="num">{{ c }}</th></tr></thead>
        <tbody>
          <tr v-for="r in rowsDesc" :key="r.month" :class="{ muted: r.total === null }">
            <td>{{ month(r.month) }}</td>
            <td v-for="a in nw.accounts" :key="a.id" class="num">{{ r.balances[a.id] == null ? "–" : eur0(r.balances[a.id]) }}</td>
            <td class="num"><b>{{ eur0(r.total) }}</b></td>
            <td class="num" :class="sign(r.variation)">{{ eur0(r.variation) }}</td>
            <td class="num" :class="sign(r.variationPct)">{{ pct(r.variationPct) }}</td>
            <td v-for="c in classes" :key="c" class="num">{{ r.total === null ? "–" : eur0(r.byClass[c]) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
