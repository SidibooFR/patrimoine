<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { api } from "../lib/api";
import { guard, notify } from "../lib/toast";

const rules = ref<any[]>([]);
const bankMap = ref<any[]>([]);
const unmapped = ref<any[]>([]);
const categories = ref<any[]>([]);
const search = ref("");
const newRule = ref({ keyword: "", category_id: "" as number | "" });
const newMap = ref({ bank_label: "", category_id: "" as number | "" });

async function load() {
  [rules.value, bankMap.value, unmapped.value, categories.value] = await Promise.all([api.listRules(), api.listBankCategoryMap(), api.unmappedBankCategories(), api.listCategories()]);
}
onMounted(load);
const filtered = computed(() => rules.value.filter((r) => !search.value || r.keyword.toLowerCase().includes(search.value.toLowerCase()) || r.category.toLowerCase().includes(search.value.toLowerCase())));

async function recat() { const r = await guard(() => api.recategorize()); if (r) notify(`${r.updated} opération(s) recatégorisée(s) · ${r.uncategorized} sans catégorie`); await load(); }
async function addRule() {
  if (!newRule.value.keyword || newRule.value.category_id === "") return;
  await guard(() => api.saveRule({ keyword: newRule.value.keyword, category_id: Number(newRule.value.category_id) }));
  newRule.value.keyword = ""; await recat();
}
async function setRuleCat(r: any, v: string) { await guard(() => api.saveRule({ id: r.id, keyword: r.keyword, category_id: Number(v) })); await recat(); }
async function setRuleKw(r: any, v: string) { if (v.trim() && v !== r.keyword) { await guard(() => api.saveRule({ id: r.id, keyword: v, category_id: r.category_id })); await recat(); } }
async function delRule(r: any) { await guard(() => api.deleteRule(r.id)); await recat(); }
async function addMap(label?: string) {
  const bank_label = label ?? newMap.value.bank_label;
  const cat = label ? Number(window.prompt("Id de catégorie ?")) : Number(newMap.value.category_id);
  if (!bank_label || !cat) return;
  await guard(() => api.saveBankCategoryMap({ bank_label, category_id: cat }));
  newMap.value.bank_label = ""; await recat();
}
async function setMapCat(m: any, v: string) { await guard(() => api.saveBankCategoryMap({ id: m.id, bank_label: m.bank_label, category_id: Number(v) })); await recat(); }
async function delMap(m: any) { await guard(() => api.deleteBankCategoryMap(m.id)); await recat(); }
const quickMap = ref<Record<string, number | "">>({});
async function quickAdd(label: string) {
  const c = quickMap.value[label];
  if (!c) return;
  await guard(() => api.saveBankCategoryMap({ bank_label: label, category_id: Number(c) }));
  await recat();
}
</script>

<template>
  <div class="page-head">
    <div><h1>Règles de catégorisation</h1>
      <p class="sub">1) Un mot-clé trouvé dans le libellé donne la catégorie (le mot-clé le plus long l'emporte). 2) Sinon, la catégorie proposée par la banque est convertie. 3) Sinon l'opération reste à catégoriser.</p></div>
    <div class="actions"><button @click="recat">↻ Recatégoriser tout</button></div>
  </div>

  <div v-if="unmapped.length" class="card" style="margin-bottom:16px">
    <h2>Catégories bancaires sans correspondance</h2>
    <p class="help">Ces catégories apparaissent dans tes exports sur des opérations encore non classées. Associe-les en un clic.</p>
    <table>
      <thead><tr><th>Catégorie banque</th><th class="num">Opérations</th><th>Ma catégorie</th></tr></thead>
      <tbody><tr v-for="u in unmapped" :key="u.bank_category"><td>{{ u.bank_category }}</td><td class="num">{{ u.n }}</td>
        <td><select v-model="quickMap[u.bank_category]" @change="quickAdd(u.bank_category)"><option value="" disabled selected>Choisir…</option><option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option></select></td></tr></tbody>
    </table>
  </div>

  <div class="grid c2">
    <div class="card">
      <div class="card-title"><h2 style="margin:0">Mots-clés ({{ rules.length }})</h2><input v-model="search" placeholder="Filtrer…" /></div>
      <table>
        <thead><tr><th>Mot-clé</th><th>Catégorie</th><th></th></tr></thead>
        <tbody>
          <tr><td><input v-model="newRule.keyword" placeholder="Nouveau mot-clé" style="width:100%" @keyup.enter="addRule" /></td>
            <td><select v-model="newRule.category_id" style="width:100%"><option value="" disabled>Catégorie…</option><option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option></select></td>
            <td><button class="small primary" @click="addRule">+</button></td></tr>
          <tr v-for="r in filtered" :key="r.id">
            <td><input :value="r.keyword" class="cell" style="text-align:left;background:#fff" @change="setRuleKw(r, ($event.target as HTMLInputElement).value)" /></td>
            <td><select :value="r.category_id" style="width:100%" @change="setRuleCat(r, ($event.target as HTMLSelectElement).value)"><option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option></select></td>
            <td><button class="small danger" @click="delRule(r)">✕</button></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="card">
      <h2>Catégories bancaires → mes catégories ({{ bankMap.length }})</h2>
      <table>
        <thead><tr><th>Catégorie banque</th><th>Ma catégorie</th><th></th></tr></thead>
        <tbody>
          <tr><td><input v-model="newMap.bank_label" placeholder="Libellé exact de la banque" style="width:100%" /></td>
            <td><select v-model="newMap.category_id" style="width:100%"><option value="" disabled>Catégorie…</option><option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option></select></td>
            <td><button class="small primary" @click="addMap()">+</button></td></tr>
          <tr v-for="m in bankMap" :key="m.id">
            <td>{{ m.bank_label }}</td>
            <td><select :value="m.category_id" style="width:100%" @change="setMapCat(m, ($event.target as HTMLSelectElement).value)"><option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option></select></td>
            <td><button class="small danger" @click="delMap(m)">✕</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
