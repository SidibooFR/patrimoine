<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { api } from "../lib/api";
import { eur0, pct, sign, monthLong, cur } from "../lib/format";
import { guard } from "../lib/toast";
import Modal from "../components/Modal.vue";
import SelectField from "../components/SelectField.vue";
import type { GoalsReport, GoalRow, GoalSource } from "../../core/goals";
import type { Account } from "../../core/schema";
import KpiCard from "../components/KpiCard.vue";
import PageHeader from "../components/PageHeader.vue";

const rep = ref<GoalsReport>();
const accounts = ref<Account[]>([]);
const classes = ref<readonly string[]>([]);
const showArchived = ref(false);
async function load() {
  const [g, a, m] = await Promise.all([api.goals(), api.listAccounts(), api.meta()]);
  rep.value = g; accounts.value = a; classes.value = m.assetClasses;
}
onMounted(load);

const goals = computed(() => (rep.value?.goals ?? []).filter((g) => showArchived.value || !g.archived));
const SOURCES: Record<GoalSource, string> = { manual: "Montant que je saisis", account: "Solde d'un compte", class: "Total d'une classe d'actif", emergency: "Épargne de précaution (liquidités + épargne sécurisée)" };
const STATUS_CLASS: Record<string, string> = { "Atteint": "ok", "En avance": "ok", "Dans les temps": "ok", "En retard": "neg", "À financer": "warn", "Sans échéance": "" };

const inYear = (n: number) => { const d = new Date(); d.setFullYear(d.getFullYear() + n); return d.toISOString().slice(0, 10); };
/** Brouillon du formulaire ("" = champ vide). */
interface GoalDraft {
  id?: number; name: string; source: GoalSource; target: number | ""; target_date: string; account_id: number | "";
  asset_class: string; manual_amount: number; archived?: number;
}
const modal = ref<GoalDraft | null>(null);
function openNew(preset?: "emergency" | "apport" | "voyage") {
  const base: GoalDraft = { name: "", source: "manual", target: "", target_date: inYear(1), account_id: "", asset_class: "Épargne sécurisée", manual_amount: 0 };
  if (preset === "emergency") Object.assign(base, { name: "Épargne de précaution", source: "emergency", target: "" });
  if (preset === "apport") Object.assign(base, { name: "Apport immobilier", source: "class", asset_class: "Épargne sécurisée", target: 20000, target_date: inYear(5) });
  if (preset === "voyage") Object.assign(base, { name: "Voyage", source: "manual", target: 1500, target_date: inYear(1) });
  modal.value = base;
}
function openEdit(g: GoalRow) {
  modal.value = { id: g.id, name: g.name, source: g.source, target: g.targetAuto ? "" : g.target, target_date: g.target_date ?? "", account_id: g.account_id ?? "", asset_class: g.asset_class ?? "Épargne sécurisée", manual_amount: g.manual_amount, archived: g.archived };
}
async function save() {
  const m = modal.value!;
  const ok = await guard(() => api.saveGoal({
    id: m.id, name: m.name, source: m.source, target: m.target === "" ? null : Number(m.target), target_date: m.target_date || null,
    account_id: m.account_id === "" ? null : Number(m.account_id), asset_class: m.asset_class, manual_amount: Number(m.manual_amount) || 0, archived: m.archived ?? 0,
  }), "Objectif enregistré");
  if (ok !== undefined) { modal.value = null; await load(); }
}
async function archive(g: GoalRow) { await guard(() => api.saveGoal({ ...g, archived: g.archived ? 0 : 1, target: g.targetAuto ? null : g.target })); await load(); }
async function remove(g: GoalRow) { if (!window.confirm(`Supprimer l'objectif « ${g.name} » ?`)) return; await guard(() => api.deleteGoal(g.id), "Objectif supprimé"); await load(); }
async function setManual(g: GoalRow, v: string) { await guard(() => api.saveGoal({ ...g, target: g.target, manual_amount: Number(v) || 0 })); await load(); }
const origin = (g: GoalRow) => g.source === "account" ? g.account : g.source === "class" ? `classe « ${g.asset_class} »` : g.source === "emergency" ? "liquidités + épargne sécurisée" : "montant saisi";
</script>

