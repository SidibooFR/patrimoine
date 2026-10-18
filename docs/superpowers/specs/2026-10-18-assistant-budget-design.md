# Assistant de budgétisation : propositions de budget par scénario

Date : 2026-10-18 · Statut : à valider

## Intention

Dans l'onglet Budget, remplir la colonne « Budget / mois » catégorie par catégorie est fastidieux : l'utilisateur a eu « la flemme ». Il veut un bouton qui calcule des budgets complets à partir de ses transactions, lui présente plusieurs scénarios et applique celui qu'il choisit. Son rôle se limite à **choisir** ; il ne saisit plus rien, sauf pour retoucher ensuite.

## Objectifs

- Un bouton « Proposer un budget » dans l'en-tête de l'onglet Budget.
- Une fenêtre (composant `Modal.vue` existant) avec **cinq cartes de scénario**, sur le modèle de la maquette A validée :
  - Ma moyenne,
  - Économe,
  - Équilibré,
  - Loisirs,
  - Investissement.
- Chaque carte affiche les dépenses totales/mois, l'épargne/mois et le taux d'épargne. La carte Investissement indique en plus la part bourse et crypto.
- Sous les cartes, la **liste des charges fixes** : une case à cocher par catégorie de dépense, pré-cochée, que l'utilisateur peut cocher ou décocher. Les cartes se recalculent quand la sélection change.
- On sélectionne une carte puis on clique sur « Appliquer ». Le budget de l'année affichée est rempli **uniquement pour les catégories sans budget**.

## Non-objectifs

- Aucune transaction n'est créée, modifiée ou recatégorisée. Les scénarios lisent les données brutes et ne les changent jamais.
- Pas de budget mois par mois : le modèle reste un montant mensuel par catégorie et par année (table `budgets`).
- Pas de trajectoire progressive (type « +3 points par an »), pas de prise en compte de l'épargne de précaution, pas de séparation entre variables « essentielles » et « plaisir ». La recherche les a évoquées, mais ces options ont été écartées pour garder un seul réglage (les charges).

## Anti-objectifs (échec même si « ça marche »)

- **Écraser un montant saisi à la main.** Une catégorie qui a déjà une ligne dans `budgets` pour l'année n'est jamais touchée.
- **Faire varier une charge cochée.** Elle reste à sa moyenne dans tous les scénarios.
- Modifier quoi que ce soit dans les transactions.

## Règles de calcul

### Base : « moyenne » d'une catégorie

- Elle porte sur les **12 derniers mois complets** : le mois en cours est exclu, et la période peut couvrir deux années civiles.
- Le montant mensuel de chaque catégorie est calculé exactement comme dans `budgetReport` : même signe via `budgetAmount`, et mêmes ajustements de remboursements rapprochés (`refundAllocations`). C'est indispensable pour que la proposition reste cohérente avec la colonne « Moy. / mois » de la grille.
- Le dénominateur est commun à toutes les catégories : il va du **premier mois où l'appli a des transactions** (ou du début de la fenêtre s'il est antérieur) jusqu'à la fin de la période. Une dépense ponctuelle ou annuelle est ainsi lissée et non gonflée. *(révisé après revue : un dénominateur par catégorie proposait 1 200 €/mois pour une taxe foncière unique)*. Une catégorie Revenu ou Dépense sans transaction sur la période n'est pas proposée. Les catégories Épargne sans historique restent des cibles possibles (moyenne 0) pour recevoir un surplus.
- Les montants proposés sont arrondis à 10 €.
- La base ne dépend pas de l'année affichée. Elle porte toujours sur les 12 derniers mois complets à partir d'aujourd'hui. Le bouton reste disponible quelle que soit l'année, et on n'écrit de toute façon que dans les cases vides. *(mon choix)*
- Les ajustements de remboursements sont découpés par date de transaction sur la fenêtre glissante, et non par année civile.

