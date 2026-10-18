# Assistant de budgétisation : plan d'implémentation

> **Pour les agents :** sous-skill REQUIS, superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans, pour exécuter ce plan tâche par tâche. Les étapes utilisent la syntaxe de case à cocher (`- [ ]`) pour le suivi.

**Objectif :** un bouton « Proposer un budget » dans l'onglet Budget. Il ouvre une modale de 5 scénarios calculés à partir des 12 derniers mois de transactions. Le scénario choisi remplit uniquement les budgets vides de l'année affichée.

**Architecture :** le calcul pur des scénarios (`buildScenarios`) est séparé de la lecture SQL (`categoryAverages`) et de l'écriture (`applyBudgetScenario`), tous les trois dans `core/budgetPlan.ts`. On l'expose via `core/api.ts`, ce qui le rend aussi disponible en IPC, en HTTP de dev et dans le client typé `src/lib/api.ts` sans rien modifier (ce client est un Proxy typé sur `Api`). Un outil MCP en lecture s'y ajoute. Côté vue, une modale `ScenarioModal.vue` réutilise `Modal.vue`.

**Stack technique :** TypeScript, sql.js, Vue 3 `<script setup>`, Vitest, zod (MCP).

**Spec :** `docs/superpowers/specs/2026-10-18-assistant-budget-design.md`

## Contraintes globales

- Le code, les commentaires, les textes d'interface et les commits sont en **français**. Les commits suivent Conventional Commits (`feat(budget): …`, `test(budget): …`) et se terminent par `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- Les transactions ne sont **jamais** modifiées. On n'écrit que dans la table `budgets`, et seulement pour les couples `(category_id, year)` **sans ligne existante**.
- Les charges cochées restent à leur moyenne dans les 5 scénarios.
- La base de calcul couvre les 12 derniers mois **complets** avant le mois de `asOf`, mois en cours exclu. Elle est indépendante de l'année affichée.
- Les montants proposés sont arrondis à 10 € : `Math.round(x / 10) * 10`.
- Le réglage `budget_fixed_categories` contient des noms de catégories séparés par `|`. Quand il est absent, on utilise `DEFAULT_FIXED` : `Loyer & charges`, `Énergie, internet & téléphone`, `Assurances`, `Abonnements`, `Crédits`, `Impôts & taxes`, `Frais bancaires`. Une chaîne vide signifie qu'aucune charge n'est cochée, ce qui est différent d'un réglage absent.
- Pas de couleur codée en dur : uniquement les tokens de `src/style.css` (`--accent`, `--accent-soft`, `--accent-tint`, `--line`, `--outline`, `--surface-2`, `--muted`, `--radius`).
- `budgetReport` (colonne « Moy. / mois ») **n'est pas modifié** (option A de la spec).
- Après les modifications de code, lancer `graphify update .`.

## Points de vigilance en revue

1. **Revenus nuls ou aucune transaction dans la fenêtre.** Les 5 scénarios utilisent `k = 1`, le taux vaut `null` et la modale affiche un état vide sans pouvoir appliquer. Testé en tâche 1 (`R = 0`) et en tâche 2 (base vide).
2. **Moyenne négative ou nulle** (remboursements supérieurs aux dépenses, montants arrondis à 0). Aucune proposition n'est faite, la case reste vide. Testé en tâche 1.
3. **Charge cochée qui n'existe plus** (catégorie renommée) **ou réglage vide.** On l'ignore sans erreur, et le réglage vide donne zéro charge. Testé en tâche 2.
4. **Taux déjà au-dessus de la cible.** Équilibré et Économe gardent `k = 1` et ne proposent jamais une hausse des dépenses. Loisirs ne fait pas passer le taux sous 10 %, ni sous `t0` s'il est déjà plus bas. Testé en tâche 1.
5. **Double clic sur « Appliquer » ou budgets saisis entre-temps.** Le deuxième appel ne remplit rien (`filled = 0`) parce que les cases sont déjà prises. Testé en tâche 2.

---

## Structure des fichiers

