<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { api } from "../lib/api";
import { eur, eur0, date } from "../lib/format";
import { guard } from "../lib/toast";
import type { EnvelopesReport, EnvelopeRow, EnvelopeKindInfo } from "../../core/envelopes";
import KpiCard from "../components/KpiCard.vue";
import PageHeader from "../components/PageHeader.vue";
import MovesCard from "./envelopes/MovesCard.vue";
import EnvelopeCard from "./envelopes/EnvelopeCard.vue";
import EnvelopeModal from "./envelopes/EnvelopeModal.vue";

const rep = ref<EnvelopesReport>();
const accounts = ref<any[]>([]);
const kinds = ref<EnvelopeKindInfo[]>([]);
const ratesAsOf = ref("");

async function load() {
  const [r, a, m] = await Promise.all([api.envelopes(), api.listAccounts(), api.meta()]);
  rep.value = r; accounts.value = a; kinds.value = m.envelopeKinds; ratesAsOf.value = m.ratesAsOf;
}
onMounted(load);

const kindOf = (k: string) => kinds.value.find((x) => x.name === k);

// Édition
const modal = ref<any>(null);
const freeAccounts = computed(() => accounts.value.filter((a) => !rep.value?.rows.some((r) => r.account_id === a.id) || a.id === modal.value?.account_id));
function openNew() {
  const a = freeAccounts.value.find((x) => x.type === "Livret" || x.type === "PEA") ?? freeAccounts.value[0];
  modal.value = { account_id: a?.id ?? "", kind: a?.type === "PEA" ? "PEA" : "Livret A", ceiling: "", ratePct: "", opened_on: "", initial_deposits: 0, monthly_deposit: 0, note: "" };
}
function openEdit(r: EnvelopeRow) {
  modal.value = { id: r.id, account_id: r.account_id, kind: r.kind, ceiling: r.ceiling !== kindOf(r.kind)?.ceiling ? r.ceiling ?? "" : "", ratePct: r.rateSource === "personnalisé" ? +(r.rate! * 100).toFixed(3) : "", opened_on: r.opened_on ?? "", initial_deposits: r.initial_deposits, monthly_deposit: r.monthly_deposit, note: r.note };
}
async function remove() {
  if (!window.confirm("Retirer cette enveloppe ? Le compte et ses opérations sont conservés.")) return;
  await guard(() => api.deleteEnvelope(modal.value.id), "Enveloppe retirée");
  modal.value = null; await load();
}
</script>

<template>
  <PageHeader title="Livrets & PEA" :sub="`Plafonds, intérêts perçus et estimés, et où mettre ton épargne pour qu'elle rapporte le plus. Taux officiels au ${date(ratesAsOf)}.`">
    <button class="primary" @click="openNew">+ Enveloppe</button>
  </PageHeader>

  <template v-if="rep">
    <div class="grid c4 mb-3">
      <KpiCard label="Épargne sur livrets" :value="eur(rep.totals.balance)" :hint="`${rep.rows.length} enveloppe(s) suivie(s)`" card />
      <KpiCard label="Place restante (livrets plafonnés)" :value="eur0(rep.totals.room)" card />
      <KpiCard :label="`Intérêts estimés ${rep.year}`" :value="eur(rep.totals.estimateThisYear)" :hint="`dont déjà perçus : ${eur(rep.totals.interestThisYear)}`" tone="pos" card />
      <KpiCard label="Gain possible par an" :value="rep.missed > 0 ? '+' + eur(rep.missed) : '–'" hint="en appliquant les transferts conseillés" :tone="rep.missed > 0 ? 'warn' : 'pos'" card />
    </div>

    <MovesCard :moves="rep.moves" />

    <div class="grid c2">
      <EnvelopeCard v-for="r in rep.rows" :key="r.id" :row="r" :year="rep.year" @edit="openEdit(r)" />
    </div>
    <div v-if="!rep.rows.length" class="card empty">Aucune enveloppe. Ajoute ton LEP, ton Livret A ou ton PEA pour suivre leurs plafonds et leurs intérêts.</div>

    <div v-if="!rep.hasPea" class="note mt-3">
      Tu n'as pas de PEA déclaré. Ouvrir un PEA, même avec un petit versement, lance son compteur de 5 ans : après cette durée, les gains des ETF éligibles ne paient que les prélèvements sociaux, contre la flat tax sur un compte-titres. Une fois ouvert, ajoute un compte de type PEA dans Paramètres, puis déclare-le ici.
    </div>
    <p class="help mt-2">Intérêts des livrets réglementés estimés selon la règle des quinzaines (un versement compte à partir du 1er ou du 16 suivant, un retrait cesse de compter dès le début de sa quinzaine) aux taux officiels successifs, en supposant le solde constant jusqu'au 31 décembre, versement programmé compris. Les intérêts des livrets sont versés en fin d'année ; ceux d'un compte rémunéré au fil de l'eau.</p>
  </template>

  <EnvelopeModal v-if="modal" :envelope="modal" :accounts="accounts" :kinds="kinds" @close="modal = null" @saved="modal = null; load()" @remove="remove" />
</template>
