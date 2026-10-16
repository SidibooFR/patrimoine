<script setup lang="ts">
defineProps<{ title: string }>();
const emit = defineEmits<{ close: [] }>();
</script>
<template>
  <div class="modal-back" @mousedown.self="emit('close')">
    <div class="modal" role="dialog" :aria-label="title">
      <div class="card-title"><h2>{{ title }}</h2><button class="icon-btn" aria-label="Fermer" title="Fermer" @click="emit('close')">✕</button></div>
      <slot />
      <div class="modal-foot"><slot name="foot" /></div>
    </div>
  </div>
</template>
