<script setup lang="ts">
import { eur, eur0, pct, date } from "../../lib/format";
import type { EnvelopeRow } from "../../../core/envelopes";
import KpiCard from "../../components/KpiCard.vue";

defineProps<{ row: EnvelopeRow; year: number }>();
defineEmits<{ edit: [] }>();

const RATE_SRC: Record<string, string> = { officiel: "taux officiel", personnalisé: "taux saisi", constaté: "taux net constaté sur tes intérêts" };
const threshold = 0.5;
</script>

<template>
  <div class="card env-card">
    <div class="head">
      <div><span class="tag">{{ row.kind }}</span><h2 style="margin-top:6px">{{ row.account }}</h2></div>
      <button class="small" @click="$emit('edit')">✎ Modifier</button>
    </div>

    <template v-if="row.ceiling !== null">
      <div>
        <div class="gauge" :class="{ low: row.ceilingOn === 'balance' && (row.fill ?? 0) < threshold }"><span :style="{ width: Math.max(1.5, (row.fill ?? 0) * 100) + '%' }"></span></div>
        <div class="gauge-legend">
          <span>{{ row.ceilingOn === "deposits" ? "Versements" : "Solde" }} : <b>{{ eur(row.used) }}</b> sur {{ eur0(row.ceiling) }} ({{ pct(row.fill, 0) }})</span>
          <span>reste <b>{{ eur0(row.room) }}</b></span>
        </div>
      </div>
    </template>
    <div v-else class="help">Pas de plafond · solde <b>{{ eur(row.balance) }}</b></div>

    <div class="stat-row">
      <KpiCard label="Taux net" :value="row.rate === null ? '–' : pct(row.rate, 2)" :hint="row.rateSource ? RATE_SRC[row.rateSource] : row.ceilingOn === 'deposits' ? 'selon les placements' : 'à renseigner'" />
      <KpiCard :label="`Intérêts perçus ${year}`" :value="eur(row.interestThisYear)" :hint="`${year - 1} : ${eur(row.interestLastYear)}`" />
      <KpiCard :label="`Estimés ${year}`" :value="row.estimateThisYear === null ? '–' : eur(row.estimateThisYear)" :hint="row.estimateAtCeiling !== null ? `au plafond : ${eur0(row.estimateAtCeiling)} / an` : undefined" tone="pos" />
    </div>
    <p v-if="row.fiveYears" class="note m0">Ancienneté fiscale : 5 ans le <b>{{ date(row.fiveYears) }}</b>. Après cette date, les gains ne sont plus soumis à l'impôt sur le revenu (prélèvements sociaux seuls).</p>
    <p class="help m0">{{ row.help }}<span v-if="row.balanceSource"> Solde au {{ date(row.balanceDate) }} ({{ row.balanceSource }}).</span><span v-if="row.monthly_deposit"> Versement programmé : {{ eur(row.monthly_deposit) }} / mois.</span></p>
  </div>
</template>
