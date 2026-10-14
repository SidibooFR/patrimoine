<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api, files } from "../api";
import { eur, date } from "../format";
import { guard } from "../toast";

const previews = ref<{ file: string; preview: any; result?: any; error?: string }[]>([]);
const busy = ref(false);
const maps = ref<any[]>([]);
const accounts = ref<any[]>([]);
const newMap = ref({ source: "boursobank", key: "", account_id: "" as number | "" });

const SOURCE_LABEL: Record<string, string> = { bnp: "BNP Paribas", boursobank: "Boursobank", revolut: "Revolut" };

async function loadMaps() { maps.value = await api.listImportAccountMap(); }
onMounted(async () => { accounts.value = await api.listAccounts(); await loadMaps(); });

async function choose() {
  const paths = await files.open({ title: "Exports bancaires", multi: true, filters: [{ name: "Exports bancaires", extensions: ["xls", "xlsx", "csv"] }] });
  for (const file of paths) {
    try { previews.value.push({ file, preview: await api.previewImport(file) }); }
    catch (e) { previews.value.push({ file, preview: null, error: (e as Error).message }); }
  }
}
async function importAll() {
  busy.value = true;
  for (const p of previews.value) {
    if (!p.preview || p.result) continue;
    try { p.result = await api.importFile(p.file, p.preview.source); } catch (e) { p.error = (e as Error).message; }
  }
  busy.value = false;
}
function clear() { previews.value = []; }
async function addMap() {
  if (!newMap.value.key || !newMap.value.account_id) return;
  await guard(() => api.saveImportAccountMap({ source: newMap.value.source, key: newMap.value.key, account_id: Number(newMap.value.account_id) }), "Correspondance enregistrée");
  newMap.value.key = ""; await loadMaps();
}
async function delMap(id: number) { await guard(() => api.deleteImportAccountMap(id)); await loadMaps(); }
async function setMapAccount(m: any, v: string) { await guard(() => api.saveImportAccountMap({ id: m.id, source: m.source, key: m.key, account_id: Number(v) })); await loadMaps(); }
</script>

<template>
  <div class="page-head">
    <div><h1>Importer des relevés</h1><p class="sub">Exports BNP Paribas (.xls), Boursobank (.xlsx) et Revolut (.csv). La banque est détectée automatiquement, les doublons ignorés, les opérations catégorisées selon tes règles.</p></div>
    <div class="actions"><button class="primary" @click="choose">Choisir des fichiers…</button><button v-if="previews.length" @click="clear">Vider</button></div>
  </div>

  <div v-if="!previews.length" class="card">
    <h2>Comment exporter</h2>
    <div class="grid c3">
      <div><b>BNP Paribas</b><p class="help">Mes comptes → Historique des opérations → Télécharger → format <b>Excel (.xls)</b>. Un fichier par compte.</p></div>
      <div><b>Boursobank</b><p class="help">Compte → Mouvements → Exporter → <b>Excel (.xlsx)</b>. Un fichier par compte (courant, LEP…) : le compte est reconnu grâce à son libellé.</p></div>
      <div><b>Revolut</b><p class="help">Comptes → Relevé → format <b>CSV</b>, tous comptes. Le compte courant et le compte d'épargne sont séparés automatiquement.</p></div>
    </div>
    <p class="help" style="margin-top:8px">Tu peux ré-importer un export qui chevauche le précédent : les opérations déjà présentes sont ignorées.</p>
  </div>

  <div v-for="p in previews" :key="p.file" class="card" style="margin-bottom:12px">
    <div class="card-title">
      <div><b>{{ p.file.split(/[\\/]/).pop() }}</b> <span v-if="p.preview" class="tag">{{ SOURCE_LABEL[p.preview.source] }}</span></div>
      <div v-if="p.result" class="tag ok">Importé</div>
    </div>
    <div v-if="p.error" class="note err">{{ p.error }}</div>
    <template v-else-if="p.preview">
      <p class="help">{{ p.preview.count }} opérations du {{ date(p.preview.from) }} au {{ date(p.preview.to) }} · compte(s) : {{ p.preview.accounts.join(", ") }}</p>
      <div v-if="p.result" class="note ok">
        {{ p.result.inserted }} nouvelle(s) opération(s) · {{ p.result.duplicates }} doublon(s) ignoré(s) · {{ p.result.uncategorized }} à catégoriser
        <span v-if="p.result.unknownAccounts.length" class="warn"> · comptes non reconnus : {{ p.result.unknownAccounts.join(", ") }} (ajoute une correspondance ci-dessous)</span>
      </div>
      <table v-else>
        <thead><tr><th>Date</th><th>Compte (export)</th><th>Libellé</th><th>Catégorie banque</th><th class="num">Montant</th></tr></thead>
        <tbody><tr v-for="(r, i) in p.preview.sample" :key="i"><td>{{ date(r.date) }}</td><td class="muted">{{ r.accountKey }}</td><td class="ellipsis">{{ r.label }}</td><td class="muted">{{ r.bank_category }}</td><td class="num" :class="r.amount < 0 ? 'neg' : 'pos'">{{ eur(r.amount) }}</td></tr></tbody>
      </table>
    </template>
  </div>
  <div v-if="previews.some((p) => p.preview && !p.result)" class="toolbar">
    <button class="primary" :disabled="busy" @click="importAll">{{ busy ? "Import en cours…" : "Importer dans la base" }}</button>
  </div>

  <div class="card" style="margin-top:20px">
    <h2>Correspondance export → compte</h2>
    <p class="help">Associe le libellé de compte présent dans chaque export à l'un de tes comptes. « * » = compte par défaut pour cette banque.</p>
    <table>
      <thead><tr><th>Banque</th><th>Libellé dans l'export</th><th>Compte</th><th></th></tr></thead>
      <tbody>
        <tr v-for="m in maps" :key="m.id">
          <td>{{ SOURCE_LABEL[m.source] ?? m.source }}</td><td><code>{{ m.key }}</code></td>
          <td><select :value="m.account_id" @change="setMapAccount(m, ($event.target as HTMLSelectElement).value)"><option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }}</option></select></td>
          <td><button class="small danger" @click="delMap(m.id)">✕</button></td>
        </tr>
        <tr>
          <td><select v-model="newMap.source"><option value="bnp">BNP Paribas</option><option value="boursobank">Boursobank</option><option value="revolut">Revolut</option></select></td>
          <td><input v-model="newMap.key" placeholder="ex. LIVRET A" /></td>
          <td><select v-model="newMap.account_id"><option value="" disabled>Compte…</option><option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }}</option></select></td>
          <td><button class="small primary" @click="addMap">Ajouter</button></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
