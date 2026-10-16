# Refactorisation du renderer : composants et cohérence de l'UI

## Intention

Quand on ouvre `src/`, on ne voit pas tout de suite comment il est organisé. Les 14 vues (`src/views/*.vue`, ~1 500 lignes) recopient à la main les mêmes briques : tuiles KPI, en-têtes de page, badges, groupes de boutons. Il n'existe que deux composants partagés (`Modal`, `Chart`). Le but est double :

1. **Lisibilité** : comprendre la structure de `src/` d'un coup d'œil, et lire une vue sans balisage répété.
2. **Cohérence de l'UI** : une même brique s'affiche partout de la même façon.

## Objectifs

- Ranger `src/` en dossiers clairs.
- Extraire des composants pour les motifs vraiment répétés.
- Découper les grosses vues (en priorité `Portfolio.vue`, 225 lignes) en sous-composants.
- Supprimer les styles en ligne au profit de classes de `style.css` qui utilisent les tokens.

## Non-objectifs

- Aucun changement dans `core/`, `electron/` ou `mcp/` : la logique métier ne bouge pas.
- Pas de nouvelle fonctionnalité ni de nouvelle dépendance runtime (pas de lib de composants, pas de Pinia).
- Pas de refonte du thème Material 3 existant.

## Anti-objectifs (ce qui serait un échec même si ça compile)

- Une abstraction qui ne sert qu'une fois, ou un composant avec plus de props que le HTML qu'il remplace.
- Un composant `Field` qui enveloppe `<label class="field">` : le HTML natif est déjà court et lisible, on le garde.
- Une régression de comportement : une action, un filtre ou une modale qui ne marche plus.
- Des sous-composants « par principe » dans des vues qui n'ont pas de bloc clairement séparable.

## Contraintes

- Code, commentaires, textes UI et messages de commit en **français**.
- Commits au format Conventional Commits avec le préfixe `refactor:` / `style:` / `chore:` / `docs:` (pas de release semantic-release).
- *(Choix de Claude)* Ce document est commité en `docs:`, et le skill installé ainsi que `skills-lock.json` sont commités en `chore:`, tous deux en premier sur la branche. `.claude/skills` et `.agents/skills` sont versionnés pour que le skill suive le projet.
- Travail sur une branche dédiée. `npm run typecheck`, `npm test` et `npm run build` passent à chaque commit.
- Couleurs et espacements via les variables CSS de `src/style.css`, jamais en dur.
- Composants en `<script setup lang="ts">` avec `defineProps<…>()` typé, comme `Modal.vue` et `Chart.vue`.

## Décisions prises avec l'utilisateur

- **Les deux objectifs comptent** : lisibilité et cohérence.
- **Les vues peuvent bouger visuellement** : unifier les espacements et les tailles de KPI est accepté, le pixel-perfect n'est pas exigé.
- **Les grosses vues sont découpées**, à commencer par Portfolio.
- **Skills** : installer `vuejs-ai/skills@vue-best-practices` (skills.sh) dans le projet, à côté de `frontend-design` déjà présent dans `skills-lock.json`, et l'utiliser comme référence.

## Structure cible de `src/`

```
src/
  main.ts  App.vue  router.ts  style.css  env.d.ts
  lib/            api.ts appearance.ts charts.ts format.ts toast.ts update.ts
  components/     Modal.vue Chart.vue KpiCard.vue PageHeader.vue …
  views/          Dashboard.vue … (une vue = un fichier)
  views/portfolio/  sous-composants propres à Portfolio
```

Les sous-composants propres à une vue vont dans `views/<vue>/`. Les composants réutilisés par au moins deux vues vont dans `components/`. Il faut mettre à jour les imports (~60), le chemin `src/api.ts` cité dans `CLAUDE.md`, et la mention dans `README.md` (~l. 140). `index.html` pointe sur `/src/main.ts`, qui ne bouge pas.

## Composants à extraire (candidats)

| Composant | Remplace | Constat |
|---|---|---|
| `KpiCard` | `<div class="(card) kpi"><span class="label">…<span class="value (small)" :class="sign(x)">…<span class="hint">` | ~50 occurrences, variantes `card`/sans card et `small`/normal mélangées |
| `PageHeader` | `<div class="page-head"><div><h1>…<p class="sub">…</div><div class="actions">…` | 14 vues |
| `RowActions` (nom libre) | groupes `✎ Modifier` / `Archiver` / `✕` en `style="display:flex;gap:6px"` | plusieurs vues |

`KpiCard` reçoit au minimum `label`, la valeur, `hint`, une taille (`small`) et un indicateur « dans une card ou non ». Un slot sert aux cas riches (tag « peu fiable » dans le label, `<small>/ mois</small>` dans la valeur). La couleur selon le signe reste à la charge de l'appelant, via une classe ou une prop `tone`, au choix du builder.

`Tag` : à extraire seulement si un composant apporte plus qu'une classe CSS. Sinon on garde `<span class="tag ok">`.

`DataTable` : à extraire seulement si un motif commun (wrapper `card pad0` + `table-wrap` à hauteur max + ligne vide `.empty`) se retrouve réellement dans plusieurs vues. Pas de tableau générique piloté par une config de colonnes.

## Découpage de Portfolio.vue

Blocs identifiés :
1. Rangée de 4 KPI → `KpiCard`
2. Tableau des positions
3. Graphique d'évolution + tableau de performance par période
4. Tableau des opérations + filtre
5. Répartition par classe (camembert + tableau)
6. Modales actif et opération

`Portfolio.vue` garde le chargement des données, l'état des modales et les actions. Il passe les données aux blocs par props et reçoit les actions par événements. Les sous-composants vont dans `src/views/portfolio/`. Les autres vues de plus de 130 lignes (`Transactions`, `Settings`, `Refunds`, `Envelopes`) sont examinées avec la même grille : on découpe seulement s'il y a un bloc autonome.

## Styles en ligne

Il y a ~125 attributs `style="…"` dans les vues (Recurring 18, Settings/Refunds/Portfolio 16…). On remplace les motifs récurrents (`margin-top:12px`, `margin-bottom:16px`, `display:flex;gap:6px`, `grid-template-columns: minmax(0,1fr) 320px`, `h2 style="margin:0"`) par quelques classes dans `style.css`. Un style vraiment ponctuel peut rester en ligne. `Chart.vue` code en dur `#5e5e5e` / `#e1e3e1` : à lire depuis les tokens si c'est simple, sinon à laisser.

## Vérification

- `typecheck`, `test` et `build` au vert (ces tests ne couvrent que `core/`).
- **Pas de tests de composants** et pas de nouvelle dépendance de test : c'est la décision de l'utilisateur. Le filet de sécurité est donc la vérification manuelle, à faire après chaque étape qui touche une vue (pas seulement à la fin).
- Parcours manuel avec `npm run dev`, sur une base de dev remplie par `scripts/seed-data.ts` : affichage, ouverture/fermeture des modales, une création/modification/suppression par écran à formulaire, filtres et tris des tableaux. Pour Portfolio, on vérifie chaque action (ajout/édition d'actif et d'opération, rafraîchissement des cours, filtre des opérations) avant et après le découpage.

## Laissé au builder

- Ordre exact des étapes, granularité des commits.
- Noms précis des props et des sous-composants.
- Liste finale des classes utilitaires ajoutées à `style.css`.
- Décision Tag / DataTable / découpage des vues secondaires, selon la grille ci-dessus.
