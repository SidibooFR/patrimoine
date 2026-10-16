<script setup lang="ts">
import { onMounted, ref, watch, computed } from "vue";
import { api } from "../api";
import { eur0, pct, sign } from "../format";
import { guard } from "../toast";
import type { BudgetReport } from "../../core/reports";

const year = ref(new Date().getFullYear());
const b = ref<BudgetReport>();
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

async function load() { b.value = await guard(() => api.budget(year.value)); }
onMounted(load);
watch(year, load);

async function setBudget(row: any, v: string) {
  const n = v.trim() === "" ? null : Number(v);
  await guard(() => api.setBudget(row.category_id, year.value, n));
  await load();
}
const groups = computed(() => {
  if (!b.value) return [];
  return ["Revenu", "Dépense", "Épargne"].map((k) => ({ kind: k, rows: b.value!.rows.filter((r) => r.kind === k && (r.total !== 0 || r.budget !== null)) }));
});
const hiddenCount = computed(() => b.value ? b.value.rows.filter((r) => r.kind !== "Transfert" && r.total === 0 && r.budget === null).length : 0);
const showAll = ref(false);
const groupsShown = computed(() => showAll.value && b.value ? ["Revenu", "Dépense", "Épargne"].map((k) => ({ kind: k, rows: b.value!.rows.filter((r) => r.kind === k) })) : groups.value);
const curMonth = new Date().getMonth();
</script>

<template>
  <div class="page-head">
    <div><h1>Budget {{ year }}</h1><p class="sub">Réel par catégorie et par mois, calculé depuis les relevés. Saisis un budget mensuel prévu dans la colonne jaune pour suivre l'écart.</p></div>
    <div class="actions"><button @click="year--">‹ {{ year - 1 }}</button><button @click="year++">{{ year + 1 }} ›</button><button @click="showAll = !showAll">{{ showAll ? "Masquer les catégories vides" : `Afficher tout (${hiddenCount} vides)` }}</button></div>
  </div>

  <div v-if="b" class="grid c4" style="margin-bottom:16px">
    <div class="card kpi"><span class="label">Revenus {{ year }}</span><span class="value pos">{{ eur0(b.yearTotals.income) }}</span></div>
    <div class="card kpi"><span class="label">Dépenses {{ year }}</span><span class="value neg">{{ eur0(b.yearTotals.expense) }}</span><span class="hint">{{ eur0(b.yearTotals.avgExpense) }} / mois en moyenne</span></div>
    <div class="card kpi"><span class="label">Reste (revenus − dépenses)</span><span class="value" :class="sign(b.yearTotals.remaining)">{{ eur0(b.yearTotals.remaining) }}</span></div>
    <div class="card kpi"><span class="label">Taux d'épargne {{ year }}</span><span class="value" :class="sign(b.yearTotals.rate)">{{ pct(b.yearTotals.rate) }}</span><span v-if="b.uncategorized" class="hint warn">{{ b.uncategorized }} opération(s) sans catégorie non comptées</span></div>
  </div>

  <div v-if="b" class="card pad0">
    <div class="table-wrap">
      <table>
        <thead><tr><th>Catégorie</th><th class="num" style="background:var(--edit)">Budget / mois</th><th v-for="(m, i) in MONTHS" :key="m" class="num" :style="i === curMonth && year === new Date().getFullYear() ? 'color:var(--accent)' : ''">{{ m }}</th><th class="num">Total</th><th class="num">Moy. / mois</th><th class="num">Écart</th></tr></thead>
        <tbody>
          <template v-for="g in groupsShown" :key="g.kind">
            <tr><td colspan="17" style="background:var(--surface-2);font-weight:500;color:var(--text)">{{ g.kind === "Revenu" ? "Revenus" : g.kind === "Dépense" ? "Dépenses" : "Épargne & investissements placés" }}</td></tr>
            <tr v-for="r in g.rows" :key="r.category_id">
              <td>{{ r.name }} <span v-if="r.refunded" class="tag ok" :title="`Remboursements rapprochés : ${eur0(r.refunded)} sur l'année (onglet Remboursements)`">↺ {{ eur0(r.refunded) }}</span></td>
              <td class="num"><input class="cell" type="number" step="10" :value="r.budget ?? ''" placeholder="–" @change="setBudget(r, ($event.target as HTMLInputElement).value)" /></td>
              <td v-for="(v, i) in r.months" :key="i" class="num" :class="{ muted: v === 0 }">{{ v === 0 ? "–" : eur0(v) }}</td>
              <td class="num"><b>{{ eur0(r.total) }}</b></td><td class="num">{{ eur0(r.average) }}</td>
              <td class="num" :class="sign(r.gap)">{{ r.gap === null ? "–" : eur0(r.gap) }}</td>
            </tr>
          </template>
          <tr class="total"><td>Total revenus</td><td></td><td v-for="(v, i) in b.totals.income" :key="i" class="num pos">{{ eur0(v) }}</td><td class="num">{{ eur0(b.yearTotals.income) }}</td><td class="num">{{ eur0(b.yearTotals.income / b.monthsWithData) }}</td><td></td></tr>
          <tr class="total"><td>Total dépenses</td><td></td><td v-for="(v, i) in b.totals.expense" :key="i" class="num neg">{{ eur0(v) }}</td><td class="num">{{ eur0(b.yearTotals.expense) }}</td><td class="num">{{ eur0(b.yearTotals.avgExpense) }}</td><td></td></tr>
          <tr class="total"><td>Épargne placée</td><td></td><td v-for="(v, i) in b.totals.savings" :key="i" class="num">{{ eur0(v) }}</td><td class="num">{{ eur0(b.yearTotals.savings) }}</td><td></td><td></td></tr>
          <tr class="total"><td>Reste</td><td></td><td v-for="(v, i) in b.totals.remaining" :key="i" class="num" :class="sign(v)">{{ eur0(v) }}</td><td class="num" :class="sign(b.yearTotals.remaining)">{{ eur0(b.yearTotals.remaining) }}</td><td></td><td></td></tr>
          <tr class="total"><td>Taux d'épargne</td><td></td><td v-for="(v, i) in b.totals.rate" :key="i" class="num" :class="sign(v)">{{ pct(v, 0) }}</td><td class="num" :class="sign(b.yearTotals.rate)">{{ pct(b.yearTotals.rate) }}</td><td></td><td></td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
