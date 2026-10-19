# Graph Report - patrimoine  (2026-10-19)

## Corpus Check
- 131 files · ~105,144 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 1, .css 1)

## Summary
- 1109 nodes · 2610 edges · 68 communities (61 shown, 7 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 174 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d9651879`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- history.ts
- importers.ts
- lib/api.ts
- Envelopes.vue
- ScenarioModal.vue
- appearance.ts
- Règles de catégorisation
- Configuration electron-builder
- Vue Transactions
- envelopes.ts
- Dépendances de développement
- Portfolio.vue
- Métadonnées package.json
- budgetPlan.ts
- Vue Objectifs
- schema.ts
- charts.ts
- Release et gitflow
- Assistant de budgétisation : propositions de budget par scénario
- Projection.vue
- toast.ts
- Recurring.vue
- format.ts
- Settings.vue
- Store
- Scripts npm
- Dashboard.vue
- Budget.vue
- Configuration TypeScript
- Networth.vue
- db.ts
- Dépendances runtime
- Principes Vue (skill)
- Serveur MCP
- Import.vue
- Refunds.vue
- Animations, slots, composables
- Flux de données Vue
- core/api.ts
- Async, SSR et état global
- KeepAlive, Suspense, Transition
- SFC et TransitionGroup
- Directives et rendu
- Performance des listes
- seed-dev.ts
- Réactivité et animations
- Dépôt git (package.json)
- zip-mcp.mjs
- AssetModal.vue
- Allocation.vue
- format.ts
- sumKind
- createApi
- Category
- PickerModal.vue
- Account
- Graphiques : passage de Chart.js à ApexCharts
- updater.ts
- hero
- cellClass
- expB
- sgn
- prevRow
- vue
- draftSum
- Assistant de budgétisation : plan d'implémentation
- run-ts.mjs
- load

## God Nodes (most connected - your core abstractions)
1. `guard()` - 86 edges
2. `createApi()` - 54 edges
3. `vue` - 41 edges
4. `Store` - 38 edges
5. `round2()` - 35 edges
6. `eur0()` - 32 edges
7. `api` - 26 edges
8. `notify()` - 25 edges
9. `Vue Best Practices Workflow (SKILL)` - 25 edges
10. `eur()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `Tâche 2 : moyennes glissantes, réglage des charges, application et API` --references--> `Scenario`  [INFERRED]
  docs/superpowers/plans/2026-10-18-assistant-budget.md → core/budgetPlan.ts
- `Assistant de budgétisation : plan d'implémentation` --references--> `buildScenarios()`  [INFERRED]
  docs/superpowers/plans/2026-10-18-assistant-budget.md → core/budgetPlan.ts
- `Tâche 1 : calcul pur des scénarios` --references--> `buildScenarios()`  [INFERRED]
  docs/superpowers/plans/2026-10-18-assistant-budget.md → core/budgetPlan.ts
- `Tâche 2 : moyennes glissantes, réglage des charges, application et API` --references--> `buildScenarios()`  [INFERRED]
  docs/superpowers/plans/2026-10-18-assistant-budget.md → core/budgetPlan.ts
- `Assistant de budgétisation : plan d'implémentation` --references--> `categoryAverages()`  [INFERRED]
  docs/superpowers/plans/2026-10-18-assistant-budget.md → core/budgetPlan.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Release pipeline: Conventional Commits -> CI -> semantic-release -> CHANGELOG** — claude_conventional_commits, _github_workflows_ci, _github_workflows_release, _github_workflows_release_semantic_release, changelog, claude_gitflow_branches [EXTRACTED 1.00]
- **Refactor UI : KpiCard, PageHeader, découpage Portfolio, tokens CSS** — docs_superpowers_specs_2026_10_17_refactor_composants_ui_design_kpicard, docs_superpowers_specs_2026_10_17_refactor_composants_ui_design_pageheader, docs_superpowers_specs_2026_10_17_refactor_composants_ui_design_portfolio_split, docs_superpowers_specs_2026_10_17_refactor_composants_ui_design_css_tokens, docs_superpowers_plans_2026_10_17_refactor_composants_ui_src_lib_move [EXTRACTED 1.00]
- **SSR Safety Concerns** — _claude_skills_vue_best_practices_references_state_management_ssr_singleton_leak, _claude_skills_vue_best_practices_references_component_async_lazy_hydration, _claude_skills_vue_best_practices_references_directives_get_ssr_props [INFERRED 0.75]
- **Vue Built-in Components (Transition, TransitionGroup, KeepAlive, Suspense, Teleport)** — _claude_skills_vue_best_practices_references_component_transition_transition, _claude_skills_vue_best_practices_references_component_transition_group_transition_group, _claude_skills_vue_best_practices_references_component_keep_alive_keepalive_cache, _claude_skills_vue_best_practices_references_component_suspense_suspense, _claude_skills_vue_best_practices_references_component_teleport_teleport_overlay [INFERRED 0.85]
- **Large List Rendering Performance Techniques** — _claude_skills_vue_best_practices_references_perf_virtualize_large_lists_list_virtualization, _claude_skills_vue_best_practices_references_perf_v_once_v_memo_directives_v_memo, _claude_skills_vue_best_practices_references_perf_avoid_component_abstraction_in_lists_component_overhead_in_lists, _claude_skills_vue_best_practices_references_sfc_stable_key [INFERRED 0.85]

## Communities (68 total, 7 thin omitted)

### Community 0 - "history.ts"
Cohesion: 0.14
Nodes (23): exportWorkbook(), sheet(), addDays(), backfillPriceHistory(), BackfillResult, currencyOf(), fetchCoinGeckoHistory(), fetchYahooHistory() (+15 more)

### Community 1 - "importers.ts"
Cohesion: 0.28
Nodes (13): decodeHtml(), detectSource(), excelDate(), fingerprint(), num(), parseBnp(), parseBoursobank(), parseCsvLine() (+5 more)

### Community 2 - "lib/api.ts"
Cohesion: 0.18
Nodes (11): api, Bridge, call(), files, isElectron, Promisify, Window, exportOps() (+3 more)

### Community 3 - "Envelopes.vue"
Cohesion: 0.12
Nodes (18): EnvelopeRow, accounts, draft, emit, EnvelopeDraft, EnvelopeKindInfo, modalKind, props (+10 more)

### Community 4 - "ScenarioModal.vue"
Cohesion: 0.18
Nodes (12): applyOnce(), busy, choice, chosen, data, emit, empty, follow() (+4 more)

### Community 5 - "appearance.ts"
Cohesion: 0.18
Nodes (17): Contraintes, props, ACCENT_PRESETS, appearance, applyAppearance(), applyCachedAppearance(), CURRENCIES, DEFAULT_ACCENT (+9 more)

### Community 6 - "Règles de catégorisation"
Cohesion: 0.16
Nodes (22): guard(), load(), setTarget(), addMap(), addRule(), bankMap, categories, delMap() (+14 more)

### Community 7 - "Configuration electron-builder"
Cohesion: 0.08
Nodes (25): build, appId, asar, copyright, directories, extraResources, files, linux (+17 more)

### Community 8 - "Vue Transactions"
Cohesion: 0.08
Nodes (25): TxFilter, el, emit, props, Value, todayIso(), newOp(), accounts (+17 more)

### Community 9 - "envelopes.ts"
Cohesion: 0.11
Nodes (30): ApiMethod, CurrentBalance, currentBalances(), dailyBalances(), lastStatementBalances(), portfolioValueByAccount(), addDays(), ENVELOPE_KIND_NAMES (+22 more)

### Community 10 - "Dépendances de développement"
Cohesion: 0.09
Nodes (23): devDependencies, conventional-changelog-conventionalcommits, cross-env, electron, electron-builder, esbuild, eslint, @eslint/css (+15 more)

### Community 11 - "Portfolio.vue"
Cohesion: 0.11
Nodes (19): notify(), copyPrevious(), useSuggested(), accounts, assets, backfill(), backfilling, classes (+11 more)

### Community 12 - "Métadonnées package.json"
Cohesion: 0.08
Nodes (28): author, description, engines, node, main, name, private, type (+20 more)

### Community 13 - "budgetPlan.ts"
Cohesion: 0.08
Nodes (36): addDays(), addMonths(), autoBudgets(), AvgRow, budgetPrepare(), budgetScenarios, buildScenarios(), categoryAverages() (+28 more)

### Community 14 - "Vue Objectifs"
Cohesion: 0.13
Nodes (18): GoalRow, GoalSource, accounts, archive(), classes, GoalDraft, goals, inYear() (+10 more)

### Community 15 - "schema.ts"
Cohesion: 0.19
Nodes (14): Asset, AssetRow, BankCategoryMap, BankCategoryMapRow, Goal, ImportAccountMap, ImportAccountMapRow, Operation (+6 more)

### Community 16 - "charts.ts"
Cohesion: 0.38
Nodes (7): Tâche 1 : Fondations (dépendances, helpers, composant), merged, ChartUi, isPlain(), mergeOptions(), moneyAxis(), styleC()

### Community 17 - "Release et gitflow"
Cohesion: 0.08
Nodes (30): frontend-design LICENSE (Apache 2.0), frontend-design skill (.agents), AI-generated design defaults to avoid, UX writing in design, frontend-design LICENSE (Apache 2.0, .claude copy), frontend-design skill (.claude), CI workflow (typecheck, lint, test, build), Release workflow (semantic-release, Windows .exe) (+22 more)

### Community 18 - "Assistant de budgétisation : propositions de budget par scénario"
Cohesion: 0.13
Nodes (14): Anti-objectifs (échec même si « ça marche »), Application, Architecture (décidée), Assistant de budgétisation : propositions de budget par scénario, Charges fixes, Intention, Laissé au constructeur, Mes choix (non validés explicitement par l'utilisateur) (+6 more)

### Community 19 - "Projection.vue"
Cohesion: 0.18
Nodes (9): apexcharts, activeGoals, compute(), goals, nwTotal, options, p, pr (+1 more)

### Community 20 - "toast.ts"
Cohesion: 0.20
Nodes (10): @fontsource-variable/roboto, @material/web, vue3-apexcharts, vue-router, group, route, tabs, router (+2 more)

### Community 21 - "Recurring.vue"
Cohesion: 0.06
Nodes (53): CalendarEntry, calendarMonth(), iso(), lastDay(), MONTHS, projectedDates(), Categorizer, normalize() (+45 more)

### Community 22 - "format.ts"
Cohesion: 0.27
Nodes (10): Global Constraints, Graphiques ApexCharts : plan d'implémentation, Review Focus, Tâche 2 : Projection (graphique de référence), Tâche 3 : Tableau de bord (4 graphiques), Tâche 4 : Patrimoine, Allocation, Portefeuille (4 graphiques), pctTick(), pct() (+2 more)

### Community 23 - "Settings.vue"
Cohesion: 0.15
Nodes (21): fromSettings(), accounts, addAcc(), addCat(), categories, addCat(), emit, newCat (+13 more)

### Community 24 - "Store"
Cohesion: 0.18
Nodes (13): applyBudgetScenario(), buildCategorizer(), recategorizeAll(), Store, guessEnvelopeKind(), saveGoal(), importFile(), DEFAULT_SETTINGS_V2 (+5 more)

### Community 25 - "Scripts npm"
Cohesion: 0.13
Nodes (15): scripts, build, build:electron, build:mcp, build:renderer, dev, dev:electron, lint (+7 more)

### Community 26 - "Dashboard.vue"
Cohesion: 0.27
Nodes (12): Tâche 6 : Retrait de Chart.js, Laissé au constructeur, theme, eurTick(), eurTip(), PALETTE, budgetChart, d (+4 more)

### Community 27 - "Budget.vue"
Cohesion: 0.04
Nodes (50): PrepareReport, BudgetRow, autoCount, b, bPrev, CatMonth, curMonth, curYear (+42 more)

### Community 28 - "Configuration TypeScript"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, lib, module, moduleResolution, noEmit, resolveJsonModule, skipLibCheck (+4 more)

### Community 29 - "Networth.vue"
Cohesion: 0.19
Nodes (12): month(), thisMonth(), classes, draft, draftTotal, editMonth, fillDraft(), load() (+4 more)

### Community 30 - "db.ts"
Cohesion: 0.19
Nodes (7): locateWasm(), Row, vite, @vitejs/plugin-vue, [dir, out], FX, HAS_FX

### Community 31 - "Dépendances runtime"
Cohesion: 0.14
Nodes (14): dependencies, apexcharts, chart.js, electron-updater, exceljs, @fontsource-variable/roboto, @material/web, @modelcontextprotocol/sdk (+6 more)

### Community 32 - "Principes Vue (skill)"
Cohesion: 0.22
Nodes (4): Component Fallthrough Attributes Best Practices, Teleport Component Best Practices, Avoid Expensive Operations in Updated Hook, Vue Best Practices Workflow (SKILL)

### Community 33 - "Serveur MCP"
Cohesion: 0.19
Nodes (9): defaultDbPath(), VERSION, fail(), main(), text(), wrap(), electron, @modelcontextprotocol/sdk (+1 more)

### Community 34 - "Import.vue"
Cohesion: 0.16
Nodes (11): ImportResult, accounts, addMap(), busy, delMap(), loadMaps(), maps, newMap (+3 more)

### Community 35 - "Refunds.vue"
Cohesion: 0.18
Nodes (13): applyAll(), categories, deleteRule(), expenseCats, linkTo(), load(), pick(), picker (+5 more)

### Community 36 - "Animations, slots, composables"
Cohesion: 0.25
Nodes (3): Use Class-based Animations for Non-Enter/Leave Effects, Component Slots Best Practices, Composable Organization Patterns

### Community 38 - "core/api.ts"
Cohesion: 0.16
Nodes (29): addMonths(), CashFlow, days(), futureValue(), monthStart(), monthsToGoal(), round2(), today() (+21 more)

### Community 40 - "KeepAlive, Suspense, Transition"
Cohesion: 0.29
Nodes (3): KeepAlive Component Best Practices, Suspense Component Best Practices, Transition Component Best Practices

### Community 42 - "Directives et rendu"
Cohesion: 0.29
Nodes (3): Directive Best Practices, Avoid Excessive Component Abstraction in Large Lists, Render Function Patterns and Performance

### Community 44 - "seed-dev.ts"
Cohesion: 0.17
Nodes (17): addDays(), appDb, argv, between(), chance(), dayOf(), days, gauss() (+9 more)

### Community 46 - "Dépôt git (package.json)"
Cohesion: 0.67
Nodes (3): repository, type, url

### Community 47 - "zip-mcp.mjs"
Cohesion: 0.13
Nodes (13): cd, centrals, end, entries, files, locals, now, out (+5 more)

### Community 48 - "AssetModal.vue"
Cohesion: 0.20
Nodes (9): AssetSuggestion, AssetDraft, draft, emit, props, query, results, saveAsset() (+1 more)

### Community 49 - "Allocation.vue"
Cohesion: 0.18
Nodes (8): AllocationRow, chart.js, canvas, props, CLASS_COLORS, monthLong(), al, deposit

### Community 50 - "format.ts"
Cohesion: 0.16
Nodes (16): Anti-objectifs (échec même si « ça marche »), cur(), date(), eur(), eur0(), fmtCache, moneyFormat(), num() (+8 more)

### Community 51 - "sumKind"
Cohesion: 0.29
Nodes (7): exp, inc, pexp, pinc, psav, sav, sumKind()

### Community 52 - "createApi"
Cohesion: 0.33
Nodes (7): createApi(), budgetMonthReport, saveBudgetMonth(), vitest, main(), setup(), setup()

### Community 53 - "Category"
Cohesion: 0.22
Nodes (9): Category, emit, excluded, props, setExcluded(), draft, emit, props (+1 more)

### Community 54 - "PickerModal.vue"
Cohesion: 0.31
Nodes (8): RefundRow, emit, pickCategory(), picker, pickExpense(), props, searchExpenses(), shift()

### Community 55 - "Account"
Cohesion: 0.25
Nodes (8): Account, accountsShown, addAcc(), emit, newAcc, NewAccount, props, showArchived

### Community 56 - "Graphiques : passage de Chart.js à ApexCharts"
Cohesion: 0.25
Nodes (7): Décidé par l'utilisateur, Graphiques : passage de Chart.js à ApexCharts, Intention, Le style C : les ingrédients communs, Livraison, Non-objectifs, Objectifs

### Community 57 - "updater.ts"
Cohesion: 0.22
Nodes (10): check(), isPortable(), setupUpdater(), state, UpdateState, electron-updater, checkUpdate(), describe() (+2 more)

### Community 58 - "hero"
Cohesion: 0.40
Nodes (5): cap(), daysIn(), daysLeft, hero, paceLeft

### Community 59 - "cellClass"
Cohesion: 0.50
Nodes (4): cellClass(), isCurCol(), isFutureCol(), monthDone()

### Community 61 - "sgn"
Cohesion: 0.17
Nodes (15): Tâche 5 : Budget (4 graphiques faits main), Budget : les graphiques faits main, Graphique par graphique, Répartition des dépenses et des revenus (anneaux), Taux d'épargne par mois, Écart au budget (barres divergentes), Delta, diverge (+7 more)

### Community 62 - "prevRow"
Cohesion: 0.67
Nodes (3): editGroups, exps, prevRow()

### Community 63 - "vue"
Cohesion: 0.09
Nodes (21): OperationKind, vue, dialog, emit, *.vue, toast, emit, last (+13 more)

### Community 65 - "Assistant de budgétisation : plan d'implémentation"
Cohesion: 0.25
Nodes (7): Api, Assistant de budgétisation : plan d'implémentation, Contraintes globales, Points de vigilance en revue, Structure des fichiers, Tâche 1 : calcul pur des scénarios, Tâche 3 : outil MCP et README

### Community 66 - "run-ts.mjs"
Cohesion: 0.33
Nodes (4): esbuild, out, r, [script, ...args]

### Community 67 - "load"
Cohesion: 0.29
Nodes (7): copyPrev(), load(), loadPrep(), loadYear(), save(), setBudget(), stopAuto()

## Knowledge Gaps
- **15 isolated node(s):** `@semantic-release/changelog`, `@semantic-release/exec`, `@semantic-release/git`, `@types/node`, `@types/sql.js` (+10 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 471 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `vue` to `lib/api.ts`, `Envelopes.vue`, `ScenarioModal.vue`, `appearance.ts`, `Règles de catégorisation`, `Vue Transactions`, `Portfolio.vue`, `Métadonnées package.json`, `Vue Objectifs`, `Projection.vue`, `toast.ts`, `Recurring.vue`, `Settings.vue`, `Dashboard.vue`, `Budget.vue`, `Networth.vue`, `Import.vue`, `Refunds.vue`, `AssetModal.vue`, `Allocation.vue`, `format.ts`, `Category`, `PickerModal.vue`, `Account`, `updater.ts`?**
  _High betweenness centrality (0.142) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `round2()` (e.g. with `Tâche 1 : calcul pur des scénarios` and `Tâche 2 : moyennes glissantes, réglage des charges, application et API`) actually correct?**
  _`round2()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@semantic-release/changelog`, `@semantic-release/exec`, `@semantic-release/git` to the rest of the system?**
  _15 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `history.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14153846153846153 - nodes in this community are weakly interconnected._
- **Why does `guard()` connect `Règles de catégorisation` to `lib/api.ts`, `Envelopes.vue`, `ScenarioModal.vue`, `Vue Transactions`, `Portfolio.vue`, `Vue Objectifs`, `Projection.vue`, `Recurring.vue`, `Settings.vue`, `Dashboard.vue`, `Budget.vue`, `Networth.vue`, `Import.vue`, `Refunds.vue`, `AssetModal.vue`, `Allocation.vue`, `Category`, `PickerModal.vue`, `vue`, `load`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Should `Envelopes.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.11904761904761904 - nodes in this community are weakly interconnected._
- **Why does `devDependencies` connect `Dépendances de développement` to `Métadonnées package.json`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._