<script setup lang="ts">
defineProps<{
  label?: string;
  value?: string | number; // déjà formaté par l'appelant (eur0, pct…)
  hint?: string;
  tone?: string; // classe de couleur de la valeur : résultat de sign(), ou "pos" | "neg" | "warn" | ""
  small?: boolean;
  card?: boolean; // tuile autonome (.card)
}>();
</script>
<template>
  <div class="kpi" :class="{ card }">
    <span v-if="label !== undefined || $slots.label" class="label"><slot name="label">{{ label }}</slot></span>
    <span v-if="value !== undefined || $slots.default" class="value" :class="[{ small }, tone]"><slot>{{ value }}</slot></span>
    <span v-if="hint !== undefined || $slots.hint" class="hint"><slot name="hint">{{ hint }}</slot></span>
  </div>
</template>