| Fichier | Rôle |
|---|---|
| `core/budgetPlan.ts` (créé) | Moyennes sur la fenêtre glissante, calcul des scénarios (pur), réglage des charges, application. |
| `core/reports.ts` (modifié) | `export` sur `budgetAmount`, réutilisé par `budgetPlan`. |
| `core/api.ts` (modifié) | `budgetScenarios`, `applyBudgetScenario`. |
| `mcp/server.ts`, `README.md` (modifiés) | Outil `get_budget_scenarios` et liste des outils. |
| `tests/budgetPlan.test.ts` (créé) | Tests du module. |
| `src/components/Modal.vue` (modifié) | Prop optionnelle `wide`. |
| `src/views/budget/ScenarioModal.vue` (créé) | La modale. |
| `src/views/Budget.vue` (modifié) | Bouton et montage de la modale. |
| `src/style.css` (modifié) | Styles `.scenario*` et `.charge-list`. |

---

### Tâche 1 : calcul pur des scénarios

**Fichiers :**
- Créer : `core/budgetPlan.ts`
- Tester : `tests/budgetPlan.test.ts`

**Interfaces produites :**
```ts
export type ScenarioKey = "moyenne" | "equilibre" | "econome" | "loisirs" | "investissement";
export interface AvgRow { category_id: number; name: string; kind: string; average: number }
export interface Scenario {
  key: ScenarioKey; label: string; hint: string;
  k: number;                 // facteur appliqué aux dépenses variables
  income: number;            // R
  expense: number;           // C + k·V
  savings: number;           // R − C − k·V (le « reste »)
  rate: number | null;       // savings / R, null si R ≤ 0
  invest: number;            // somme des montants proposés pour bourse + crypto
  amounts: { category_id: number; amount: number }[]; // arrondis à 10, uniquement > 0
}
export const DEFAULT_FIXED: string[];
export function buildScenarios(rows: AvgRow[], fixed: string[]): Scenario[]; // toujours 5, dans l'ordre ci-dessus
```

Libellés exacts (`label` / `hint`) :
- `moyenne` : « Ma moyenne » / « 12 derniers mois »
- `equilibre` : « Équilibré » / « Vise 20 % d'épargne »
- `econome` : « Économe » / « +10 pts d'épargne, max 30 % »
- `loisirs` : « Loisirs » / « +15 % de dépenses variables »
- `investissement` : « Investissement » / « Surplus vers bourse & crypto »

- [ ] **Étape 1 : écrire les tests qui échouent**

Fixture commune :
```ts
const row = (id: number, name: string, kind: string, average: number) => ({ category_id: id, name, kind, average });
// R = 2000, C = 800 (Loyer), V = 1000 (Restaurants 600 + Courses 400), E : livrets 100, bourse 100, crypto 0
const ROWS = [row(1, "Salaire", "Revenu", 2000), row(2, "Loyer & charges", "Dépense", 800),
  row(3, "Restaurants & sorties", "Dépense", 600), row(4, "Courses", "Dépense", 400),
  row(5, "Épargne (livrets)", "Épargne", 100), row(6, "Investissement bourse", "Épargne", 100),
  row(7, "Investissement crypto", "Épargne", 0)];
const FIXED = ["Loyer & charges"];
const get = (s: Scenario[], k: ScenarioKey) => s.find((x) => x.key === k)!;
const amt = (s: Scenario, id: number) => s.amounts.find((a) => a.category_id === id)?.amount;
```

Tests (`describe("budgetPlan : scénarios")`) :
- `"Ma moyenne reprend les moyennes arrondies"` : `k === 1`, `rate` ≈ `0.10`, `amt(m, 3) === 600`, `amt(m, 7) === undefined`.
- `"Équilibré : vise 20 % mais borné à −15 %"` : `k` ≈ `0.85`, `rate` ≈ `0.175`, `amt(e, 2) === 800` (la charge ne bouge pas), `amt(e, 3) === 510`, et le surplus de 150 va à 50/50 sur livrets et bourse : `amt(e, 5) === 180` (100 + 75 = 175, arrondi à 180), `amt(e, 6) === 180`.
- `"Économe : t0 + 10 pts atteint sans dépasser −25 %"` : `k` ≈ `0.8`, `rate` ≈ `0.20`.
- `"Investissement : même k qu'Économe, surplus uniquement bourse et crypto"` : `k` ≈ `0.8`, `amt(i, 5) === 100`, `amt(i, 6) === 300`, `invest === 300`.
- `"Loisirs : plancher de 10 % quand t0 = 10 %"` : `k === 1`.
- `"Loisirs : +15 % quand le taux le permet"` : avec `Salaire` = 3000 (t0 = 0,4), `k` ≈ `1.15`, la baisse de 150 est retirée au prorata de l'épargne (−75 chacun) : `amt(l, 5) === 30`, `amt(l, 6) === 30`. Avec livrets = 50 et bourse = 0, `Salaire` = 3000 et Courses = 1400 (V = 2000, t0 ≈ 0,07 → k = 1), on vérifie qu'aucun montant négatif n'est produit : `s.every((x) => x.amounts.every((a) => a.amount > 0))`.
- `"Équilibré ne bouge pas si le taux dépasse déjà 20 %"` : avec `Salaire` = 3000, `get(s, "equilibre").k === 1`.
- `"Revenus nuls : k = 1 et taux null partout"` : sans ligne Revenu, chaque scénario a `k === 1` et `rate === null`.
- `"Moyenne négative : aucune proposition"` : `row(8, "Santé", "Dépense", -30)` donne `amt(m, 8) === undefined`.
- `"Toujours 5 scénarios dans l'ordre"` : `s.map((x) => x.key)` vaut `["moyenne", "equilibre", "econome", "loisirs", "investissement"]`.

