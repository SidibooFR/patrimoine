<script setup lang="ts">
import { eur, pct, num, sign } from "../../lib/format";
import type { PortfolioReport } from "../../../core/reports";

defineProps<{ positions: PortfolioReport["positions"] }>();
defineEmits<{ newOp: [assetId: number]; edit: [assetId: number]; remove: [assetId: number] }>();
</script>

<template>
  <div class="card pad0">
    <div class="table-wrap" style="max-height:520px">
      <table>
        <thead><tr><th>Actif</th><th>Compte</th><th class="num">Quantité</th><th class="num">PRU</th><th class="num">Cours</th><th>Source</th><th class="num">Valeur</th><th class="num">Plus-value</th><th class="num">%</th><th class="num">Poids</th><th></th></tr></thead>
        <tbody>
          <tr v-for="p in positions" :key="p.asset_id" :class="{ muted: p.qty === 0 }">
            <td class="nowrap"><b>{{ p.name }}</b><div class="help">{{ p.symbol || "sans symbole" }} · {{ p.asset_class }}</div></td>
            <td class="muted nowrap">{{ p.account }}</td>
            <td class="num">{{ num(p.qty) }}</td><td class="num">{{ p.pru === null ? "–" : eur(p.pru, p.pru < 1 ? 6 : 2) }}</td>
            <td class="num">{{ p.price === null ? "–" : eur(p.price, p.price < 1 ? 6 : 2) }}</td>
            <td><span class="tag" :class="p.priceSource === 'Manuel' ? 'warn' : p.priceSource ? 'ok' : 'neg'" :title="p.priceUpdatedAt ? 'Mis à jour le ' + new Date(p.priceUpdatedAt).toLocaleString('fr-FR') : ''">{{ p.priceSource || "⚠ aucun" }}</span></td>
            <td class="num"><b>{{ eur(p.value) }}</b></td>
            <td class="num" :class="sign(p.unrealized)">{{ eur(p.unrealized) }}</td><td class="num" :class="sign(p.unrealizedPct)">{{ pct(p.unrealizedPct) }}</td>
            <td class="num">{{ pct(p.weight) }}</td>
            <td class="nowrap"><button class="small" @click="$emit('newOp', p.asset_id)">+ op</button> <button class="small" @click="$emit('edit', p.asset_id)">✎</button> <button class="small danger" @click="$emit('remove', p.asset_id)">✕</button></td>
          </tr>
        </tbody>
      </table>
      <div v-if="!positions.length" class="empty">Aucun actif. Ajoute un ETF ou une crypto, puis ses achats.</div>
    </div>
  </div>
</template>
