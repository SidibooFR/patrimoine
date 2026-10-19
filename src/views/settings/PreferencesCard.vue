<script setup lang="ts">
import { computed } from "vue";
import type { Category } from "../../../core/schema";

const props = defineProps<{ settings: Record<string, string>; categories: Category[]; dbPath: string }>();
const emit = defineEmits<{ set: [key: string, value: string] }>();

const excluded = computed(() => (props.settings.recurring_exclude_categories ?? "").split("|").filter(Boolean));
function setExcluded(el: HTMLSelectElement) { emit("set", "recurring_exclude_categories", Array.from(el.selectedOptions).map((o) => o.value).join("|")); }
</script>

<template>
  <div class="card">
    <h2>Réglages</h2>
    <div class="form">
      <md-outlined-text-field label="Épargne de précaution (mois de dépenses)" type="number" min="1" max="24" :value="settings.emergency_months" @change="emit('set', 'emergency_months', ($event.target as HTMLInputElement).value)"></md-outlined-text-field>
      <md-outlined-text-field label="Tolérance d'écart d'allocation (%)" type="number" min="0" max="50" :value="Number(settings.allocation_tolerance) * 100" @change="emit('set', 'allocation_tolerance', String(Number(($event.target as HTMLInputElement).value) / 100))"></md-outlined-text-field>
      <md-outlined-text-field label="Premier mois de suivi" type="month" :value="(settings.start_month ?? '').slice(0, 7)" @change="emit('set', 'start_month', ($event.target as HTMLInputElement).value + '-01')"></md-outlined-text-field>
      <md-outlined-text-field label="Alerte livret sous-utilisé (rempli à moins de, %)" type="number" min="0" max="100" :value="Number(settings.envelope_underuse_threshold ?? 0.5) * 100" @change="emit('set', 'envelope_underuse_threshold', String(Number(($event.target as HTMLInputElement).value) / 100))"></md-outlined-text-field>
      <md-outlined-text-field label="À garder sur les comptes courants (mois de dépenses)" type="number" min="0" max="12" step="0.5" :value="settings.checking_buffer_months ?? 1" @change="emit('set', 'checking_buffer_months', ($event.target as HTMLInputElement).value)"></md-outlined-text-field>
      <label class="field full">Catégories exclues de la détection d'abonnements
        <select multiple size="5" @change="setExcluded($event.target as HTMLSelectElement)"><option v-for="c in categories.filter((x) => x.kind === 'Dépense')" :key="c.id" :value="c.name" :selected="excluded.includes(c.name)">{{ c.name }}</option></select>
        <span class="help">Dépenses variables (courses, restaurants…) qui reviennent souvent sans être des abonnements. Ctrl+clic pour en choisir plusieurs.</span></label>
    </div>
    <p class="help mt-2">Base de données : <code>{{ dbPath }}</code><br />Sauvegarde = copier ce fichier. Pour repartir de zéro, supprime-le (l'application le recrée avec les valeurs par défaut).</p>
  </div>
</template>