- [ ] **Étape 2 : lancer `npx vitest run tests/budgetPlan.test.ts`.** Attendu : ÉCHEC, module introuvable.

- [ ] **Étape 3 : implémenter `buildScenarios` et `DEFAULT_FIXED` dans `core/budgetPlan.ts`**

Algorithme, non déterminé par les tests seuls :
- **Partition.**
  - `R` = somme des moyennes `Revenu`.
  - `C` = somme des `Dépense` dont le nom est dans `fixed`.
  - `V` = somme des autres `Dépense`.
  - Épargne = lignes `Épargne`.
  - Bourse et crypto = lignes `Épargne` dont le nom normalisé contient `bourse` ou `crypto`.
  - `t0 = (R − C − V) / R`.
- **Calcul de `k` pour un taux cible `T`.** On prend `kFor(T) = (R − C − T·R) / V`. Si `R ≤ 0` ou `V ≤ 0`, alors `k = 1` pour tous les scénarios.
  - Équilibré : `T = max(t0, 0.20)`, puis `k = clamp(kFor(T), 0.85, 1)`.
  - Économe et Investissement : `T = max(t0, min(t0 + 0.10, 0.30))`, puis `k = clamp(kFor(T), 0.75, 1)`.
  - Loisirs : `F = max(min(t0, 0.10), 0)`, puis `k = clamp(kFor(F), 1, 1.15)`.
- **Montants.**
  - Revenus et charges cochées : leur moyenne.
  - Variables : `moyenne × k`.
  - Épargne : on calcule `delta = (1 − k) × V`, puis on le répartit entre les catégories cibles, Épargne pour Équilibré, Économe et Loisirs, bourse et crypto pour Investissement. La répartition se fait au prorata des moyennes, ou en parts égales si leur somme vaut 0 et que `delta > 0`. Quand `delta < 0`, aucune catégorie ne passe sous 0.
  - On arrondit chaque montant à 10 et on ne garde que ceux `> 0`.
- **Totaux.** `income`, `expense` et `savings` sont calculés sur les valeurs non arrondies, puis passés à `round2` (`core/finance.ts`).

- [ ] **Étape 4 : lancer `npx vitest run tests/budgetPlan.test.ts`.** Attendu : SUCCÈS.

- [ ] **Étape 5 : commit** `feat(budget): calcul des scénarios de budget`

---

### Tâche 2 : moyennes glissantes, réglage des charges, application et API

**Fichiers :**
- Modifier : `core/budgetPlan.ts`
- Modifier : `core/reports.ts:20` (`export function budgetAmount`)
- Modifier : `core/api.ts`, section `// ---- budget`, après `setBudget`
- Tester : `tests/budgetPlan.test.ts`

**Interfaces consommées :** `buildScenarios`, `DEFAULT_FIXED` et `Scenario` (tâche 1) ; `budgetAmount` (`core/reports.ts`) ; `refundAllocations(store)` (`core/refunds.ts`) ; `setting` (`core/reports.ts`) ; `today` et `round2` (`core/finance.ts`).

