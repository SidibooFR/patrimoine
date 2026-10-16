<script setup lang="ts">
import { ref } from "vue";
import { api } from "../../lib/api";
import { guard, notify } from "../../lib/toast";
import Modal from "../../components/Modal.vue";

const props = defineProps<{ rule: { keyword: string; category_id: number | ""; label: string }; categories: any[] }>();
const emit = defineEmits<{ close: []; saved: [] }>();

// Copie locale : la modale est recréée à chaque ouverture (v-if), la prop n'est pas mutée.
const draft = ref({ ...props.rule });

async function saveRule() {
  const m = draft.value;
  if (!m.keyword || m.category_id === "") return;
  const ok = await guard(() => api.saveRule({ keyword: m.keyword, category_id: Number(m.category_id) }));
  if (ok === undefined) return;
  const r = await api.recategorize();
  notify(`Règle ajoutée · ${r.updated} opération(s) recatégorisée(s)`);
  emit("saved");
}
</script>

<template>
  <Modal title="Nouvelle règle de catégorisation" @close="emit('close')">
    <p class="help">Toute opération dont le libellé contient ce mot-clé prendra cette catégorie, maintenant et pour les prochains imports. Raccourcis le mot-clé à la partie stable du libellé (ex. « CARREFOUR »).</p>
    <div class="form">
      <label class="field">Mot-clé<input v-model="draft.keyword" /></label>
      <label class="field">Catégorie<select v-model="draft.category_id"><option value="" disabled>Choisir…</option><option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option></select></label>
    </div>
    <template #foot><button @click="emit('close')">Annuler</button><button class="primary" :disabled="!draft.keyword || draft.category_id === ''" @click="saveRule">Créer la règle</button></template>
  </Modal>
</template>