<template>
  <PageHeader title="Objectifs d'épargne" sub="Un montant, une date : l'application calcule le versement mensuel nécessaire et vérifie que ton rythme d'épargne suit.">
    <md-outlined-button @click="openNew('emergency')">+ Épargne de précaution</md-outlined-button><md-outlined-button @click="openNew('apport')">+ Apport</md-outlined-button><md-outlined-button @click="openNew('voyage')">+ Voyage</md-outlined-button>
    <md-filled-button @click="openNew()">+ Objectif</md-filled-button>
  </PageHeader>

  <template v-if="rep">
    <div class="grid c4 mb-3">
      <KpiCard label="Déjà épargné" :value="eur0(rep.totals.current)" :hint="`sur ${eur0(rep.totals.target)} visés`" card />
      <KpiCard label="Reste à épargner" :value="eur0(rep.totals.remaining)" card />
      <KpiCard label="Besoin mensuel total" :value="eur0(rep.totals.monthlyNeeded)" hint="pour tenir toutes les échéances" card />
      <KpiCard label="Ta capacité d'épargne" :value="rep.capacity === null ? '–' : eur0(rep.capacity)" hint="revenus − dépenses, moyenne des mois terminés" :tone="sign(rep.capacity)" card />
    </div>
    <div v-if="rep.margin !== null && rep.totals.monthlyNeeded > 0" class="note mb-3" :class="rep.margin >= 0 ? 'ok' : 'warn'">
      <template v-if="rep.margin >= 0">Tes objectifs demandent {{ eur0(rep.totals.monthlyNeeded) }} par mois et tu épargnes en moyenne {{ eur0(rep.capacity) }} : il reste {{ eur0(rep.margin) }} par mois pour investir.</template>
      <template v-else>Tes objectifs demandent {{ eur0(rep.totals.monthlyNeeded) }} par mois, mais ton épargne moyenne cette année est de {{ eur0(rep.capacity) }} par mois. Il manque {{ eur0(-rep.margin) }} par mois : repousse une échéance, réduis un montant, ou trouve cette somme dans tes charges fixes (onglet Abonnements).</template>
    </div>

    <div class="toolbar"><label class="check help"><md-checkbox :checked="showArchived" @change="showArchived = ($event.target as HTMLInputElement).checked"></md-checkbox>afficher les objectifs archivés</label></div>
    <div class="grid c2">
      <div v-for="g in goals" :key="g.id" class="card goal-card" :class="{ muted: g.archived }">
        <div class="top">
          <h2 class="m0">{{ g.name }}</h2>
          <span class="tag" :class="STATUS_CLASS[g.status]">{{ g.status }}</span>
        </div>
        <div class="top"><span class="amount">{{ eur0(g.current) }}</span><span class="muted">sur {{ eur0(g.target) }}<span v-if="g.targetAuto" title="Calculé : mois de dépenses × dépenses moyennes (Paramètres)"> (calculé)</span></span></div>
        <md-linear-progress class="big" :class="g.status === 'Atteint' ? 'done' : g.status === 'En retard' ? 'late' : ''" :value="Math.min(1, Math.max(0.01, g.progress))"></md-linear-progress>
        <div class="gauge-legend"><span>{{ pct(g.progress, 0) }}</span><span>reste {{ eur0(g.remaining) }}</span></div>
        <div class="stat-row">
          <KpiCard label="Échéance" :value="g.target_date ? monthLong(g.target_date) : 'aucune'" :hint="g.monthsLeft !== null ? `dans ${Math.round(g.monthsLeft)} mois` : undefined" />
          <KpiCard label="À verser par mois" :value="g.monthlyNeeded === null ? '–' : eur0(g.monthlyNeeded)" :hint="g.rate ? `intérêts à ${pct(g.rate, 2)} inclus` : undefined" />
          <KpiCard label="Rythme actuel" :value="g.pace === null ? '–' : (g.pace > 0 ? '+' : '') + eur0(g.pace)" :hint="g.pace === null ? (g.source === 'manual' ? 'montant saisi' : 'historique trop court') : 'par mois (90 derniers jours)'" :tone="sign(g.pace)" />
        </div>
        <p class="help m0">
          Suivi : {{ origin(g) }}.
          <template v-if="g.status !== 'Atteint'"><span v-if="g.projectedDate"> Au rythme actuel : atteint en <b>{{ monthLong(g.projectedDate) }}</b>.</span><span v-else-if="g.pace !== null"> Au rythme actuel, l'objectif n'avance pas.</span></template>
        </p>
        <md-outlined-text-field v-if="g.source === 'manual'" style="max-width:220px" :label="`Montant épargné (${cur()})`" type="number" step="any" :value="g.manual_amount" @change="setManual(g, ($event.target as HTMLInputElement).value)"></md-outlined-text-field>
        <div class="row-actions"><md-outlined-button class="small" @click="openEdit(g)"><i slot="icon" class="fa-solid fa-pen" aria-hidden="true"></i>Modifier</md-outlined-button><md-outlined-button class="small" @click="archive(g)"><i slot="icon" class="fa-solid" :class="g.archived ? 'fa-rotate-left' : 'fa-box-archive'" aria-hidden="true"></i>{{ g.archived ? "Réactiver" : "Archiver" }}</md-outlined-button><md-icon-button class="small danger" aria-label="Supprimer l'objectif" title="Supprimer l'objectif" @click="remove(g)"><i class="fa-solid fa-xmark" aria-hidden="true"></i></md-icon-button></div>
      </div>
    </div>
    <div v-if="!goals.length" class="card empty">Aucun objectif. Commence par ton épargne de précaution : l'objectif est calculé à partir de tes dépenses.</div>
  </template>

  <Modal v-if="modal" :title="modal.id ? 'Modifier l\'objectif' : 'Nouvel objectif'" @close="modal = null">
    <div class="form">
      <md-outlined-text-field v-model="modal.name" class="full" label="Nom" placeholder="ex. Apport immobilier"></md-outlined-text-field>
      <SelectField v-model="modal.source" class="full" label="Comment mesurer l'avancement ?"><md-select-option v-for="(l, k) in SOURCES" :key="k" :value="k"><div slot="headline">{{ l }}</div></md-select-option></SelectField>
      <SelectField v-if="modal.source === 'account'" v-model="modal.account_id" label="Compte"><md-select-option v-for="a in accounts" :key="a.id" :value="a.id"><div slot="headline">{{ a.name }}</div></md-select-option></SelectField>
      <SelectField v-if="modal.source === 'class'" v-model="modal.asset_class" label="Classe d'actif"><md-select-option v-for="c in classes" :key="c" :value="c"><div slot="headline">{{ c }}</div></md-select-option></SelectField>
      <md-outlined-text-field v-if="modal.source === 'manual'" v-model="modal.manual_amount" :label="`Déjà épargné (${cur()})`" type="number" step="any"></md-outlined-text-field>
      <md-outlined-text-field v-model="modal.target" :label="`Montant visé (${cur()})`" type="number" step="any" :placeholder="modal.source === 'emergency' ? 'calculé si vide' : ''"></md-outlined-text-field>
      <md-outlined-text-field v-model="modal.target_date" label="Échéance" type="date"></md-outlined-text-field>
    </div>
    <p class="help">Lié à un compte, l'objectif suit son solde automatiquement (et tient compte du taux du livret pour le versement mensuel). L'épargne de précaution vise par défaut {{ "le nombre de mois de dépenses réglé dans Paramètres" }}.</p>
    <template #foot><md-text-button @click="modal = null">Annuler</md-text-button><md-filled-button :disabled="!modal.name || (modal.source !== 'emergency' && !modal.target)" @click="save">Enregistrer</md-filled-button></template>
  </Modal>
</template>
