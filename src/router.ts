import { createRouter, createWebHashHistory } from "vue-router";

/** Rubriques de la barre supérieure ; `group` relie chaque route à la sienne (Paramètres = 4, hors rubriques). */
export const sections = [
  { group: 0, title: "Vue d'ensemble", icon: "◎", path: "/" },
  { group: 1, title: "Opérations", icon: "☰", path: "/releves" },
  { group: 2, title: "Budget", icon: "▦", path: "/budget" },
  { group: 3, title: "Placements", icon: "▲", path: "/patrimoine" },
];

export const routes = [
  { path: "/", name: "Vue d'ensemble", icon: "◎", group: 0, component: () => import("./views/Dashboard.vue") },
  { path: "/releves", name: "Relevés", icon: "☰", group: 1, component: () => import("./views/Transactions.vue") },
  { path: "/import", name: "Import", icon: "⇩", group: 1, component: () => import("./views/Import.vue") },
  { path: "/regles", name: "Règles de tri", icon: "⚙", group: 1, component: () => import("./views/Rules.vue") },
  { path: "/remboursements", name: "Remboursements", icon: "↺", group: 1, component: () => import("./views/Refunds.vue") },
  { path: "/budget", name: "Suivi mensuel", icon: "▦", group: 2, component: () => import("./views/Budget.vue") },
  { path: "/abonnements", name: "Abonnements", icon: "↻", group: 2, component: () => import("./views/Recurring.vue") },
  { path: "/objectifs", name: "Objectifs", icon: "⚑", group: 2, component: () => import("./views/Goals.vue") },
  { path: "/patrimoine", name: "Bilan global", icon: "▲", group: 3, component: () => import("./views/Networth.vue") },
  { path: "/enveloppes", name: "Livrets & PEA", icon: "▣", group: 3, component: () => import("./views/Envelopes.vue") },
  { path: "/portefeuille", name: "Bourse & crypto", icon: "◈", group: 3, component: () => import("./views/Portfolio.vue") },
  { path: "/allocation", name: "Répartition", icon: "◔", group: 3, component: () => import("./views/Allocation.vue") },
  { path: "/projection", name: "Projection", icon: "↗", group: 3, component: () => import("./views/Projection.vue") },
  { path: "/parametres", name: "Paramètres", icon: "✎", group: 4, component: () => import("./views/Settings.vue") },
];

export const router = createRouter({ history: createWebHashHistory(), routes });
