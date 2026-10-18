<script setup lang="ts">
import PageHeader from "../components/PageHeader.vue";
import { onMounted, ref } from "vue";
import { api, files, isElectron } from "../lib/api";
import { guard, notify } from "../lib/toast";
import { applyAppearance, fromSettings, DEFAULT_ACCENT, DEFAULT_FONT } from "../lib/appearance";
import AccountsCard from "./settings/AccountsCard.vue";
import CategoriesCard from "./settings/CategoriesCard.vue";
import PreferencesCard from "./settings/PreferencesCard.vue";
import AppearanceCard from "./settings/AppearanceCard.vue";
import McpCard from "./settings/McpCard.vue";
import UpdatesCard from "./settings/UpdatesCard.vue";
import type { NewAccount } from "./settings/AccountsCard.vue";
import type { NewCategory } from "./settings/CategoriesCard.vue";
import type { Account, Category } from "../../core/schema";

const accounts = ref<Account[]>([]);
const categories = ref<Category[]>([]);
const meta = ref<{ assetClasses: readonly string[]; accountTypes: readonly string[]; categoryKinds: readonly string[]; version: string }>({ assetClasses: [], accountTypes: [], categoryKinds: [], version: "" });
const settings = ref<Record<string, string>>({});
const paths = ref<{ db: string; documents: string; mcpServer: string }>({ db: "", documents: "", mcpServer: "" });

async function load() {
  [accounts.value, categories.value, meta.value, settings.value, paths.value] = await Promise.all([api.listAccounts(true), api.listCategories(), api.meta(), api.settings(), files.paths()]);
}
onMounted(load);

async function saveAcc(a: Account, patch: Partial<Account>) { await guard(() => api.saveAccount({ ...a, ...patch })); await load(); }
async function addAcc(acc: NewAccount) { await guard(() => api.saveAccount(acc), "Compte ajouté"); await load(); }
async function delAcc(a: Account) { if (!window.confirm(`Supprimer le compte « ${a.name} » ?`)) return; await guard(() => api.deleteAccount(a.id), "Compte supprimé"); await load(); }
async function saveCat(c: Category, patch: Partial<Category>) { await guard(() => api.saveCategory({ ...c, ...patch })); await load(); }
async function addCat(cat: NewCategory) { await guard(() => api.saveCategory(cat), "Catégorie ajoutée"); await load(); }
async function delCat(c: Category) { if (!window.confirm(`Supprimer « ${c.name} » ? Les opérations de cette catégorie redeviendront « sans catégorie ».`)) return; await guard(() => api.deleteCategory(c.id)); await load(); }
async function setSetting(k: string, v: string) { settings.value = (await guard(() => api.setSetting(k, v))) ?? settings.value; }
async function setLook(k: string, v: string) { await setSetting(k, v); applyAppearance(fromSettings(settings.value)); }
async function resetLook() {
  for (const [k, v] of [["ui_accent", DEFAULT_ACCENT], ["ui_font", DEFAULT_FONT], ["ui_scale", "1"]]) await setSetting(k, v);
  applyAppearance(fromSettings(settings.value)); notify("Apparence réinitialisée");
}

async function exportExcel() {
  const f = await files.save({ title: "Exporter vers Excel", defaultPath: `${paths.value.documents}/Patrimoine ${new Date().toISOString().slice(0, 10)}.xlsx`, filters: [{ name: "Excel", extensions: ["xlsx"] }] });
  if (!f) return;
  const r = await guard(() => api.exportExcel(f), "Export Excel créé");
  if (r && isElectron) files.showItem(f);
}
</script>

<template>
  <PageHeader title="Paramètres" sub="Comptes, catégories, réglages, export et connexion à Claude.">
    <md-filled-button @click="exportExcel">⇪ Exporter tout vers Excel</md-filled-button>
  </PageHeader>

  <div class="grid c2">
    <AccountsCard :accounts="accounts" :account-types="meta.accountTypes" :asset-classes="meta.assetClasses" @save="saveAcc" @add="addAcc" @remove="delAcc" />
    <CategoriesCard :categories="categories" :category-kinds="meta.categoryKinds" @save="saveCat" @add="addCat" @remove="delCat" />
    <PreferencesCard :settings="settings" :categories="categories" :db-path="paths.db" @set="setSetting" />
    <AppearanceCard @set-look="setLook" @reset="resetLook" />
    <McpCard :mcp-server="paths.mcpServer" />
    <UpdatesCard :version="meta.version" />
  </div>
</template>
