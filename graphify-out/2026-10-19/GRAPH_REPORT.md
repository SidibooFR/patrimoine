# Graph Report - patrimoine  (2026-10-19)

## Corpus Check
- 131 files · ~105,091 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 1, .css 1)

## Summary
- 1116 nodes · 2608 edges · 65 communities (58 shown, 7 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 170 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `da6e33d6`
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
- eur0
- src/main.ts
- Recurring.vue
- Dashboard.vue
- Settings.vue
- Store
- Scripts npm
- TransactionModal.vue
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
- Recurring.vue
- format.ts
- sumKind
- seed.ts
- Category
- PickerModal.vue
- Account
- Graphiques : passage de Chart.js à ApexCharts
- hero
- cellClass
- expB
- sgn
- prevRow
- vue
- draftSum
- load

## God Nodes (most connected - your core abstractions)
1. `guard()` - 86 edges
2. `createApi()` - 54 edges
3. `vue` - 41 edges
4. `Store` - 38 edges
5. `round2()` - 35 edges
6. `eur0()` - 31 edges
7. `api` - 26 edges
8. `notify()` - 25 edges
9. `Vue Best Practices Workflow (SKILL)` - 25 edges
10. `eur()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `Assistant de budgétisation : plan d'implémentation` --references--> `Api`  [INFERRED]
  docs/superpowers/plans/2026-10-18-assistant-budget.md → core/api.ts
- `Tâche 4 : modale de scénarios (UI)` --references--> `ScenarioKey`  [INFERRED]
  docs/superpowers/plans/2026-10-18-assistant-budget.md → core/budgetPlan.ts
- `Tâche 4 : modale de scénarios (UI)` --references--> `budgetScenarios`  [INFERRED]
  docs/superpowers/plans/2026-10-18-assistant-budget.md → core/budgetPlan.ts
- `Tâche 1 : calcul pur des scénarios` --references--> `round2()`  [INFERRED]
  docs/superpowers/plans/2026-10-18-assistant-budget.md → core/finance.ts
- `Tâche 2 : moyennes glissantes, réglage des charges, application et API` --references--> `round2()`  [INFERRED]
  docs/superpowers/plans/2026-10-18-assistant-budget.md → core/finance.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Release pipeline: Conventional Commits -> CI -> semantic-release -> CHANGELOG** — claude_conventional_commits, _github_workflows_ci, _github_workflows_release, _github_workflows_release_semantic_release, changelog, claude_gitflow_branches [EXTRACTED 1.00]
- **Refactor UI : KpiCard, PageHeader, découpage Portfolio, tokens CSS** — docs_superpowers_specs_2026_10_17_refactor_composants_ui_design_kpicard, docs_superpowers_specs_2026_10_17_refactor_composants_ui_design_pageheader, docs_superpowers_specs_2026_10_17_refactor_composants_ui_design_portfolio_split, docs_superpowers_specs_2026_10_17_refactor_composants_ui_design_css_tokens, docs_superpowers_plans_2026_10_17_refactor_composants_ui_src_lib_move [EXTRACTED 1.00]
- **SSR Safety Concerns** — _claude_skills_vue_best_practices_references_state_management_ssr_singleton_leak, _claude_skills_vue_best_practices_references_component_async_lazy_hydration, _claude_skills_vue_best_practices_references_directives_get_ssr_props [INFERRED 0.75]
- **Vue Built-in Components (Transition, TransitionGroup, KeepAlive, Suspense, Teleport)** — _claude_skills_vue_best_practices_references_component_transition_transition, _claude_skills_vue_best_practices_references_component_transition_group_transition_group, _claude_skills_vue_best_practices_references_component_keep_alive_keepalive_cache, _claude_skills_vue_best_practices_references_component_suspense_suspense, _claude_skills_vue_best_practices_references_component_teleport_teleport_overlay [INFERRED 0.85]
- **Large List Rendering Performance Techniques** — _claude_skills_vue_best_practices_references_perf_virtualize_large_lists_list_virtualization, _claude_skills_vue_best_practices_references_perf_v_once_v_memo_directives_v_memo, _claude_skills_vue_best_practices_references_perf_avoid_component_abstraction_in_lists_component_overhead_in_lists, _claude_skills_vue_best_practices_references_sfc_stable_key [INFERRED 0.85]

## Communities (65 total, 7 thin omitted)

### Community 0 - "history.ts"
Cohesion: 0.14
Nodes (24): exportWorkbook(), sheet(), today(), addDays(), backfillPriceHistory(), BackfillResult, currencyOf(), fetchCoinGeckoHistory() (+16 more)

### Community 1 - "importers.ts"
Cohesion: 0.22
Nodes (16): buildCategorizer(), Categorizer, decodeHtml(), detectSource(), excelDate(), fingerprint(), importFile(), num() (+8 more)

### Community 2 - "lib/api.ts"
Cohesion: 0.19
Nodes (10): api, Bridge, call(), files, Promisify, Window, exportOps(), opsFilter (+2 more)

### Community 3 - "Envelopes.vue"
Cohesion: 0.12
Nodes (18): EnvelopeRow, accounts, draft, emit, EnvelopeDraft, EnvelopeKindInfo, modalKind, props (+10 more)

### Community 4 - "ScenarioModal.vue"
Cohesion: 0.12
Nodes (18): notify(), applyOnce(), busy, choice, chosen, data, emit, empty (+10 more)

### Community 5 - "appearance.ts"
Cohesion: 0.20
Nodes (15): Global Constraints, Graphiques ApexCharts : plan d'implémentation, Contraintes, ACCENT_PRESETS, appearance, applyAppearance(), CURRENCIES, DEFAULTS (+7 more)

### Community 6 - "Règles de catégorisation"
Cohesion: 0.15
Nodes (19): addMap(), addRule(), bankMap, categories, delMap(), delRule(), filtered, load() (+11 more)

### Community 7 - "Configuration electron-builder"
Cohesion: 0.08
Nodes (25): build, appId, asar, copyright, directories, extraResources, files, linux (+17 more)

### Community 8 - "Vue Transactions"
Cohesion: 0.12
Nodes (14): TxFilter, todayIso(), newOp(), accounts, categories, filter, modal, openNew() (+6 more)

### Community 9 - "envelopes.ts"
Cohesion: 0.20
Nodes (18): CurrentBalance, currentBalances(), dailyBalances(), lastStatementBalances(), portfolioValueByAccount(), addDays(), ENVELOPE_KIND_NAMES, ENVELOPE_KINDS (+10 more)

### Community 10 - "Dépendances de développement"
Cohesion: 0.09
Nodes (23): devDependencies, conventional-changelog-conventionalcommits, cross-env, electron, electron-builder, esbuild, eslint, @eslint/css (+15 more)

### Community 11 - "Portfolio.vue"
Cohesion: 0.12
Nodes (16): accounts, assets, backfill(), backfilling, classes, deleteAsset(), deleteOp(), hist (+8 more)

### Community 12 - "Métadonnées package.json"
Cohesion: 0.08
Nodes (28): author, description, engines, node, main, name, private, type (+20 more)

### Community 13 - "budgetPlan.ts"
Cohesion: 0.07
Nodes (43): addDays(), addMonths(), applyBudgetScenario(), autoBudgets(), AvgRow, budgetPrepare(), budgetScenarios, buildScenarios() (+35 more)

### Community 14 - "Vue Objectifs"
Cohesion: 0.13
Nodes (18): GoalRow, GoalSource, accounts, archive(), classes, GoalDraft, goals, inYear() (+10 more)

### Community 15 - "schema.ts"
Cohesion: 0.13
Nodes (21): Asset, AssetRow, BankCategoryMap, BankCategoryMapRow, Envelope, Goal, ImportAccountMap, ImportAccountMapRow (+13 more)

### Community 16 - "charts.ts"
Cohesion: 0.31
Nodes (9): Tâche 1 : Fondations (dépendances, helpers, composant), apexcharts, merged, props, ChartUi, isPlain(), mergeOptions(), moneyAxis() (+1 more)

### Community 17 - "Release et gitflow"
Cohesion: 0.05
Nodes (42): frontend-design LICENSE (Apache 2.0), frontend-design skill (.agents), AI-generated design defaults to avoid, UX writing in design, frontend-design LICENSE (Apache 2.0, .claude copy), frontend-design skill (.claude), CI workflow (typecheck, lint, test, build), Release workflow (semantic-release, Windows .exe) (+34 more)

### Community 18 - "Assistant de budgétisation : propositions de budget par scénario"
Cohesion: 0.13
Nodes (14): Anti-objectifs (échec même si « ça marche »), Application, Architecture (décidée), Assistant de budgétisation : propositions de budget par scénario, Charges fixes, Intention, Laissé au constructeur, Mes choix (non validés explicitement par l'utilisateur) (+6 more)

### Community 19 - "eur0"
Cohesion: 0.11
Nodes (19): Tâche 4 : modale de scénarios (UI), chart.js, canvas, props, theme, PALETTE, eur0(), byClass (+11 more)

### Community 20 - "src/main.ts"
Cohesion: 0.29
Nodes (5): @fontsource-variable/roboto, @material/web, vue3-apexcharts, applyCachedAppearance(), router

### Community 21 - "Recurring.vue"
Cohesion: 0.07
Nodes (43): CalendarEntry, calendarMonth(), iso(), lastDay(), MONTHS, projectedDates(), normalize(), addDays() (+35 more)

### Community 22 - "Dashboard.vue"
Cohesion: 0.10
Nodes (25): AllocationRow, Review Focus, Tâche 2 : Projection (graphique de référence), Tâche 3 : Tableau de bord (4 graphiques), Tâche 4 : Patrimoine, Allocation, Portefeuille (4 graphiques), CLASS_COLORS, pctTick(), monthLong() (+17 more)

### Community 23 - "Settings.vue"
Cohesion: 0.17
Nodes (19): isElectron, DEFAULT_ACCENT, DEFAULT_FONT, fromSettings(), accounts, addAcc(), addCat(), categories (+11 more)

### Community 24 - "Store"
Cohesion: 0.17
Nodes (11): recategorizeAll(), locateWasm(), Store, guessEnvelopeKind(), saveGoal(), DEFAULT_SETTINGS_V2, migrate(), SCHEMA_VERSION (+3 more)

### Community 25 - "Scripts npm"
Cohesion: 0.13
Nodes (15): scripts, build, build:electron, build:mcp, build:renderer, dev, dev:electron, lint (+7 more)

### Community 26 - "TransactionModal.vue"
Cohesion: 0.12
Nodes (15): dialog, emit, el, emit, props, Value, draft, emit (+7 more)

### Community 27 - "Budget.vue"
Cohesion: 0.04
Nodes (50): PrepareReport, BudgetRow, autoCount, b, bPrev, CatMonth, curMonth, curYear (+42 more)

### Community 28 - "Configuration TypeScript"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, lib, module, moduleResolution, noEmit, resolveJsonModule, skipLibCheck (+4 more)

### Community 29 - "Networth.vue"
Cohesion: 0.16
Nodes (18): Tâche 6 : Retrait de Chart.js, Laissé au constructeur, eurTick(), eurTip(), month(), thisMonth(), chart, classes (+10 more)

### Community 30 - "db.ts"
Cohesion: 0.14
Nodes (10): Row, esbuild, vite, @vitejs/plugin-vue, out, r, [script, ...args], [dir, out] (+2 more)

### Community 31 - "Dépendances runtime"
Cohesion: 0.14
Nodes (14): dependencies, apexcharts, chart.js, electron-updater, exceljs, @fontsource-variable/roboto, @material/web, @modelcontextprotocol/sdk (+6 more)

### Community 32 - "Principes Vue (skill)"
Cohesion: 0.22
Nodes (4): Component Fallthrough Attributes Best Practices, Teleport Component Best Practices, Avoid Expensive Operations in Updated Hook, Vue Best Practices Workflow (SKILL)

### Community 33 - "Serveur MCP"
Cohesion: 0.31
Nodes (8): defaultDbPath(), VERSION, fail(), main(), text(), wrap(), @modelcontextprotocol/sdk, zod

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
Cohesion: 0.15
Nodes (36): ApiMethod, createApi(), addMonths(), CashFlow, days(), futureValue(), monthStart(), monthsToGoal() (+28 more)

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

### Community 49 - "Recurring.vue"
Cohesion: 0.18
Nodes (10): load(), maxCat, mode, open, rename, rep, rows, saveRename() (+2 more)

### Community 50 - "format.ts"
Cohesion: 0.22
Nodes (10): Anti-objectifs (échec même si « ça marche »), cur(), date(), eur(), fmtCache, moneyFormat(), num(), sign() (+2 more)

### Community 51 - "sumKind"
Cohesion: 0.29
Nodes (7): exp, inc, pexp, pinc, psav, sav, sumKind()

### Community 52 - "seed.ts"
Cohesion: 0.22
Nodes (8): ACCOUNT_TYPES, ACCOUNTS, BANK_MAP, CATEGORIES, CATEGORY_KINDS, RULES, SOURCES, TARGETS

### Community 53 - "Category"
Cohesion: 0.22
Nodes (9): Category, addCat(), emit, newCat, NewCategory, emit, excluded, props (+1 more)

### Community 54 - "PickerModal.vue"
Cohesion: 0.31
Nodes (8): RefundRow, emit, pickCategory(), picker, pickExpense(), props, searchExpenses(), shift()

### Community 55 - "Account"
Cohesion: 0.25
Nodes (8): Account, accountsShown, addAcc(), emit, newAcc, NewAccount, props, showArchived

### Community 56 - "Graphiques : passage de Chart.js à ApexCharts"
Cohesion: 0.25
Nodes (7): Décidé par l'utilisateur, Graphiques : passage de Chart.js à ApexCharts, Intention, Le style C : les ingrédients communs, Livraison, Non-objectifs, Objectifs

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
Cohesion: 0.12
Nodes (16): vue, vue-router, group, route, tabs, *.vue, toast, routes (+8 more)

### Community 67 - "load"
Cohesion: 0.24
Nodes (13): guard(), load(), setTarget(), copyPrev(), load(), loadPrep(), loadYear(), save() (+5 more)

## Knowledge Gaps
- **15 isolated node(s):** `@semantic-release/changelog`, `@semantic-release/exec`, `@semantic-release/git`, `@types/node`, `@types/sql.js` (+10 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 481 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `vue` to `lib/api.ts`, `Envelopes.vue`, `ScenarioModal.vue`, `appearance.ts`, `Règles de catégorisation`, `Vue Transactions`, `Portfolio.vue`, `Métadonnées package.json`, `Vue Objectifs`, `schema.ts`, `charts.ts`, `Release et gitflow`, `eur0`, `src/main.ts`, `Recurring.vue`, `Dashboard.vue`, `Settings.vue`, `TransactionModal.vue`, `Budget.vue`, `Networth.vue`, `Import.vue`, `Refunds.vue`, `AssetModal.vue`, `Recurring.vue`, `Category`, `PickerModal.vue`, `Account`?**
  _High betweenness centrality (0.137) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `round2()` (e.g. with `Tâche 1 : calcul pur des scénarios` and `Tâche 2 : moyennes glissantes, réglage des charges, application et API`) actually correct?**
  _`round2()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@semantic-release/changelog`, `@semantic-release/exec`, `@semantic-release/git` to the rest of the system?**
  _15 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `history.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1396011396011396 - nodes in this community are weakly interconnected._
- **Why does `guard()` connect `load` to `lib/api.ts`, `Envelopes.vue`, `ScenarioModal.vue`, `Règles de catégorisation`, `Vue Transactions`, `Portfolio.vue`, `Vue Objectifs`, `schema.ts`, `eur0`, `Dashboard.vue`, `Settings.vue`, `TransactionModal.vue`, `Budget.vue`, `Networth.vue`, `Import.vue`, `Refunds.vue`, `AssetModal.vue`, `Recurring.vue`, `PickerModal.vue`, `vue`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Should `Envelopes.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.11904761904761904 - nodes in this community are weakly interconnected._
- **Why does `devDependencies` connect `Dépendances de développement` to `Métadonnées package.json`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._