<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { api, files } from "../api";
import { eur, eur0, pct, num, sign, date, todayIso } from "../format";
import { guard, notify } from "../toast";
import Modal from "../components/Modal.vue";
import Chart from "../components/Chart.vue";
import { PALETTE, eurTick, eurTip } from "../charts";
import type { PortfolioReport } from "../../core/reports";
import type { PortfolioHistory } from "../../core/history";

const pf = ref<PortfolioReport>();
const ops = ref<any[]>([]);
const assets = ref<any[]>([]);
const accounts = ref<any[]>([]);
const classes = ref<readonly string[]>([]);
const refreshing = ref(false);
const lastRefresh = ref<{ updated: number; failed: string[]; at: string } | null>(null);
const opsFilter = ref<number | "">("");
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
const histChart = computed<any>(() => {
  const pts = hist.value?.points ?? [];
  return {
    type: "line",
    data: {
      labels: pts.map((p) => new Date(p.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" })),
      datasets: [
        { label: "Valeur", data: pts.map((p) => p.value), borderColor: "#2f6fed", backgroundColor: "rgba(47,111,237,.10)", fill: true, tension: .2, pointRadius: 0, borderWidth: 2 },
        { label: "Montant investi", data: pts.map((p) => p.invested), borderColor: "#67748a", borderDash: [5, 4], pointRadius: 0, borderWidth: 1.5, stepped: true },
      ],
    },
    options: { interaction: { mode: "index", intersect: false }, plugins: { tooltip: { callbacks: { label: eurTip } } }, scales: { y: { ticks: { callback: eurTick } }, x: { ticks: { maxTicksLimit: 8 } } } },
  };
});

// Actifs
const assetModal = ref<any>(null);
function newAsset() { assetModal.value = { name: "", symbol: "", account_id: accounts.value.find((a) => a.asset_class === "Actions & ETF")?.id ?? "", asset_class: "Actions & ETF", manual_price: null }; }
function editAsset(a: any) { assetModal.value = { ...a, account_id: a.account_id ?? "" }; }
async function saveAsset() {
  const m = assetModal.value;
  const ok = await guard(() => api.saveAsset({ id: m.id, name: m.name, symbol: m.symbol, account_id: m.account_id === "" ? null : m.account_id, asset_class: m.asset_class, manual_price: m.manual_price === "" || m.manual_price === null ? null : Number(m.manual_price) }), "Actif enregistré");
  if (ok !== undefined) { assetModal.value = null; await load(); }
}
async function deleteAsset(a: any) {
  if (!window.confirm(`Supprimer « ${a.name} » et toutes ses opérations ?`)) return;
  await guard(() => api.deleteAsset(a.id), "Actif supprimé"); await load();
}

// Opérations
const opModal = ref<any>(null);
function newOp(asset_id?: number) { opModal.value = { date: todayIso(), asset_id: asset_id ?? assets.value[0]?.id, kind: "Achat", quantity: null, unit_price: null, fees: 0, note: "" }; }
function editOp(o: any) { opModal.value = { ...o }; }
async function saveOp() {
  const m = opModal.value;
  const ok = await guard(() => api.saveOperation({ id: m.id, date: m.date, asset_id: m.asset_id, kind: m.kind, quantity: Number(m.quantity), unit_price: Number(m.unit_price), fees: Number(m.fees) || 0, note: m.note }), "Opération enregistrée");
  if (ok !== undefined) { opModal.value = null; await load(); }
}
async function deleteOp(o: any) { if (!window.confirm("Supprimer cette opération ?")) return; await guard(() => api.deleteOperation(o.id)); await load(); }
const opsShown = computed(() => ops.value.filter((o) => opsFilter.value === "" || o.asset_id === opsFilter.value));
const opTotal = (o: any) => (o.kind === "Achat" ? -(o.quantity * o.unit_price + o.fees) : o.kind === "Frais" ? -o.fees : o.quantity * o.unit_price - o.fees);

const weightChart = computed<any>(() => {
  const pos = (pf.value?.positions ?? []).filter((p) => p.value > 0).sort((a, b) => b.value - a.value);
  const top = pos.slice(0, 8); const rest = pos.slice(8).reduce((s, p) => s + p.value, 0);
  const labels = [...top.map((p) => p.name), ...(rest ? ["Autres"] : [])];
  return { type: "doughnut", data: { labels, datasets: [{ data: [...top.map((p) => p.value), ...(rest ? [rest] : [])], backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]) }] },
    options: { plugins: { legend: { position: "right" }, tooltip: { callbacks: { label: (c: any) => `${c.label} : ${eur0(c.parsed)}` } } }, cutout: "60%" } };
});
const byClass = computed(() => {
  const m = new Map<string, number>();
  for (const p of pf.value?.positions ?? []) m.set(p.asset_class, (m.get(p.asset_class) ?? 0) + p.value);
  return [...m.entries()];
});
async function exportOps() {
  const f = await files.save({ title: "Exporter", defaultPath: "patrimoine.xlsx", filters: [{ name: "Excel", extensions: ["xlsx"] }] });
  if (f) await guard(() => api.exportExcel(f), "Export créé");
}
</script>

