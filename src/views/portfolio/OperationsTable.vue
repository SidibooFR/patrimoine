<script setup lang="ts">
import { ref, computed } from "vue";
import { api, files } from "../../lib/api";
import { eur, num, sign, date } from "../../lib/format";
import { guard } from "../../lib/toast";
import type { AssetRow, OperationRow } from "../../../core/schema";

const props = defineProps<{ ops: OperationRow[]; assets: AssetRow[] }>();
defineEmits<{ edit: [op: OperationRow]; remove: [op: OperationRow] }>();

const opsFilter = ref<number | "">("");
const opsShown = computed(() => props.ops.filter((o) => opsFilter.value === "" || o.asset_id === opsFilter.value));
const opTotal = (o: OperationRow) => (o.kind === "Achat" ? -(o.quantity * o.unit_price + o.fees) : o.kind === "Frais" ? -o.fees : o.quantity * o.unit_price - o.fees);
async function exportOps() {
  const f = await files.save({ title: "Exporter", defaultPath: "patrimoine.xlsx", filters: [{ name: "Excel", extensions: ["xlsx"] }] });
  if (f) await guard(() => api.exportExcel(f), "Export créé");
}
</script>

<template>
  <div class="card pad0">
    <div class="toolbar" style="padding:12px 14px 0"><h2 class="m0">Opérations</h2>
      <select v-model="opsFilter" class="ml-auto"><option value="">Tous les actifs</option><option v-for="a in assets" :key="a.id" :value="a.id">{{ a.name }}</option></select>
      <button class="small" @click="exportOps">Export Excel</button></div>
    <div class="table-wrap" style="max-height:420px">
      <table>
        <thead><tr><th>Date</th><th>Actif</th><th>Type</th><th class="num">Quantité</th><th class="num">Prix unitaire</th><th class="num">Frais</th><th class="num">Flux</th><th>Note</th><th></th></tr></thead>
        <tbody>
          <tr v-for="o in opsShown" :key="o.id" class="clickable" @dblclick="$emit('edit', o)">
            <td>{{ date(o.date) }}</td><td>{{ o.asset }}</td><td><span class="tag" :class="o.kind === 'Achat' ? '' : o.kind === 'Vente' ? 'warn' : 'ok'">{{ o.kind }}</span></td>
            <td class="num">{{ num(o.quantity) }}</td><td class="num">{{ eur(o.unit_price, o.unit_price < 1 ? 6 : 2) }}</td><td class="num">{{ eur(o.fees) }}</td>
            <td class="num" :class="sign(opTotal(o))">{{ eur(opTotal(o)) }}</td><td class="muted">{{ o.note }}</td>
            <td><button class="small" @click="$emit('edit', o)">✎</button> <button class="small danger" @click="$emit('remove', o)">✕</button></td>
          </tr>
        </tbody>
      </table>
      <div v-if="!opsShown.length" class="empty">Aucune opération.</div>
    </div>
  </div>
</template>
