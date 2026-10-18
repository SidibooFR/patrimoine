<script setup lang="ts">
import { appearance, ACCENT_PRESETS, FONTS, SCALES, CURRENCIES } from "../../lib/appearance";
import { eur } from "../../lib/format";
import SelectField from "../../components/SelectField.vue";

const emit = defineEmits<{ setLook: [key: string, value: string]; reset: [] }>();
</script>

<template>
  <div class="card">
    <div class="card-title"><h2>Apparence</h2><md-outlined-button class="small" @click="emit('reset')">Réinitialiser</md-outlined-button></div>
    <div class="form">
      <div class="field full">Couleur principale
        <div class="swatches">
          <button v-for="c in ACCENT_PRESETS" :key="c.color" class="swatch" :class="{ on: appearance.accent.toLowerCase() === c.color }" :style="{ background: c.color }" :title="c.name" @click="emit('setLook', 'ui_accent', c.color)"></button>
          <label class="swatch custom" title="Couleur personnalisée" :class="{ on: !ACCENT_PRESETS.some((c) => c.color === appearance.accent.toLowerCase()) }" :style="{ background: appearance.accent }">
            <input type="color" :value="appearance.accent" @change="emit('setLook', 'ui_accent', ($event.target as HTMLInputElement).value)" />✎</label>
        </div>
      </div>
      <SelectField :model-value="appearance.font" label="Police" @update:model-value="(v) => emit('setLook', 'ui_font', String(v))"><md-select-option v-for="f in FONTS" :key="f.id" :value="f.id"><div slot="headline" :style="{ fontFamily: f.stack }">{{ f.name }}</div></md-select-option></SelectField>
      <SelectField :model-value="appearance.scale" label="Taille du texte" @update:model-value="(v) => emit('setLook', 'ui_scale', String(v))"><md-select-option v-for="z in SCALES" :key="z.value" :value="z.value"><div slot="headline">{{ z.name }} ({{ Math.round(z.value * 100) }} %)</div></md-select-option></SelectField>
      <div class="field full"><SelectField :model-value="appearance.currency" label="Devise" @update:model-value="(v) => emit('setLook', 'currency', String(v))"><md-select-option v-for="c in CURRENCIES" :key="c.code" :value="c.code"><div slot="headline">{{ c.code }} – {{ c.name }}</div></md-select-option></SelectField>
        <span class="help">Aperçu : {{ eur(1234.5) }}. Les montants ne sont pas convertis : choisis la devise dans laquelle sont tenus tes comptes. Les cours bourse et crypto sont récupérés dans cette devise.</span></div>
    </div>
  </div>
</template>