<template>
  <div class="page-head">
    <div><h1>Portefeuille</h1><p class="sub">ETF, actions et cryptos. Les cours viennent de Yahoo Finance et CoinGecko ; sans connexion, le cours manuel de secours est utilisé.</p></div>
    <div class="actions">
      <button :disabled="refreshing" @click="refresh">{{ refreshing ? "Actualisation…" : "↻ Actualiser les cours" }}</button>
      <button :disabled="backfilling" title="Télécharge les cours quotidiens depuis le premier achat (courbe et performances par période)" @click="backfill">{{ backfilling ? "Téléchargement…" : "⇩ Historique des cours" }}</button>
      <button @click="newAsset">+ Actif</button><button class="primary" :disabled="!assets.length" @click="newOp()">+ Opération</button>
    </div>
  </div>

  <div v-if="pf" class="grid c4" style="margin-bottom:16px">
    <div class="card kpi"><span class="label">Valeur actuelle</span><span class="value">{{ eur(pf.totals.value) }}</span><span class="hint">Investi : {{ eur(pf.invested) }} · récupéré : {{ eur(pf.recovered) }}</span></div>
    <div class="card kpi"><span class="label">Plus-value latente</span><span class="value" :class="sign(pf.totals.unrealized)">{{ eur(pf.totals.unrealized) }}</span><span class="hint" :class="sign(pf.totals.unrealizedPct)">{{ pct(pf.totals.unrealizedPct) }} du prix de revient</span></div>
    <div class="card kpi"><span class="label">Gain total</span><span class="value" :class="sign(pf.gain)">{{ eur(pf.gain) }}</span><span class="hint">latent + réalisé ({{ eur(pf.totals.realized) }}) + dividendes ({{ eur(pf.totals.dividends) }}) · perf. {{ pct(pf.performance) }}</span></div>
    <div class="card kpi"><span class="label">Rendement annualisé (TRI) <span v-if="!pf.irrInfo.reliable" class="tag warn" :title="pf.irrInfo.note ?? ''">peu fiable</span></span><span class="value" :class="sign(pf.irr)">{{ pct(pf.irr) }}</span>
      <span class="hint">{{ pf.irrInfo.note ? pf.irrInfo.note[0].toUpperCase() + pf.irrInfo.note.slice(1) + "." : "Tient compte des dates de chaque versement." }}</span></div>
  </div>
  <div v-if="lastRefresh" class="note" :class="lastRefresh.failed.length ? 'warn' : 'ok'" style="margin-bottom:12px">
    Cours actualisés le {{ new Date(lastRefresh.at).toLocaleString("fr-FR") }} : {{ lastRefresh.updated }} actif(s).<span v-if="lastRefresh.failed.length"> Sans cours web : {{ lastRefresh.failed.join(", ") }} — vérifie le symbole ou renseigne un cours manuel.</span>
  </div>

  <div v-if="pf">
    <div class="card pad0">
      <div class="table-wrap" style="max-height:520px">
        <table>
          <thead><tr><th>Actif</th><th>Compte</th><th class="num">Quantité</th><th class="num">PRU</th><th class="num">Cours</th><th>Source</th><th class="num">Valeur</th><th class="num">Plus-value</th><th class="num">%</th><th class="num">Poids</th><th></th></tr></thead>
          <tbody>
            <tr v-for="p in pf.positions" :key="p.asset_id" :class="{ muted: p.qty === 0 }">
              <td style="white-space:nowrap"><b>{{ p.name }}</b><div class="help">{{ p.symbol || "sans symbole" }} · {{ p.asset_class }}</div></td>
              <td class="muted" style="white-space:nowrap">{{ p.account }}</td>
              <td class="num">{{ num(p.qty) }}</td><td class="num">{{ p.pru === null ? "–" : eur(p.pru, p.pru < 1 ? 6 : 2) }}</td>
              <td class="num">{{ p.price === null ? "–" : eur(p.price, p.price < 1 ? 6 : 2) }}</td>
              <td><span class="tag" :class="p.priceSource === 'Manuel' ? 'warn' : p.priceSource ? 'ok' : 'neg'" :title="p.priceUpdatedAt ? 'Mis à jour le ' + new Date(p.priceUpdatedAt).toLocaleString('fr-FR') : ''">{{ p.priceSource || "⚠ aucun" }}</span></td>
              <td class="num"><b>{{ eur(p.value) }}</b></td>
              <td class="num" :class="sign(p.unrealized)">{{ eur(p.unrealized) }}</td><td class="num" :class="sign(p.unrealizedPct)">{{ pct(p.unrealizedPct) }}</td>
              <td class="num">{{ pct(p.weight) }}</td>
              <td style="white-space:nowrap"><button class="small" @click="newOp(p.asset_id)">+ op</button> <button class="small" @click="editAsset(assets.find((a) => a.id === p.asset_id))">✎</button> <button class="small danger" @click="deleteAsset(assets.find((a) => a.id === p.asset_id))">✕</button></td>
            </tr>
          </tbody>
        </table>
        <div v-if="!pf.positions.length" class="empty">Aucun actif. Ajoute un ETF ou une crypto, puis ses achats.</div>
      </div>
    </div>
  </div>

  <div v-if="hist && hist.points.length" class="grid" style="grid-template-columns: minmax(0, 1fr) 320px; margin-top:16px">
    <div class="card">
      <div class="card-title"><h2 style="margin:0">Évolution depuis le {{ date(hist.start) }}</h2>
        <span class="help">{{ hist.historyPoints }} cours historiques · {{ pct(hist.coverage, 0) }} de la valeur sur cours réels</span></div>
      <Chart :config="histChart" :height="400" />
    </div>
    <div class="card">
      <h3>Performance par période</h3>
      <table>
        <thead><tr><th>Période</th><th class="num">Perf.</th><th class="num">Gain</th></tr></thead>
        <tbody>
          <tr v-for="p in hist.periods" :key="p.label">
            <td>{{ p.label }}<div v-if="p.annualized !== null" class="help">soit {{ pct(p.annualized) }} / an</div></td>
            <td class="num" :class="p.reliable ? sign(p.twr) : 'muted'" :title="p.reason ?? ''">{{ p.twr === null ? "–" : pct(p.twr) }}<span v-if="!p.reliable && p.twr !== null"> *</span></td>
            <td class="num" :class="sign(p.gain)">{{ p.gain === null ? "–" : eur0(p.gain) }}</td>
          </tr>
        </tbody>
      </table>
      <p class="help" style="margin-top:8px">Performance pondérée par le temps : elle mesure tes placements sans être faussée par le moment de tes versements.</p>
      <p v-if="hist.periods.some((p) => !p.reliable && p.reason?.includes('historique'))" class="note warn" style="margin:8px 0 0;font-size:12px">Cours historiques manquants : clique sur « Historique des cours » pour des performances par période exactes.<span v-if="hist.periods.some((p) => p.twr !== null && !p.reliable)"> * estimation.</span></p>
      <p v-if="hist.approximateOps" class="note" style="margin:8px 0 0;font-size:12px">{{ hist.approximateOps }} achat(s) à date approximative : la performance de ces positions avant cette date est comptée le jour de l'achat. Corrige les dates (double-clic sur l'opération) pour un TRI juste.</p>
    </div>
  </div>

  <div class="grid" style="grid-template-columns: minmax(0, 1fr) 320px; margin-top:16px">
  <div class="card pad0">
    <div class="toolbar" style="padding:12px 14px 0"><h2 style="margin:0">Opérations</h2>
      <select v-model="opsFilter" style="margin-left:auto"><option value="">Tous les actifs</option><option v-for="a in assets" :key="a.id" :value="a.id">{{ a.name }}</option></select>
      <button class="small" @click="exportOps">Export Excel</button></div>
    <div class="table-wrap" style="max-height:420px">
      <table>
        <thead><tr><th>Date</th><th>Actif</th><th>Type</th><th class="num">Quantité</th><th class="num">Prix unitaire</th><th class="num">Frais</th><th class="num">Flux</th><th>Note</th><th></th></tr></thead>
        <tbody>
          <tr v-for="o in opsShown" :key="o.id" class="clickable" @dblclick="editOp(o)">
            <td>{{ date(o.date) }}</td><td>{{ o.asset }}</td><td><span class="tag" :class="o.kind === 'Achat' ? '' : o.kind === 'Vente' ? 'warn' : 'ok'">{{ o.kind }}</span></td>
            <td class="num">{{ num(o.quantity) }}</td><td class="num">{{ eur(o.unit_price, o.unit_price < 1 ? 6 : 2) }}</td><td class="num">{{ eur(o.fees) }}</td>
            <td class="num" :class="sign(opTotal(o))">{{ eur(opTotal(o)) }}</td><td class="muted">{{ o.note }}</td>
            <td><button class="small" @click="editOp(o)">✎</button> <button class="small danger" @click="deleteOp(o)">✕</button></td>
          </tr>
        </tbody>
      </table>
      <div v-if="!opsShown.length" class="empty">Aucune opération.</div>
    </div>
  </div>
    <div v-if="pf" class="card">
      <h3>Répartition</h3>
      <Chart :config="weightChart" :height="220" />
      <table style="margin-top:10px"><tbody><tr v-for="[c, v] in byClass" :key="c"><td>{{ c }}</td><td class="num">{{ eur0(v) }}</td><td class="num muted">{{ pct(pf.totals.value ? v / pf.totals.value : null) }}</td></tr></tbody></table>
    </div>
  </div>

  <Modal v-if="assetModal" :title="assetModal.id ? 'Modifier l\'actif' : 'Nouvel actif'" @close="assetModal = null">
    <div class="form">
      <label class="field full">Nom<input v-model="assetModal.name" placeholder="ex. Vanguard S&P 500 (VUAA)" /></label>
      <label class="field">Classe<select v-model="assetModal.asset_class"><option v-for="c in classes" :key="c">{{ c }}</option></select></label>
      <label class="field">Compte<select v-model="assetModal.account_id"><option value="">–</option><option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }}</option></select></label>
      <label class="field">Symbole de cotation<input v-model="assetModal.symbol" :placeholder="assetModal.asset_class === 'Crypto' ? 'id CoinGecko, ex. bitcoin' : 'symbole Yahoo, ex. VUAA.DE'" /></label>
      <label class="field">Cours manuel de secours (€)<input v-model="assetModal.manual_price" type="number" step="any" /></label>
    </div>
    <p class="help">ETF / actions : symbole Yahoo Finance (suffixe .DE pour Xetra, .PA pour Paris). Cryptos : identifiant CoinGecko, visible dans l'adresse de la page coingecko.com (ex. « bitcoin », « ethereum », « polygon-ecosystem-token »).</p>
    <template #foot><button @click="assetModal = null">Annuler</button><button class="primary" :disabled="!assetModal.name" @click="saveAsset">Enregistrer</button></template>
  </Modal>

  <Modal v-if="opModal" :title="opModal.id ? 'Modifier l\'opération' : 'Nouvelle opération'" @close="opModal = null">
    <div class="form">
      <label class="field">Date<input v-model="opModal.date" type="date" /></label>
      <label class="field">Actif<select v-model="opModal.asset_id"><option v-for="a in assets" :key="a.id" :value="a.id">{{ a.name }}</option></select></label>
      <label class="field">Type<select v-model="opModal.kind"><option>Achat</option><option>Vente</option><option>Dividende</option><option>Frais</option></select></label>
      <label class="field">Quantité<input v-model="opModal.quantity" type="number" step="any" :placeholder="opModal.kind === 'Dividende' ? '1' : ''" /></label>
      <label class="field">Prix unitaire (€)<input v-model="opModal.unit_price" type="number" step="any" :placeholder="opModal.kind === 'Dividende' ? 'montant reçu' : ''" /></label>
      <label class="field">Frais (€)<input v-model="opModal.fees" type="number" step="any" /></label>
      <label class="field full">Note<input v-model="opModal.note" /></label>
    </div>
    <p class="help">Dividende : quantité 1 et prix unitaire = montant reçu. Frais seuls : type « Frais » avec le montant dans Frais.</p>
    <template #foot><button @click="opModal = null">Annuler</button><button class="primary" :disabled="!opModal.asset_id || !opModal.date" @click="saveOp">Enregistrer</button></template>
  </Modal>
</template>
