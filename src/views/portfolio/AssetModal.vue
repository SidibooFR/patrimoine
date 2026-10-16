<script setup lang="ts">
import { ref } from "vue";
import { api } from "../../lib/api";
import { cur } from "../../lib/format";
import { guard } from "../../lib/toast";
import Modal from "../../components/Modal.vue";

const props = defineProps<{ asset: any; accounts: any[]; classes: readonly string[] }>();
const emit = defineEmits<{ close: []; saved: [] }>();

// Copie locale : la modale est recréée à chaque ouverture (v-if), la prop n'est pas mutée.
const draft = ref<any>({ ...props.asset });

async function saveAsset() {
  const m = draft.value;
  const ok = await guard(() => api.saveAsset({ id: m.id, name: m.name, symbol: m.symbol, account_id: m.account_id === "" ? null : m.account_id, asset_class: m.asset_class, manual_price: m.manual_price === "" || m.manual_price === null ? null : Number(m.manual_price) }), "Actif enregistré");
  if (ok !== undefined) emit("saved");
}
</script>

<template>
  <Modal :title="draft.id ? 'Modifier l\'actif' : 'Nouvel actif'" @close="emit('close')">
    <div class="form">
      <label class="field full">Nom<input v-model="draft.name" placeholder="ex. Vanguard S&P 500 (VUAA)" /></label>
      <label class="field">Classe<select v-model="draft.asset_class"><option v-for="c in classes" :key="c">{{ c }}</option></select></label>
      <label class="field">Compte<select v-model="draft.account_id"><option value="">–</option><option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }}</option></select></label>
      <label class="field">Symbole de cotation<input v-model="draft.symbol" :placeholder="draft.asset_class === 'Crypto' ? 'id CoinGecko, ex. bitcoin' : 'symbole Yahoo, ex. VUAA.DE'" /></label>
      <label class="field">Cours manuel de secours ({{ cur() }})<input v-model="draft.manual_price" type="number" step="any" /></label>
    </div>
    <p class="help">ETF / actions : symbole Yahoo Finance (suffixe .DE pour Xetra, .PA pour Paris). Cryptos : identifiant CoinGecko, visible dans l'adresse de la page coingecko.com (ex. « bitcoin », « ethereum », « polygon-ecosystem-token »).</p>
    <template #foot><button @click="emit('close')">Annuler</button><button class="primary" :disabled="!draft.name" @click="saveAsset">Enregistrer</button></template>
  </Modal>
</template>
