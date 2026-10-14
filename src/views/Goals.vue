<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { api } from "../api";
import { eur, eur0, pct, date, sign, monthLong, cur } from "../format";
import { guard } from "../toast";
import Modal from "../components/Modal.vue";
import type { GoalsReport, GoalRow } from "../../core/goals";

const rep = ref<GoalsReport>();
const accounts = ref<any[]>([]);
const classes = ref<readonly string[]>([]);
const showArchived = ref(false);
async function load() {
  const [g, a, m] = await Promise.all([api.goals(), api.listAccounts(), api.meta()]);
  rep.value = g; accounts.value = a; classes.value = m.assetClasses;
}
onMounted(load);

const goals = computed(() => (rep.value?.goals ?? []).filter((g) => showArchived.value || !g.archived));
const SOURCES: Record<string, string> = { manual: "Montant que je saisis", account: "Solde d'un compte", class: "Total d'une classe d'actif", emergency: "Épargne de précaution (liquidités + épargne sécurisée)" };
const STATUS_CLASS: Record<string, string> = { "Atteint": "ok", "En avance": "ok", "Dans les temps": "ok", "En retard": "neg", "À financer": "warn", "Sans échéance": "" };

const inYear = (n: number) => { const d = new Date(); d.setFullYear(d.getFullYear() + n); return d.toISOString().slice(0, 10); };
const modal = ref<any>(null);
function openNew(preset?: "emergency" | "apport" | "voyage") {
  const base = { name: "", source: "manual", target: "", target_date: inYear(1), account_id: "", asset_class: "Épargne sécurisée", manual_amount: 0 };
  if (preset === "emergency") Object.assign(base, { name: "Épargne de précaution", source: "emergency", target: "" });
  if (preset === "apport") Object.assign(base, { name: "Apport immobilier", source: "class", asset_class: "Épargne sécurisée", target: 20000, target_date: inYear(5) });
  if (preset === "voyage") Object.assign(base, { name: "Voyage", source: "manual", target: 1500, target_date: inYear(1) });
  modal.value = base;
}
function openEdit(g: GoalRow) {
  modal.value = { id: g.id, name: g.name, source: g.source, target: g.targetAuto ? "" : g.target, target_date: g.target_date ?? "", account_id: g.account_id ?? "", asset_class: g.asset_class ?? "Épargne sécurisée", manual_amount: g.manual_amount, archived: g.archived };
}
async function save() {
  const m = modal.value;
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
  <div class="page-head">
    <div><h1>Objectifs d'épargne</h1><p class="sub">Un montant, une date : l'application calcule le versement mensuel nécessaire et vérifie que ton rythme d'épargne suit.</p></div>
    <div class="actions">
      <button @click="openNew('emergency')">+ Épargne de précaution</button><button @click="openNew('apport')">+ Apport</button><button @click="openNew('voyage')">+ Voyage</button>
      <button class="primary" @click="openNew()">+ Objectif</button>
    </div>
  </div>

  <template v-if="rep">
    <div class="grid c4" style="margin-bottom:16px">
      <div class="card kpi"><span class="label">Déjà épargné</span><span class="value">{{ eur0(rep.totals.current) }}</span><span class="hint">sur {{ eur0(rep.totals.target) }} visés</span></div>
      <div class="card kpi"><span class="label">Reste à épargner</span><span class="value">{{ eur0(rep.totals.remaining) }}</span></div>
      <div class="card kpi"><span class="label">Besoin mensuel total</span><span class="value">{{ eur0(rep.totals.monthlyNeeded) }}</span><span class="hint">pour tenir toutes les échéances</span></div>
      <div class="card kpi"><span class="label">Ta capacité d'épargne</span><span class="value" :class="sign(rep.capacity)">{{ rep.capacity === null ? "–" : eur0(rep.capacity) }}</span><span class="hint">revenus − dépenses, moyenne des mois terminés</span></div>
    </div>
    <div v-if="rep.margin !== null && rep.totals.monthlyNeeded > 0" class="note" :class="rep.margin >= 0 ? 'ok' : 'warn'" style="margin-bottom:16px">
      <template v-if="rep.margin >= 0">Tes objectifs demandent {{ eur0(rep.totals.monthlyNeeded) }} par mois et tu épargnes en moyenne {{ eur0(rep.capacity) }} : il reste {{ eur0(rep.margin) }} par mois pour investir.</template>
      <template v-else>Tes objectifs demandent {{ eur0(rep.totals.monthlyNeeded) }} par mois, mais ton épargne moyenne cette année est de {{ eur0(rep.capacity) }} par mois. Il manque {{ eur0(-rep.margin) }} par mois : repousse une échéance, réduis un montant, ou trouve cette somme dans tes charges fixes (onglet Abonnements).</template>
    </div>

    <div class="toolbar"><label class="help"><input v-model="showArchived" type="checkbox" /> afficher les objectifs archivés</label></div>
    <div class="grid c2">
      <div v-for="g in goals" :key="g.id" class="card goal-card" :class="{ muted: g.archived }">
        <div class="top">
          <h2 style="margin:0">{{ g.name }}</h2>
          <span class="tag" :class="STATUS_CLASS[g.status]">{{ g.status }}</span>
        </div>
        <div class="top"><span class="amount">{{ eur0(g.current) }}</span><span class="muted">sur {{ eur0(g.target) }}<span v-if="g.targetAuto" title="Calculé : mois de dépenses × dépenses moyennes (Paramètres)"> (calculé)</span></span></div>
        <div class="progress big"><span :class="g.status === 'Atteint' ? 'done' : g.status === 'En retard' ? 'late' : ''" :style="{ width: Math.max(1, g.progress * 100) + '%' }"></span></div>
        <div class="gauge-legend"><span>{{ pct(g.progress, 0) }}</span><span>reste {{ eur0(g.remaining) }}</span></div>
        <div class="stat-row">
          <div class="kpi"><span class="label">Échéance</span><span class="value">{{ g.target_date ? monthLong(g.target_date) : "aucune" }}</span><span class="hint" v-if="g.monthsLeft !== null">dans {{ Math.round(g.monthsLeft) }} mois</span></div>
          <div class="kpi"><span class="label">À verser par mois</span><span class="value">{{ g.monthlyNeeded === null ? "–" : eur0(g.monthlyNeeded) }}</span><span class="hint" v-if="g.rate">intérêts à {{ pct(g.rate, 2) }} inclus</span></div>
          <div class="kpi"><span class="label">Rythme actuel</span><span class="value" :class="sign(g.pace)">{{ g.pace === null ? "–" : (g.pace > 0 ? "+" : "") + eur0(g.pace) }}</span><span class="hint">{{ g.pace === null ? (g.source === "manual" ? "montant saisi" : "historique trop court") : "par mois (90 derniers jours)" }}</span></div>
        </div>
        <p class="help" style="margin:0">
          Suivi : {{ origin(g) }}.
          <template v-if="g.status !== 'Atteint'"><span v-if="g.projectedDate"> Au rythme actuel : atteint en <b>{{ monthLong(g.projectedDate) }}</b>.</span><span v-else-if="g.pace !== null"> Au rythme actuel, l'objectif n'avance pas.</span></template>
        </p>
        <label v-if="g.source === 'manual'" class="field" style="max-width:220px">Montant épargné ({{ cur() }})<input type="number" step="any" :value="g.manual_amount" @change="setManual(g, ($event.target as HTMLInputElement).value)" /></label>
        <div style="display:flex;gap:6px"><button class="small" @click="openEdit(g)">✎ Modifier</button><button class="small" @click="archive(g)">{{ g.archived ? "↶ Réactiver" : "▣ Archiver" }}</button><button class="small danger" @click="remove(g)">✕</button></div>
      </div>
    </div>
    <div v-if="!goals.length" class="card empty">Aucun objectif. Commence par ton épargne de précaution : l'objectif est calculé à partir de tes dépenses.</div>
  </template>

  <Modal v-if="modal" :title="modal.id ? 'Modifier l\'objectif' : 'Nouvel objectif'" @close="modal = null">
    <div class="form">
      <label class="field full">Nom<input v-model="modal.name" placeholder="ex. Apport immobilier" /></label>
      <label class="field full">Comment mesurer l'avancement ?<select v-model="modal.source"><option v-for="(l, k) in SOURCES" :key="k" :value="k">{{ l }}</option></select></label>
      <label v-if="modal.source === 'account'" class="field">Compte<select v-model="modal.account_id"><option value="" disabled>Choisir…</option><option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }}</option></select></label>
      <label v-if="modal.source === 'class'" class="field">Classe d'actif<select v-model="modal.asset_class"><option v-for="c in classes" :key="c">{{ c }}</option></select></label>
      <label v-if="modal.source === 'manual'" class="field">Déjà épargné ({{ cur() }})<input v-model="modal.manual_amount" type="number" step="any" /></label>
      <label class="field">Montant visé ({{ cur() }})<input v-model="modal.target" type="number" step="any" :placeholder="modal.source === 'emergency' ? 'calculé si vide' : ''" /></label>
      <label class="field">Échéance<input v-model="modal.target_date" type="date" /></label>
    </div>
    <p class="help">Lié à un compte, l'objectif suit son solde automatiquement (et tient compte du taux du livret pour le versement mensuel). L'épargne de précaution vise par défaut {{ "le nombre de mois de dépenses réglé dans Paramètres" }}.</p>
    <template #foot><button @click="modal = null">Annuler</button><button class="primary" :disabled="!modal.name || (modal.source !== 'emergency' && !modal.target)" @click="save">Enregistrer</button></template>
  </Modal>
</template>