**Interfaces produites :**
```ts
export interface BudgetScenarios {
  period: { from: string; to: string };   // "2025-10", "2026-09"
  fixedCandidates: { name: string; checked: boolean }[]; // toutes les catégories Dépense, dans l'ordre de sort
  scenarios: (Scenario & { fillable: number })[];       // fillable = montants sans budget existant pour `year`
}
export function categoryAverages(store: Store, asOf: string): { period: { from: string; to: string }; rows: AvgRow[] };
export function fixedCategories(store: Store): string[];
export function budgetScenarios(store: Store, year: number, fixed?: string[], asOf?: string): BudgetScenarios;
export function applyBudgetScenario(store: Store, year: number, key: ScenarioKey, fixed?: string[], asOf?: string): { filled: number; skipped: number };
// core/api.ts
budgetScenarios(year: number, fixed?: string[], asOf?: string): BudgetScenarios;
applyBudgetScenario(year: number, key: ScenarioKey, fixed?: string[], asOf?: string): { filled: number; skipped: number };
```
Quand `fixed` vaut `undefined`, on lit `fixedCategories(store)`. Le réglage est enregistré par la vue via l'API existante `setSetting("budget_fixed_categories", names.join("|"))`.

- [ ] **Étape 1 : écrire les tests qui échouent** (`describe("budgetPlan : base et application")`)

Mise en place : `const store = await Store.open(null); const api = createApi(store);`, puis `const cat = (n: string) => store.scalar<number>("SELECT id FROM categories WHERE name=?", [n])!` et un compte quelconque `store.scalar<number>("SELECT id FROM accounts LIMIT 1")`. Transactions saisies avec `api.addTransaction({ date, account_id, label, amount, category_id })`. On utilise `asOf = "2026-10-18"`.

- `"fenêtre de 12 mois complets, mois en cours exclu"` : Restaurants à −100 € chaque mois de 2025-10 à 2026-09, plus −9999 le 2026-10-05 et −9999 le 2025-09-15. Attendu : `categoryAverages(store, asOf).period` vaut `{ from: "2025-10", to: "2026-09" }` et la moyenne de Restaurants vaut `100`.
- `"dénominateur depuis le premier mois actif"` : Courses à −400 € de 2026-04 à 2026-09 uniquement. Attendu : moyenne de `400`, et non 200.
- `"les remboursements rapprochés sont déduits dans la fenêtre"` : une dépense Santé de −100 (2026-03) et un remboursement de +60, catégorie Remboursements, lié par `api.linkRefund(refundId, { expense_id: depenseId })`, donnent pour Santé une moyenne de `40 / 12` à 0,01 près.
- `"charges : défaut, réglage vide, nom inconnu"` :
  - sans réglage, `fixedCategories(store)` vaut `DEFAULT_FIXED` ;
  - après `api.setSetting("budget_fixed_categories", "")`, il vaut `[]` ;
  - avec `"Loyer & charges|Inexistante"`, `budgetScenarios(...).fixedCandidates` ne contient pas `Inexistante`, et `Loyer & charges` y est coché.
- `"application : ne remplit que les cases vides, idempotente"` : avec un salaire et des restaurants sur la fenêtre, plus `api.setBudget(cat("Restaurants & sorties"), 2026, 42)`, l'appel `applyBudgetScenario(store, 2026, "moyenne", undefined, asOf)` remplit `Salaire`, laisse Restaurants à `42` et renvoie `skipped === 1`. Un second appel renvoie `filled === 0`.
- `"aucune transaction n'est modifiée"` : `SELECT COUNT(*), SUM(amount) FROM transactions` est identique avant et après l'application.
- `"base vide : 5 scénarios, rien à remplir"` : avec un store neuf, chaque `fillable` vaut `0`.

- [ ] **Étape 2 : lancer `npx vitest run tests/budgetPlan.test.ts`.** Attendu : ÉCHEC sur les nouveaux tests.

- [ ] **Étape 3 : implémenter** dans `core/budgetPlan.ts`, et exporter `budgetAmount`.

`categoryAverages` :
- requête `SUM(amount)` groupée par `category_id` et `substr(date,1,7)`, sur `date >= from-01` et `date < (mois de asOf)-01` ;
- signe appliqué avec `budgetAmount(kind, total)` ;
- remboursements traités avec la même logique de `bump` que `budgetReport` (`core/reports.ts:56-72`), filtrée sur la fenêtre et non sur l'année ;
- dénominateur égal au nombre de mois entre `max(from, premier mois avec transaction de la catégorie, toutes dates confondues)` et `to`, inclus ;
- catégories `Transfert` exclues ;
- catégories sans transaction dans la fenêtre absentes.

