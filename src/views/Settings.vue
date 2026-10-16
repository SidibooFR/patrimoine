<script setup lang="ts">
import PageHeader from "../components/PageHeader.vue";
import { onMounted, ref, computed } from "vue";
import { api, files, isElectron } from "../lib/api";
import { guard, notify } from "../lib/toast";
import { appearance, applyAppearance, fromSettings, ACCENT_PRESETS, FONTS, SCALES, CURRENCIES, DEFAULT_ACCENT, DEFAULT_FONT } from "../lib/appearance";
import { eur } from "../lib/format";
import { update, checkUpdate, installUpdate, describe } from "../lib/update";

const accounts = ref<any[]>([]);
const categories = ref<any[]>([]);
const meta = ref<any>({ assetClasses: [], accountTypes: [], categoryKinds: [] });
const settings = ref<Record<string, string>>({});
const paths = ref<{ db: string; documents: string; mcpServer: string }>({ db: "", documents: "", mcpServer: "" });
const newAcc = ref({ name: "", institution: "", type: "Courant", asset_class: "Liquidités" });
const newCat = ref({ name: "", kind: "Dépense" });
const showArchived = ref(false);

async function load() {
  [accounts.value, categories.value, meta.value, settings.value, paths.value] = await Promise.all([api.listAccounts(true), api.listCategories(), api.meta(), api.settings(), files.paths()]);
}
onMounted(load);
const accountsShown = computed(() => accounts.value.filter((a) => showArchived.value || !a.archived));

async function saveAcc(a: any, patch: any) { await guard(() => api.saveAccount({ ...a, ...patch })); await load(); }
async function addAcc() { if (!newAcc.value.name) return; await guard(() => api.saveAccount(newAcc.value), "Compte ajouté"); newAcc.value.name = ""; await load(); }
async function delAcc(a: any) { if (!window.confirm(`Supprimer le compte « ${a.name} » ?`)) return; await guard(() => api.deleteAccount(a.id), "Compte supprimé"); await load(); }
async function saveCat(c: any, patch: any) { await guard(() => api.saveCategory({ ...c, ...patch })); await load(); }
async function addCat() { if (!newCat.value.name) return; await guard(() => api.saveCategory(newCat.value), "Catégorie ajoutée"); newCat.value.name = ""; await load(); }
async function delCat(c: any) { if (!window.confirm(`Supprimer « ${c.name} » ? Les opérations de cette catégorie redeviendront « sans catégorie ».`)) return; await guard(() => api.deleteCategory(c.id)); await load(); }
async function setSetting(k: string, v: string) { settings.value = (await guard(() => api.setSetting(k, v))) ?? settings.value; }
async function setLook(k: string, v: string) { await setSetting(k, v); applyAppearance(fromSettings(settings.value)); }
async function resetLook() {
  for (const [k, v] of [["ui_accent", DEFAULT_ACCENT], ["ui_font", DEFAULT_FONT], ["ui_scale", "1"]]) await setSetting(k, v);
  applyAppearance(fromSettings(settings.value)); notify("Apparence réinitialisée");
}
const excluded = computed(() => (settings.value.recurring_exclude_categories ?? "").split("|").filter(Boolean));
function setExcluded(el: HTMLSelectElement) { setSetting("recurring_exclude_categories", Array.from(el.selectedOptions).map((o) => o.value).join("|")); }

async function exportExcel() {
  const f = await files.save({ title: "Exporter vers Excel", defaultPath: `${paths.value.documents}/Patrimoine ${new Date().toISOString().slice(0, 10)}.xlsx`, filters: [{ name: "Excel", extensions: ["xlsx"] }] });
  if (!f) return;
  const r = await guard(() => api.exportExcel(f), "Export Excel créé");
  if (r && isElectron) files.showItem(f);
}
const mcpConfig = computed(() => JSON.stringify({ mcpServers: { patrimoine: { command: "node", args: [paths.value.mcpServer.replace(/\\/g, "/")] } } }, null, 2));
async function copyConfig() { await navigator.clipboard.writeText(mcpConfig.value); notify("Configuration copiée"); }
</script>

