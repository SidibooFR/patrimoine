<script setup lang="ts">
import type { RefundsReport } from "../../../core/refunds";

defineProps<{ rules: RefundsReport["rules"] }>();
defineEmits<{ remove: [id: number] }>();
</script>

<template>
  <div class="card">
    <h3>Règles payeur</h3>
    <p class="help">Chaque remboursement de ce payeur est déduit de la catégorie, sans intervention. Crée-en une depuis « Choisir… » &gt; Catégorie &gt; « toujours ».</p>
    <table v-if="rules.length"><tbody>
      <tr v-for="x in rules" :key="x.id"><td style="text-transform:capitalize">{{ x.keyword }}</td><td class="muted">{{ x.category }}</td><td class="num muted">{{ x.matches }}</td><td><md-icon-button class="small danger" aria-label="Supprimer la règle" title="Supprimer la règle" @click="$emit('remove', x.id)"><i class="fa-solid fa-xmark" aria-hidden="true"></i></md-icon-button></td></tr>
    </tbody></table>
    <div v-else class="help mt-1">Aucune règle.</div>
    <p class="help mt-2">Une dépense rapprochée est réduite le mois de la dépense ; une catégorie, le mois du remboursement. Les remboursements non rapprochés restent dans les revenus.</p>
  </div>
</template>
