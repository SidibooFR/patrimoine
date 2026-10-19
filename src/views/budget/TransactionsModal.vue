<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { api } from "../../lib/api";
import { eur, eur0, date, monthLong } from "../../lib/format";
import { guard } from "../../lib/toast";
import type { TransactionRow } from "../../../core/schema";
import Modal from "../../components/Modal.vue";

/** Opérations d'une catégorie sur un mois (clic sur une carte de la vue mensuelle du Budget). */
const props = defineProps<{ categoryId: number; name: string; month: string; real: number; budget: number | null }>();
const emit = defineEmits<{ close: [] }>();
const router = useRouter();

const rows = ref<TransactionRow[]>();
const last = new Date(Number(props.month.slice(0, 4)), Number(props.month.slice(5, 7)), 0).getDate();
const from = `${props.month}-01`, to = `${props.month}-${String(last).padStart(2, "0")}`;
onMounted(async () => {
  const r = await guard(() => api.listTransactions({ category_id: props.categoryId, from, to, limit: 500 }));
  rows.value = r?.rows ?? [];
});
const summary = computed(() => {
  const n = rows.value?.length ?? 0;
  return `${n} opération${n > 1 ? "s" : ""} · ${eur0(props.real)}${props.budget !== null ? ` sur ${eur0(props.budget)} prévus` : " · sans budget"}`;
});
const over = computed(() => props.budget !== null && props.real > props.budget);
function openInStatements() {
  router.push({ path: "/releves", query: { category_id: String(props.categoryId), from, to } });
}
</script>

<template>
  <Modal :title="`${name} · ${monthLong(month)}`" wide @close="emit('close')">
    <p class="help" :class="{ neg: over }" style="margin:0 0 16px">{{ summary }}</p>
    <div class="card pad0" style="border-radius:16px">
      <table>
        <thead><tr><th>Date</th><th>Compte</th><th>Libellé</th><th class="num">Montant</th></tr></thead>
        <tbody>
          <tr v-for="t in rows" :key="t.id">
            <td class="nowrap">{{ date(t.date) }}</td>
            <td class="muted nowrap">{{ t.account }}</td>
            <td>{{ t.label }}</td>
            <td class="num" :class="t.amount < 0 ? 'neg' : 'pos'">{{ eur(t.amount) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="rows && !rows.length" class="muted" style="padding:40px;text-align:center;margin:0">Aucune opération ce mois-ci.</p>
      <p v-if="!rows" class="muted" style="padding:24px;text-align:center;margin:0">Chargement…</p>
    </div>
    <template #foot>
      <md-outlined-button @click="openInStatements">Ouvrir dans Relevés</md-outlined-button>
      <md-filled-button @click="emit('close')">Fermer</md-filled-button>
    </template>
  </Modal>
</template>
