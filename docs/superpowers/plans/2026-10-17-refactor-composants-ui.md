# Refactorisation du renderer : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** Ranger `src/`, extraire les composants répétés (`KpiCard`, `PageHeader`), remplacer les styles en ligne par des classes à base de tokens et découper `Portfolio.vue`, sans changer la logique métier.

**Architecture :** Les utilitaires du renderer passent dans `src/lib/`. Les composants partagés par au moins 2 vues vont dans `src/components/`, ceux d'une seule vue dans `src/views/<vue>/`. La vue parente garde le chargement des données et les appels `api`. Les blocs reçoivent des props et émettent des événements.

**Tech Stack :** Vue 3 `<script setup lang="ts">`, TypeScript, Vite, CSS global `src/style.css`.

**Spec :** `docs/superpowers/specs/2026-10-17-refactor-composants-ui-design.md`

## Global Constraints

- Code, commentaires, textes UI et messages de commit en **français**.
- Préfixes de commit : `refactor:` / `style:` / `chore:` / `docs:` uniquement (jamais `feat:`/`fix:`, pour ne pas déclencher semantic-release).
- Aucun changement dans `core/`, `electron/`, `mcp/`. Aucune nouvelle dépendance (runtime ou dev). **Aucun test ajouté** (décision de l'utilisateur).
- Couleurs et espacements via les variables CSS de `src/style.css`, jamais en dur.
- Composants en `<script setup lang="ts">` avec `defineProps<…>()` typé, comme `src/components/Modal.vue`.
- Pas de composant `Field` : `<label class="field">` reste tel quel.
- Fin de chaque tâche : `npm run typecheck && npm test && npm run build` au vert, puis le contrôle manuel de la tâche (`npm run dev`, http://localhost:5173, base remplie par `node scripts/run-ts.mjs scripts/seed-data.ts`).
- Tous les textes affichés restent identiques (seule la mise en page peut bouger).

## Review Focus

Aucun test automatique ne couvre le renderer. Ces points sont à vérifier à la main par le relecteur, à chaque tâche concernée :

1. **Événements perdus au découpage** : un bouton d'un sous-composant (✎, ✕, + op, double-clic sur une opération) doit déclencher la même action qu'avant dans la vue parente. Vérification : cliquer chaque bouton de chaque ligne.
2. **Réactivité des props** : après l'enregistrement d'une modale, `load()` recharge et le sous-composant affiche les nouvelles valeurs, sans rechargement de page.
3. **Modale fermée sans enregistrer** : Annuler, ✕ ou un clic sur le fond ne modifie rien et laisse la liste intacte.
4. **États vides** : vue Portfolio sans actif ni opération (`.empty` affichés, pas d'erreur console), et filtre des opérations sur un actif sans opération.
5. **Thème sombre** : aucune couleur en dur restante (`background:#fff` dans les vues). Vérification : basculer le thème dans Paramètres.

---

### Task 1 : Branche, spec et skill Vue

**Files :**
- Add : `docs/superpowers/specs/…-design.md`, `docs/superpowers/plans/…-ui.md`
- Add : `.claude/skills/`, `.agents/skills/`, `skills-lock.json` (déjà présents, non suivis)

- [ ] **Step 1 :** `git switch -c refactor/composants-ui`
- [ ] **Step 2 :** `git add docs && git commit -m "docs: conception et plan de la refactorisation des composants UI"`
- [ ] **Step 3 :** Installer le skill : `npx -y skills add vuejs-ai/skills@vue-best-practices` (même mode que `frontend-design`, dans le projet). Vérifier qu'il apparaît dans `skills-lock.json`.
- [ ] **Step 4 :** Lire son `SKILL.md` et noter dans le commit les règles qui s'appliquent aux tâches 3 à 6 (props/emits typés, `defineModel`…).
- [ ] **Step 5 :** `git add .claude .agents skills-lock.json && git commit -m "chore: ajout des skills frontend-design et vue-best-practices"`

### Task 2 : Ranger les utilitaires dans `src/lib/`

**Files :**
- Move (`git mv`) : `src/{api,appearance,charts,format,toast,update}.ts` → `src/lib/`
- Modify : les imports de toutes les vues, `src/main.ts`, `src/App.vue`, `src/router.ts`, `src/components/*.vue`, et les imports internes des fichiers déplacés (`../core/…` → `../../core/…`, `../electron/…` → `../../electron/…`)
- Modify : `CLAUDE.md` (l. 32, 34, 39, 40 : `src/api.ts` → `src/lib/api.ts`, idem `appearance`, `charts`), `README.md:140`

**Interfaces :**
- Produces : `src/lib/format.ts`, `src/lib/api.ts`, etc. Les exports ne changent pas. Seuls les chemins changent : depuis une vue `../lib/format`, depuis `views/portfolio/` `../../lib/format`.

- [ ] **Step 1 :** `git mv` des 6 fichiers.
- [ ] **Step 2 :** Corriger tous les imports. Vérification : `grep -rnE "from \"\.\./(api|format|toast|appearance|charts|update)\"|from \"\./(api|format|toast|appearance|charts|update)\"" src` ne renvoie rien.
- [ ] **Step 3 :** `npm run typecheck && npm test && npm run build` : PASS.
- [ ] **Step 4 :** Contrôle : `npm run dev`, ouvrir 3 vues (Tableau de bord, Portefeuille, Paramètres), changer l'apparence dans Paramètres (vérifie `appearance`).
- [ ] **Step 5 :** Mettre à jour `CLAUDE.md` et `README.md`. `git commit -am "refactor(ui): regroupe les utilitaires du renderer dans src/lib"`

### Task 3 : Classes utilitaires et suppression des styles en ligne récurrents

**Files :**
- Modify : `src/style.css`, toutes les vues

Classes à ajouter dans `style.css` (une famille courte, à base de tokens) :
- `.mt-1` (8px), `.mt-2` (12px), `.mt-3` (16px), `.mb-2` (12px), `.mb-3` (16px), `.m0` (margin:0)
- `.nowrap` (white-space:nowrap), `.w-full` (width:100%), `.ml-auto` (margin-left:auto)
- `.grid.side` : `grid-template-columns: minmax(0, 1fr) 320px`
- `.row-actions` : `display:flex; gap:6px` (groupes de boutons ✎ / Archiver / ✕)
- `.card-title h2, .card-title h3 { margin: 0 }`, ce qui supprime les `style="margin:0"` des titres de carte

Correspondances : `margin-top:6px|8px|10px` → `.mt-1`, `12px|14px` → `.mt-2`, `16px` → `.mt-3`. On unifie les espacements, ce que la spec accepte.

- [ ] **Step 1 :** Ajouter les classes à `style.css`, à côté de `.grid`.
- [ ] **Step 2 :** Remplacer dans les vues les styles listés ci-dessus. Remplacer `background:#fff` (4 occurrences) par une classe qui utilise `var(--panel)`. Garder en ligne les styles uniques (`max-width:280px`, largeurs de colonnes, styles liés à des données comme la barre de progression de Goals).
- [ ] **Step 3 :** Vérification : `grep -oh 'style="[^"]*"' src/views/*.vue | sort | uniq -c | sort -rn` ne montre plus aucun style présent plus de 2 fois (hors `:style` dynamiques).
- [ ] **Step 4 :** `npm run typecheck && npm test && npm run build` : PASS.
- [ ] **Step 5 :** Contrôle : parcourir les 14 vues en thème clair puis sombre. Aucune mise en page cassée, aucun fond blanc en thème sombre.
- [ ] **Step 6 :** `git commit -am "style(ui): classes utilitaires à la place des styles en ligne"`

### Task 4 : `KpiCard`

**Files :**
- Create : `src/components/KpiCard.vue`
- Modify : Dashboard, Goals, Envelopes, Budget, Portfolio, Recurring, Refunds, Allocation (≈50 occurrences de `class="kpi"` / `class="card kpi"`)

**Interfaces :**
- Produces :
  ```ts
  defineProps<{
    label?: string;
    value?: string;        // déjà formaté par l'appelant (eur0, pct…)
    hint?: string;
    tone?: string;         // classe de couleur : résultat de sign(), ou "pos" | "neg" | "warn" | ""
    small?: boolean;       // .value.small
    card?: boolean;        // ajoute .card (tuile autonome)
  }>()
  ```
  Slots : `label`, `default` (remplace la valeur), `hint`. Chaque slot sert de repli quand la prop correspondante ne suffit pas (tag « peu fiable » dans le label, `<small>/ mois</small>` après la valeur, hint coloré). Rend `<div class="kpi" :class="{ card }">` avec `span.label`, `span.value` et `span.hint`. Un span n'est rendu que si sa prop ou son slot existe.
- Usage : `<KpiCard label="Revenus" :value="eur0(d.month.income)" tone="pos" small />`

- [ ] **Step 1 :** Créer `KpiCard.vue`.
- [ ] **Step 2 :** Remplacer toutes les tuiles KPI des vues listées. Vérification : `grep -n 'class="\(card \)\?kpi"' src/views/*.vue` ne renvoie rien.
- [ ] **Step 3 :** `npm run typecheck && npm test && npm run build` : PASS.
- [ ] **Step 4 :** Contrôle : dans chaque vue modifiée, les mêmes libellés, valeurs, couleurs (positif en vert, négatif en rouge) et tags « peu fiable » qu'avant.
- [ ] **Step 5 :** `git commit -am "refactor(ui): composant KpiCard pour les tuiles d'indicateurs"`

### Task 5 : `PageHeader`

**Files :**
- Create : `src/components/PageHeader.vue`
- Modify : les 14 vues

**Interfaces :**
- Produces : `defineProps<{ title: string; sub?: string }>()`. Le slot par défaut contient les boutons d'action, rendus dans `<div class="actions">` seulement si le slot est fourni. Les slots `title` et `sub` servent quand le texte contient de l'interpolation ou du balisage. Rend `<div class="page-head"><div><h1>…</h1><p class="sub">…</p></div><div class="actions"><slot/></div></div>`.
- Usage : `<PageHeader :title="\`Budget ${year}\`" sub="Réel par catégorie…"><button …>‹ …</button></PageHeader>`

- [ ] **Step 1 :** Créer `PageHeader.vue`.
- [ ] **Step 2 :** Remplacer les 14 `page-head`. Vérification : `grep -n 'class="page-head"' src/views` ne renvoie rien.
- [ ] **Step 3 :** `npm run typecheck && npm test && npm run build` : PASS.
- [ ] **Step 4 :** Contrôle : chaque bouton d'en-tête de chaque vue fonctionne (Budget ‹ › et « Afficher tout », Goals les 3 « + », Portfolio Actualiser / Historique / + Actif / + Opération).
- [ ] **Step 5 :** `git commit -am "refactor(ui): composant PageHeader pour les en-têtes de page"`

### Task 6 : Découpage de `Portfolio.vue`

**Files :**
- Create : `src/views/portfolio/PositionsTable.vue`, `HistoryPanel.vue`, `OperationsTable.vue`, `AllocationPanel.vue`, `AssetModal.vue`, `OperationModal.vue`
- Modify : `src/views/Portfolio.vue` (doit garder `load`, `refresh`, `backfill`, `newAsset`, `editAsset`, `deleteAsset`, `newOp`, `editOp`, `deleteOp`, l'en-tête, les KPI et la note `lastRefresh`)

**Interfaces** (types venant de `core/reports` / `core/history` ; `any` conservé là où la vue l'utilise déjà) :
- `PositionsTable` : props `{ positions: PortfolioReport["positions"] }`. Émet `newOp: [assetId: number]`, `edit: [assetId: number]`, `remove: [assetId: number]`. Le parent résout l'actif via `assets.find(a => a.id === id)`.
- `HistoryPanel` : props `{ hist: PortfolioHistory }`. Contient `histChart` (computed) et le tableau des périodes. Rendu par le parent avec `v-if="hist && hist.points.length"`.
- `OperationsTable` : props `{ ops: any[]; assets: any[] }`. Garde en interne `opsFilter`, `opsShown`, `opTotal` et `exportOps` (appelle `files.save` / `api.exportExcel`). Émet `edit: [op: any]` (bouton ✎ et double-clic) et `remove: [op: any]`.
- `AllocationPanel` : props `{ pf: PortfolioReport }`. Contient `weightChart` et `byClass`.
- `AssetModal` : props `{ asset: any; accounts: any[]; classes: readonly string[] }` (brouillon déjà initialisé par `newAsset`/`editAsset`). Contient `saveAsset`, avec l'appel `api.saveAsset` et le même toast « Actif enregistré ». Émet `close: []` et `saved: []`. Le parent ferme la modale et appelle `load()` sur `saved`.
- `OperationModal` : props `{ op: any; assets: any[] }`. Contient `saveOp` avec « Opération enregistrée ». Émet `close: []` et `saved: []`.
- La mise en page en grille (`.grid.side` de la tâche 3) reste dans `Portfolio.vue`. Chaque bloc rend sa propre `.card`.

- [ ] **Step 1 :** Contrôle **avant** : noter le comportement actuel de chaque action listée à l'étape 4.
- [ ] **Step 2 :** Créer les 6 composants en déplaçant le code tel quel (textes, classes, calculs) et brancher `Portfolio.vue`. Cible : `Portfolio.vue` sous 100 lignes.
- [ ] **Step 3 :** `npm run typecheck && npm test && npm run build` : PASS.
- [ ] **Step 4 :** Contrôle **après**, identique à l'étape 1 : + Actif (création), ✎ actif (modification), ✕ actif (confirmation puis suppression), + op depuis une ligne (actif présélectionné), + Opération, ✎ et double-clic sur une opération, ✕ opération, filtre par actif, Export Excel, Actualiser les cours (note `lastRefresh`), Historique des cours, Annuler dans chaque modale, et les points 1 à 4 de la Review Focus.
- [ ] **Step 5 :** `git add src/views && git commit -m "refactor(portefeuille): découpe la vue en sous-composants"`

### Task 7 : Vues secondaires (selon la grille de la spec)

**Files :** à décider pour `Transactions.vue` (145), `Settings.vue` (142), `Refunds.vue` (137), `Envelopes.vue` (132).

Règle : on extrait dans `src/views/<vue>/` uniquement un bloc **autonome**. Un bloc est autonome s'il a sa propre `.card`, ses propres données en props et au plus 3 événements vers le parent. Une modale avec son propre `save` compte aussi comme bloc autonome. Si aucun bloc ne remplit ces critères, on laisse la vue telle quelle et on le note dans le commit ou le compte rendu. Même méthode pour `RowActions` / `Tag` / `DataTable` : on n'extrait que si le composant remplace au moins 3 occurrences identiques **et** fait plus qu'une classe CSS. Sinon, `.row-actions` (tâche 3) suffit.

- [ ] **Step 1 :** Pour chaque vue, appliquer la règle et lister les blocs retenus (ou « aucun »).
- [ ] **Step 2 :** Extraire les blocs retenus, avec la même convention props/événements qu'à la tâche 6.
- [ ] **Step 3 :** `npm run typecheck && npm test && npm run build` : PASS.
- [ ] **Step 4 :** Contrôle : dans chaque vue touchée, une création, une modification et une suppression, les filtres et l'Annuler des modales.
- [ ] **Step 5 :** Un commit par vue : `refactor(<vue>): …`

### Task 8 : `Chart.vue` sur les tokens et passe finale

**Files :**
- Modify : `src/components/Chart.vue` (`#5e5e5e`, `#e1e3e1`)

- [ ] **Step 1 :** Remplacer les deux couleurs par les valeurs de `--muted` / `--line`, lues via `getComputedStyle(document.documentElement)` au rendu. Si `src/lib/appearance.ts` (`theme`) expose déjà ces valeurs, les prendre là. Si ce n'est pas simple, garder les valeurs actuelles avec un commentaire `ponytail:`.
- [ ] **Step 2 :** `npm run typecheck && npm test && npm run build` : PASS.
- [ ] **Step 3 :** Contrôle : graphiques lisibles en thème clair et sombre, puis parcours complet des 14 vues (Review Focus 1 à 5).
- [ ] **Step 4 :** `git commit -am "style(graphiques): couleurs des axes depuis les tokens du thème"`
