<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api } from "../lib/api";
import { eur, pct, sign, todayIso } from "../lib/format";
import { guard, notify } from "../lib/toast";
import type { PortfolioReport } from "../../core/reports";
import type { PortfolioHistory } from "../../core/history";
import KpiCard from "../components/KpiCard.vue";
import PageHeader from "../components/PageHeader.vue";
import PositionsTable from "./portfolio/PositionsTable.vue";
import HistoryPanel from "./portfolio/HistoryPanel.vue";
import OperationsTable from "./portfolio/OperationsTable.vue";
import AllocationPanel from "./portfolio/AllocationPanel.vue";
import AssetModal from "./portfolio/AssetModal.vue";
import OperationModal from "./portfolio/OperationModal.vue";
import type { AssetDraft } from "./portfolio/AssetModal.vue";
import type { OperationDraft } from "./portfolio/OperationModal.vue";
import type { Account, AssetRow, OperationRow } from "../../core/schema";

const pf = ref<PortfolioReport>();
const ops = ref<OperationRow[]>([]);
const assets = ref<AssetRow[]>([]);
const accounts = ref<Account[]>([]);
const classes = ref<readonly string[]>([]);
const refreshing = ref(false);
const lastRefresh = ref<{ updated: number; failed: string[]; at: string } | null>(null);
const hist = ref<PortfolioHistory>();
const backfilling = ref(false);

async function load() {
  [pf.value, ops.value, assets.value, accounts.value, hist.value] = await Promise.all([api.portfolio(), api.listOperations(), api.listAssets(), api.listAccounts(), api.portfolioHistory()]);
  classes.value = (await api.meta()).assetClasses;
}
onMounted(load);

async function refresh() {
  refreshing.value = true;
  const r = await guard(() => api.refreshPrices());
  refreshing.value = false;
  if (r) { lastRefresh.value = r; notify(r.failed.length ? `${r.updated} cours mis à jour · échec : ${r.failed.join(", ")}` : `${r.updated} cours mis à jour`, r.updated === 0); await load(); }
}
async function backfill() {
  backfilling.value = true;
  notify("Téléchargement de l'historique des cours… (jusqu'à une minute pour les cryptos)");
  const r = await guard(() => api.backfillPriceHistory());
  backfilling.value = false;
  if (r) { notify(r.failed.length ? `${r.points} cours pour ${r.assets} actif(s) · échec : ${r.failed.join(", ")}` : `${r.points} cours historiques pour ${r.assets} actif(s)`, r.assets === 0); await load(); }
}

// Actifs
const assetModal = ref<AssetDraft | null>(null);
function newAsset() { assetModal.value = { name: "", symbol: "", account_id: accounts.value.find((a) => a.asset_class === "Actions & ETF")?.id ?? "", asset_class: "Actions & ETF", manual_price: null }; }
function editAsset(id: number) {
  const a = assets.value.find((x) => x.id === id);
  if (a) assetModal.value = { ...a, account_id: a.account_id ?? "" };
}
async function deleteAsset(id: number) {
  const a = assets.value.find((x) => x.id === id);
  if (!a || !window.confirm(`Supprimer « ${a.name} » et toutes ses opérations ?`)) return;
  await guard(() => api.deleteAsset(a.id), "Actif supprimé"); await load();
}

// Opérations
const opModal = ref<OperationDraft | null>(null);
function newOp(asset_id?: number) { opModal.value = { date: todayIso(), asset_id: asset_id ?? assets.value[0]?.id, kind: "Achat", quantity: null, unit_price: null, fees: 0, note: "" }; }
function editOp(o: OperationRow) { opModal.value = { ...o }; }
async function deleteOp(o: OperationRow) { if (!window.confirm("Supprimer cette opération ?")) return; await guard(() => api.deleteOperation(o.id)); await load(); }
</script>

<template>
  <PageHeader title="Portefeuille" sub="ETF, actions et cryptos. Les cours viennent de Yahoo Finance et CoinGecko ; sans connexion, le cours manuel de secours est utilisé.">
    <md-outlined-button :disabled="refreshing" @click="refresh">{{ refreshing ? "Actualisation…" : "↻ Actualiser les cours" }}</md-outlined-button>
    <md-outlined-button :disabled="backfilling" title="Télécharge les cours quotidiens depuis le premier achat (courbe et performances par période)" @click="backfill">{{ backfilling ? "Téléchargement…" : "⇩ Historique des cours" }}</md-outlined-button>
    <md-outlined-button @click="newAsset">+ Actif</md-outlined-button><md-filled-button :disabled="!assets.length" @click="newOp()">+ Opération</md-filled-button>
  </PageHeader>

  <div v-if="pf" class="grid c4 mb-3">
    <KpiCard label="Valeur actuelle" :value="eur(pf.totals.value)" :hint="`Investi : ${eur(pf.invested)} · récupéré : ${eur(pf.recovered)}`" card />
    <KpiCard label="Plus-value latente" :value="eur(pf.totals.unrealized)" :tone="sign(pf.totals.unrealized)" card>
      <template #hint><span :class="sign(pf.totals.unrealizedPct)">{{ pct(pf.totals.unrealizedPct) }} du prix de revient</span></template>
    </KpiCard>
    <KpiCard label="Gain total" :value="eur(pf.gain)" :hint="`latent + réalisé (${eur(pf.totals.realized)}) + dividendes (${eur(pf.totals.dividends)}) · perf. ${pct(pf.performance)}`" :tone="sign(pf.gain)" card />
    <KpiCard card :value="pct(pf.irr)" :tone="sign(pf.irr)" :hint="pf.irrInfo.note ? pf.irrInfo.note[0].toUpperCase() + pf.irrInfo.note.slice(1) + '.' : 'Tient compte des dates de chaque versement.'">
      <template #label>Rendement annualisé (TRI) <span v-if="!pf.irrInfo.reliable" class="tag warn" :title="pf.irrInfo.note ?? ''">peu fiable</span></template>
    </KpiCard>
  </div>
  <div v-if="lastRefresh" class="note mb-2" :class="lastRefresh.failed.length ? 'warn' : 'ok'">
    Cours actualisés le {{ new Date(lastRefresh.at).toLocaleString("fr-FR") }} : {{ lastRefresh.updated }} actif(s).<span v-if="lastRefresh.failed.length"> Sans cours web : {{ lastRefresh.failed.join(", ") }} — vérifie le symbole ou renseigne un cours manuel.</span>
  </div>

  <div v-if="pf">
    <PositionsTable :positions="pf.positions" @new-op="newOp" @edit="editAsset" @remove="deleteAsset" />
  </div>

  <div v-if="hist && hist.points.length" class="grid side mt-3">
    <HistoryPanel :hist="hist" />
  </div>

  <div class="grid side mt-3">
    <OperationsTable :ops="ops" :assets="assets" @edit="editOp" @remove="deleteOp" />
    <AllocationPanel v-if="pf" :pf="pf" />
  </div>

  <AssetModal v-if="assetModal" :asset="assetModal" :accounts="accounts" :classes="classes" @close="assetModal = null" @saved="assetModal = null; load()" />
  <OperationModal v-if="opModal" :op="opModal" :assets="assets" @close="opModal = null" @saved="opModal = null; load()" />
</template>
