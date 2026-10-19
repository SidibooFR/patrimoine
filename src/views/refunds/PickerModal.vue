<script setup lang="ts">
import { ref, watch, onUnmounted } from "vue";
import { api } from "../../lib/api";
import { guard } from "../../lib/toast";
import { eur, date } from "../../lib/format";
import Modal from "../../components/Modal.vue";
import type { RefundRow } from "../../../core/refunds";
import type { Category, TransactionRow } from "../../../core/schema";

const props = defineProps<{ row: RefundRow; expenseCats: Category[] }>();
const emit = defineEmits<{ close: []; pick: [target: { expense_id?: number; category_id?: number }, remember?: boolean] }>();

// État local : la modale est recréée à chaque ouverture (v-if).
const picker = ref<{ row: RefundRow; tab: "expense" | "category"; search: string; results: TransactionRow[]; category_id: number | ""; remember: boolean }>({ row: props.row, tab: "expense", search: "", results: [], category_id: "", remember: false });
const shift = (d: string, n: number) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
// Recherche différée de 250 ms après la frappe ; pas de requête si le terme (sans espaces autour)
// n'a pas changé, et une réponse arrivée après une plus récente est ignorée.
let lastTerm: string | undefined;
let seq = 0;
async function searchExpenses() {
  const p = picker.value;
  const term = p.search.trim();
  if (term === lastTerm) return;
  lastTerm = term;
  const id = ++seq;
  const r = await guard(() => api.listTransactions({ kind: "Dépense", from: shift(p.row.date, -90), to: shift(p.row.date, 7), search: term || undefined, limit: 60 }));
  if (id !== seq) return;
  if (r) p.results = r.rows;
  else lastTerm = undefined; // échec : la même recherche pourra être relancée
}
searchExpenses();
let t: ReturnType<typeof setTimeout> | undefined;
watch(() => picker.value.search, () => { clearTimeout(t); t = setTimeout(searchExpenses, 250); });
onUnmounted(() => clearTimeout(t));

// Le rapprochement lui-même est fait par la vue parente (qui ferme la modale avant l'appel).
function pickExpense(e: TransactionRow) { emit("pick", { expense_id: e.id }); }
function pickCategory() { const p = picker.value; if (p.category_id === "") return; emit("pick", { category_id: Number(p.category_id) }, p.remember); }
</script>

<template>
  <Modal :title="`Rapprocher ${eur(picker.row.amount)} de ${picker.row.payer}`" @close="emit('close')">
    <div class="seg mb-2"><button :class="{ on: picker.tab === 'expense' }" @click="picker.tab = 'expense'">Une dépense précise</button><button :class="{ on: picker.tab === 'category' }" @click="picker.tab = 'category'">Une catégorie</button></div>
    <template v-if="picker.tab === 'expense'">
      <input v-model="picker.search" placeholder="Rechercher une dépense…" style="width:100%;margin-bottom:8px" />
      <div class="table-wrap" style="max-height:340px">
        <table><tbody>
          <tr v-for="e in picker.results" :key="e.id" class="clickable" @click="pickExpense(e)">
            <td>{{ date(e.date) }}</td><td class="ellipsis" style="max-width:280px">{{ e.label }}</td><td class="muted">{{ e.category }}</td><td class="num neg">{{ eur(e.amount) }}</td>
            <td class="muted" v-if="e.refunded">déjà {{ eur(e.refunded) }} remb.</td><td v-else></td>
          </tr>
        </tbody></table>
        <div v-if="!picker.results.length" class="empty">Aucune dépense entre 90 jours avant et 7 jours après.</div>
      </div>
    </template>
    <template v-else>
      <div class="form">
        <label class="field">Catégorie<select v-model="picker.category_id"><option value="" disabled>Choisir…</option><option v-for="c in expenseCats" :key="c.id" :value="c.id">{{ c.name }}</option></select></label>
        <label class="field" style="flex-direction:row;align-items:center;gap:8px;margin-top:20px"><input v-model="picker.remember" type="checkbox" /> toujours pour « {{ picker.row.payer }} »</label>
      </div>
      <p class="help">Exemple : la part de loyer versée chaque mois par ta colocataire → « Loyer &amp; charges », toujours.</p>
    </template>
    <template #foot><button @click="emit('close')">Annuler</button><button v-if="picker.tab === 'category'" class="primary" :disabled="picker.category_id === ''" @click="pickCategory">Rapprocher</button></template>
  </Modal>
</template>
