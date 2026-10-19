import { createRouter, createWebHashHistory } from "vue-router";

/** Icônes : classes Font Awesome (style solid). Rubriques de la barre supérieure ; `group` relie chaque route à la sienne (Paramètres = 4, hors rubriques). */
export const sections = [
  { group: 0, title: "Vue d'ensemble", icon: "fa-gauge", path: "/" },
  { group: 1, title: "Opérations", icon: "fa-list", path: "/releves" },
  { group: 2, title: "Budget", icon: "fa-chart-column", path: "/budget" },
  { group: 3, title: "Placements", icon: "fa-chart-line", path: "/patrimoine" },
];

export const routes = [
  { path: "/", name: "Vue d'ensemble", icon: "fa-gauge", group: 0, component: () => import("./views/Dashboard.vue") },
  { path: "/releves", name: "Relevés", icon: "fa-list", group: 1, component: () => import("./views/Transactions.vue") },
  { path: "/import", name: "Import", icon: "fa-file-import", group: 1, component: () => import("./views/Import.vue") },
  { path: "/regles", name: "Règles de tri", icon: "fa-filter", group: 1, component: () => import("./views/Rules.vue") },
  { path: "/remboursements", name: "Remboursements", icon: "fa-rotate-left", group: 1, component: () => import("./views/Refunds.vue") },
  { path: "/budget", name: "Suivi mensuel", icon: "fa-chart-column", group: 2, component: () => import("./views/Budget.vue") },
  { path: "/abonnements", name: "Abonnements", icon: "fa-arrows-rotate", group: 2, component: () => import("./views/Recurring.vue") },
  { path: "/objectifs", name: "Objectifs", icon: "fa-flag", group: 2, component: () => import("./views/Goals.vue") },
  { path: "/patrimoine", name: "Bilan global", icon: "fa-scale-balanced", group: 3, component: () => import("./views/Networth.vue") },
  { path: "/enveloppes", name: "Livrets & PEA", icon: "fa-piggy-bank", group: 3, component: () => import("./views/Envelopes.vue") },
  { path: "/portefeuille", name: "Bourse & crypto", icon: "fa-chart-line", group: 3, component: () => import("./views/Portfolio.vue") },
  { path: "/allocation", name: "Répartition", icon: "fa-chart-pie", group: 3, component: () => import("./views/Allocation.vue") },
  { path: "/projection", name: "Projection", icon: "fa-arrow-trend-up", group: 3, component: () => import("./views/Projection.vue") },
  { path: "/parametres", name: "Paramètres", icon: "fa-gear", group: 4, component: () => import("./views/Settings.vue") },
];

export const router = createRouter({ history: createWebHashHistory(), routes });
