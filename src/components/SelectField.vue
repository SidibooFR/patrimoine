<script setup lang="ts">
// md-outlined-select compare les valeurs avec === : lier les options en `:value` garde leur type
// (identifiants numériques). Il ignore aussi une valeur "" posée avant le rendu des options : on la réapplique.
import { onMounted, ref } from "vue";
type Value = string | number | null | undefined;
const props = defineProps<{ modelValue?: Value; label?: string }>();
const emit = defineEmits<{ "update:modelValue": [value: string | number] }>();
const el = ref<HTMLElement & { value: Value; updateComplete: Promise<boolean> }>();
onMounted(async () => { await el.value?.updateComplete; if (el.value) el.value.value = props.modelValue ?? ""; });
</script>
<template>
  <md-outlined-select ref="el" :label="label" :value="modelValue ?? ''" @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)">
    <slot />
  </md-outlined-select>
</template>
