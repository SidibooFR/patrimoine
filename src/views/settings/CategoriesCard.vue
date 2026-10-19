<script lang="ts">
import type { Category } from "../../../core/schema";
export type NewCategory = Pick<Category, "name" | "kind">;
</script>
<script setup lang="ts">
import { ref } from "vue";

defineProps<{ categories: Category[]; categoryKinds: readonly string[] }>();
const emit = defineEmits<{ save: [category: Category, patch: Partial<Category>]; add: [category: NewCategory]; remove: [category: Category] }>();

const newCat = ref({ name: "", kind: "Dépense" });
function addCat() { if (!newCat.value.name) return; emit("add", { ...newCat.value }); newCat.value.name = ""; }
</script>

<template>
  <div class="card">
    <h2>Catégories</h2>
    <table>
      <thead><tr><th>Nom</th><th>Type</th><th></th></tr></thead>
      <tbody>
        <tr v-for="c in categories" :key="c.id">
          <td><input class="cell cell-left" :value="c.name" @change="emit('save', c, { name: ($event.target as HTMLInputElement).value })" /></td>
          <td><select :value="c.kind" @change="emit('save', c, { kind: ($event.target as HTMLSelectElement).value })"><option v-for="k in categoryKinds" :key="k">{{ k }}</option></select></td>
          <td><md-icon-button class="small danger" aria-label="Supprimer" title="Supprimer" @click="emit('remove', c)"><i class="fa-solid fa-xmark" aria-hidden="true"></i></md-icon-button></td>
        </tr>
        <tr><td><input v-model="newCat.name" placeholder="Nouvelle catégorie" @keyup.enter="addCat" class="w-full" /></td><td><select v-model="newCat.kind"><option v-for="k in categoryKinds" :key="k">{{ k }}</option></select></td><td><md-icon-button class="small" aria-label="Ajouter" title="Ajouter" @click="addCat"><i class="fa-solid fa-plus" aria-hidden="true"></i></md-icon-button></td></tr>
      </tbody>
    </table>
    <p class="help">Revenu / Dépense entrent dans le taux d'épargne. Épargne = argent placé (compté à part). Transfert = virement entre tes comptes, ignoré.</p>
  </div>
</template>
