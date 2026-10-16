<script setup lang="ts">
import { computed } from "vue";
import { notify } from "../../lib/toast";

const props = defineProps<{ mcpServer: string }>();

const mcpConfig = computed(() => JSON.stringify({ mcpServers: { patrimoine: { command: "node", args: [props.mcpServer.replace(/\\/g, "/")] } } }, null, 2));
async function copyConfig() { await navigator.clipboard.writeText(mcpConfig.value); notify("Configuration copiée"); }
</script>

<template>
  <div class="card">
    <h2>Claude (serveur MCP)</h2>
    <p class="help">Claude Desktop peut lire et modifier tes données via le serveur MCP fourni (42 outils : tableau de bord, relevés, import, règles, remboursements, budget, abonnements, objectifs, patrimoine, livrets et PEA, portefeuille et historique des cours, allocation, projection, export). Ajoute ceci dans <code>claude_desktop_config.json</code> (Paramètres → Développeur → Modifier la configuration), puis redémarre Claude Desktop. Node.js doit être installé.</p>
    <pre>{{ mcpConfig }}</pre>
    <button @click="copyConfig">Copier la configuration</button>
    <p class="help mt-1">L'application et Claude partagent le même fichier de base : les modifications faites par l'un sont visibles par l'autre au prochain rafraîchissement de page (<kbd>Ctrl</kbd>+<kbd>R</kbd>).</p>
  </div>
</template>
