<script lang="ts">
/** Type d'enveloppe tel qu'exposé par api.meta. */
export interface EnvelopeKindInfo { name: string; ceiling: number | null; ceilingOn: string | null; rate: number | null; help: string }
/** Brouillon du formulaire ("" = champ vide). */
export interface EnvelopeDraft {
  id?: number; account_id: number | ""; kind: string; ceiling: number | "" | null; ratePct: number | "" | null; opened_on: string;
  initial_deposits: number; monthly_deposit: number; note: string;
}
</script>

<script setup lang="ts">
import { ref, computed } from "vue";
import { api } from "../../lib/api";
import { cur } from "../../lib/format";
import { guard } from "../../lib/toast";
import Modal from "../../components/Modal.vue";
import SelectField from "../../components/SelectField.vue";
import type { Account } from "../../../core/schema";

const props = defineProps<{ envelope: EnvelopeDraft; accounts: Account[]; kinds: EnvelopeKindInfo[] }>();
const emit = defineEmits<{ close: []; saved: []; remove: [] }>();

// Copie locale : la modale est recréée à chaque ouverture (v-if), la prop n'est pas mutée.
const draft = ref<EnvelopeDraft>({ ...props.envelope });

// Calculé sur le brouillon (et non sur la prop) pour suivre les changements de type.
const modalKind = computed(() => props.kinds.find((x) => x.name === draft.value.kind));

async function save() {
  const m = draft.value;
  const ok = await guard(() => api.saveEnvelope({
    id: m.id, account_id: Number(m.account_id), kind: m.kind,
    ceiling: m.ceiling === "" || m.ceiling === null ? null : Number(m.ceiling),
    rate: m.ratePct === "" || m.ratePct === null ? null : Number(m.ratePct) / 100,
    opened_on: m.opened_on || null, initial_deposits: Number(m.initial_deposits) || 0, monthly_deposit: Number(m.monthly_deposit) || 0, note: m.note,
  }), "Enveloppe enregistrée");
  if (ok !== undefined) emit("saved");
}
</script>

<template>
  <Modal :title="draft.id ? 'Modifier l\'enveloppe' : 'Nouvelle enveloppe'" @close="emit('close')">
    <div class="form">
      <SelectField v-model="draft.account_id" label="Compte"><md-select-option v-for="a in accounts" :key="a.id" :value="a.id"><div slot="headline">{{ a.name }}</div></md-select-option></SelectField>
      <SelectField v-model="draft.kind" label="Type"><md-select-option v-for="k in kinds" :key="k.name" :value="k.name"><div slot="headline">{{ k.name }}</div></md-select-option></SelectField>
      <md-outlined-text-field v-model="draft.ceiling" :label="`Plafond (${cur()})`" type="number" step="any" :placeholder="modalKind?.ceiling ? 'officiel : ' + modalKind.ceiling.toLocaleString('fr-FR') : 'aucun'"></md-outlined-text-field>
      <md-outlined-text-field v-model="draft.ratePct" label="Taux annuel net (%)" type="number" step="0.01" :placeholder="modalKind?.rate !== null && modalKind?.rate !== undefined ? 'officiel : ' + (modalKind.rate * 100).toLocaleString('fr-FR') : 'constaté si vide'"></md-outlined-text-field>
      <md-outlined-text-field v-model="draft.monthly_deposit" :label="`Versement programmé (${cur()} / mois)`" type="number" step="any"></md-outlined-text-field>
      <md-outlined-text-field v-model="draft.opened_on" label="Date d'ouverture" type="date"></md-outlined-text-field>
      <md-outlined-text-field v-if="modalKind?.ceilingOn === 'deposits'" v-model="draft.initial_deposits" :label="`Versements antérieurs aux relevés (${cur()})`" type="number" step="any"></md-outlined-text-field>
      <md-outlined-text-field v-model="draft.note" class="full" label="Note"></md-outlined-text-field>
    </div>
    <p class="help">{{ modalKind?.help }} Laisse plafond et taux vides pour suivre automatiquement les valeurs officielles (et leurs changements au 1er février et au 1er août).</p>
    <template #foot>
      <md-text-button v-if="draft.id" class="danger" style="margin-right:auto" @click="emit('remove')">Retirer</md-text-button>
      <md-text-button @click="emit('close')">Annuler</md-text-button><md-filled-button :disabled="!draft.account_id" @click="save">Enregistrer</md-filled-button>
    </template>
  </Modal>
</template>
