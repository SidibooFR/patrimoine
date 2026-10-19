<script setup lang="ts">
import { computed } from "vue";
import type { ApexAxisChartSeries, ApexNonAxisChartSeries, ApexOptions } from "apexcharts";
import { appearance, FONTS } from "../lib/appearance";
import { mergeOptions, styleC } from "../lib/charts";

const props = withDefaults(defineProps<{
  type: "area" | "line" | "bar" | "donut" | "rangeArea";
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  options?: ApexOptions;
  height?: number;
  zoom?: boolean;
}>(), { height: 260, zoom: false });

const merged = computed(() => {
  // lire accent et police ici : le calcul est refait quand l'apparence change (les variables CSS sont posées par applyAppearance)
  void appearance.accent;
  const font = FONTS.find((f) => f.id === appearance.font)?.stack ?? "";
  const css = getComputedStyle(document.documentElement);
  const ui = { muted: css.getPropertyValue("--muted").trim(), line: css.getPropertyValue("--line").trim(), font };
  return mergeOptions(styleC(props.type, props.zoom, ui), props.options ?? {});
});
</script>
<template>
  <div class="chart-box" :style="{ height: height + 'px' }">
    <apexchart :type="type" :height="height" :series="series" :options="merged" />
  </div>
</template>
