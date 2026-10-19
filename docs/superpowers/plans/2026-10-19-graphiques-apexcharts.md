# Graphiques ApexCharts : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** Remplacer Chart.js et les graphiques faits main par ApexCharts, dans le « style C » validé sur maquettes, pour les 13 graphiques de l'application.

**Architecture :** Un composant `src/components/ApexChart.vue` enveloppe `<apexchart>` (vue3-apexcharts) et fusionne les options communes du style C (construites par la fonction pure `styleC()` de `src/lib/charts.ts`) avec les options propres à chaque graphique. Les vues ne passent que `type`, `series`, `options` et `height`. Chart.js reste installé pendant la migration écran par écran, puis il est supprimé dans la dernière tâche.

**Tech Stack :** Vue 3 `<script setup lang="ts">`, TypeScript, `apexcharts` ^8.3.1, `vue3-apexcharts` ^1.11.3 (peer `apexcharts >=5.10`), Vitest (environnement node, pas de test de composant).

**Spec :** `docs/superpowers/specs/2026-10-19-graphiques-apexcharts-design.md` (maquettes de référence dans `docs/superpowers/specs/2026-10-19-graphiques-apexcharts-maquettes/`)

## Global Constraints

- Code, commentaires, textes UI et messages de commit en **français**.
- Branche `feat/graphiques-apexcharts` créée depuis `develop` ; commits `feat(graphiques): …` (Conventional Commits) ; PR vers `develop`.
- Aucune modification dans `core/`, `electron/`, `mcp/` : données, calculs, rapports et API inchangés.
- Mise en page des écrans inchangée (cartes, grilles, tableaux, hauteurs ±).
- Couleurs uniquement depuis `PALETTE`, `CLASS_COLORS` (`src/lib/charts.ts`), `theme.accent` / `theme.navy` / `rgba` / `mix` (`src/lib/appearance.ts`) et les variables CSS (`--muted`, `--line`, `--pos`, `--neg`, `--outline`, `--panel`, `--text`) lues au rendu. Pas de couleur en dur, sauf un gris neutre de grille si aucune variable ne convient.
- Montants via `eur`, `eur0`, `pct` de `src/lib/format.ts` (devise d'affichage, français) ; axes abrégés via `moneyAxis` (Tâche 1).
- Apparence réactive : changer la couleur principale ou la police dans Réglages met à jour les graphiques affichés, sans recharger.
- ApexCharts vient du bundle npm, jamais d'un CDN.
- Fin de chaque tâche : `npm run typecheck && npm test && npm run lint` au vert, puis le contrôle visuel de la tâche avec `npm run dev` (http://localhost:5173) sur la base fictive (`npm run seed:dev`).
- Après les modifications de code de chaque tâche : `graphify update .`.

## Review Focus

Le renderer n'a pas de test de composant ; seuls les helpers de `src/lib/charts.ts` sont testés automatiquement. Ces cas ne sont couverts par aucun test et sont à vérifier à la main dans la tâche qui possède le graphique :

1. **Données vides** (base neuve, mois sans opération, aucune catégorie budgétée, portefeuille vide) : le graphique s'affiche vide ou laisse place au message vide existant, sans erreur dans la console. Contrôle : Tâches 3, 4, 5.
2. **Valeurs `null`** (mois sans relevé, mois futurs du taux d'épargne) : un trou dans la courbe, jamais un zéro. Contrôle : Tâches 3, 5.
3. **Changement d'apparence pendant l'affichage** : couleur principale et police changées dans Réglages, puis retour sur l'écran : couleurs accent/navy et police à jour. Contrôle : Tâche 2.
4. **Frappe dans les champs de la projection** : les courbes glissent vers les nouvelles valeurs, sans clignoter ni repartir de zéro. Contrôle : Tâche 2.
5. **Devise autre que l'euro** : axes et infobulles dans la devise choisie. Test automatique `moneyAxis` en USD (Tâche 1), puis contrôle visuel Tâche 2.

---

### Tâche 1 : Fondations (dépendances, helpers, composant)

**Files:**
- Modify: `package.json` (ajout `apexcharts`, `vue3-apexcharts`)
- Modify: `src/main.ts` (enregistrement du plugin)
- Modify: `src/lib/charts.ts` (nouveaux helpers ; `eurTick`/`eurTip` restent jusqu'à la Tâche 6)
- Create: `src/components/ApexChart.vue`
- Create: `tests/charts.test.ts`
- Add: `docs/superpowers/specs/2026-10-19-graphiques-apexcharts-design.md` et le dossier `…-maquettes/` (pas encore versionnés)

**Interfaces:**
- Produces :
  - `moneyAxis(v: number): string` : montant abrégé dans la devise d'affichage (`Intl.NumberFormat("fr-FR", { style: "currency", currency: appearance.currency, notation: "compact", maximumFractionDigits: 1 })`) ; ex. 150000 → « 150 k€ », 1200000 → « 1,2 M€ ».
  - `pctTick(v: number | string): string` : existant, inchangé (« 25 % »).
  - `mergeOptions<T extends object>(base: T, extra: T): T` : fusion profonde, sans muter les entrées ; les objets simples sont fusionnés, les tableaux et les autres valeurs de `extra` remplacent ceux de `base`.
  - `interface ChartUi { muted: string; line: string; font: string }`
  - `styleC(type: "area" | "line" | "bar" | "donut" | "rangeArea", zoom: boolean, ui: ChartUi): ApexOptions` : options communes du style C (spec, « Le style C : les ingrédients communs »).
  - Composant `ApexChart.vue`, props `{ type: "area" | "line" | "bar" | "donut" | "rangeArea"; series: ApexAxisChartSeries | ApexNonAxisChartSeries; options?: ApexOptions; height?: number; zoom?: boolean }` (`height` par défaut 260, `zoom` par défaut `false`).

- [ ] **Step 1 : Branche et spec**

```bash
git switch -c feat/graphiques-apexcharts develop
git add docs/superpowers/specs/2026-10-19-graphiques-apexcharts-design.md docs/superpowers/specs/2026-10-19-graphiques-apexcharts-maquettes docs/superpowers/plans/2026-10-19-graphiques-apexcharts.md
git commit -m "docs(graphiques): conception et plan du passage à ApexCharts"
```

- [ ] **Step 2 : Dépendances**

Run : `npm install apexcharts@^8.3.1 vue3-apexcharts@^1.11.3`
Expected : les deux paquets sont dans `dependencies`, et `npm ls apexcharts` n'affiche pas de conflit de peer.

- [ ] **Step 3 : Écrire les tests qui échouent** dans `tests/charts.test.ts`

Comparer les chaînes après normalisation des espaces (`s.replace(/\s/g, " ")`, l'Intl français utilise des espaces insécables).

```ts
describe("moneyAxis", () => {
  it("abrège en k et M dans la devise d'affichage", () => {
    appearance.currency = "EUR";
    expect(n(moneyAxis(150000))).toBe("150 k€");
    expect(n(moneyAxis(1200000))).toBe("1,2 M€");
    expect(n(moneyAxis(950))).toBe("950 €");
  });
  it("suit la devise choisie", () => { appearance.currency = "USD"; expect(n(moneyAxis(150000))).toBe("150 k$US"); appearance.currency = "EUR"; });
});
describe("mergeOptions", () => {
  it("fusionne en profondeur, remplace les tableaux, ne mute pas", () => {
    const base = { chart: { toolbar: { show: false }, height: 260 }, colors: ["#a"] };
    const out = mergeOptions(base, { chart: { toolbar: { show: true } }, colors: ["#b"] } as typeof base);
    expect(out).toEqual({ chart: { toolbar: { show: true }, height: 260 }, colors: ["#b"] });
    expect(base.chart.toolbar.show).toBe(false);
  });
});
describe("styleC", () => {
  const ui = { muted: "#5e5e5e", line: "#e1e3e1", font: "Roboto" };
  it("active le zoom horizontal et la barre d'outils seulement si demandé", () => {
    expect(styleC("area", true, ui).chart?.zoom).toMatchObject({ enabled: true, type: "x" });
    expect(styleC("area", true, ui).chart?.toolbar).toMatchObject({ show: true, tools: { download: false } });
    expect(styleC("area", false, ui).chart?.toolbar?.show).toBe(false);
  });
  it("arrondit les barres et règle les anneaux", () => {
    expect(styleC("bar", false, ui).plotOptions?.bar).toMatchObject({ borderRadius: 6, borderRadiusApplication: "end", columnWidth: "55%" });
    expect(styleC("donut", false, ui).plotOptions?.pie?.donut?.size).toBe("68%");
  });
  it("applique police, animation et infobulle partagée", () => {
    const o = styleC("line", false, ui);
    expect(o.chart?.fontFamily).toBe("Roboto");
    expect(o.chart?.animations).toMatchObject({ enabled: true, speed: 700 });
    expect(o.tooltip).toMatchObject({ shared: true, intersect: false });
  });
});
```

(Si le format `USD` compact diffère selon la version de Node, ajuster la valeur attendue à la sortie réelle d'`Intl` : le test vérifie que le symbole suit `appearance.currency`, pas une chaîne exacte.)

- [ ] **Step 4 : Vérifier l'échec**

Run : `npx vitest run tests/charts.test.ts`
Expected : FAIL, `moneyAxis`, `mergeOptions` et `styleC` ne sont pas exportés.

- [ ] **Step 5 : Implémenter les helpers dans `src/lib/charts.ts`**

`styleC` reprend les valeurs de la spec : animation `easeinout` 700 ms avec `dynamicAnimation` activée (mise à jour en douceur) ; grille `strokeDashArray: 4`, couleur `ui.line` ; axe X sans bordure ni graduation ; libellés en `ui.muted` ; `dataLabels` désactivés ; légende en haut à gauche, pastilles rondes ; infobulle partagée avec `y.formatter = (v) => eur0(v)`. Pour area/line/rangeArea : `stroke.curve "smooth"`, `markers.size 0` et `hover.size 6`, axe Y `moneyAxis`, fill en dégradé vertical (`opacityTo 0`, `stops [0, 95]`). Pour `zoom` : `chart.zoom { enabled: true, type: "x" }` et une barre d'outils avec zoom, zoom +/−, déplacement, réinitialiser, sans téléchargement. Pour bar : `plotOptions.bar { borderRadius: 6, borderRadiusApplication: "end", borderRadiusWhenStacked: "last", columnWidth: "55%" }`. Pour donut : `plotOptions.pie.donut.size "68%"`, `stroke { width: 3, colors: [panel] }`, légende à droite, total au centre (`labels.total.show`, formatter `eur0` de la somme). Le type `ApexOptions` vient de `apexcharts`.

- [ ] **Step 6 : Vérifier le succès**

Run : `npx vitest run tests/charts.test.ts`
Expected : PASS.

- [ ] **Step 7 : Composant `src/components/ApexChart.vue` et plugin**

Dans `src/main.ts`, ajouter `app.use(VueApexCharts)` (import par défaut de `vue3-apexcharts`), ce qui enregistre `<apexchart>`. Le composant :
- calcule `ui` à partir de `getComputedStyle(document.documentElement)` (`--muted`, `--line`) et de `appearance.font` via `FONTS` ; il lit `appearance.accent` et `appearance.font` dans ce `computed` pour être recalculé quand l'apparence change ;
- passe `mergeOptions(styleC(type, zoom, ui), options ?? {})` à `<apexchart :type :height :series :options>` ;
- garde le conteneur `.chart-box` existant (même hauteur qu'aujourd'hui).

- [ ] **Step 8 : Vérifier l'ensemble**

Run : `npm run typecheck && npm test && npm run lint`
Expected : tout passe (Chart.js est toujours là, aucune vue n'a encore changé).

- [ ] **Step 9 : Commit**

```bash
graphify update .
git add package.json package-lock.json src/main.ts src/lib/charts.ts src/components/ApexChart.vue tests/charts.test.ts graphify-out
git commit -m "feat(graphiques): socle ApexCharts et style commun"
```

---

### Tâche 2 : Projection (graphique de référence)

**Files:**
- Modify: `src/views/Projection.vue:8-10,37-46,75`

**Interfaces:**
- Consumes : `ApexChart.vue` (Tâche 1), `theme`, `PALETTE`.

- [ ] **Step 1 : Remplacer le `computed` `chart`** par `series` (4 séries `{ name, data: {x: year, y}[] }` : Dynamique `PALETTE[2]`, Central `theme.accent`, Prudent `PALETTE[1]`, Total versé `PALETTE[6]` ; les noms gardent les taux, ex. `Central ${p.rateMid} %`) et `options`.

Valeurs à reprendre de la maquette C : `xaxis.type "numeric"`, libellés d'année entiers ; `stroke.width [2, 3.5, 2, 2]`, `dashArray [0, 0, 0, 6]` ; dégradé `opacityFrom [0.10, 0.28, 0.10, 0]`. Objectif : `annotations.yaxis` à `p.goal`, couleur `PALETTE[4]` en pointillés, étiquette `Objectif ${eur0(p.goal)}` à gauche. Point annoté : `const hit = pr.value.rows.find((r) => r.mid >= p.goal)` ; si `hit` existe, `annotations.points` en `(hit.year, hit.mid)`, marqueur blanc cerclé d'accent, étiquette `Objectif atteint en ${hit.year}` sur fond accent ; sinon aucun point. Infobulle titre `Année ${x}`.

- [ ] **Step 2 : Remplacer `<Chart :config="chart" :height="380" />`** par `<ApexChart type="area" :series="series" :options="options" :height="380" zoom />` et retirer les imports Chart.js.

- [ ] **Step 3 : Vérifier**

Run : `npm run typecheck && npm test && npm run lint`, puis `npm run dev` → Placement → Projection.
Expected : le rendu correspond à `maquettes/projection-styles.html` (option C) ; le zoom à la souris et la réinitialisation fonctionnent. **Review Focus 4** : taper dans « Versement mensuel » fait glisser les courbes sans clignoter ni repartir de zéro ; avec un objectif inatteignable (10 000 000), le point annoté disparaît. **Review Focus 3** : passer la couleur principale sur « Vert » et la police sur « Verdana » dans Réglages, revenir : la courbe centrale est verte et les libellés sont en Verdana. **Review Focus 5** : avec la devise en USD, l'axe affiche « k$US ». Vérifier aussi l'échelle d'interface à 125 % dans le navigateur de dev : si l'infobulle ou le zoom sont décalés, le noter dans la PR (Electron fait foi).

- [ ] **Step 4 : Commit**

```bash
graphify update .
git add src/views/Projection.vue graphify-out
git commit -m "feat(graphiques): projection en style C avec ApexCharts"
```

---

### Tâche 3 : Tableau de bord (4 graphiques)

**Files:**
- Modify: `src/views/Dashboard.vue:8-9,17-38,106-109`

- [ ] **Step 1 : Convertir les quatre `computed`** (rendu détaillé : tableau « Graphique par graphique » de la spec, maquette `autres-graphiques.html`)
  - `nwChart` → `type="area"`, une série « Patrimoine » en `theme.navy`, catégories = libellés de mois actuels, légende masquée, `zoom`. Les `null` restent `null` (trou, pas de zéro).
  - `classChart` → `type="donut"`, `series` = valeurs, `labels` = classes, `colors` = `CLASS_COLORS[c] ?? PALETTE[6]`.
  - `budgetChart` → `type="bar"`, Revenus `PALETTE[1]` et Dépenses `PALETTE[4]`, léger dégradé vertical (`opacityFrom 1`, `opacityTo 0.75`).
  - `rateChart` → `type="bar"`, une série, couleur fonction `({ value }) => value < 0 ? PALETTE[4] : theme.accent`, axe Y `pctTick`, `min -1`, `max 1`, infobulle `pct`, légende masquée.

- [ ] **Step 2 : Remplacer les 4 `<Chart>`** par `<ApexChart>` (hauteur par défaut) et retirer les imports Chart.js.

- [ ] **Step 3 : Vérifier**

Run : `npm run typecheck && npm test && npm run lint`, puis `npm run dev` → Tableau de bord.
Expected : rendu conforme à la maquette. **Review Focus 1 et 2** : avec une base vide (`PATRIMOINE_DB` pointant vers un fichier neuf), l'écran s'affiche sans erreur dans la console ; dans la base fictive, un mois sans relevé fait un trou dans l'évolution du patrimoine.

- [ ] **Step 4 : Commit**

```bash
graphify update .
git add src/views/Dashboard.vue graphify-out
git commit -m "feat(graphiques): tableau de bord en style C"
```

---

### Tâche 4 : Patrimoine, Allocation, Portefeuille (4 graphiques)

**Files:**
- Modify: `src/views/Networth.vue:7-9,48-52,78`
- Modify: `src/views/Allocation.vue:7-9,29-34,62`
- Modify: `src/views/portfolio/AllocationPanel.vue:4-6,11-16,28`
- Modify: `src/views/portfolio/HistoryPanel.vue:5-7,12-25,32`

- [ ] **Step 1 : Convertir**
  - Networth → `type="bar"`, `chart.stacked: true`, une série par classe (`CLASS_COLORS`), `null` conservés ; hauteur 360.
  - Allocation → `type="bar"`. Actuel : couleur par point de la classe (`colors` fonction sur `dataPointIndex` → `CLASS_COLORS[rows[i].asset_class]`). Cible : `rgba(theme.navy, .25)` avec contour `theme.navy`. Axe `pctTick`, `max 1`, infobulle `pct` ; hauteur 240.
  - AllocationPanel → `type="donut"`, 8 premières lignes + « Autres » comme aujourd'hui, `PALETTE` ; hauteur 220.
  - HistoryPanel → `type="area"`, `zoom`. « Valeur » en `theme.accent` avec dégradé ; « Montant investi » en `PALETTE[6]`, pointillés, sans remplissage, `stroke.curve` `"stepline"` pour cette série (en escalier comme aujourd'hui). Axe X en `categories` (libellés de date actuels), `tickAmount 8` ; hauteur 400.

- [ ] **Step 2 : Remplacer les `<Chart>`** et retirer les imports Chart.js des 4 fichiers.

- [ ] **Step 3 : Vérifier**

Run : `npm run typecheck && npm test && npm run lint`, puis `npm run dev` → Patrimoine, Allocation, Portefeuille (onglets Répartition et Historique).
Expected : rendu conforme à `autres-graphiques.html`. **Review Focus 1** : un portefeuille sans ligne n'affiche aucune erreur dans la console.

- [ ] **Step 4 : Commit**

```bash
graphify update .
git add src/views/Networth.vue src/views/Allocation.vue src/views/portfolio graphify-out
git commit -m "feat(graphiques): patrimoine, allocation et portefeuille en style C"
```

---

### Tâche 5 : Budget (4 graphiques faits main)

**Files:**
- Modify: `src/views/Budget.vue:129-153` (calculs), `:274-305` (anneaux et écarts), `:323-333` (taux d'épargne)
- Modify: `src/style.css:135-157` (supprimer `.donut`, `.donut .hole`, `.diverge*`, `.rate-chart*`, `.rate-months*` ; garder `.donut-wrap` et `.donut-legend` si la légende les réutilise)

**Interfaces:**
- Consumes : `ApexChart.vue`, `PALETTE`, `sgn`, `exps`, `mi`, `b`.

- [ ] **Step 1 : Anneaux.** `donut()` garde le regroupement (6 premières + « Autres », `PALETTE`) et renvoie `{ segs }` sans `conic`. Chaque carte : `<ApexChart type="donut" :height="210">` (`series` = `segs.v`, `labels` = `segs.name`, `colors` = `segs.color`, `legend.show false`, `donut.size "70%"`, total au centre = `eur0(exp)` / `eur0(inc)`, infobulle `${eur0(v)} · ${pourcentage} %`), à côté de la légende HTML `.donut-legend` actuelle, inchangée. Cas vide « Aucun revenu ce mois. » conservé.

- [ ] **Step 2 : Écarts.** `diverge` renvoie `{ name, d }[]` triés comme aujourd'hui. `<ApexChart type="bar">`, `plotOptions.bar.horizontal true`, `barHeight "55%"`, `borderRadius 4` ; couleur fonction `value > 0 ? --neg : --pos` (lues sur `:root`) ; `dataLabels` activés avec le formatter `sgn` ; annotation `xaxis` à 0 en `--outline` ; axe X symétrique (`±max|d| × 1,35`) sans libellés ; infobulle `${sgn(d)} (budget ${eur0(b)}, réel ${eur0(r)})` ; hauteur `max(n × 30 + 30, 160)`. Légende « ← sous le budget / au-dessus → » et message vide conservés.

- [ ] **Step 3 : Taux d'épargne.** Supprimer `ratePts`, `rmax`, `RX`, `RY`, `ratePath` et le bloc `.rate-chart` / `.rate-months`. `<ApexChart type="area" :height="200">` : série = `b.totals.rate` (12 mois, `null` conservés), catégories `MONTHS`, axe Y masqué, `markers.size 5` (blanc cerclé d'accent), point de `mi` plein et plus gros (`markers.discrete`), libellés de valeur activés (`Math.round(v*100) %`, `--muted`), libellé du mois `mi` en accent et gras, annotation `xaxis` pointillée sur `MONTHS[mi]`, annotation `yaxis` à 0 en `--outline`, bornes Y couvrant les négatifs (`min(min(rate), 0) − 0,1` à `max(max(rate), 0,3) × 1,2`), grille masquée, pas de zoom.

- [ ] **Step 4 : Nettoyer `src/style.css`** (voir Files).

- [ ] **Step 5 : Vérifier**

Run : `npm run typecheck && npm test && npm run lint`, puis `npm run dev` → Budget.
Expected : rendu conforme à `budget-taux-epargne.html` (version 2) et `budget-anneaux-ecarts.html` (rangée 2). **Review Focus 1 et 2** : un mois futur affiche les messages vides sans erreur dans la console ; les mois futurs du taux d'épargne sont vides, pas à 0 ; un mois négatif descend sous la ligne zéro. Changer de mois met à jour les trois graphiques et le point mis en avant.

- [ ] **Step 6 : Commit**

```bash
graphify update .
git add src/views/Budget.vue src/style.css graphify-out
git commit -m "feat(graphiques): graphiques du budget sous ApexCharts"
```

---

### Tâche 6 : Retrait de Chart.js

**Files:**
- Delete: `src/components/Chart.vue`
- Modify: `src/lib/charts.ts` (retirer `eurTick`, `eurTip`, l'import `chart.js` et le commentaire « pour Chart.js »)
- Modify: `src/lib/appearance.ts:3,78` (retirer l'import et `Chart.defaults.font.family`)
- Modify: `package.json` (retirer `chart.js`)
- Modify: `README.md:5` (`Chart.js` → `ApexCharts`)

- [ ] **Step 1 : Supprimer** les éléments listés, puis `npm uninstall chart.js`.

- [ ] **Step 2 : Vérifier qu'il ne reste rien**

Run : `git grep -n -i "chart\.js\|chartconfiguration\|eurTip\|eurTick\|components/Chart.vue"`
Expected : aucun résultat hors `docs/` et `CHANGELOG.md`.

- [ ] **Step 3 : Vérification complète**

Run : `npm run typecheck && npm test && npm run lint && npm run build`
Expected : tout passe. Noter dans la PR la taille du bundle renderer avant/après (sortie de `vite build`).

- [ ] **Step 4 : Contrôle final** : `npm run dev:electron` ; parcourir Tableau de bord, Budget, Patrimoine, Allocation, Portefeuille, Projection. Aucune erreur dans la console, et l'échelle d'interface à 125 % garde les infobulles bien placées.

- [ ] **Step 5 : Commit**

```bash
graphify update .
git add -A src package.json package-lock.json README.md graphify-out
git commit -m "feat(graphiques): retrait de Chart.js"
```
