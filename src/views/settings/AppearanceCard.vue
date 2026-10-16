<script setup lang="ts">
import { appearance, ACCENT_PRESETS, FONTS, SCALES, CURRENCIES } from "../../lib/appearance";
import { eur } from "../../lib/format";

const emit = defineEmits<{ setLook: [key: string, value: string]; reset: [] }>();
</script>

<template>
  <div class="card">
    <div class="card-title"><h2>Apparence</h2><button class="small" @click="emit('reset')">Réinitialiser</button></div>
    <div class="form">
      <div class="field full">Couleur principale
        <div class="swatches">
          <button v-for="c in ACCENT_PRESETS" :key="c.color" class="swatch" :class="{ on: appearance.accent.toLowerCase() === c.color }" :style="{ background: c.color }" :title="c.name" @click="emit('setLook', 'ui_accent', c.color)"></button>
          <label class="swatch custom" title="Couleur personnalisée" :class="{ on: !ACCENT_PRESETS.some((c) => c.color === appearance.accent.toLowerCase()) }" :style="{ background: appearance.accent }">
            <input type="color" :value="appearance.accent" @change="emit('setLook', 'ui_accent', ($event.target as HTMLInputElement).value)" />✎</label>
        </div>
      </div>
      <label class="field">Police<select :value="appearance.font" @change="emit('setLook', 'ui_font', ($event.target as HTMLSelectElement).value)"><option v-for="f in FONTS" :key="f.id" :value="f.id" :style="{ fontFamily: f.stack }">{{ f.name }}</option></select></label>
      <label class="field">Taille du texte<select :value="appearance.scale" @change="emit('setLook', 'ui_scale', ($event.target as HTMLSelectElement).value)"><option v-for="z in SCALES" :key="z.value" :value="z.value">{{ z.name }} ({{ Math.round(z.value * 100) }} %)</option></select></label>
      <label class="field full">Devise<select :value="appearance.currency" @change="emit('setLook', 'currency', ($event.target as HTMLSelectElement).value)"><option v-for="c in CURRENCIES" :key="c.code" :value="c.code">{{ c.code }} – {{ c.name }}</option></select>
        <span class="help">Aperçu : {{ eur(1234.5) }}. Les montants ne sont pas convertis : choisis la devise dans laquelle sont tenus tes comptes. Les cours bourse et crypto sont récupérés dans cette devise.</span></label>
    </div>
  </div>
</template>