Notations :
- **R** : revenus moyens, somme des catégories « Revenu ».
- **C** : charges cochées.
- **V** : autres dépenses, dites « variables ».
- **E** : épargne moyenne, somme des catégories « Épargne ».
- **Taux actuel** : `t0 = (R − C − V) / R`. C'est la définition du taux d'épargne déjà utilisée dans le Budget (revenus − dépenses).

### Scénarios

Dans tous les scénarios :
- Les revenus et les charges cochées restent à leur moyenne.
- Seules les dépenses variables (multipliées par un facteur commun `k`) et l'épargne bougent.
- Toute variation de dépenses variables est reportée sur l'épargne.

| Scénario | Règle |
|---|---|
| **Ma moyenne** | `k = 1`. Toutes les catégories restent à leur moyenne. |
| **Équilibré** | Cible : un taux d'au moins `max(t0, 20 %)`. `k` est la plus petite baisse qui atteint la cible, sans descendre sous `0,85` (−15 %). Si `t0 ≥ 20 %`, alors `k = 1`. |
| **Économe** | Cible : un taux d'au moins `min(t0 + 10 pts, 30 %)`, sans être inférieur à `t0`. `k` est la plus petite baisse qui atteint la cible, sans descendre sous `0,75` (−25 %). |
| **Loisirs** | `k = 1,15`, ramené à la baisse si besoin pour que le taux reste à au moins `max(min(t0, 10 %), 0)`. Le scénario ne fait jamais tomber le taux sous 10 %, et ne le dégrade pas si l'utilisateur est déjà en dessous. |
| **Investissement** | Même `k` que Économe. Tout le surplus d'épargne va **uniquement** aux catégories d'épargne bourse et crypto. |

Le surplus d'épargne correspond à `(1 − k) × V` :
- Dans Équilibré et Économe, il est réparti entre les catégories d'épargne au prorata de leur moyenne.
- Dans Investissement, il est réparti entre les catégories bourse et crypto au prorata de leur moyenne.
- Si toutes les moyennes concernées sont à 0, le surplus est réparti en parts égales.

Dans Loisirs, la baisse d'épargne est retirée au prorata, et une catégorie ne descend jamais sous 0.

**Ce que montrent les cartes** *(mon choix)*
- **Épargne/mois** vaut `R − C − k·V`. C'est le « reste » du Budget, et le taux affiché en découle. Le taux et ce montant sont donc toujours cohérents avec les KPI de l'onglet.
- Les budgets des catégories « Épargne » sont une répartition indicative de ce reste. Ils peuvent ne pas couvrir tout le reste, par exemple quand les virements vers un livret sont classés « Virement interne ».
- Dans Loisirs, la hausse des dépenses est prise sur le reste. Les catégories d'épargne baissent au prorata tant qu'elles ne passent pas sous 0, et le surplus éventuel réduit seulement le reste non affecté.
- Sur la carte Investissement, la « part bourse et crypto » est la somme des budgets proposés pour ces catégories, en €/mois.

Ces bornes ont été calibrées par une recherche documentaire (INSEE, Banque de France, Lukas & Howard 2023, YNAB/Monarch) :
- Le taux médian français est d'environ 6 à 10 %.
- 20 % correspond à la règle 50/30/20.
- 25 à 30 % correspond au quintile le plus aisé.
- Les cibles de budget ambitieuses ne sont tenues qu'à moitié, d'où des baisses de −10 à −25 % plutôt qu'une coupe brutale.

### Charges fixes

- La liste est stockée dans le réglage `budget_fixed_categories`. Ce sont des noms de catégories séparés par `|`, au même format que `recurring_exclude_categories`.
- Quand le réglage est absent, la pré-sélection est la suivante :
  - Loyer & charges,
  - Énergie, internet & téléphone,
  - Assurances,
  - Abonnements,
  - Crédits,
  - Impôts & taxes,
  - Frais bancaires.
- Cocher ou décocher une case enregistre le réglage, qui est donc mémorisé d'une ouverture à l'autre.

### Application

