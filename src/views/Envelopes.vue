<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { api } from "../api";
import { eur, eur0, pct, date, cur } from "../format";
import { guard } from "../toast";
import Modal from "../components/Modal.vue";
import type { EnvelopesReport, EnvelopeRow } from "../../core/envelopes";

const rep = ref<EnvelopesReport>();
const accounts = ref<any[]>([]);
const kinds = ref<{ name: string; ceiling: number | null; ceilingOn: string | null; rate: number | null; help: string }[]>([]);
const ratesAsOf = ref("");

async function load() {
  const [r, a, m] = await Promise.all([api.envelopes(), api.listAccounts(), api.meta()]);
  rep.value = r; accounts.value = a; kinds.value = m.envelopeKinds; ratesAsOf.value = m.ratesAsOf;
}
onMounted(load);

const kindOf = (k: string) => kinds.value.find((x) => x.name === k);
const RATE_SRC: Record<string, string> = { officiel: "taux officiel", personnalisé: "taux saisi", constaté: "taux net constaté sur tes intérêts" };

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
async function save() {
  const m = modal.value;
  const ok = await guard(() => api.saveEnvelope({
    id: m.id, account_id: Number(m.account_id), kind: m.kind,
    ceiling: m.ceiling === "" || m.ceiling === null ? null : Number(m.ceiling),
    rate: m.ratePct === "" || m.ratePct === null ? null : Number(m.ratePct) / 100,
    opened_on: m.opened_on || null, initial_deposits: Number(m.initial_deposits) || 0, monthly_deposit: Number(m.monthly_deposit) || 0, note: m.note,
  }), "Enveloppe enregistrée");
  if (ok !== undefined) { modal.value = null; await load(); }
}
async function remove() {
  if (!window.confirm("Retirer cette enveloppe ? Le compte et ses opérations sont conservés.")) return;
  await guard(() => api.deleteEnvelope(modal.value.id), "Enveloppe retirée");
  modal.value = null; await load();
}
const modalKind = computed(() => (modal.value ? kindOf(modal.value.kind) : undefined));
const threshold = 0.5;
</script>

