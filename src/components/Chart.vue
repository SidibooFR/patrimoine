<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import { Chart, type ChartConfiguration, registerables } from "chart.js";
Chart.register(...registerables);

const props = defineProps<{ config: ChartConfiguration; height?: number }>();
const canvas = ref<HTMLCanvasElement>();
let chart: Chart | undefined;

function render() {
  const css = getComputedStyle(document.documentElement);
  Chart.defaults.color = css.getPropertyValue("--muted").trim() || Chart.defaults.color;
  Chart.defaults.borderColor = css.getPropertyValue("--line").trim() || Chart.defaults.borderColor;
  chart?.destroy();
  if (!canvas.value) return;
  chart = new Chart(canvas.value, { ...props.config, options: { responsive: true, maintainAspectRatio: false, animation: false, ...(props.config.options ?? {}) } });
}
onMounted(render);
watch(() => props.config, render, { deep: true });
onBeforeUnmount(() => chart?.destroy());
</script>
<template>
  <div class="chart-box" :style="{ height: (height ?? 260) + 'px' }"><canvas ref="canvas"></canvas></div>
</template>