« Appliquer » écrit en une seule transaction un `budgets(category_id, year, monthly_amount)` pour chaque catégorie Revenu, Dépense ou Épargne qui a une proposition **et aucune ligne existante** pour l'année affichée. Ensuite, la grille se recharge et un toast indique le nombre de catégories remplies, et éventuellement le nombre ignorées parce que déjà renseignées.

### Écart avec la grille (décision de l'utilisateur : option A)

La colonne « Moy. / mois » de la grille reste calculée comme aujourd'hui, sur l'année affichée. `budgetReport` n'est pas modifié. Les deux moyennes peuvent donc différer, et on l'assume en le signalant clairement :

- La fenêtre affiche la période utilisée, par exemple « Basé sur oct. 2025 → sept. 2026 (12 mois complets) ».
- La carte s'intitule « Ma moyenne · 12 derniers mois » et porte une infobulle (ⓘ) qui explique pourquoi elle peut différer de la colonne « Moy. / mois » de la grille : celle-ci ne compte que l'année affichée, mois en cours compris.

But : éviter qu'après « Appliquer », l'utilisateur ne comprenne pas pourquoi la colonne « Écart » n'est pas à 0.

Les cartes affichent les totaux du scénario **complet**, même si une partie des catégories ne sera pas écrite. La fenêtre signale avec une ligne discrète combien de catégories seront remplies.

## Architecture (décidée)

Elle suit le chemin standard du projet :
- un nouveau module `core/budgetPlan.ts` contient le calcul pur et testable ;
- `core/api.ts` expose `budgetScenarios(year, fixed?)` et `applyBudgetScenario(year, scenario, fixed?)` ;
- `src/lib/api.ts` fournit les appels typés ;
- `Budget.vue` porte le bouton et une nouvelle modale `src/views/budget/ScenarioModal.vue`.

On utilise le composant `Modal.vue` existant et les tokens CSS de `src/style.css`, sans couleur codée en dur.

**Demande de l'utilisateur :** le plan d'implémentation doit s'appuyer sur le skill `ui-ux-pro-max` pour concevoir le visuel de la modale, de façon cohérente avec le style Material 3 de l'appli. Il couvre notamment :
- la hiérarchie des cartes ;
- l'état sélectionné ;
- l'accessibilité au clavier ;
- l'infobulle ;
- la liste des charges.

Le serveur MCP expose un outil `get_budget_scenarios` en lecture seule, et la liste des outils du README est mise à jour. L'application d'un scénario via MCP reste possible avec `set_budget`, donc il n'y a pas d'outil d'écriture dédié.

## Tests

Le module `core/budgetPlan.ts` a ses tests dans `tests/`. Ils doivent couvrir :
- la base sur 12 mois glissants, mois en cours exclu ;
- le dénominateur qui part du premier mois actif ;
- les charges cochées qui ne bougent pas ;
- les bornes de `k` ;
- le plancher de 10 % pour Loisirs ;
- le surplus de Investissement envoyé uniquement vers bourse et crypto ;
- l'application qui n'écrase pas un budget existant.

## Laissé au constructeur

- La présentation exacte des cartes et de la liste de cases à cocher, dans l'esprit de la maquette A.
- La façon d'identifier les catégories bourse et crypto (par nom seedé « Investissement bourse » ou « Investissement crypto », ou par heuristique sur le nom).
- La factorisation éventuelle du calcul mensuel par catégorie entre `budgetReport` et `budgetPlan`.
- La façon de résoudre `k` : formule fermée ou recherche simple.

## Mes choix (non validés explicitement par l'utilisateur)

- Les 12 mois glissants, mois en cours exclu.
- Les revenus repris à leur moyenne dans tous les scénarios, et remplis s'ils sont vides.
- Les montants arrondis à 10 €.
- La pré-sélection des charges listée ci-dessus.
- Le réglage persistant.
- Le seul outil MCP en lecture.
- La répartition au prorata.
- Le dénominateur commun « depuis le premier mois de données ».
