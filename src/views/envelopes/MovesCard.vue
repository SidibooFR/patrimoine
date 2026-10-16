<script setup lang="ts">
import { eur, eur0, pct } from "../../lib/format";
import type { EnvelopesReport } from "../../../core/envelopes";

defineProps<{ moves: EnvelopesReport["moves"] }>();
</script>

<template>
  <div class="card mb-3">
    <h2>Transferts conseillés</h2>
    <div v-if="moves.length" class="grid" style="gap:8px">
      <div v-for="m in moves" :key="m.from_account_id + '-' + m.to_account_id" class="move">
        <span style="font-size:18px">→</span>
        <span>Transférer <b>{{ eur0(m.amount) }}</b> de <b>{{ m.from }}</b> ({{ pct(m.fromRate, 2) }} net) vers <b>{{ m.to }}</b> ({{ pct(m.toRate, 2) }} net)</span>
        <span style="margin-left:auto;font-weight:700;white-space:nowrap">+{{ eur(m.gainPerYear) }} / an</span>
      </div>
      <p class="help" style="margin:4px 0 0">Les livrets réglementés sont disponibles à tout moment et exonérés d'impôt : y placer ton épargne de précaution ne la bloque pas. Sur les comptes courants, l'application garde un mois de dépenses de côté.</p>
    </div>
    <div v-else class="note ok">Rien à optimiser : ton épargne est déjà sur les supports les mieux rémunérés disponibles.</div>
  </div>
</template>
