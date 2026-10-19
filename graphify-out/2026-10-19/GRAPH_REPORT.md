# Graph Report - patrimoine  (2026-10-19)

## Corpus Check
- 127 files · ~95,370 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 1, .css 1)

## Summary
- 1068 nodes · 2512 edges · 58 communities (51 shown, 7 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 138 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `79f33e3b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- history.ts
- Import.vue
- format.ts
- Envelopes.vue
- ScenarioModal.vue
- appearance.ts
- Règles de catégorisation
- Configuration electron-builder
- Vue Transactions
- round2
- Dépendances de développement
- Portfolio.vue
- Métadonnées package.json
- budgetPlan.ts
- Vue Objectifs
- Release et gitflow
- Assistant de budgétisation : propositions de budget par scénario
- Dashboard.vue
- vue
- Recurring.vue
- format.ts
- Settings.vue
- Store
- Scripts npm
- Recurring.vue
- Budget.vue
- Configuration TypeScript
- Networth.vue
- Dépendances runtime
- Principes Vue (skill)
- Serveur MCP
- core/api.ts
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
- AssetModal.vue
- TransactionsModal.vue
- sumKind
- toast.ts
- Category
- electron/main.ts
- hero
- cellClass
- expB
- sgn
- prevRow
- ratePath
- draftSum
- donut

## God Nodes (most connected - your core abstractions)
1. `guard()` - 86 edges
2. `createApi()` - 54 edges
3. `vue` - 40 edges
4. `Store` - 38 edges
5. `round2()` - 35 edges
6. `api` - 26 edges
7. `eur0()` - 26 edges
8. `notify()` - 25 edges
9. `Vue Best Practices Workflow (SKILL)` - 25 edges
10. `today()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `Assistant de budgétisation : plan d'implémentation` --references--> `Api`  [INFERRED]
  docs/superpowers/plans/2026-10-18-assistant-budget.md → core/api.ts
- `Tâche 1 : calcul pur des scénarios` --references--> `round2()`  [INFERRED]
  docs/superpowers/plans/2026-10-18-assistant-budget.md → core/finance.ts
- `Tâche 2 : moyennes glissantes, réglage des charges, application et API` --references--> `round2()`  [INFERRED]
  docs/superpowers/plans/2026-10-18-assistant-budget.md → core/finance.ts
- `Tâche 2 : moyennes glissantes, réglage des charges, application et API` --references--> `today()`  [INFERRED]
  docs/superpowers/plans/2026-10-18-assistant-budget.md → core/finance.ts
- `Tâche 2 : moyennes glissantes, réglage des charges, application et API` --references--> `setting()`  [INFERRED]
  docs/superpowers/plans/2026-10-18-assistant-budget.md → core/reports.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Release pipeline: Conventional Commits -> CI -> semantic-release -> CHANGELOG** — claude_conventional_commits, _github_workflows_ci, _github_workflows_release, _github_workflows_release_semantic_release, changelog, claude_gitflow_branches [EXTRACTED 1.00]
- **Refactor UI : KpiCard, PageHeader, découpage Portfolio, tokens CSS** — docs_superpowers_specs_2026_10_17_refactor_composants_ui_design_kpicard, docs_superpowers_specs_2026_10_17_refactor_composants_ui_design_pageheader, docs_superpowers_specs_2026_10_17_refactor_composants_ui_design_portfolio_split, docs_superpowers_specs_2026_10_17_refactor_composants_ui_design_css_tokens, docs_superpowers_plans_2026_10_17_refactor_composants_ui_src_lib_move [EXTRACTED 1.00]
- **SSR Safety Concerns** — _claude_skills_vue_best_practices_references_state_management_ssr_singleton_leak, _claude_skills_vue_best_practices_references_component_async_lazy_hydration, _claude_skills_vue_best_practices_references_directives_get_ssr_props [INFERRED 0.75]
- **Vue Built-in Components (Transition, TransitionGroup, KeepAlive, Suspense, Teleport)** — _claude_skills_vue_best_practices_references_component_transition_transition, _claude_skills_vue_best_practices_references_component_transition_group_transition_group, _claude_skills_vue_best_practices_references_component_keep_alive_keepalive_cache, _claude_skills_vue_best_practices_references_component_suspense_suspense, _claude_skills_vue_best_practices_references_component_teleport_teleport_overlay [INFERRED 0.85]
- **Large List Rendering Performance Techniques** — _claude_skills_vue_best_practices_references_perf_virtualize_large_lists_list_virtualization, _claude_skills_vue_best_practices_references_perf_v_once_v_memo_directives_v_memo, _claude_skills_vue_best_practices_references_perf_avoid_component_abstraction_in_lists_component_overhead_in_lists, _claude_skills_vue_best_practices_references_sfc_stable_key [INFERRED 0.85]

## Communities (58 total, 7 thin omitted)

### Community 0 - "history.ts"
Cohesion: 0.15
Nodes (22): exportWorkbook(), sheet(), addDays(), backfillPriceHistory(), BackfillResult, currencyOf(), fetchCoinGeckoHistory(), fetchYahooHistory() (+14 more)

### Community 1 - "Import.vue"
Cohesion: 0.11
Nodes (24): decodeHtml(), detectSource(), excelDate(), fingerprint(), ImportResult, num(), parseBnp(), parseBoursobank() (+16 more)

### Community 2 - "format.ts"
Cohesion: 0.20
Nodes (10): files, cur(), fmtCache, moneyFormat(), num(), sign(), exportOps(), opsFilter (+2 more)

### Community 3 - "Envelopes.vue"
Cohesion: 0.11
Nodes (20): EnvelopeRow, date(), accounts, RATE_SRC, draft, emit, EnvelopeDraft, EnvelopeKindInfo (+12 more)

### Community 4 - "ScenarioModal.vue"
Cohesion: 0.18
Nodes (12): applyOnce(), busy, choice, chosen, data, emit, empty, follow() (+4 more)

### Community 5 - "appearance.ts"
Cohesion: 0.22
Nodes (12): ACCENT_PRESETS, appearance, CURRENCIES, DEFAULT_ACCENT, DEFAULT_FONT, DEFAULTS, FONTS, hex() (+4 more)

### Community 6 - "Règles de catégorisation"
Cohesion: 0.11
Nodes (33): guard(), load(), setTarget(), copyPrev(), load(), loadPrep(), loadYear(), save() (+25 more)

### Community 7 - "Configuration electron-builder"
Cohesion: 0.08
Nodes (25): build, appId, asar, copyright, directories, extraResources, files, linux (+17 more)

### Community 8 - "Vue Transactions"
Cohesion: 0.09
Nodes (22): TxFilter, el, emit, props, Value, accounts, categories, filter (+14 more)

### Community 9 - "round2"
Cohesion: 0.18
Nodes (25): currentBalances(), dailyBalances(), lastStatementBalances(), portfolioValueByAccount(), budgetPrepare(), effectiveBudget(), goalTargets(), envelopesReport (+17 more)

### Community 10 - "Dépendances de développement"
Cohesion: 0.09
Nodes (23): devDependencies, conventional-changelog-conventionalcommits, cross-env, electron, electron-builder, esbuild, eslint, @eslint/css (+15 more)

### Community 11 - "Portfolio.vue"
Cohesion: 0.05
Nodes (47): Account, Asset, AssetRow, BankCategoryMap, BankCategoryMapRow, Goal, ImportAccountMap, ImportAccountMapRow (+39 more)

### Community 12 - "Métadonnées package.json"
Cohesion: 0.08
Nodes (28): author, description, engines, node, main, name, private, type (+20 more)

### Community 13 - "budgetPlan.ts"
Cohesion: 0.07
Nodes (37): addDays(), addMonths(), applyBudgetScenario(), autoBudgets(), AvgRow, budgetScenarios, buildScenarios(), categoryAverages() (+29 more)

### Community 14 - "Vue Objectifs"
Cohesion: 0.13
Nodes (18): GoalRow, GoalSource, accounts, archive(), classes, GoalDraft, goals, inYear() (+10 more)

### Community 17 - "Release et gitflow"
Cohesion: 0.08
Nodes (30): frontend-design LICENSE (Apache 2.0), frontend-design skill (.agents), AI-generated design defaults to avoid, UX writing in design, frontend-design LICENSE (Apache 2.0, .claude copy), frontend-design skill (.claude), CI workflow (typecheck, lint, test, build), Release workflow (semantic-release, Windows .exe) (+22 more)

### Community 18 - "Assistant de budgétisation : propositions de budget par scénario"
Cohesion: 0.13
Nodes (14): Anti-objectifs (échec même si « ça marche »), Application, Architecture (décidée), Assistant de budgétisation : propositions de budget par scénario, Charges fixes, Intention, Laissé au constructeur, Mes choix (non validés explicitement par l'utilisateur) (+6 more)

### Community 19 - "Dashboard.vue"
Cohesion: 0.14
Nodes (23): chart.js, canvas, props, rgba(), theme, eurTick(), eurTip(), PALETTE (+15 more)

### Community 20 - "vue"
Cohesion: 0.17
Nodes (13): @fontsource-variable/roboto, @material/web, vue-router, group, route, tabs, checkUpdate(), describe() (+5 more)

### Community 21 - "Recurring.vue"
Cohesion: 0.08
Nodes (37): CalendarEntry, calendarMonth(), iso(), lastDay(), MONTHS, projectedDates(), normalize(), guessEnvelopeKind() (+29 more)

### Community 22 - "format.ts"
Cohesion: 0.17
Nodes (13): AllocationRow, CLASS_COLORS, pctTick(), eur0(), pct(), al, chart, deposit (+5 more)

### Community 23 - "Settings.vue"
Cohesion: 0.18
Nodes (19): applyAppearance(), applyCachedAppearance(), fromSettings(), accounts, addAcc(), addCat(), categories, delAcc() (+11 more)

### Community 24 - "Store"
Cohesion: 0.21
Nodes (8): Store, saveGoal(), importFile(), migrate(), linkRefund(), seedDefaults(), [dir, out], main()

### Community 25 - "Scripts npm"
Cohesion: 0.13
Nodes (15): scripts, build, build:electron, build:mcp, build:renderer, dev, dev:electron, lint (+7 more)

### Community 26 - "Recurring.vue"
Cohesion: 0.14
Nodes (13): api, Bridge, call(), isElectron, Promisify, Window, maxCat, mode (+5 more)

### Community 27 - "Budget.vue"
Cohesion: 0.04
Nodes (50): PrepareReport, BudgetRow, autoCount, b, bPrev, CatMonth, curMonth, curYear (+42 more)

### Community 28 - "Configuration TypeScript"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, lib, module, moduleResolution, noEmit, resolveJsonModule, skipLibCheck (+4 more)

### Community 29 - "Networth.vue"
Cohesion: 0.19
Nodes (12): month(), thisMonth(), classes, draft, draftTotal, editMonth, fillDraft(), load() (+4 more)

### Community 31 - "Dépendances runtime"
Cohesion: 0.17
Nodes (12): dependencies, chart.js, electron-updater, exceljs, @fontsource-variable/roboto, @material/web, @modelcontextprotocol/sdk, sql.js (+4 more)

### Community 32 - "Principes Vue (skill)"
Cohesion: 0.22
Nodes (4): Component Fallthrough Attributes Best Practices, Teleport Component Best Practices, Avoid Expensive Operations in Updated Hook, Vue Best Practices Workflow (SKILL)

### Community 33 - "Serveur MCP"
Cohesion: 0.31
Nodes (8): defaultDbPath(), VERSION, fail(), main(), text(), wrap(), @modelcontextprotocol/sdk, zod

### Community 34 - "core/api.ts"
Cohesion: 0.08
Nodes (31): ApiMethod, CurrentBalance, buildCategorizer(), Categorizer, recategorizeAll(), locateWasm(), Row, addDays() (+23 more)

### Community 35 - "Refunds.vue"
Cohesion: 0.09
Nodes (26): dayDiff(), RefundAllocation, RefundRow, RefundSuggestion, SHARES, applyAll(), categories, deleteRule() (+18 more)

### Community 36 - "Animations, slots, composables"
Cohesion: 0.25
Nodes (3): Use Class-based Animations for Non-Enter/Leave Effects, Component Slots Best Practices, Composable Organization Patterns

### Community 38 - "core/api.ts"
Cohesion: 0.13
Nodes (30): Api, createApi(), CashFlow, days(), futureValue(), monthStart(), monthsToGoal(), xirr() (+22 more)

### Community 40 - "KeepAlive, Suspense, Transition"
Cohesion: 0.29
Nodes (3): KeepAlive Component Best Practices, Suspense Component Best Practices, Transition Component Best Practices

### Community 42 - "Directives et rendu"
Cohesion: 0.29
Nodes (3): Directive Best Practices, Avoid Excessive Component Abstraction in Large Lists, Render Function Patterns and Performance

### Community 44 - "seed-dev.ts"
Cohesion: 0.06
Nodes (36): esbuild, vite, @vitejs/plugin-vue, out, r, [script, ...args], addDays(), appDb (+28 more)

### Community 46 - "Dépôt git (package.json)"
Cohesion: 0.67
Nodes (3): repository, type, url

### Community 48 - "AssetModal.vue"
Cohesion: 0.22
Nodes (8): AssetDraft, draft, emit, props, query, results, saveAsset(), searching

### Community 50 - "TransactionsModal.vue"
Cohesion: 0.14
Nodes (11): vue, dialog, emit, *.vue, monthLong(), emit, last, over (+3 more)

### Community 51 - "sumKind"
Cohesion: 0.29
Nodes (7): exp, inc, pexp, pinc, psav, sav, sumKind()

### Community 52 - "toast.ts"
Cohesion: 0.20
Nodes (11): notify(), toast, copyPrevious(), useSuggested(), copyConfig(), mcpConfig, props, draft (+3 more)

### Community 53 - "Category"
Cohesion: 0.22
Nodes (9): Category, addCat(), emit, newCat, NewCategory, emit, excluded, props (+1 more)

### Community 57 - "electron/main.ts"
Cohesion: 0.21
Nodes (7): check(), isPortable(), setupUpdater(), state, UpdateState, electron, electron-updater

### Community 58 - "hero"
Cohesion: 0.40
Nodes (5): cap(), daysIn(), daysLeft, hero, paceLeft

### Community 59 - "cellClass"
Cohesion: 0.50
Nodes (4): cellClass(), isCurCol(), isFutureCol(), monthDone()

### Community 61 - "sgn"
Cohesion: 0.67
Nodes (3): Delta, diverge, sgn()

### Community 62 - "prevRow"
Cohesion: 0.67
Nodes (3): editGroups, exps, prevRow()

### Community 63 - "ratePath"
Cohesion: 0.67
Nodes (3): ratePath, RX(), RY()

### Community 65 - "donut"
Cohesion: 0.67
Nodes (3): donut(), expDonut, incDonut

## Knowledge Gaps
- **15 isolated node(s):** `@semantic-release/changelog`, `@semantic-release/exec`, `@semantic-release/git`, `@types/node`, `@types/sql.js` (+10 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 456 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `TransactionsModal.vue` to `Import.vue`, `format.ts`, `Envelopes.vue`, `ScenarioModal.vue`, `appearance.ts`, `Règles de catégorisation`, `Vue Transactions`, `Portfolio.vue`, `Métadonnées package.json`, `Vue Objectifs`, `Dashboard.vue`, `vue`, `Recurring.vue`, `format.ts`, `Settings.vue`, `Recurring.vue`, `Budget.vue`, `Networth.vue`, `Refunds.vue`, `AssetModal.vue`, `toast.ts`, `Category`?**
  _High betweenness centrality (0.140) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `round2()` (e.g. with `Tâche 1 : calcul pur des scénarios` and `Tâche 2 : moyennes glissantes, réglage des charges, application et API`) actually correct?**
  _`round2()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@semantic-release/changelog`, `@semantic-release/exec`, `@semantic-release/git` to the rest of the system?**
  _15 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `history.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14666666666666667 - nodes in this community are weakly interconnected._
- **Why does `guard()` connect `Règles de catégorisation` to `Import.vue`, `format.ts`, `Envelopes.vue`, `ScenarioModal.vue`, `Refunds.vue`, `Vue Transactions`, `Portfolio.vue`, `Vue Objectifs`, `AssetModal.vue`, `TransactionsModal.vue`, `Dashboard.vue`, `toast.ts`, `format.ts`, `Settings.vue`, `Recurring.vue`, `Budget.vue`, `Networth.vue`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Should `Import.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.1103448275862069 - nodes in this community are weakly interconnected._
- **Why does `devDependencies` connect `Dépendances de développement` to `Métadonnées package.json`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._