`applyBudgetScenario` : `INSERT ... ON CONFLICT DO NOTHING` sur `budgets`, dans `store.transaction`. On compte `filled` avec `changes()` ou une vérification préalable.

- [ ] **Étape 4 : lancer `npx vitest run tests/budgetPlan.test.ts && npm run typecheck`.** Attendu : SUCCÈS.

- [ ] **Étape 5 : commit** `feat(budget): base glissante sur 12 mois et application des scénarios`

---

### Tâche 3 : outil MCP et README

**Fichiers :** modifier `mcp/server.ts` (après `set_budget`) et `README.md:110`, ainsi que la ligne « Budget » du tableau.

- [ ] **Étape 1 :** enregistrer `get_budget_scenarios`. `inputSchema: { year: z.number().int().optional(), fixed: z.array(z.string()).optional() }`, `annotations: ro`, `wrap(({ year, fixed }) => api.budgetScenarios(year ?? new Date().getFullYear(), fixed))`. Description : « Propose 5 scénarios de budget (moyenne 12 mois, équilibré, économe, loisirs, investissement) calculés sur les 12 derniers mois complets ; les charges fixes ne bougent pas. Appliquer via set_budget. »
- [ ] **Étape 2 :** dans le README, ajouter `get_budget_scenarios` après `set_budget`. La ligne Budget devient : « Réel par catégorie et par mois, budget prévu, écarts, taux d'épargne, assistant « Proposer un budget » (5 scénarios) ».
- [ ] **Étape 3 :** lancer `npm run build`. Attendu : le bundle MCP compile.
- [ ] **Étape 4 : commit** `feat(mcp): outil get_budget_scenarios`

---

### Tâche 4 : modale de scénarios (UI)

