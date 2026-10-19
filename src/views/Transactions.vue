<script setup lang="ts">
import PageHeader from "../components/PageHeader.vue";
import { onMounted, ref, reactive, watch, computed } from "vue";
import { useRoute } from "vue-router";
import { api } from "../lib/api";
import { eur, date, sign, todayIso } from "../lib/format";
import { guard } from "../lib/toast";
import SelectField from "../components/SelectField.vue";
import RuleModal from "./transactions/RuleModal.vue";
import TransactionModal from "./transactions/TransactionModal.vue";
import type { TransactionDraft } from "./transactions/TransactionModal.vue";
import type { TxFilter } from "../../core/api";
import type { Account, Category, TransactionRow } from "../../core/schema";

const accounts = ref<Account[]>([]);
const categories = ref<Category[]>([]);
const filter = reactive<{ from: string; to: string; account_id: number | ""; category: string; kind: string; search: string; source: string }>({ from: "", to: "", account_id: "", category: "", kind: "", search: "", source: "" });
const result = ref<{ total: number; sum: number; rows: TransactionRow[] }>({ total: 0, sum: 0, rows: [] });
const page = ref(0);
const PAGE = 200;

async function load() {
  const f: TxFilter = { limit: PAGE, offset: page.value * PAGE };
  if (filter.from) f.from = filter.from; if (filter.to) f.to = filter.to;
  if (filter.account_id) f.account_id = filter.account_id;
  if (filter.category === "none") f.uncategorized = true; else if (filter.category) f.category_id = Number(filter.category);
  if (filter.kind) f.kind = filter.kind; if (filter.search) f.search = filter.search; if (filter.source) f.source = filter.source;
  const r = await guard(() => api.listTransactions(f));
  if (r) result.value = r;
}
const route = useRoute();
onMounted(async () => {
  [accounts.value, categories.value] = await Promise.all([api.listAccounts(), api.listCategories()]);
  // Filtres passés par l'URL (ex. « Ouvrir dans Relevés » depuis l'onglet Budget) : #/releves?category_id=9&from=…&to=…
  const q = route.query;
  if (typeof q.category_id === "string") filter.category = q.category_id;
  if (typeof q.from === "string") filter.from = q.from;
  if (typeof q.to === "string") filter.to = q.to;
  await load();
});
let t: ReturnType<typeof setTimeout> | undefined;
watch(filter, () => { page.value = 0; clearTimeout(t); t = setTimeout(load, 250); });
watch(page, load);
const pages = computed(() => Math.ceil(result.value.total / PAGE));

// Édition inline de la catégorie
async function setCategory(row: TransactionRow, v: string) {
  const category_id = v === "" ? null : Number(v);
  await guard(() => api.updateTransaction(row.id, { category_id }));
  const c = categories.value.find((x) => x.id === category_id);
  row.category_id = category_id; row.category = c?.name ?? null; row.kind = c?.kind ?? null; row.category_manual = 1;
}
const ruleModal = ref<null | { keyword: string; category_id: number | ""; label: string }>(null);
function ruleFrom(row: TransactionRow) { ruleModal.value = { keyword: row.label, category_id: row.category_id ?? "", label: row.label }; }

// Ajout / édition manuelle
const modal = ref<TransactionDraft | null>(null);
function openNew() { modal.value = { date: todayIso(), account_id: accounts.value[0]?.id, label: "", amount: null, category_id: "", note: "", direction: "-" }; }
function openEdit(row: TransactionRow) { if (row.source !== "manuel") return; modal.value = { ...row, amount: Math.abs(row.amount), direction: row.amount < 0 ? "-" : "+", category_id: row.category_id ?? "" }; }
async function remove(row: TransactionRow) {
  if (!window.confirm(`Supprimer « ${row.label} » (${eur(row.amount)}) ?`)) return;
  await guard(() => api.deleteTransaction(row.id), "Opération supprimée");
  await load();
}
</script>

