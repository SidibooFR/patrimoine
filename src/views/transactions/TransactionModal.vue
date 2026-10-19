<script lang="ts">
/** Brouillon du formulaire : montant en valeur absolue + sens ; "" / null = champ vide. */
export interface TransactionDraft {
  id?: number; date: string; account_id: number; label: string; amount: number | null; category_id: number | ""; note: string; direction: "-" | "+";
}
</script>
<script setup lang="ts">
import { ref } from "vue";
import { api } from "../../lib/api";
import { cur } from "../../lib/format";
import { guard } from "../../lib/toast";
import Modal from "../../components/Modal.vue";
import SelectField from "../../components/SelectField.vue";
import type { Account, Category } from "../../../core/schema";

const props = defineProps<{ tx: TransactionDraft; accounts: Account[]; categories: Category[] }>();
const emit = defineEmits<{ close: []; saved: [] }>();

// Copie locale : la modale est recréée à chaque ouverture (v-if), la prop n'est pas mutée.
const draft = ref<TransactionDraft>({ ...props.tx });

async function save() {
  const m = draft.value;
  const amount = (m.direction === "-" ? -1 : 1) * Math.abs(Number(m.amount));
  const cat = m.category_id === "" ? null : Number(m.category_id);
  const id = m.id;
  const ok = id
    ? await guard(() => api.updateTransaction(id, { date: m.date, account_id: m.account_id, label: m.label, amount, category_id: cat, note: m.note }), "Opération modifiée")
    : await guard(() => api.addTransaction({ date: m.date, account_id: m.account_id, label: m.label, amount, category_id: cat, note: m.note }), "Opération ajoutée");
  if (ok !== undefined) emit("saved");
}
</script>

<template>
  <Modal :title="draft.id ? 'Modifier l\'opération' : 'Saisie manuelle'" @close="emit('close')">
    <div class="form">
      <md-outlined-text-field v-model="draft.date" label="Date" type="date"></md-outlined-text-field>
      <SelectField v-model="draft.account_id" label="Compte"><md-select-option v-for="a in accounts" :key="a.id" :value="a.id"><div slot="headline">{{ a.name }}</div></md-select-option></SelectField>
      <SelectField v-model="draft.direction" label="Sens"><md-select-option value="-"><div slot="headline">Sortie (dépense)</div></md-select-option><md-select-option value="+"><div slot="headline">Entrée (revenu)</div></md-select-option></SelectField>
      <md-outlined-text-field v-model.number="draft.amount" :label="`Montant (${cur()})`" type="number" step="0.01" min="0"></md-outlined-text-field>
      <md-outlined-text-field v-model="draft.label" class="full" label="Libellé" placeholder="ex. Marché, espèces"></md-outlined-text-field>
      <SelectField v-model="draft.category_id" label="Catégorie"><md-select-option value=""><div slot="headline">Automatique (règles)</div></md-select-option><md-select-option v-for="c in categories" :key="c.id" :value="c.id"><div slot="headline">{{ c.name }}</div></md-select-option></SelectField>
      <md-outlined-text-field v-model="draft.note" label="Note"></md-outlined-text-field>
    </div>
    <template #foot><md-text-button @click="emit('close')">Annuler</md-text-button><md-filled-button :disabled="!draft.label || !draft.amount" @click="save">Enregistrer</md-filled-button></template>
  </Modal>
</template>
