<script setup lang="ts">
import { eur, date } from "../../lib/format";
import type { RefundRow } from "../../../core/refunds";

defineProps<{ rows: RefundRow[]; show: "todo" | "done" | "all" }>();
defineEmits<{ link: [row: RefundRow, target: { expense_id?: number; category_id?: number }]; unlink: [row: RefundRow]; openPicker: [row: RefundRow] }>();

const VIA: Record<string, string> = { expense: "dépense", category: "catégorie", rule: "règle payeur" };
</script>

<template>
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
                <button v-if="r.link.via !== 'rule'" class="small" @click="$emit('unlink', r)">Annuler</button>
              </div>
              <div v-else class="sugg">
                <button v-for="s in r.suggestions" :key="(s.expense_id ?? 'c') + '-' + s.category_id" class="small" @click="$emit('link', r, s.type === 'expense' ? { expense_id: s.expense_id } : { category_id: s.category_id })">
                  <span v-if="s.type === 'expense'">↳ <b>{{ s.label }}</b> · {{ eur(s.amount) }} · {{ date(s.date) }} <span class="muted">({{ s.reason }})</span></span>
                  <span v-else>↳ catégorie <b>{{ s.category }}</b> <span class="muted">({{ s.reason }})</span></span>
                  <span class="score">{{ Math.round(s.score * 100) }} %</span>
                </button>
                <div v-if="r.hint" class="help">ℹ {{ r.hint }}</div>
                <div><button class="small" @click="$emit('openPicker', r)">Choisir la dépense ou la catégorie…</button></div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!rows.length" class="empty">{{ show === "todo" ? "Tout est rapproché." : "Aucun remboursement." }}</div>
    </div>
  </div>
</template>
