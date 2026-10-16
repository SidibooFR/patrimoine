<script setup lang="ts">
import { update, checkUpdate, installUpdate, describe } from "../../lib/update";

defineProps<{ version?: string }>();
</script>

<template>
  <div class="card">
    <h2>Mises à jour</h2>
    <p>Version installée : <b>{{ version }}</b><br /><span class="help">{{ describe(update) }}</span></p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button :disabled="['unsupported', 'checking', 'downloading', 'downloaded'].includes(update.status)" @click="checkUpdate">Rechercher une mise à jour</button>
      <button v-if="update.status === 'downloaded'" class="primary" @click="installUpdate">Redémarrer et installer</button>
      <button v-if="update.status === 'portable'" class="primary" @click="installUpdate">Ouvrir la page de téléchargement</button>
    </div>
    <p class="help mt-1">L'application vérifie au démarrage puis toutes les 6 heures s'il existe une nouvelle version sur GitHub et la télécharge en arrière-plan. Elle s'installe en redémarrant, ou automatiquement à la prochaine fermeture. Tes données ne sont pas touchées.</p>
  </div>
</template>
