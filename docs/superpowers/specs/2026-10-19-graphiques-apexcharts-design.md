# Graphiques : passage de Chart.js à ApexCharts

## Intention

Les graphiques de l'application « font ancien et pas moderne du tout » : tracés plats, aucune animation, infobulle par défaut, rien d'interactif. Le graphique de projection (onglet Placement → Projection) est l'exemple cité. On remplace Chart.js par **ApexCharts** (via le composant Vue officiel `vue3-apexcharts`) pour donner à tous les graphiques un rendu moderne et homogène.

Le style de référence a été choisi sur maquettes : c'est la **maquette C, « courbes lisses et interactives »**, déclinée ensuite à tous les types de graphiques et validée telle quelle. Les maquettes validées sont versionnées à côté de ce document, dans [2026-10-19-graphiques-apexcharts-maquettes/](2026-10-19-graphiques-apexcharts-maquettes/) (ouvrir dans un navigateur, ApexCharts y est chargé depuis un CDN) :

- `projection-styles.html` : les trois pistes, **seule la C est retenue** ;
- `autres-graphiques.html` : la déclinaison du style C aux autres types ;
- `budget-taux-epargne.html` : taux d'épargne de Budget, **version 2 (ApexCharts) retenue** ;
- `budget-anneaux-ecarts.html` : anneaux et écarts de Budget, **rangée 2 (ApexCharts) retenue**.

Ces maquettes utilisent des couleurs en dur (`#0b57d0`, `#d93025`…) : dans l'application, elles correspondent à `theme.accent`, `PALETTE`, `CLASS_COLORS` et aux variables CSS (`--pos`, `--neg`, `--muted`, `--line`…).

## Objectifs

- **Tous** les graphiques de l'application passent sous ApexCharts dans le style C, y compris ceux dessinés à la main dans Budget : l'harmonisation est totale, quel que soit le graphique.
- Chart.js disparaît complètement du projet (dépendance, imports, `Chart.defaults` dans `appearance.ts`, mentions dans le README).
- Les graphiques suivent la couleur principale (`theme.accent` / `theme.navy`) et la police choisies dans Réglages → Apparence, comme aujourd'hui, et se mettent à jour quand on les change.

## Non-objectifs

- Aucune modification des données, des calculs (`core/`), des rapports ni de l'API.
- Aucune modification de la mise en page des écrans (cartes, grilles, tableaux, hauteurs à peu près conservées).
- Pas de thème sombre (l'application n'en a pas).
- Pas de nouveaux graphiques.
- Les jauges de progression (barres de consommation du budget par catégorie avec repère de rythme, progression des objectifs…) ne sont pas des graphiques : elles restent en HTML/CSS (*mon choix, pas discuté*).

## Anti-objectifs (échec même si « ça marche »)

- Des graphiques qui ne se ressemblent pas d'un écran à l'autre : on veut une seule famille visuelle.
- Des couleurs codées en dur qui ignorent la couleur principale choisie par l'utilisateur.
- Des montants mal formatés (il faut l'euro / la devise d'affichage via `eur`, `eur0`, `cur` de `src/lib/format.ts`, en français).
- Une animation qui rejoue à chaque frappe dans les champs de la projection : la projection se recalcule pendant qu'on tape (anti-rebond de 250 ms), les courbes doivent se mettre à jour en douceur, sans clignoter ni repartir de zéro.

## Le style C : les ingrédients communs

Valables pour tous les graphiques :

- animation à l'apparition (`easeinout`, environ 700 ms) ;
- grille horizontale discrète en pointillés, aucune bordure ni graduation sur l'axe X ;
- libellés d'axes en couleur `--muted`, police de l'application ;
- montants abrégés sur l'axe Y (« 150 k€ », « 1,2 M€ ») et pourcentages entiers (« 25 % ») ;
- infobulle partagée (toutes les séries d'une même abscisse dans un seul cadre), montants complets formatés ;
- légende en haut à gauche, pastilles rondes ; légende masquée quand il n'y a qu'une série ;
- pas d'étiquettes de valeurs sur les points (sauf le taux d'épargne de Budget) ;
- barre d'outils masquée, sauf sur les courbes dans le temps qui ont le zoom.

Par type :

- **Courbes dans le temps** (aires) : courbes lissées, remplissage en dégradé vertical léger qui s'efface vers le bas, point visible seulement au survol, **zoom horizontal et déplacement à la souris** avec une petite barre d'outils (zoom, zoom +/−, déplacement, réinitialiser ; pas de téléchargement).
- **Barres** : coins arrondis en haut (6 px), colonnes à environ 55 % de largeur ; dégradé vertical très léger sur revenus/dépenses.
- **Barres empilées** : coins arrondis seulement sur le segment du haut.
- **Anneaux** : anneau à environ 68 %, liseré blanc entre les parts, **total affiché au centre**, légende à droite.

