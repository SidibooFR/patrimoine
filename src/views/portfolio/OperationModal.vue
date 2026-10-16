<script setup lang="ts">
import { ref } from "vue";
import { api } from "../../lib/api";
import { cur } from "../../lib/format";
import { guard } from "../../lib/toast";
import Modal from "../../components/Modal.vue";

const props = defineProps<{ op: any; assets: any[] }>();
const emit = defineEmits<{ close: []; saved: [] }>();

// Copie locale : la modale est recréée à chaque ouverture (v-if), la prop n'est pas mutée.
const draft = ref<any>({ ...props.op });

async function saveOp() {
  const m = draft.value;
  const ok = await guard(() => api.saveOperation({ id: m.id, date: m.date, asset_id: m.asset_id, kind: m.kind, quantity: Number(m.quantity), unit_price: Number(m.unit_price), fees: Number(m.fees) || 0, note: m.note }), "Opération enregistrée");
  if (ok !== undefined) emit("saved");
}
</script>

<template>
  <Modal :title="draft.id ? 'Modifier l\'opération' : 'Nouvelle opération'" @close="emit('close')">
    <div class="form">
      <label class="field">Date<input v-model="draft.date" type="date" /></label>
      <label class="field">Actif<select v-model="draft.asset_id"><option v-for="a in assets" :key="a.id" :value="a.id">{{ a.name }}</option></select></label>
      <label class="field">Type<select v-model="draft.kind"><option>Achat</option><option>Vente</option><option>Dividende</option><option>Frais</option></select></label>
      <label class="field">Quantité<input v-model="draft.quantity" type="number" step="any" :placeholder="draft.kind === 'Dividende' ? '1' : ''" /></label>
      <label class="field">Prix unitaire ({{ cur() }})<input v-model="draft.unit_price" type="number" step="any" :placeholder="draft.kind === 'Dividende' ? 'montant reçu' : ''" /></label>
      <label class="field">Frais ({{ cur() }})<input v-model="draft.fees" type="number" step="any" /></label>
      <label class="field full">Note<input v-model="draft.note" /></label>
    </div>
    <p class="help">Dividende : quantité 1 et prix unitaire = montant reçu. Frais seuls : type « Frais » avec le montant dans Frais.</p>
    <template #foot><button @click="emit('close')">Annuler</button><button class="primary" :disabled="!draft.asset_id || !draft.date" @click="saveOp">Enregistrer</button></template>
  </Modal>
</template>
