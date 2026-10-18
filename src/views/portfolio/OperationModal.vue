<script lang="ts">
import type { OperationKind } from "../../../core/schema";
/** Brouillon du formulaire (null = champ vide). */
export interface OperationDraft { id?: number; date: string; asset_id: number; kind: OperationKind; quantity: number | null; unit_price: number | null; fees: number; note: string }
</script>
<script setup lang="ts">
import { ref } from "vue";
import { api } from "../../lib/api";
import { cur } from "../../lib/format";
import { guard } from "../../lib/toast";
import Modal from "../../components/Modal.vue";
import SelectField from "../../components/SelectField.vue";
import type { AssetRow } from "../../../core/schema";

const props = defineProps<{ op: OperationDraft; assets: AssetRow[] }>();
const emit = defineEmits<{ close: []; saved: [] }>();

// Copie locale : la modale est recréée à chaque ouverture (v-if), la prop n'est pas mutée.
const draft = ref<OperationDraft>({ ...props.op });

async function saveOp() {
  const m = draft.value;
  const ok = await guard(() => api.saveOperation({ id: m.id, date: m.date, asset_id: m.asset_id, kind: m.kind, quantity: Number(m.quantity), unit_price: Number(m.unit_price), fees: Number(m.fees) || 0, note: m.note }), "Opération enregistrée");
  if (ok !== undefined) emit("saved");
}
</script>

<template>
  <Modal :title="draft.id ? 'Modifier l\'opération' : 'Nouvelle opération'" @close="emit('close')">
    <div class="form">
      <md-outlined-text-field v-model="draft.date" label="Date" type="date"></md-outlined-text-field>
      <SelectField v-model="draft.asset_id" label="Actif"><md-select-option v-for="a in assets" :key="a.id" :value="a.id"><div slot="headline">{{ a.name }}</div></md-select-option></SelectField>
      <SelectField v-model="draft.kind" label="Type"><md-select-option value="Achat"><div slot="headline">Achat</div></md-select-option><md-select-option value="Vente"><div slot="headline">Vente</div></md-select-option><md-select-option value="Dividende"><div slot="headline">Dividende</div></md-select-option><md-select-option value="Frais"><div slot="headline">Frais</div></md-select-option></SelectField>
      <md-outlined-text-field v-model="draft.quantity" label="Quantité" type="number" step="any" :placeholder="draft.kind === 'Dividende' ? '1' : ''"></md-outlined-text-field>
      <md-outlined-text-field v-model="draft.unit_price" :label="`Prix unitaire (${cur()})`" type="number" step="any" :placeholder="draft.kind === 'Dividende' ? 'montant reçu' : ''"></md-outlined-text-field>
      <md-outlined-text-field v-model="draft.fees" :label="`Frais (${cur()})`" type="number" step="any"></md-outlined-text-field>
      <md-outlined-text-field v-model="draft.note" class="full" label="Note"></md-outlined-text-field>
    </div>
    <p class="help">Dividende : quantité 1 et prix unitaire = montant reçu. Frais seuls : type « Frais » avec le montant dans Frais.</p>
    <template #foot><md-text-button @click="emit('close')">Annuler</md-text-button><md-filled-button :disabled="!draft.asset_id || !draft.date" @click="saveOp">Enregistrer</md-filled-button></template>
  </Modal>
</template>
