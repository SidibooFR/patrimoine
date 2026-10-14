import { createRouter, createWebHashHistory } from "vue-router";

/** `group` : les séparateurs du menu sont placés entre deux groupes. */
export const routes = [
  { path: "/", name: "Tableau de bord", icon: "◎", group: 0, component: () => import("./views/Dashboard.vue") },
  { path: "/releves", name: "Relevés", icon: "☰", group: 1, component: () => import("./views/Transactions.vue") },
  { path: "/import", name: "Importer", icon: "⇩", group: 1, component: () => import("./views/Import.vue") },
  { path: "/regles", name: "Règles", icon: "⚙", group: 1, component: () => import("./views/Rules.vue") },
  { path: "/remboursements", name: "Remboursements", icon: "↺", group: 1, component: () => import("./views/Refunds.vue") },
  { path: "/budget", name: "Budget", icon: "▦", group: 2, component: () => import("./views/Budget.vue") },
  { path: "/abonnements", name: "Abonnements", icon: "↻", group: 2, component: () => import("./views/Recurring.vue") },
  { path: "/objectifs", name: "Objectifs", icon: "⚑", group: 2, component: () => import("./views/Goals.vue") },
  { path: "/patrimoine", name: "Patrimoine", icon: "▲", group: 3, component: () => import("./views/Networth.vue") },
  { path: "/enveloppes", name: "Livrets & PEA", icon: "▣", group: 3, component: () => import("./views/Envelopes.vue") },
  { path: "/portefeuille", name: "Portefeuille", icon: "◈", group: 3, component: () => import("./views/Portfolio.vue") },
  { path: "/allocation", name: "Allocation", icon: "◔", group: 3, component: () => import("./views/Allocation.vue") },
  { path: "/projection", name: "Projection", icon: "↗", group: 3, component: () => import("./views/Projection.vue") },
  { path: "/parametres", name: "Paramètres", icon: "✎", group: 4, component: () => import("./views/Settings.vue") },
];

export const router = createRouter({ history: createWebHashHistory(), routes });
