<script setup lang="ts">
import { routes, sections } from "./router";
import { toast } from "./lib/toast";
import { computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { api } from "./lib/api";
import { applyAppearance, fromSettings } from "./lib/appearance";
import { update, installUpdate } from "./lib/update";
const route = useRoute();
const group = computed(() => routes.find((r) => r.path === route.path)?.group ?? 0);
/* Les onglets d'une rubrique ; la vue d'ensemble et les paramètres n'en ont pas. */
const tabs = computed(() => (group.value >= 1 && group.value <= 3 ? routes.filter((r) => r.group === group.value) : []));
onMounted(async () => {
  try { applyAppearance(fromSettings(await api.settings())); } catch { /* hors Electron sans API */ }
});
</script>

<template>
  <header class="topbar">
    <div class="bar">
      <div class="brand"><span class="logo">P</span>Patrimoine</div>
      <nav>
        <router-link v-for="s in sections" :key="s.group" :to="s.path" :class="{ on: s.group === group }"><i class="ico fa-solid" :class="s.icon" aria-hidden="true"></i>{{ s.title }}</router-link>
      </nav>
      <div class="right">
        <md-filled-button v-if="update.status === 'downloaded'" class="small" @click="installUpdate"><i slot="icon" class="fa-solid fa-rotate" aria-hidden="true"></i>Installer la version {{ update.version }}</md-filled-button>
        <md-outlined-button v-else-if="update.status === 'portable'" class="small" @click="installUpdate"><i slot="icon" class="fa-solid fa-download" aria-hidden="true"></i>Version {{ update.version }} disponible</md-outlined-button>
        <span class="tag ok" title="Données locales uniquement · serveur MCP intégré pour Claude">● Local</span>
        <router-link to="/parametres" class="gear" :class="{ on: group === 4 }" title="Paramètres" aria-label="Paramètres"><i class="fa-solid fa-gear" aria-hidden="true"></i></router-link>
      </div>
    </div>
    <nav v-if="tabs.length" class="tabs">
      <router-link v-for="r in tabs" :key="r.path" :to="r.path"><i class="ico fa-solid" :class="r.icon" aria-hidden="true"></i>{{ r.name }}</router-link>
    </nav>
  </header>
  <main>
    <router-view v-slot="{ Component }">
      <component :is="Component" :key="$route.path" />
    </router-view>
  </main>
  <!-- Popover : passe au-dessus des md-dialog ouverts (couche supérieure). -->
  <div v-if="toast.visible" :ref="(el) => (el as HTMLElement | null)?.showPopover()" popover="manual" class="toast" :class="{ err: toast.err }">{{ toast.text }}</div>
</template>