<template>
  <PageHeader title="Relevés" sub="Toutes les opérations : exports bancaires importés et saisies manuelles. Change une catégorie directement dans la liste.">
    <md-filled-button @click="openNew">+ Saisie manuelle</md-filled-button>
  </PageHeader>

  <div class="toolbar">
    <md-outlined-text-field v-model="filter.search" placeholder="Rechercher un libellé…" style="width:220px"></md-outlined-text-field>
    <md-outlined-text-field v-model="filter.from" label="Du" type="date"></md-outlined-text-field> <span class="muted">→</span> <md-outlined-text-field v-model="filter.to" label="Au" type="date"></md-outlined-text-field>
    <SelectField v-model="filter.account_id" label="Compte"><md-select-option value=""><div slot="headline">Tous les comptes</div></md-select-option><md-select-option v-for="a in accounts" :key="a.id" :value="a.id"><div slot="headline">{{ a.name }}</div></md-select-option></SelectField>
    <SelectField v-model="filter.category" label="Catégorie"><md-select-option value=""><div slot="headline">Toutes les catégories</div></md-select-option><md-select-option value="none"><div slot="headline">⚠ Sans catégorie</div></md-select-option><md-select-option v-for="c in categories" :key="c.id" :value="String(c.id)"><div slot="headline">{{ c.name }}</div></md-select-option></SelectField>
    <SelectField v-model="filter.kind" label="Type"><md-select-option value=""><div slot="headline">Tous types</div></md-select-option><md-select-option v-for="k in ['Revenu', 'Dépense', 'Épargne', 'Transfert']" :key="k" :value="k"><div slot="headline">{{ k }}</div></md-select-option></SelectField>
    <SelectField v-model="filter.source" label="Source"><md-select-option value=""><div slot="headline">Toutes sources</div></md-select-option><md-select-option value="manuel"><div slot="headline">Manuel</div></md-select-option><md-select-option value="bnp"><div slot="headline">BNP</div></md-select-option><md-select-option value="boursobank"><div slot="headline">Boursobank</div></md-select-option><md-select-option value="revolut"><div slot="headline">Revolut</div></md-select-option></SelectField>
    <span class="muted ml-auto">{{ result.total }} opération(s) · total <b :class="sign(result.sum)">{{ eur(result.sum) }}</b></span>
  </div>

  <div class="card pad0">
    <div class="table-wrap">
      <table>
        <thead><tr><th>Date</th><th>Compte</th><th>Libellé</th><th>Catégorie banque</th><th class="num">Montant</th><th>Catégorie</th><th></th></tr></thead>
        <tbody>
          <tr v-for="r in result.rows" :key="r.id" :class="{ clickable: r.source === 'manuel' }" @dblclick="openEdit(r)">
            <td>{{ date(r.date) }}</td>
            <td class="muted">{{ r.account }}</td>
            <td class="ellipsis" :title="r.raw_label"><router-link v-if="r.refund_expense_id || r.refund_category_id" to="/remboursements" class="tag ok" title="Remboursement rapproché : déduit de la dépense d'origine">↺ rapproché</router-link>
              <router-link v-else-if="r.refunded" to="/remboursements" class="tag ok" :title="`Remboursé à hauteur de ${eur(r.refunded)}`">↺ remb. {{ eur(r.refunded) }}</router-link>
              <router-link v-else-if="r.category === 'Remboursements'" to="/remboursements" class="tag warn" title="Remboursement non rapproché : compté comme revenu">↺ à rapprocher</router-link>
              {{ r.label }} <span v-if="r.source === 'manuel'" class="tag" title="Saisie manuelle">M</span></td>
            <td class="muted ellipsis" style="max-width:200px">{{ r.bank_category }}</td>
            <td class="num" :class="sign(r.amount)">{{ eur(r.amount) }}</td>
            <td>
              <select :value="r.category_id ?? ''" @change="setCategory(r, ($event.target as HTMLSelectElement).value)" :style="r.category_id ? '' : 'background:var(--warn-soft);border-color:var(--warn)'">
                <option value="">? Sans catégorie</option>
                <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
              <span v-if="r.category_manual" class="muted" title="Catégorie fixée à la main"> ✎</span>
            </td>
            <td class="nowrap">
              <md-outlined-button class="small" title="Créer une règle à partir de ce libellé" @click="ruleFrom(r)">+ règle</md-outlined-button>
              <md-icon-button v-if="r.source === 'manuel'" class="small danger" aria-label="Supprimer" title="Supprimer" @click="remove(r)">✕</md-icon-button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!result.rows.length" class="empty">Aucune opération. Importe un export bancaire ou ajoute une saisie manuelle.</div>
    </div>
  </div>
  <div v-if="pages > 1" class="toolbar" style="margin-top:10px;justify-content:center">
    <md-icon-button :disabled="page === 0" aria-label="Page précédente" title="Page précédente" @click="page--">‹</md-icon-button><span class="muted">Page {{ page + 1 }} / {{ pages }}</span><md-icon-button :disabled="page >= pages - 1" aria-label="Page suivante" title="Page suivante" @click="page++">›</md-icon-button>
  </div>

  <RuleModal v-if="ruleModal" :rule="ruleModal" :categories="categories" @close="ruleModal = null" @saved="ruleModal = null; load()" />
  <TransactionModal v-if="modal" :tx="modal" :accounts="accounts" :categories="categories" @close="modal = null" @saved="modal = null; load()" />
</template>
