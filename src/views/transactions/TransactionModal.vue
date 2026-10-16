<script setup lang="ts">
import { ref } from "vue";
import { api } from "../../lib/api";
import { cur } from "../../lib/format";
import { guard } from "../../lib/toast";
import Modal from "../../components/Modal.vue";

const props = defineProps<{ tx: any; accounts: any[]; categories: any[] }>();
const emit = defineEmits<{ close: []; saved: [] }>();

// Copie locale : la modale est recréée à chaque ouverture (v-if), la prop n'est pas mutée.
const draft = ref<any>({ ...props.tx });

async function save() {
  const m = draft.value;
  const amount = (m.direction === "-" ? -1 : 1) * Math.abs(Number(m.amount));
  const cat = m.category_id === "" ? null : Number(m.category_id);
  const ok = m.id
    ? await guard(() => api.updateTransaction(m.id, { date: m.date, account_id: m.account_id, label: m.label, amount, category_id: cat, note: m.note }), "Opération modifiée")
    : await guard(() => api.addTransaction({ date: m.date, account_id: m.account_id, label: m.label, amount, category_id: cat, note: m.note }), "Opération ajoutée");
  if (ok !== undefined) emit("saved");
}
</script>

<template>
  <Modal :title="draft.id ? 'Modifier l\'opération' : 'Saisie manuelle'" @close="emit('close')">
    <div class="form">
      <label class="field">Date<input v-model="draft.date" type="date" /></label>
      <label class="field">Compte<select v-model="draft.account_id"><option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }}</option></select></label>
      <label class="field">Sens<select v-model="draft.direction"><option value="-">Sortie (dépense)</option><option value="+">Entrée (revenu)</option></select></label>
      <label class="field">Montant ({{ cur() }})<input v-model.number="draft.amount" type="number" step="0.01" min="0" /></label>
      <label class="field full">Libellé<input v-model="draft.label" placeholder="ex. Marché, espèces" /></label>
      <label class="field">Catégorie<select v-model="draft.category_id"><option value="">Automatique (règles)</option><option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option></select></label>
      <label class="field">Note<input v-model="draft.note" /></label>
    </div>
    <template #foot><button @click="emit('close')">Annuler</button><button class="primary" :disabled="!draft.label || !draft.amount" @click="save">Enregistrer</button></template>
  </Modal>
</template>