## Graphique par graphique

| Écran | Fichier | Graphique | Rendu ApexCharts |
|---|---|---|---|
| Placement → Projection | `src/views/Projection.vue` | Projection (5 séries) | Aires lissées. Dynamique, Central, Prudent avec un dégradé (plus marqué pour Central, trait plus épais ~3,5 px, couleur `theme.accent`), « Total versé » en pointillés gris sans remplissage. **Objectif** = ligne horizontale annotée en rouge avec étiquette « Objectif 100 000 € ». **Point annoté** sur la courbe centrale à la première année où elle atteint l'objectif (« Objectif atteint en 2041 »), absent si jamais atteint. Zoom. |
| Tableau de bord | `src/views/Dashboard.vue` | Évolution du patrimoine | Aire lissée, couleur `theme.navy`, sans légende, zoom. Les mois sans relevé (valeurs nulles) restent gérés comme aujourd'hui (`spanGaps`). |
| Tableau de bord | `src/views/Dashboard.vue` | Répartition actuelle | Anneau, couleurs `CLASS_COLORS`, total au centre. |
| Tableau de bord | `src/views/Dashboard.vue` | Revenus vs dépenses | Barres groupées arrondies, vert / rouge (`PALETTE[1]` / `PALETTE[4]`). |
| Tableau de bord | `src/views/Dashboard.vue` | Taux d'épargne mensuel | Barres arrondies, accent si ≥ 0, rouge si < 0, axe Y en %, bornes −100 % / +100 % comme aujourd'hui. |
| Allocation | `src/views/Allocation.vue` | Actuel vs cible | Barres groupées. Actuel : couleur de la classe (`CLASS_COLORS`), comme aujourd'hui. Cible : `theme.navy` translucide. Axe en %, max 100 %. |
| Patrimoine | `src/views/Networth.vue` | Répartition par classe d'actif | Barres empilées par mois, couleurs `CLASS_COLORS`, arrondi sur le segment du haut. |
| Portefeuille → Répartition | `src/views/portfolio/AllocationPanel.vue` | Poids des lignes | Anneau, `PALETTE`, total au centre. |
| Portefeuille → Historique | `src/views/portfolio/HistoryPanel.vue` | Historique | Aires lissées, zoom (même traitement que l'évolution du patrimoine ; reprendre les séries et couleurs actuelles). |
| Budget | `src/views/Budget.vue` | Taux d'épargne par mois | **Remplace la courbe SVG dessinée à la main** (voir ci-dessous). |
| Budget | `src/views/Budget.vue` | Répartition des dépenses / des revenus | **Remplacent les anneaux CSS `conic-gradient`** (voir ci-dessous). |
| Budget | `src/views/Budget.vue` | Écart au budget | **Remplace les barres divergentes HTML** (voir ci-dessous). |

### Budget : les graphiques faits main

Budget contient aujourd'hui quatre graphiques sans Chart.js. Tous passent sous ApexCharts (validé sur maquettes).

#### Taux d'épargne par mois

Aujourd'hui, ce graphique est une courbe SVG faite à la main (classes `.rate-chart`, `.rate-months` dans `src/style.css`, calculs `ratePts`/`rmax`/`RX`/`RY`/`ratePath` dans `Budget.vue`). Elle est remplacée par une aire ApexCharts, choisie sur maquette :

- 12 mois de janvier à décembre, les mois sans donnée (`null`) restent vides ;
- courbe lissée, accent, dégradé léger ;
- un point sur chaque mois connu, avec son **pourcentage affiché au-dessus** (c'est la seule exception à la règle « pas d'étiquettes ») ;
- **mois sélectionné** (`mi`) mis en avant : point plein plus gros, libellé du mois en accent et gras, repère vertical pointillé léger ;
- **les taux négatifs descendent sous une ligne zéro** (aujourd'hui ils sont bloqués à 0, ce qui les masque) ;
- pas d'axe Y visible, pas de zoom, hauteur compacte (~200 px).

#### Répartition des dépenses et des revenus (anneaux)

Aujourd'hui : `donut()`, `expDonut`, `incDonut` produisent un `conic-gradient` (classes `.donut`, `.donut-wrap`, `.donut-legend`).

- Anneau ApexCharts (~70 %), liseré blanc, animation, part mise en avant au survol.
- Au centre : « Total » + montant total ; au survol d'une part, le centre affiche le nom et le montant de la part.
- Infobulle : montant et pourcentage.
- **La légende HTML détaillée actuelle est conservée** à droite de l'anneau (pastille, nom, montant, %), plutôt que la légende ApexCharts. La fonction de regroupement (6 premières catégories + « Autres », couleurs `PALETTE`) est conservée, seule la partie `conic` disparaît.
- Cas vide inchangé (« Aucun revenu ce mois. »).

#### Écart au budget (barres divergentes)

Aujourd'hui : `diverge` calcule des largeurs pour des barres HTML (classes `.diverge`).

- Barres horizontales ApexCharts, une par catégorie budgétée, triées comme aujourd'hui (du plus gros dépassement à la plus grosse économie).
- Ligne verticale zéro ; à gauche (sous le budget) en `--pos`, à droite (au-dessus) en `--neg`.
- Coins arrondis côté extérieur, écart signé affiché au bout de chaque barre (formaté comme aujourd'hui, `sgn`).
- Infobulle : écart, budget et réel de la catégorie.
- Hauteur proportionnelle au nombre de catégories ; la légende « ← sous le budget / au-dessus → » et le message vide restent.

Les calculs SVG/CSS et les classes CSS devenus inutiles (`.rate-chart`, `.rate-months`, `.donut`, `.donut .hole`, `.diverge`…) sont supprimés ; `.donut-legend` reste si la légende HTML la réutilise.

## Contraintes

- Vue 3 Composition API, `<script setup lang="ts">`, TypeScript strict : `npm run typecheck` et `npm test` doivent passer.
- Le texte de l'interface et les commentaires restent en français.
- Couleurs : uniquement `PALETTE`, `CLASS_COLORS` (`src/lib/charts.ts`), `theme.accent` / `theme.navy` / `rgba` / `mix` (`src/lib/appearance.ts`) et les variables CSS (`--muted`, `--line`…) lues au rendu. Pas de nouvelles couleurs en dur, hormis les gris neutres de grille si aucune variable ne convient.
- L'apparence est réactive : changer la couleur principale ou la police dans Réglages doit se répercuter sur les graphiques sans recharger la page.
- Zoom de l'interface : sous Electron, il est natif (aucun souci). Dans le navigateur de dev (`npm run dev`), `applyAppearance` applique un `zoom` CSS sur `:root`. Vérifier que les infobulles et le zoom à la souris d'ApexCharts restent bien placés quand l'échelle est différente de 100 % ; si ce n'est pas le cas, le signaler. Seul le mode Electron compte pour les utilisateurs.
- Hors ligne : ApexCharts est livré dans le bundle (dépendance npm), pas de CDN.
- Taille du bundle : ApexCharts est plus lourd que Chart.js. C'est accepté, à mentionner dans le résumé de la PR.

## Décidé par l'utilisateur

- ApexCharts pour Vue, à la place de Chart.js.
- Le style C pour tous les graphiques, tel que montré sur les maquettes (projection et déclinaison aux autres types).
- Harmonisation totale : tous les graphiques, y compris les quatre graphiques faits main de Budget (taux d'épargne, deux anneaux, écarts), passent sous ApexCharts.
- Chart.js est entièrement retiré.
- Les données, les calculs et la mise en page des écrans ne changent pas.

## Laissé au constructeur

- Les versions exactes d'`apexcharts` et de `vue3-apexcharts` (dernières stables compatibles entre elles et avec Vue 3).
- L'architecture : garder un composant `src/components/Chart.vue` qui enveloppe `<apexchart>` et porte les options communes du style C (fusionnées avec les options propres à chaque graphique), et faire évoluer `src/lib/charts.ts` (formateurs d'axes et d'infobulles ApexCharts à la place d'`eurTick`/`pctTick`/`eurTip`). C'est la piste recommandée, mais le découpage exact reste libre.
- Le réglage fin des durées d'animation, des opacités et des épaisseurs, tant que le rendu reste celui des maquettes.
- Gestion de la mise à jour des données sans rejouer l'animation complète (par exemple `animations.dynamicAnimation`, ou mise à jour des séries plutôt que recréation du graphique).

## Livraison

- Une branche `feat/…` depuis `develop`, une PR vers `develop`.
- Commit Conventional Commits de type `feat` (il change le rendu visible).
- Mettre à jour le README (la pile mentionne Chart.js).
- Vérification visuelle de chaque écran avec `npm run dev` et la base fictive (`npm run seed:dev`).
