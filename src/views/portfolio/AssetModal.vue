<script lang="ts">
/** Brouillon du formulaire ("" = champ vide). */
export interface AssetDraft { id?: number; name: string; symbol: string; account_id: number | ""; asset_class: string; manual_price: number | "" | null }
</script>
<script setup lang="ts">
import { ref, watch } from "vue";
import { api } from "../../lib/api";
import { cur } from "../../lib/format";
import { appearance } from "../../lib/appearance";
import { guard } from "../../lib/toast";
import Modal from "../../components/Modal.vue";
import type { Account } from "../../../core/schema";
import type { AssetSuggestion } from "../../../core/prices";

const props = defineProps<{ asset: AssetDraft; accounts: Account[]; classes: readonly string[] }>();
const emit = defineEmits<{ close: []; saved: [] }>();

// Copie locale : la modale est recréée à chaque ouverture (v-if), la prop n'est pas mutée.
const draft = ref<AssetDraft>({ ...props.asset });

// Recherche (nom, ISIN ou ticker) : remplit nom, symbole et classe ; les champs restent modifiables.
const query = ref("");
const results = ref<AssetSuggestion[]>([]);
const searching = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;
let seq = 0;
watch(query, (q) => {
  clearTimeout(timer);
  const n = ++seq; // ignore les réponses d'une frappe précédente
  if (q.trim().length < 2) { results.value = []; searching.value = false; return; }
  searching.value = true;
  timer = setTimeout(async () => {
    const r = await api.searchAssets(q).catch(() => []);
    if (n !== seq) return;
    results.value = r;
    searching.value = false;
  }, 350);
});
function pick(s: AssetSuggestion) {
  Object.assign(draft.value, { name: s.name, symbol: s.symbol }, props.classes.includes(s.asset_class) ? { asset_class: s.asset_class } : {});
  query.value = "";
}

async function saveAsset() {
  const m = draft.value;
  const ok = await guard(() => api.saveAsset({ id: m.id, name: m.name, symbol: m.symbol, account_id: m.account_id === "" ? null : m.account_id, asset_class: m.asset_class, manual_price: m.manual_price === "" || m.manual_price === null ? null : Number(m.manual_price) }), "Actif enregistré");
  if (ok !== undefined) emit("saved");
}
</script>

<template>
  <Modal :title="draft.id ? 'Modifier l\'actif' : 'Nouvel actif'" @close="emit('close')">
    <label class="field">🔍 Rechercher (nom ou ISIN)<input v-model="query" placeholder="ex. amundi msci world, LU1681043599, bitcoin" /></label>
    <div v-if="query.trim().length >= 2" class="suggest">
      <p v-if="searching" class="help" role="status"><span class="spinner" />Recherche…</p>
      <p v-else-if="!results.length" class="help">Aucun résultat (ou pas de connexion) : remplis les champs à la main.</p>
      <button v-for="s in results" v-else :key="s.asset_class + s.symbol" type="button" @click="pick(s)">
        <span><b>{{ s.name }}</b><br /><span class="muted">{{ s.symbol }}</span></span>
        <span class="tag" :class="{ ok: s.asset_class !== 'Crypto' && s.currency === appearance.currency }">{{ s.asset_class === "Crypto" ? "Crypto" : [s.exchange, s.currency].filter(Boolean).join(" · ") }}</span>
      </button>
    </div>
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