<template>
  <div class="page-head">
    <div><h1>Livrets &amp; PEA</h1><p class="sub">Plafonds, intérêts perçus et estimés, et où mettre ton épargne pour qu'elle rapporte le plus. Taux officiels au {{ date(ratesAsOf) }}.</p></div>
    <div class="actions"><button class="primary" @click="openNew">+ Enveloppe</button></div>
  </div>

  <template v-if="rep">
    <div class="grid c4" style="margin-bottom:16px">
      <div class="card kpi"><span class="label">Épargne sur livrets</span><span class="value">{{ eur(rep.totals.balance) }}</span><span class="hint">{{ rep.rows.length }} enveloppe(s) suivie(s)</span></div>
      <div class="card kpi"><span class="label">Place restante (livrets plafonnés)</span><span class="value">{{ eur0(rep.totals.room) }}</span></div>
      <div class="card kpi"><span class="label">Intérêts estimés {{ rep.year }}</span><span class="value pos">{{ eur(rep.totals.estimateThisYear) }}</span><span class="hint">dont déjà perçus : {{ eur(rep.totals.interestThisYear) }}</span></div>
      <div class="card kpi"><span class="label">Gain possible par an</span><span class="value" :class="rep.missed > 0 ? 'warn' : 'pos'">{{ rep.missed > 0 ? "+" + eur(rep.missed) : "–" }}</span><span class="hint">en appliquant les transferts conseillés</span></div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <h2>Transferts conseillés</h2>
      <div v-if="rep.moves.length" class="grid" style="gap:8px">
        <div v-for="m in rep.moves" :key="m.from_account_id + '-' + m.to_account_id" class="move">
          <span style="font-size:18px">→</span>
          <span>Transférer <b>{{ eur0(m.amount) }}</b> de <b>{{ m.from }}</b> ({{ pct(m.fromRate, 2) }} net) vers <b>{{ m.to }}</b> ({{ pct(m.toRate, 2) }} net)</span>
          <span style="margin-left:auto;font-weight:700;white-space:nowrap">+{{ eur(m.gainPerYear) }} / an</span>
        </div>
        <p class="help" style="margin:4px 0 0">Les livrets réglementés sont disponibles à tout moment et exonérés d'impôt : y placer ton épargne de précaution ne la bloque pas. Sur les comptes courants, l'application garde un mois de dépenses de côté.</p>
      </div>
      <div v-else class="note ok">Rien à optimiser : ton épargne est déjà sur les supports les mieux rémunérés disponibles.</div>
    </div>

    <div class="grid c2">
      <div v-for="r in rep.rows" :key="r.id" class="card env-card">
        <div class="head">
          <div><span class="tag">{{ r.kind }}</span><h2 style="margin-top:6px">{{ r.account }}</h2></div>
          <button class="small" @click="openEdit(r)">✎ Modifier</button>
        </div>

        <template v-if="r.ceiling !== null">
          <div>
            <div class="gauge" :class="{ low: r.ceilingOn === 'balance' && (r.fill ?? 0) < threshold }"><span :style="{ width: Math.max(1.5, (r.fill ?? 0) * 100) + '%' }"></span></div>
            <div class="gauge-legend">
              <span>{{ r.ceilingOn === "deposits" ? "Versements" : "Solde" }} : <b>{{ eur(r.used) }}</b> sur {{ eur0(r.ceiling) }} ({{ pct(r.fill, 0) }})</span>
              <span>reste <b>{{ eur0(r.room) }}</b></span>
            </div>
          </div>
        </template>
        <div v-else class="help">Pas de plafond · solde <b>{{ eur(r.balance) }}</b></div>

        <div class="stat-row">
          <div class="kpi"><span class="label">Taux net</span><span class="value">{{ r.rate === null ? "–" : pct(r.rate, 2) }}</span><span class="hint">{{ r.rateSource ? RATE_SRC[r.rateSource] : r.ceilingOn === "deposits" ? "selon les placements" : "à renseigner" }}</span></div>
          <div class="kpi"><span class="label">Intérêts perçus {{ rep.year }}</span><span class="value">{{ eur(r.interestThisYear) }}</span><span class="hint">{{ rep.year - 1 }} : {{ eur(r.interestLastYear) }}</span></div>
          <div class="kpi"><span class="label">Estimés {{ rep.year }}</span><span class="value pos">{{ r.estimateThisYear === null ? "–" : eur(r.estimateThisYear) }}</span>
            <span class="hint" v-if="r.estimateAtCeiling !== null">au plafond : {{ eur0(r.estimateAtCeiling) }} / an</span></div>
        </div>
        <p v-if="r.fiveYears" class="note" style="margin:0">Ancienneté fiscale : 5 ans le <b>{{ date(r.fiveYears) }}</b>. Après cette date, les gains ne sont plus soumis à l'impôt sur le revenu (prélèvements sociaux seuls).</p>
        <p class="help" style="margin:0">{{ r.help }}<span v-if="r.balanceSource"> Solde au {{ date(r.balanceDate) }} ({{ r.balanceSource }}).</span><span v-if="r.monthly_deposit"> Versement programmé : {{ eur(r.monthly_deposit) }} / mois.</span></p>
      </div>
    </div>
    <div v-if="!rep.rows.length" class="card empty">Aucune enveloppe. Ajoute ton LEP, ton Livret A ou ton PEA pour suivre leurs plafonds et leurs intérêts.</div>

    <div v-if="!rep.hasPea" class="note" style="margin-top:16px">
      Tu n'as pas de PEA déclaré. Ouvrir un PEA, même avec un petit versement, lance son compteur de 5 ans : après cette durée, les gains des ETF éligibles ne paient que les prélèvements sociaux, contre la flat tax sur un compte-titres. Une fois ouvert, ajoute un compte de type PEA dans Paramètres, puis déclare-le ici.
    </div>
    <p class="help" style="margin-top:12px">Intérêts des livrets réglementés estimés selon la règle des quinzaines (un versement compte à partir du 1er ou du 16 suivant, un retrait cesse de compter dès le début de sa quinzaine) aux taux officiels successifs, en supposant le solde constant jusqu'au 31 décembre, versement programmé compris. Les intérêts des livrets sont versés en fin d'année ; ceux d'un compte rémunéré au fil de l'eau.</p>
  </template>

  <Modal v-if="modal" :title="modal.id ? 'Modifier l\'enveloppe' : 'Nouvelle enveloppe'" @close="modal = null">
    <div class="form">
      <label class="field">Compte<select v-model="modal.account_id"><option v-for="a in freeAccounts" :key="a.id" :value="a.id">{{ a.name }}</option></select></label>
      <label class="field">Type<select v-model="modal.kind"><option v-for="k in kinds" :key="k.name">{{ k.name }}</option></select></label>
      <label class="field">Plafond ({{ cur() }})<input v-model="modal.ceiling" type="number" step="any" :placeholder="modalKind?.ceiling ? 'officiel : ' + modalKind.ceiling.toLocaleString('fr-FR') : 'aucun'" /></label>
      <label class="field">Taux annuel net (%)<input v-model="modal.ratePct" type="number" step="0.01" :placeholder="modalKind?.rate !== null && modalKind?.rate !== undefined ? 'officiel : ' + (modalKind.rate * 100).toLocaleString('fr-FR') : 'constaté si vide'" /></label>
      <label class="field">Versement programmé ({{ cur() }} / mois)<input v-model="modal.monthly_deposit" type="number" step="any" /></label>
      <label class="field">Date d'ouverture<input v-model="modal.opened_on" type="date" /></label>
      <label v-if="modalKind?.ceilingOn === 'deposits'" class="field">Versements antérieurs aux relevés ({{ cur() }})<input v-model="modal.initial_deposits" type="number" step="any" /></label>
      <label class="field full">Note<input v-model="modal.note" /></label>
    </div>
    <p class="help">{{ modalKind?.help }} Laisse plafond et taux vides pour suivre automatiquement les valeurs officielles (et leurs changements au 1er février et au 1er août).</p>
    <template #foot>
      <button v-if="modal.id" class="danger" style="margin-right:auto" @click="remove">Retirer</button>
      <button @click="modal = null">Annuler</button><button class="primary" :disabled="!modal.account_id" @click="save">Enregistrer</button>
    </template>
  </Modal>
</template>
