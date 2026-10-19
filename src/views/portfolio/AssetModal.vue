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
import SelectField from "../../components/SelectField.vue";
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
    <md-outlined-text-field v-model="query" class="w-full" label="🔍 Rechercher (nom ou ISIN)" placeholder="ex. amundi msci world, LU1681043599, bitcoin"></md-outlined-text-field>
    <div v-if="query.trim().length >= 2" class="suggest">
      <p v-if="searching" class="help" role="status"><md-circular-progress indeterminate class="inline"></md-circular-progress>Recherche…</p>
      <p v-else-if="!results.length" class="help">Aucun résultat (ou pas de connexion) : remplis les champs à la main.</p>
      <md-list v-else>
        <md-list-item v-for="s in results" :key="s.asset_class + s.symbol" type="button" @click="pick(s)">
          <div slot="headline">{{ s.name }}</div>
          <div slot="supporting-text">{{ s.symbol }}</div>
          <span slot="end" class="tag" :class="{ ok: s.asset_class !== 'Crypto' && s.currency === appearance.currency }">{{ s.asset_class === "Crypto" ? "Crypto" : [s.exchange, s.currency].filter(Boolean).join(" · ") }}</span>
        </md-list-item>
      </md-list>
    </div>
    <div class="form">
      <md-outlined-text-field v-model="draft.name" class="full" label="Nom" placeholder="ex. Vanguard S&P 500 (VUAA)"></md-outlined-text-field>
      <SelectField v-model="draft.asset_class" label="Classe"><md-select-option v-for="c in classes" :key="c" :value="c"><div slot="headline">{{ c }}</div></md-select-option></SelectField>
      <SelectField v-model="draft.account_id" label="Compte"><md-select-option value=""><div slot="headline">–</div></md-select-option><md-select-option v-for="a in accounts" :key="a.id" :value="a.id"><div slot="headline">{{ a.name }}</div></md-select-option></SelectField>
      <md-outlined-text-field v-model="draft.symbol" label="Symbole de cotation" :placeholder="draft.asset_class === 'Crypto' ? 'id CoinGecko, ex. bitcoin' : 'symbole Yahoo, ex. VUAA.DE'"></md-outlined-text-field>
      <md-outlined-text-field v-model="draft.manual_price" :label="`Cours manuel de secours (${cur()})`" type="number" step="any"></md-outlined-text-field>
    </div>
    <p class="help">ETF / actions : symbole Yahoo Finance (suffixe .DE pour Xetra, .PA pour Paris). Cryptos : identifiant CoinGecko, visible dans l'adresse de la page coingecko.com (ex. « bitcoin », « ethereum », « polygon-ecosystem-token »).</p>
    <template #foot><md-text-button @click="emit('close')">Annuler</md-text-button><md-filled-button :disabled="!draft.name" @click="saveAsset">Enregistrer</md-filled-button></template>
  </Modal>
</template>
