<script setup lang="ts">
import { ref } from "vue";
defineProps<{ title: string; wide?: boolean }>();
const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLElement & { close(): Promise<void> }>();
</script>
<template>
  <!-- Le parent démonte la fenêtre (v-if) ; on prévient seulement quand md-dialog se ferme seul (Échap, voile, ✕). -->
  <md-dialog ref="dialog" open class="modal" :class="{ wide }" @closed="emit('close')">
    <div slot="headline" class="modal-head">{{ title }}<md-icon-button aria-label="Fermer" title="Fermer" @click="dialog?.close()">✕</md-icon-button></div>
    <div slot="content"><slot /></div>
    <div slot="actions" class="modal-foot"><slot name="foot" /></div>
  </md-dialog>
</template>
