<script setup lang="ts">
import { ref, computed } from "vue";

const props = defineProps<{ accounts: any[]; accountTypes: string[]; assetClasses: string[] }>();
const emit = defineEmits<{ save: [account: any, patch: any]; add: [account: any]; remove: [account: any] }>();

const newAcc = ref({ name: "", institution: "", type: "Courant", asset_class: "Liquidités" });
const showArchived = ref(false);
const accountsShown = computed(() => props.accounts.filter((a) => showArchived.value || !a.archived));
function addAcc() { if (!newAcc.value.name) return; emit("add", { ...newAcc.value }); newAcc.value.name = ""; }
</script>

<template>
  <div class="card" style="grid-column: 1 / -1">
    <div class="card-title"><h2>Comptes</h2><label class="help"><input v-model="showArchived" type="checkbox" /> archivés</label></div>
    <table>
      <thead><tr><th>Nom</th><th>Établissement</th><th>Type</th><th>Classe d'actif</th><th></th></tr></thead>
      <tbody>
        <tr v-for="a in accountsShown" :key="a.id" :class="{ muted: a.archived }">
          <td style="min-width:260px"><input class="cell cell-left" :value="a.name" @change="emit('save', a, { name: ($event.target as HTMLInputElement).value })" /></td>
          <td style="min-width:160px"><input class="cell cell-left" :value="a.institution" @change="emit('save', a, { institution: ($event.target as HTMLInputElement).value })" /></td>
          <td><select :value="a.type" @change="emit('save', a, { type: ($event.target as HTMLSelectElement).value })"><option v-for="t in accountTypes" :key="t">{{ t }}</option></select></td>
          <td><select :value="a.asset_class" @change="emit('save', a, { asset_class: ($event.target as HTMLSelectElement).value })"><option v-for="c in assetClasses" :key="c">{{ c }}</option></select></td>
          <td class="nowrap"><button class="small" :title="a.archived ? 'Réactiver' : 'Archiver'" @click="emit('save', a, { archived: a.archived ? 0 : 1 })">{{ a.archived ? "↶" : "▣" }}</button> <button class="small danger" @click="emit('remove', a)">✕</button></td>
        </tr>
        <tr><td><input v-model="newAcc.name" placeholder="Nouveau compte" @keyup.enter="addAcc" class="w-full" /></td><td><input v-model="newAcc.institution" placeholder="Banque" class="w-full" /></td>
          <td><select v-model="newAcc.type"><option v-for="t in accountTypes" :key="t">{{ t }}</option></select></td>
          <td><select v-model="newAcc.asset_class"><option v-for="c in assetClasses" :key="c">{{ c }}</option></select></td>
          <td><button class="small primary" @click="addAcc">+</button></td></tr>
      </tbody>
    </table>
    <p class="help">La classe d'actif sert au suivi du patrimoine et à l'allocation. Pour qu'un export bancaire alimente un compte, ajoute la correspondance dans Importer.</p>
  </div>
</template>