**Fichiers :**
- Modifier : `src/components/Modal.vue` (prop `wide?: boolean`, qui ajoute la classe `wide` sur `.modal`)
- Créer : `src/views/budget/ScenarioModal.vue`
- Modifier : `src/views/Budget.vue` (bouton dans `PageHeader`, état `showPlan`, montage de la modale, `load()` à l'émission de `applied`)
- Modifier : `src/style.css`

**Interfaces consommées :** `api.budgetScenarios`, `api.applyBudgetScenario`, `api.setSetting`, `BudgetScenarios`, `ScenarioKey`. Le composant expose `props: { year: number }` et `emits: { close: []; applied: [] }`.

Conception visuelle retenue avec ui-ux-pro-max. L'app a déjà un design system Material 3, donc on n'en génère pas de nouveau. Les règles appliquées viennent du domaine `ux` :
- **contrôles natifs avec un état exposé** (« Compact Control Semantics », critique) ;
- **jamais la couleur seule** (« Color Only », élevé) ;
- **focus visible, y compris dans une modale** (« Focus States », élevé) ;
- **pas d'infobulle accessible uniquement au survol** (« Compact Label Overflow ») ;
- **libellé visible pour chaque champ** (« Input Labels »).

La recherche d'un motif « carte sélectionnable » n'a donné aucun résultat dans la base. La structure des cartes suit donc les conventions générales Material 3, pas une fiche de la base.

Structure de la modale (`<Modal title="Proposer un budget" wide>`) :
1. **En-tête de période.** Une ligne `.muted` : « Basé sur oct. 2025 → sept. 2026 (12 mois complets) », formatée à partir de `period`. Si aucune catégorie n'a de moyenne, une `.note.warn` remplace les cartes : « Pas assez d'historique : importe des relevés pour obtenir des propositions. » Le bouton Appliquer est alors désactivé.
2. **Cartes.**
   - Groupe `role="radiogroup"` avec `aria-label="Scénarios"`, en grille `repeat(auto-fit, minmax(170px, 1fr))`, `gap: 12px`.
   - Chaque carte est un `<label class="scenario">` qui contient un **`<input type="radio" name="scenario">` natif**, visuellement masqué mais focusable. Les flèches du clavier fonctionnent donc nativement.
   - Contenu de la carte, dans l'ordre :
     - le titre (`label`), suivi de son `hint` en `.muted` 12px ;
     - le **montant d'épargne/mois** en gros, à 22px et poids 500 ;
     - une `.tag` avec le taux : `ok` si ≥ 20 %, `warn` si < 10 %, aucune classe sinon ;
     - une ligne « Dépenses : X €/mois » ;
     - une ligne supplémentaire « dont bourse & crypto : X €/mois » sur la carte Investissement.
   - **État sélectionné** : bordure `2px var(--accent)`, fond `var(--accent-tint)` et une pastille texte « ✓ Choisi » en haut à droite. La sélection ne repose donc pas uniquement sur la couleur.
   - **Focus** : `.scenario:has(input:focus-visible) { outline: 2px solid var(--accent); outline-offset: 2px; }`.
   - **Hover** : fond `var(--surface-2)`.
   - Hauteur minimale de 44px largement respectée.
3. **Infobulle de « Ma moyenne ».** Un `<button class="icon-btn" aria-label="Pourquoi ce chiffre peut différer de la grille" :aria-expanded="…">ⓘ</button>` à côté du titre. Il ouvre ou ferme, au clic ou au clavier, un paragraphe `.note` sous les cartes : « Cette moyenne couvre les 12 derniers mois complets. La colonne « Moy. / mois » de la grille ne compte que l'année affichée, mois en cours compris : les deux chiffres peuvent donc différer. » Ce n'est pas un `title` accessible au seul survol. Le clic sur le bouton ne doit pas sélectionner la carte (`@click.prevent.stop`).
4. **Charges fixes.**
   - `<fieldset class="charge-list">` avec `<legend>` « Charges fixes : elles gardent leur moyenne dans tous les scénarios ».
   - Une case `<label><input type="checkbox"> Nom</label>` par élément de `fixedCandidates`, en grille de puces de 2 à 3 colonnes.
   - Un changement de case appelle `api.setSetting("budget_fixed_categories", …)` puis recharge `api.budgetScenarios(year)`. La sélection de carte est conservée.
5. **Pied** (`#foot`).
   - Une ligne `.muted` à gauche : « N catégories seront remplies · tes montants déjà saisis sont conservés ». N vaut `fillable` du scénario choisi, et la ligne est masquée tant qu'aucun scénario n'est choisi.
   - Les boutons `Annuler` et `Appliquer` (`primary`). Appliquer est désactivé sans choix, sans base, ou si `fillable === 0`.
   - Au clic sur Appliquer : `guard(() => api.applyBudgetScenario(year, key), …)`, toast « N catégories remplies (M déjà renseignées, conservées) », puis `emit("applied")` et `emit("close")`.
6. **Chargement.** Pendant le premier appel, on affiche « Calcul des propositions… » en `.muted`, à la place de la grille, avec une hauteur réservée pour éviter un saut de mise en page.

Bouton dans `Budget.vue` : `<button class="primary" @click="showPlan = true">Proposer un budget</button>`, placé en premier dans `PageHeader`.

- [ ] **Étape 1 :** ajouter la prop `wide` à `Modal.vue` et la règle CSS `.modal.wide { width: min(960px, 94vw); }`.
- [ ] **Étape 2 :** créer `ScenarioModal.vue` et les styles `.scenario`, `.scenario.on`, `.scenario .badge`, `.charge-list` dans `src/style.css`. Utiliser uniquement les tokens, et `eur0` / `pct` de `src/lib/format.ts`.
- [ ] **Étape 3 :** brancher la modale dans `Budget.vue`.
- [ ] **Étape 4 :** lancer `npm run typecheck && npm test && npm run lint`. Attendu : tout réussit (la CI lance le lint).
- [ ] **Étape 5 : vérification manuelle.** Avec `npm run dev`, ouvrir `/budget`, cliquer sur « Proposer un budget » et vérifier :
  - les 5 cartes et la période s'affichent ;
  - la navigation se fait au clavier (Tab, puis les flèches dans le groupe, puis Espace) ;
  - le focus est visible ;
  - l'infobulle s'ouvre au clavier ;
  - décocher une charge recalcule les cartes ;
  - Appliquer remplit seulement les cases vides de la colonne jaune et le toast est correct ;
  - le rendu reste correct quand on change l'apparence dans les Réglages (les tokens `ui_*` sont appliqués par `src/lib/appearance.ts`).
- [ ] **Étape 6 :** lancer `graphify update .`, puis faire le commit `feat(budget): bouton « Proposer un budget » et modale de scénarios`.
