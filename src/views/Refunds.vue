<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { api } from "../lib/api";
import { eur0 } from "../lib/format";
import { guard, notify } from "../lib/toast";
import type { RefundsReport, RefundRow } from "../../core/refunds";
import KpiCard from "../components/KpiCard.vue";
import PageHeader from "../components/PageHeader.vue";
import RefundsTable from "./refunds/RefundsTable.vue";
import PayerRulesCard from "./refunds/PayerRulesCard.vue";
import PickerModal from "./refunds/PickerModal.vue";

const rep = ref<RefundsReport>();
const categories = ref<any[]>([]);
const show = ref<"todo" | "done" | "all">("todo");
async function load() {
  [rep.value, categories.value] = await Promise.all([api.refunds(), api.listCategories()]);
}
onMounted(load);
const expenseCats = computed(() => categories.value.filter((c) => c.kind === "Dépense"));
const rows = computed(() => (rep.value?.rows ?? []).filter((r) => show.value === "all" || (show.value === "todo" ? !r.link : !!r.link)));
const sure = computed(() => (rep.value?.rows ?? []).filter((r) => !r.link && (r.suggestions[0]?.score ?? 0) >= 0.85).length);

async function linkTo(r: RefundRow, target: { expense_id?: number; category_id?: number }, remember = false) {
  const ok = await guard(() => api.linkRefund(r.id, target, remember), remember ? "Règle créée pour ce payeur" : "Remboursement rapproché");
  if (ok !== undefined) await load();
}
async function unlink(r: RefundRow) { await guard(() => api.unlinkRefund(r.id), "Rapprochement annulé"); await load(); }
async function applyAll() {
  const r = await guard(() => api.applyRefundSuggestions(0.85));
  if (r) { notify(`${r.linked} remboursement(s) rapproché(s)`); await load(); }
}
async function deleteRule(id: number) { await guard(() => api.deleteRefundRule(id), "Règle supprimée"); await load(); }

// Choix manuel
const picker = ref<RefundRow | null>(null);
function openPicker(r: RefundRow) { picker.value = r; }
</script>

<template>
  <PageHeader title="Remboursements" sub="Relie chaque remboursement à la dépense qu'il couvre : le budget affiche alors ta vraie dépense nette, au lieu d'un revenu qui n'en est pas un.">
    <div class="seg"><button :class="{ on: show === 'todo' }" @click="show = 'todo'">À rapprocher</button><button :class="{ on: show === 'done' }" @click="show = 'done'">Rapprochés</button><button :class="{ on: show === 'all' }" @click="show = 'all'">Tous</button></div>
    <button class="primary" :disabled="!sure" @click="applyAll">Lier les {{ sure }} suggestion(s) sûres</button>
  </PageHeader>

  <template v-if="rep">
    <div class="grid c4 mb-3">
      <KpiCard label="Remboursements reçus" :value="eur0(rep.totals.amount)" :hint="`${rep.totals.count} virement(s)`" card />
      <KpiCard label="Rapprochés" :value="eur0(rep.totals.linkedAmount)" :hint="`${rep.totals.linked} · déduits des dépenses`" tone="pos" card />
      <KpiCard label="À rapprocher" :value="eur0(rep.totals.unlinkedAmount)" :hint="`${rep.totals.unlinked} · comptés comme revenus`" :tone="rep.totals.unlinked ? 'warn' : 'pos'" card />
      <KpiCard label="Règles payeur" :value="rep.rules.length" hint="rapprochement automatique" card />
    </div>
    <div v-if="!rep.categoryId" class="note warn mb-2">La catégorie « Remboursements » n'existe pas : crée-la dans Paramètres pour que les remboursements soient repérés.</div>

    <div class="grid" style="grid-template-columns: minmax(0, 1fr) 300px">
      <RefundsTable :rows="rows" :show="show" @link="linkTo" @unlink="unlink" @open-picker="openPicker" />
      <PayerRulesCard :rules="rep.rules" @remove="deleteRule" />
    </div>
  </template>

  <PickerModal v-if="picker" :row="picker" :expense-cats="expenseCats" @close="picker = null" @saved="picker = null; load()" />
</template>