<template>
  <PageHeader title="Paramètres" sub="Comptes, catégories, réglages, export et connexion à Claude.">
    <button class="primary" @click="exportExcel">⇪ Exporter tout vers Excel</button>
  </PageHeader>

  <div class="grid c2">
    <div class="card" style="grid-column: 1 / -1">
      <div class="card-title"><h2>Comptes</h2><label class="help"><input v-model="showArchived" type="checkbox" /> archivés</label></div>
      <table>
        <thead><tr><th>Nom</th><th>Établissement</th><th>Type</th><th>Classe d'actif</th><th></th></tr></thead>
        <tbody>
          <tr v-for="a in accountsShown" :key="a.id" :class="{ muted: a.archived }">
            <td style="min-width:260px"><input class="cell cell-left" :value="a.name" @change="saveAcc(a, { name: ($event.target as HTMLInputElement).value })" /></td>
            <td style="min-width:160px"><input class="cell cell-left" :value="a.institution" @change="saveAcc(a, { institution: ($event.target as HTMLInputElement).value })" /></td>
            <td><select :value="a.type" @change="saveAcc(a, { type: ($event.target as HTMLSelectElement).value })"><option v-for="t in meta.accountTypes" :key="t">{{ t }}</option></select></td>
            <td><select :value="a.asset_class" @change="saveAcc(a, { asset_class: ($event.target as HTMLSelectElement).value })"><option v-for="c in meta.assetClasses" :key="c">{{ c }}</option></select></td>
            <td class="nowrap"><button class="small" :title="a.archived ? 'Réactiver' : 'Archiver'" @click="saveAcc(a, { archived: a.archived ? 0 : 1 })">{{ a.archived ? "↶" : "▣" }}</button> <button class="small danger" @click="delAcc(a)">✕</button></td>
          </tr>
          <tr><td><input v-model="newAcc.name" placeholder="Nouveau compte" @keyup.enter="addAcc" class="w-full" /></td><td><input v-model="newAcc.institution" placeholder="Banque" class="w-full" /></td>
            <td><select v-model="newAcc.type"><option v-for="t in meta.accountTypes" :key="t">{{ t }}</option></select></td>
            <td><select v-model="newAcc.asset_class"><option v-for="c in meta.assetClasses" :key="c">{{ c }}</option></select></td>
            <td><button class="small primary" @click="addAcc">+</button></td></tr>
        </tbody>
      </table>
      <p class="help">La classe d'actif sert au suivi du patrimoine et à l'allocation. Pour qu'un export bancaire alimente un compte, ajoute la correspondance dans Importer.</p>
    </div>

    <div class="card">
      <h2>Catégories</h2>
      <table>
        <thead><tr><th>Nom</th><th>Type</th><th></th></tr></thead>
        <tbody>
          <tr v-for="c in categories" :key="c.id">
            <td><input class="cell cell-left" :value="c.name" @change="saveCat(c, { name: ($event.target as HTMLInputElement).value })" /></td>
            <td><select :value="c.kind" @change="saveCat(c, { kind: ($event.target as HTMLSelectElement).value })"><option v-for="k in meta.categoryKinds" :key="k">{{ k }}</option></select></td>
            <td><button class="small danger" @click="delCat(c)">✕</button></td>
          </tr>
          <tr><td><input v-model="newCat.name" placeholder="Nouvelle catégorie" @keyup.enter="addCat" class="w-full" /></td><td><select v-model="newCat.kind"><option v-for="k in meta.categoryKinds" :key="k">{{ k }}</option></select></td><td><button class="small primary" @click="addCat">+</button></td></tr>
        </tbody>
      </table>
      <p class="help">Revenu / Dépense entrent dans le taux d'épargne. Épargne = argent placé (compté à part). Transfert = virement entre tes comptes, ignoré.</p>
    </div>

    <div class="card">
      <h2>Réglages</h2>
      <div class="form">
        <label class="field">Épargne de précaution (mois de dépenses)<input type="number" min="1" max="24" :value="settings.emergency_months" @change="setSetting('emergency_months', ($event.target as HTMLInputElement).value)" /></label>
        <label class="field">Tolérance d'écart d'allocation (%)<input type="number" min="0" max="50" :value="Number(settings.allocation_tolerance) * 100" @change="setSetting('allocation_tolerance', String(Number(($event.target as HTMLInputElement).value) / 100))" /></label>
        <label class="field">Premier mois de suivi<input type="month" :value="(settings.start_month ?? '').slice(0, 7)" @change="setSetting('start_month', ($event.target as HTMLInputElement).value + '-01')" /></label>
        <label class="field">Alerte livret sous-utilisé (rempli à moins de, %)<input type="number" min="0" max="100" :value="Number(settings.envelope_underuse_threshold ?? 0.5) * 100" @change="setSetting('envelope_underuse_threshold', String(Number(($event.target as HTMLInputElement).value) / 100))" /></label>
        <label class="field">À garder sur les comptes courants (mois de dépenses)<input type="number" min="0" max="12" step="0.5" :value="settings.checking_buffer_months ?? 1" @change="setSetting('checking_buffer_months', ($event.target as HTMLInputElement).value)" /></label>
        <label class="field full">Catégories exclues de la détection d'abonnements
          <select multiple size="5" @change="setExcluded($event.target as HTMLSelectElement)"><option v-for="c in categories.filter((x) => x.kind === 'Dépense')" :key="c.id" :value="c.name" :selected="excluded.includes(c.name)">{{ c.name }}</option></select>
          <span class="help">Dépenses variables (courses, restaurants…) qui reviennent souvent sans être des abonnements. Ctrl+clic pour en choisir plusieurs.</span></label>
      </div>
      <p class="help mt-2">Base de données : <code>{{ paths.db }}</code><br />Sauvegarde = copier ce fichier. Pour repartir de zéro, supprime-le (l'application le recrée avec les valeurs par défaut).</p>
    </div>

    <div class="card">
      <div class="card-title"><h2>Apparence</h2><button class="small" @click="resetLook">Réinitialiser</button></div>
      <div class="form">
        <div class="field full">Couleur principale
          <div class="swatches">
            <button v-for="c in ACCENT_PRESETS" :key="c.color" class="swatch" :class="{ on: appearance.accent.toLowerCase() === c.color }" :style="{ background: c.color }" :title="c.name" @click="setLook('ui_accent', c.color)"></button>
            <label class="swatch custom" title="Couleur personnalisée" :class="{ on: !ACCENT_PRESETS.some((c) => c.color === appearance.accent.toLowerCase()) }" :style="{ background: appearance.accent }">
              <input type="color" :value="appearance.accent" @change="setLook('ui_accent', ($event.target as HTMLInputElement).value)" />✎</label>
          </div>
        </div>
        <label class="field">Police<select :value="appearance.font" @change="setLook('ui_font', ($event.target as HTMLSelectElement).value)"><option v-for="f in FONTS" :key="f.id" :value="f.id" :style="{ fontFamily: f.stack }">{{ f.name }}</option></select></label>
        <label class="field">Taille du texte<select :value="appearance.scale" @change="setLook('ui_scale', ($event.target as HTMLSelectElement).value)"><option v-for="z in SCALES" :key="z.value" :value="z.value">{{ z.name }} ({{ Math.round(z.value * 100) }} %)</option></select></label>
        <label class="field full">Devise<select :value="appearance.currency" @change="setLook('currency', ($event.target as HTMLSelectElement).value)"><option v-for="c in CURRENCIES" :key="c.code" :value="c.code">{{ c.code }} – {{ c.name }}</option></select>
          <span class="help">Aperçu : {{ eur(1234.5) }}. Les montants ne sont pas convertis : choisis la devise dans laquelle sont tenus tes comptes. Les cours bourse et crypto sont récupérés dans cette devise.</span></label>
      </div>
    </div>

    <div class="card">
      <h2>Claude (serveur MCP)</h2>
      <p class="help">Claude Desktop peut lire et modifier tes données via le serveur MCP fourni (42 outils : tableau de bord, relevés, import, règles, remboursements, budget, abonnements, objectifs, patrimoine, livrets et PEA, portefeuille et historique des cours, allocation, projection, export). Ajoute ceci dans <code>claude_desktop_config.json</code> (Paramètres → Développeur → Modifier la configuration), puis redémarre Claude Desktop. Node.js doit être installé.</p>
      <pre>{{ mcpConfig }}</pre>
      <button @click="copyConfig">Copier la configuration</button>
      <p class="help mt-1">L'application et Claude partagent le même fichier de base : les modifications faites par l'un sont visibles par l'autre au prochain rafraîchissement de page (<kbd>Ctrl</kbd>+<kbd>R</kbd>).</p>
    </div>

    <div class="card">
      <h2>Mises à jour</h2>
      <p>Version installée : <b>{{ meta.version }}</b><br /><span class="help">{{ describe(update) }}</span></p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button :disabled="['unsupported', 'checking', 'downloading', 'downloaded'].includes(update.status)" @click="checkUpdate">Rechercher une mise à jour</button>
        <button v-if="update.status === 'downloaded'" class="primary" @click="installUpdate">Redémarrer et installer</button>
        <button v-if="update.status === 'portable'" class="primary" @click="installUpdate">Ouvrir la page de téléchargement</button>
      </div>
      <p class="help mt-1">L'application vérifie au démarrage puis toutes les 6 heures s'il existe une nouvelle version sur GitHub et la télécharge en arrière-plan. Elle s'installe en redémarrant, ou automatiquement à la prochaine fermeture. Tes données ne sont pas touchées.</p>
    </div>
  </div>
</template>
