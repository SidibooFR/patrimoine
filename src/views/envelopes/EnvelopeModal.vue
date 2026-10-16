<script setup lang="ts">
import { ref, computed } from "vue";
import { api } from "../../lib/api";
import { cur } from "../../lib/format";
import { guard } from "../../lib/toast";
import Modal from "../../components/Modal.vue";
import type { EnvelopeKindInfo } from "../../../core/envelopes";

const props = defineProps<{ envelope: any; accounts: any[]; kinds: EnvelopeKindInfo[] }>();
const emit = defineEmits<{ close: []; saved: []; remove: [] }>();

// Copie locale : la modale est recréée à chaque ouverture (v-if), la prop n'est pas mutée.
const draft = ref<any>({ ...props.envelope });

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
      <label class="field">Compte<select v-model="draft.account_id"><option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }}</option></select></label>
      <label class="field">Type<select v-model="draft.kind"><option v-for="k in kinds" :key="k.name">{{ k.name }}</option></select></label>
      <label class="field">Plafond ({{ cur() }})<input v-model="draft.ceiling" type="number" step="any" :placeholder="modalKind?.ceiling ? 'officiel : ' + modalKind.ceiling.toLocaleString('fr-FR') : 'aucun'" /></label>
      <label class="field">Taux annuel net (%)<input v-model="draft.ratePct" type="number" step="0.01" :placeholder="modalKind?.rate !== null && modalKind?.rate !== undefined ? 'officiel : ' + (modalKind.rate * 100).toLocaleString('fr-FR') : 'constaté si vide'" /></label>
      <label class="field">Versement programmé ({{ cur() }} / mois)<input v-model="draft.monthly_deposit" type="number" step="any" /></label>
      <label class="field">Date d'ouverture<input v-model="draft.opened_on" type="date" /></label>
      <label v-if="modalKind?.ceilingOn === 'deposits'" class="field">Versements antérieurs aux relevés ({{ cur() }})<input v-model="draft.initial_deposits" type="number" step="any" /></label>
      <label class="field full">Note<input v-model="draft.note" /></label>
    </div>
    <p class="help">{{ modalKind?.help }} Laisse plafond et taux vides pour suivre automatiquement les valeurs officielles (et leurs changements au 1er février et au 1er août).</p>
    <template #foot>
      <button v-if="draft.id" class="danger" style="margin-right:auto" @click="emit('remove')">Retirer</button>
      <button @click="emit('close')">Annuler</button><button class="primary" :disabled="!draft.account_id" @click="save">Enregistrer</button>
    </template>
  </Modal>
</template>
