<script setup lang="ts">
import { routes } from "./router";
import { toast } from "./toast";
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
    <div class="foot">Données locales uniquement.<br />Serveur MCP intégré pour Claude.</div>
  </aside>
  <main>
    <router-view v-slot="{ Component }">
      <component :is="Component" :key="$route.path" />
    </router-view>
  </main>
  <div v-if="toast.visible" class="toast" :class="{ err: toast.err }">{{ toast.text }}</div>
</template>
