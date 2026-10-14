<script setup lang="ts">
import { routes } from "./router";
import { toast } from "./toast";
import { ref, onMounted } from "vue";
import { api } from "./api";
import { applyAppearance, fromSettings } from "./appearance";
import { update, installUpdate } from "./update";
const version = ref("");
onMounted(async () => {
  try { version.value = (await api.meta()).version; applyAppearance(fromSettings(await api.settings())); } catch { /* hors Electron sans API */ }
});
</script>

<template>
  <aside class="sidebar">
    <div class="brand">Patrimoine<small>Budget · Bourse · Crypto</small></div>
    <nav>
      <template v-for="(r, i) in routes" :key="r.path">
        <div v-if="i > 0 && r.group !== routes[i - 1].group" class="sep"></div>
        <router-link :to="r.path"><span style="width:16px;text-align:center">{{ r.icon }}</span>{{ r.name }}</router-link>
      </template>
    </nav>
    <div class="foot">Données locales uniquement.<br />Serveur MCP intégré pour Claude.<br /><span v-if="version">Version {{ version }}</span>
      <button v-if="update.status === 'downloaded'" class="small primary update-btn" @click="installUpdate">⟳ Installer la version {{ update.version }}</button>
      <button v-else-if="update.status === 'portable'" class="small update-btn" @click="installUpdate">⇩ Version {{ update.version }} disponible</button></div>
  </aside>
  <main>
    <router-view v-slot="{ Component }">
      <component :is="Component" :key="$route.path" />
    </router-view>
  </main>
  <div v-if="toast.visible" class="toast" :class="{ err: toast.err }">{{ toast.text }}</div>
</template>
