<script setup lang="ts">
defineProps<{
  title: string;
  sub?: string;
}>();
</script>
<template>
  <div class="page-head">
    <div>
      <h1><slot name="title">{{ title }}</slot></h1>
      <p v-if="sub !== undefined || $slots.sub" class="sub"><slot name="sub">{{ sub }}</slot></p>
    </div>
    <div v-if="$slots.default" class="actions"><slot /></div>
  </div>
</template>
