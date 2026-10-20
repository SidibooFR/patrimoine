# Graph Report - patrimoine  (2026-10-20)

## Corpus Check
- 129 files · ~106,134 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 1, .css 1)

## Summary
- 1137 nodes · 2626 edges · 66 communities (59 shown, 7 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 158 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `edb179d1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- features.test.ts
- importers.ts
- format.ts
- Envelopes.vue
- Projection.vue
- appearance.ts
- Rules.vue
- Configuration electron-builder
- Vue Transactions
- seed.ts
- Dépendances de développement
- Portfolio.vue
- Métadonnées package.json
- budgetPlan.ts
- Vue Objectifs
- Settings.vue
- run-ts.mjs
- updater.ts
- Assistant de budgétisation : propositions de budget par scénario
- Projection.vue
- Account
- Refunds.vue
- Dashboard.vue
- Import.vue
- Store
- Scripts npm
- Assistant de budgétisation : plan d'implémentation
- Budget.vue
- Configuration TypeScript
- Networth.vue
- db.ts
- Dépendances runtime
- Principes Vue (skill)
- Serveur MCP
- eur0
- Graphiques : passage de Chart.js à ApexCharts
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
- update.ts
- schema.ts
- sumKind
- envelopes.ts
- ScenarioModal.vue
- load
- PickerModal.vue
- eur0
- cellClass
- expB
- sgn
- prevRow
- toast.ts
- draftSum
- AssetModal.vue
- Recurring.vue
- lib/api.ts
- divergeOptions

## God Nodes (most connected - your core abstractions)
1. `guard()` - 86 edges
2. `createApi()` - 54 edges
3. `vue` - 39 edges
4. `Store` - 38 edges
5. `round2()` - 35 edges
6. `eur0()` - 34 edges
7. `api` - 26 edges
8. `notify()` - 25 edges
9. `Vue Best Practices Workflow (SKILL)` - 25 edges
10. `pct()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `Laissé au constructeur` --references--> `pctTick()`  [INFERRED]
  docs/superpowers/specs/2026-10-19-graphiques-apexcharts-design.md → src/lib/charts.ts
- `Tâche 2 : moyennes glissantes, réglage des charges, application et API` --references--> `Scenario`  [INFERRED]
  docs/superpowers/plans/2026-10-18-assistant-budget.md → core/budgetPlan.ts
- `Assistant de budgétisation : plan d'implémentation` --references--> `buildScenarios()`  [INFERRED]
  docs/superpowers/plans/2026-10-18-assistant-budget.md → core/budgetPlan.ts
- `Tâche 1 : calcul pur des scénarios` --references--> `buildScenarios()`  [INFERRED]
  docs/superpowers/plans/2026-10-18-assistant-budget.md → core/budgetPlan.ts
- `Tâche 2 : moyennes glissantes, réglage des charges, application et API` --references--> `buildScenarios()`  [INFERRED]
  docs/superpowers/plans/2026-10-18-assistant-budget.md → core/budgetPlan.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Release pipeline: Conventional Commits -> CI -> semantic-release -> CHANGELOG** — claude_conventional_commits, _github_workflows_ci, _github_workflows_release, _github_workflows_release_semantic_release, changelog, claude_gitflow_branches [EXTRACTED 1.00]
- **Refactor UI : KpiCard, PageHeader, découpage Portfolio, tokens CSS** — docs_superpowers_specs_2026_10_17_refactor_composants_ui_design_kpicard, docs_superpowers_specs_2026_10_17_refactor_composants_ui_design_pageheader, docs_superpowers_specs_2026_10_17_refactor_composants_ui_design_portfolio_split, docs_superpowers_specs_2026_10_17_refactor_composants_ui_design_css_tokens, docs_superpowers_plans_2026_10_17_refactor_composants_ui_src_lib_move [EXTRACTED 1.00]
- **SSR Safety Concerns** — _claude_skills_vue_best_practices_references_state_management_ssr_singleton_leak, _claude_skills_vue_best_practices_references_component_async_lazy_hydration, _claude_skills_vue_best_practices_references_directives_get_ssr_props [INFERRED 0.75]
- **Vue Built-in Components (Transition, TransitionGroup, KeepAlive, Suspense, Teleport)** — _claude_skills_vue_best_practices_references_component_transition_transition, _claude_skills_vue_best_practices_references_component_transition_group_transition_group, _claude_skills_vue_best_practices_references_component_keep_alive_keepalive_cache, _claude_skills_vue_best_practices_references_component_suspense_suspense, _claude_skills_vue_best_practices_references_component_teleport_teleport_overlay [INFERRED 0.85]
- **Large List Rendering Performance Techniques** — _claude_skills_vue_best_practices_references_perf_virtualize_large_lists_list_virtualization, _claude_skills_vue_best_practices_references_perf_v_once_v_memo_directives_v_memo, _claude_skills_vue_best_practices_references_perf_avoid_component_abstraction_in_lists_component_overhead_in_lists, _claude_skills_vue_best_practices_references_sfc_stable_key [INFERRED 0.85]

## Communities (66 total, 7 thin omitted)

### Community 0 - "features.test.ts"
Cohesion: 0.11
Nodes (29): exportWorkbook(), sheet(), addDays(), backfillPriceHistory(), BackfillResult, currencyOf(), fetchCoinGeckoHistory(), fetchYahooHistory() (+21 more)

### Community 1 - "importers.ts"
Cohesion: 0.28
Nodes (13): decodeHtml(), detectSource(), excelDate(), fingerprint(), num(), parseBnp(), parseBoursobank(), parseCsvLine() (+5 more)

### Community 2 - "format.ts"
Cohesion: 0.19
Nodes (11): EnvelopeRow, RefundRow, Anti-objectifs (échec même si « ça marche »), cur(), date(), eur(), fmtCache, moneyFormat() (+3 more)

### Community 3 - "Envelopes.vue"
Cohesion: 0.13
Nodes (17): accounts, draft, emit, EnvelopeDraft, EnvelopeKindInfo, modalKind, props, save() (+9 more)

### Community 4 - "Projection.vue"
Cohesion: 0.20
Nodes (8): activeGoals, compute(), goals, nwTotal, options, p, pr, series

### Community 5 - "appearance.ts"
Cohesion: 0.20
Nodes (16): Contraintes, ACCENT_PRESETS, appearance, applyAppearance(), applyCachedAppearance(), CURRENCIES, DEFAULT_ACCENT, DEFAULT_FONT (+8 more)

### Community 6 - "Rules.vue"
Cohesion: 0.16
Nodes (22): guard(), load(), setTarget(), addMap(), addRule(), bankMap, categories, delMap() (+14 more)

### Community 7 - "Configuration electron-builder"
Cohesion: 0.08
Nodes (25): build, appId, asar, copyright, directories, extraResources, files, linux (+17 more)

### Community 8 - "Vue Transactions"
Cohesion: 0.08
Nodes (25): TxFilter, el, emit, props, Value, todayIso(), newOp(), accounts (+17 more)

### Community 9 - "seed.ts"
Cohesion: 0.20
Nodes (9): ACCOUNT_TYPES, ACCOUNTS, ASSET_CLASSES, BANK_MAP, CATEGORIES, CATEGORY_KINDS, RULES, SOURCES (+1 more)

### Community 10 - "Dépendances de développement"
Cohesion: 0.09
Nodes (23): devDependencies, conventional-changelog-conventionalcommits, cross-env, electron, electron-builder, esbuild, eslint, @eslint/css (+15 more)

### Community 11 - "Portfolio.vue"
Cohesion: 0.12
Nodes (16): accounts, assets, backfill(), backfilling, classes, deleteAsset(), deleteOp(), hist (+8 more)

### Community 12 - "Métadonnées package.json"
Cohesion: 0.08
Nodes (27): author, description, engines, node, main, name, private, type (+19 more)

### Community 13 - "budgetPlan.ts"
Cohesion: 0.08
Nodes (34): addDays(), addMonths(), autoBudgets(), AvgRow, budgetPrepare(), budgetScenarios, buildScenarios(), categoryAverages() (+26 more)

### Community 14 - "Vue Objectifs"
Cohesion: 0.13
Nodes (18): GoalRow, GoalSource, accounts, archive(), classes, GoalDraft, goals, inYear() (+10 more)

### Community 15 - "Settings.vue"
Cohesion: 0.11
Nodes (26): Category, fromSettings(), accounts, addAcc(), addCat(), categories, addCat(), emit (+18 more)

### Community 16 - "run-ts.mjs"
Cohesion: 0.33
Nodes (4): esbuild, out, r, [script, ...args]

### Community 17 - "updater.ts"
Cohesion: 0.08
Nodes (30): frontend-design LICENSE (Apache 2.0), frontend-design skill (.agents), AI-generated design defaults to avoid, UX writing in design, frontend-design LICENSE (Apache 2.0, .claude copy), frontend-design skill (.claude), CI workflow (typecheck, lint, test, build), Release workflow (semantic-release, Windows .exe) (+22 more)

### Community 18 - "Assistant de budgétisation : propositions de budget par scénario"
Cohesion: 0.12
Nodes (15): Anti-objectifs (échec même si « ça marche »), Application, Architecture (décidée), Assistant de budgétisation : propositions de budget par scénario, Base : « moyenne » d'une catégorie, Charges fixes, Intention, Laissé au constructeur (+7 more)

### Community 19 - "Projection.vue"
Cohesion: 0.13
Nodes (17): AllocationRow, apexcharts, theme, ChartUi, CLASS_COLORS, PALETTE, al, deposit (+9 more)

### Community 20 - "Account"
Cohesion: 0.25
Nodes (8): Account, accountsShown, addAcc(), emit, newAcc, NewAccount, props, showArchived

### Community 21 - "Refunds.vue"
Cohesion: 0.09
Nodes (36): normalize(), addDays(), clusterByAmount(), days(), detectFrequency(), groupKey(), median(), merchantKey() (+28 more)

### Community 22 - "Dashboard.vue"
Cohesion: 0.13
Nodes (18): Tâche 3 : Tableau de bord (4 graphiques), Tâche 4 : Patrimoine, Allocation, Portefeuille (4 graphiques), pctTick(), pct(), options, budgetMois, budgetOptions, budgetSeries (+10 more)

### Community 23 - "Import.vue"
Cohesion: 0.16
Nodes (11): ImportResult, accounts, addMap(), busy, delMap(), loadMaps(), maps, newMap (+3 more)

### Community 24 - "Store"
Cohesion: 0.16
Nodes (12): applyBudgetScenario(), Store, guessEnvelopeKind(), saveGoal(), DEFAULT_SETTINGS_V2, migrate(), SCHEMA_VERSION, linkRefund() (+4 more)

### Community 25 - "Scripts npm"
Cohesion: 0.13
Nodes (15): scripts, build, build:electron, build:mcp, build:renderer, dev, dev:electron, lint (+7 more)

### Community 26 - "Assistant de budgétisation : plan d'implémentation"
Cohesion: 0.25
Nodes (7): Api, Assistant de budgétisation : plan d'implémentation, Contraintes globales, Points de vigilance en revue, Structure des fichiers, Tâche 1 : calcul pur des scénarios, Tâche 3 : outil MCP et README

### Community 27 - "Budget.vue"
Cohesion: 0.04
Nodes (48): PrepareReport, BudgetRow, autoCount, b, bPrev, CatMonth, curMonth, curYear (+40 more)

### Community 28 - "Configuration TypeScript"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, lib, module, moduleResolution, noEmit, resolveJsonModule, skipLibCheck (+4 more)

### Community 29 - "Networth.vue"
Cohesion: 0.16
Nodes (15): month(), classes, copyPrevious(), draft, draftTotal, editMonth, fillDraft(), load() (+7 more)

### Community 30 - "db.ts"
Cohesion: 0.19
Nodes (7): locateWasm(), Row, vite, @vitejs/plugin-vue, [dir, out], FX, HAS_FX

### Community 31 - "Dépendances runtime"
Cohesion: 0.14
Nodes (14): dependencies, apexcharts, electron-updater, exceljs, @fontsource-variable/roboto, @fortawesome/fontawesome-free, @material/web, @modelcontextprotocol/sdk (+6 more)

### Community 32 - "Principes Vue (skill)"
Cohesion: 0.22
Nodes (4): Component Fallthrough Attributes Best Practices, Teleport Component Best Practices, Avoid Expensive Operations in Updated Hook, Vue Best Practices Workflow (SKILL)

### Community 33 - "Serveur MCP"
Cohesion: 0.19
Nodes (9): defaultDbPath(), VERSION, fail(), main(), text(), wrap(), electron, @modelcontextprotocol/sdk (+1 more)

### Community 34 - "eur0"
Cohesion: 0.20
Nodes (12): Global Constraints, Graphiques ApexCharts : plan d'implémentation, Review Focus, Tâche 1 : Fondations (dépendances, helpers, composant), Tâche 2 : Projection (graphique de référence), Tâche 6 : Retrait de Chart.js, merged, props (+4 more)

### Community 35 - "Graphiques : passage de Chart.js à ApexCharts"
Cohesion: 0.22
Nodes (8): Décidé par l'utilisateur, Graphiques : passage de Chart.js à ApexCharts, Intention, Laissé au constructeur, Le style C : les ingrédients communs, Livraison, Non-objectifs, Objectifs

### Community 36 - "Animations, slots, composables"
Cohesion: 0.25
Nodes (3): Use Class-based Animations for Non-Enter/Leave Effects, Component Slots Best Practices, Composable Organization Patterns

### Community 38 - "core/api.ts"
Cohesion: 0.15
Nodes (34): createApi(), addMonths(), CashFlow, days(), futureValue(), monthStart(), monthsToGoal(), round2() (+26 more)

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

### Community 48 - "update.ts"
Cohesion: 0.60
Nodes (4): checkUpdate(), describe(), installUpdate(), update

### Community 49 - "schema.ts"
Cohesion: 0.10
Nodes (24): Asset, AssetRow, BankCategoryMap, BankCategoryMapRow, Goal, ImportAccountMap, ImportAccountMapRow, Operation (+16 more)

### Community 51 - "sumKind"
Cohesion: 0.29
Nodes (7): exp, inc, pexp, pinc, psav, sav, sumKind()

### Community 52 - "envelopes.ts"
Cohesion: 0.15
Nodes (25): ApiMethod, CurrentBalance, currentBalances(), dailyBalances(), lastStatementBalances(), portfolioValueByAccount(), buildCategorizer(), Categorizer (+17 more)

### Community 53 - "ScenarioModal.vue"
Cohesion: 0.10
Nodes (24): vue, dialog, emit, *.vue, notify(), applyOnce(), busy, choice (+16 more)

### Community 55 - "load"
Cohesion: 0.29
Nodes (7): copyPrev(), load(), loadPrep(), loadYear(), save(), setBudget(), stopAuto()

### Community 57 - "PickerModal.vue"
Cohesion: 0.36
Nodes (7): emit, pickCategory(), picker, pickExpense(), props, searchExpenses(), shift()

### Community 58 - "eur0"
Cohesion: 0.17
Nodes (13): eur0(), sign(), cap(), daysIn(), daysLeft, donutOptions(), expDonutOpts, gapText() (+5 more)

### Community 59 - "cellClass"
Cohesion: 0.50
Nodes (4): cellClass(), isCurCol(), isFutureCol(), monthDone()

### Community 61 - "sgn"
Cohesion: 0.20
Nodes (11): Tâche 5 : Budget (4 graphiques faits main), Budget : les graphiques faits main, Graphique par graphique, Répartition des dépenses et des revenus (anneaux), Taux d'épargne par mois, Écart au budget (barres divergentes), Delta, donut() (+3 more)

### Community 62 - "prevRow"
Cohesion: 0.67
Nodes (3): editGroups, exps, prevRow()

### Community 63 - "toast.ts"
Cohesion: 0.17
Nodes (12): @fontsource-variable/roboto, @fortawesome/fontawesome-free, @material/web, vue3-apexcharts, vue-router, group, route, tabs (+4 more)

### Community 65 - "AssetModal.vue"
Cohesion: 0.22
Nodes (8): AssetDraft, draft, emit, props, query, results, saveAsset(), searching

### Community 67 - "Recurring.vue"
Cohesion: 0.05
Nodes (47): CalendarEntry, calendarMonth(), iso(), lastDay(), MONTHS, projectedDates(), Frequency, Recurring (+39 more)

### Community 68 - "lib/api.ts"
Cohesion: 0.10
Nodes (20): check(), isPortable(), setupUpdater(), state, UpdateState, electron-updater, api, Bridge (+12 more)

### Community 70 - "divergeOptions"
Cohesion: 0.50
Nodes (4): cssVar(), divergeOptions, rateOptions, ratePct()

## Knowledge Gaps
- **15 isolated node(s):** `@semantic-release/changelog`, `@semantic-release/exec`, `@semantic-release/git`, `@types/node`, `@types/sql.js` (+10 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 493 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `ScenarioModal.vue` to `Envelopes.vue`, `Projection.vue`, `appearance.ts`, `Rules.vue`, `Vue Transactions`, `Portfolio.vue`, `Métadonnées package.json`, `Vue Objectifs`, `Settings.vue`, `Projection.vue`, `Account`, `Refunds.vue`, `Dashboard.vue`, `Import.vue`, `Budget.vue`, `Networth.vue`, `eur0`, `update.ts`, `schema.ts`, `PickerModal.vue`, `toast.ts`, `AssetModal.vue`, `Recurring.vue`, `lib/api.ts`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `round2()` (e.g. with `Tâche 1 : calcul pur des scénarios` and `Tâche 2 : moyennes glissantes, réglage des charges, application et API`) actually correct?**
  _`round2()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@semantic-release/changelog`, `@semantic-release/exec`, `@semantic-release/git` to the rest of the system?**
  _15 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `features.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11363636363636363 - nodes in this community are weakly interconnected._
- **Why does `guard()` connect `Rules.vue` to `Envelopes.vue`, `Projection.vue`, `Vue Transactions`, `Portfolio.vue`, `Vue Objectifs`, `Settings.vue`, `Projection.vue`, `Refunds.vue`, `Dashboard.vue`, `Import.vue`, `Budget.vue`, `Networth.vue`, `schema.ts`, `ScenarioModal.vue`, `load`, `PickerModal.vue`, `AssetModal.vue`, `Recurring.vue`, `lib/api.ts`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Should `Envelopes.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.12631578947368421 - nodes in this community are weakly interconnected._
- **Why does `devDependencies` connect `Dépendances de développement` to `Métadonnées package.json`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._