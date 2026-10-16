<script setup lang="ts">
import { onMounted, ref, computed, watch } from "vue";
import { api } from "../lib/api";
import { eur, eur0, date } from "../lib/format";
import { guard, notify } from "../lib/toast";
import Modal from "../components/Modal.vue";
import type { RefundsReport, RefundRow } from "../../core/refunds";
import KpiCard from "../components/KpiCard.vue";
import PageHeader from "../components/PageHeader.vue";

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
const picker = ref<{ row: RefundRow; tab: "expense" | "category"; search: string; results: any[]; category_id: number | ""; remember: boolean } | null>(null);
const shift = (d: string, n: number) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
async function searchExpenses() {
  const p = picker.value!;
  const r = await api.listTransactions({ kind: "Dépense", from: shift(p.row.date, -90), to: shift(p.row.date, 7), search: p.search || undefined, limit: 60 });
  p.results = r.rows;
}
function openPicker(r: RefundRow) {
  picker.value = { row: r, tab: "expense", search: "", results: [], category_id: "", remember: false };
  searchExpenses();
}
let t: any;
watch(() => picker.value?.search, () => { if (picker.value) { clearTimeout(t); t = setTimeout(searchExpenses, 250); } });
async function pickExpense(e: any) { const p = picker.value!; picker.value = null; await linkTo(p.row, { expense_id: e.id }); }
async function pickCategory() { const p = picker.value!; if (p.category_id === "") return; picker.value = null; await linkTo(p.row, { category_id: Number(p.category_id) }, p.remember); }
const VIA: Record<string, string> = { expense: "dépense", category: "catégorie", rule: "règle payeur" };
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
      <div class="card pad0">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Payeur</th><th class="num">Montant</th><th>Rapprochement</th></tr></thead>
            <tbody>
              <tr v-for="r in rows" :key="r.id">
                <td style="white-space:nowrap;vertical-align:top">{{ date(r.date) }}</td>
                <td style="vertical-align:top;max-width:280px"><b style="text-transform:capitalize">{{ r.payer }}</b><div class="help ellipsis" :title="r.label">{{ r.account }}</div></td>
                <td class="num pos" style="vertical-align:top"><b>{{ eur(r.amount) }}</b></td>
                <td style="vertical-align:top">
                  <div v-if="r.link" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                    <span class="tag ok">{{ VIA[r.link.via] }}</span>
                    <span v-if="r.link.expense_id">{{ r.link.expense_label }} · {{ eur(r.link.expense_amount) }} · {{ date(r.link.expense_date) }}</span>
                    <span v-else>{{ r.link.category }}</span>
                    <span class="muted">→ déduit de « {{ r.link.category }} »</span>
                    <button v-if="r.link.via !== 'rule'" class="small" @click="unlink(r)">Annuler</button>
                  </div>
                  <div v-else class="sugg">
                    <button v-for="s in r.suggestions" :key="(s.expense_id ?? 'c') + '-' + s.category_id" class="small" @click="linkTo(r, s.type === 'expense' ? { expense_id: s.expense_id } : { category_id: s.category_id })">
                      <span v-if="s.type === 'expense'">↳ <b>{{ s.label }}</b> · {{ eur(s.amount) }} · {{ date(s.date) }} <span class="muted">({{ s.reason }})</span></span>
                      <span v-else>↳ catégorie <b>{{ s.category }}</b> <span class="muted">({{ s.reason }})</span></span>
                      <span class="score">{{ Math.round(s.score * 100) }} %</span>
                    </button>
                    <div v-if="r.hint" class="help">ℹ {{ r.hint }}</div>
                    <div><button class="small" @click="openPicker(r)">Choisir la dépense ou la catégorie…</button></div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="!rows.length" class="empty">{{ show === "todo" ? "Tout est rapproché." : "Aucun remboursement." }}</div>
        </div>
      </div>
      <div class="card">
        <h3>Règles payeur</h3>
        <p class="help">Chaque remboursement de ce payeur est déduit de la catégorie, sans intervention. Crée-en une depuis « Choisir… » &gt; Catégorie &gt; « toujours ».</p>
        <table v-if="rep.rules.length"><tbody>
          <tr v-for="x in rep.rules" :key="x.id"><td style="text-transform:capitalize">{{ x.keyword }}</td><td class="muted">{{ x.category }}</td><td class="num muted">{{ x.matches }}</td><td><button class="small danger" @click="deleteRule(x.id)">✕</button></td></tr>
        </tbody></table>
        <div v-else class="help mt-1">Aucune règle.</div>
        <p class="help mt-2">Une dépense rapprochée est réduite le mois de la dépense ; une catégorie, le mois du remboursement. Les remboursements non rapprochés restent dans les revenus.</p>
      </div>
    </div>
  </template>

  <Modal v-if="picker" :title="`Rapprocher ${eur(picker.row.amount)} de ${picker.row.payer}`" @close="picker = null">
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
    <template #foot><button @click="picker = null">Annuler</button><button v-if="picker.tab === 'category'" class="primary" :disabled="picker.category_id === ''" @click="pickCategory">Rapprocher</button></template>
  </Modal>
</template>
