# Graph Report - patrimoine  (2026-10-19)

## Corpus Check
- 130 files · ~105,115 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 1, .css 1)

## Summary
- 1114 nodes · 2586 edges · 66 communities (56 shown, 10 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 155 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cee76928`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- history.ts
- importers.ts
- format.ts
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
- Recurring.vue
- load
- CLAUDE.md project guide
- Assistant de budgétisation : propositions de budget par scénario
- eur0
- RuleModal.vue
- Recurring.vue
- Dashboard.vue
- schema.ts
- Store
- Scripts npm
- electron/main.ts
- Budget.vue
- Configuration TypeScript
- Networth.vue
- db.ts
- Dépendances runtime
- Principes Vue (skill)
- Serveur MCP
- Import.vue
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
- saveAsset
- vue
- sumKind
- run-ts.mjs
- notify
- hero
- cellClass
- expB
- sgn
- prevRow
- vue
- draftSum
- Plan : refactorisation du renderer
- frontend-design skill (.agents)
- update.ts
- CHANGELOG (Journal des versions)
- donutOptions
- engines
- setTarget

## God Nodes (most connected - your core abstractions)
1. `guard()` - 86 edges
2. `createApi()` - 54 edges
3. `vue` - 40 edges
4. `Store` - 38 edges
5. `round2()` - 35 edges
6. `eur0()` - 32 edges
7. `api` - 26 edges
8. `notify()` - 25 edges
9. `Vue Best Practices Workflow (SKILL)` - 25 edges
10. `today()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `Laissé au constructeur` --references--> `pctTick()`  [INFERRED]
  docs/superpowers/specs/2026-10-19-graphiques-apexcharts-design.md → src/lib/charts.ts
- `Assistant de budgétisation : plan d'implémentation` --references--> `Api`  [INFERRED]
  docs/superpowers/plans/2026-10-18-assistant-budget.md → core/api.ts
- `Tâche 1 : calcul pur des scénarios` --references--> `round2()`  [INFERRED]
  docs/superpowers/plans/2026-10-18-assistant-budget.md → core/finance.ts
- `Tâche 2 : moyennes glissantes, réglage des charges, application et API` --references--> `round2()`  [INFERRED]
  docs/superpowers/plans/2026-10-18-assistant-budget.md → core/finance.ts
- `Tâche 2 : moyennes glissantes, réglage des charges, application et API` --references--> `today()`  [INFERRED]
  docs/superpowers/plans/2026-10-18-assistant-budget.md → core/finance.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Release pipeline: Conventional Commits -> CI -> semantic-release -> CHANGELOG** — claude_conventional_commits, _github_workflows_ci, _github_workflows_release, _github_workflows_release_semantic_release, changelog, claude_gitflow_branches [EXTRACTED 1.00]
- **Refactor UI : KpiCard, PageHeader, découpage Portfolio, tokens CSS** — docs_superpowers_specs_2026_10_17_refactor_composants_ui_design_kpicard, docs_superpowers_specs_2026_10_17_refactor_composants_ui_design_pageheader, docs_superpowers_specs_2026_10_17_refactor_composants_ui_design_portfolio_split, docs_superpowers_specs_2026_10_17_refactor_composants_ui_design_css_tokens, docs_superpowers_plans_2026_10_17_refactor_composants_ui_src_lib_move [EXTRACTED 1.00]
- **SSR Safety Concerns** — _claude_skills_vue_best_practices_references_state_management_ssr_singleton_leak, _claude_skills_vue_best_practices_references_component_async_lazy_hydration, _claude_skills_vue_best_practices_references_directives_get_ssr_props [INFERRED 0.75]
- **Vue Built-in Components (Transition, TransitionGroup, KeepAlive, Suspense, Teleport)** — _claude_skills_vue_best_practices_references_component_transition_transition, _claude_skills_vue_best_practices_references_component_transition_group_transition_group, _claude_skills_vue_best_practices_references_component_keep_alive_keepalive_cache, _claude_skills_vue_best_practices_references_component_suspense_suspense, _claude_skills_vue_best_practices_references_component_teleport_teleport_overlay [INFERRED 0.85]
- **Large List Rendering Performance Techniques** — _claude_skills_vue_best_practices_references_perf_virtualize_large_lists_list_virtualization, _claude_skills_vue_best_practices_references_perf_v_once_v_memo_directives_v_memo, _claude_skills_vue_best_practices_references_perf_avoid_component_abstraction_in_lists_component_overhead_in_lists, _claude_skills_vue_best_practices_references_sfc_stable_key [INFERRED 0.85]

## Communities (66 total, 10 thin omitted)

### Community 0 - "history.ts"
Cohesion: 0.13
Nodes (24): Api, exportWorkbook(), sheet(), addDays(), backfillPriceHistory(), BackfillResult, currencyOf(), fetchCoinGeckoHistory() (+16 more)

### Community 1 - "importers.ts"
Cohesion: 0.28
Nodes (13): decodeHtml(), detectSource(), excelDate(), fingerprint(), num(), parseBnp(), parseBoursobank(), parseCsvLine() (+5 more)

### Community 2 - "format.ts"
Cohesion: 0.15
Nodes (18): Anti-objectifs (échec même si « ça marche »), files, cur(), eur(), eur0(), fmtCache, moneyFormat(), num() (+10 more)

### Community 3 - "Envelopes.vue"
Cohesion: 0.11
Nodes (20): EnvelopeRow, date(), accounts, RATE_SRC, draft, emit, EnvelopeDraft, EnvelopeKindInfo (+12 more)

### Community 4 - "ScenarioModal.vue"
Cohesion: 0.18
Nodes (12): applyOnce(), busy, choice, chosen, data, emit, empty, follow() (+4 more)

### Community 5 - "appearance.ts"
Cohesion: 0.07
Nodes (36): Global Constraints, Graphiques ApexCharts : plan d'implémentation, Review Focus, Tâche 1 : Fondations (dépendances, helpers, composant), Tâche 2 : Projection (graphique de référence), Tâche 6 : Retrait de Chart.js, Contraintes, Décidé par l'utilisateur (+28 more)

### Community 6 - "Règles de catégorisation"
Cohesion: 0.14
Nodes (25): guard(), load(), saveRename(), setStatus(), addMap(), addRule(), bankMap, categories (+17 more)

### Community 7 - "Configuration electron-builder"
Cohesion: 0.08
Nodes (25): build, appId, asar, copyright, directories, extraResources, files, linux (+17 more)

### Community 8 - "Vue Transactions"
Cohesion: 0.12
Nodes (15): TxFilter, thisMonth(), todayIso(), newOp(), accounts, categories, filter, modal (+7 more)

### Community 9 - "envelopes.ts"
Cohesion: 0.11
Nodes (23): ApiMethod, buildCategorizer(), Categorizer, recategorizeAll(), ENVELOPE_KIND_NAMES, ENVELOPE_KINDS, EnvelopeKind, EnvelopeMove (+15 more)

### Community 10 - "Dépendances de développement"
Cohesion: 0.09
Nodes (23): devDependencies, conventional-changelog-conventionalcommits, cross-env, electron, electron-builder, esbuild, eslint, @eslint/css (+15 more)

### Community 11 - "Portfolio.vue"
Cohesion: 0.08
Nodes (23): api, Bridge, call(), isElectron, Promisify, Window, accounts, AssetDraft (+15 more)

### Community 12 - "Métadonnées package.json"
Cohesion: 0.08
Nodes (27): author, description, main, name, private, type, version, conventional-changelog-conventionalcommits (+19 more)

### Community 13 - "budgetPlan.ts"
Cohesion: 0.07
Nodes (46): addDays(), addMonths(), applyBudgetScenario(), autoBudgets(), AvgRow, budgetPrepare(), budgetScenarios, buildScenarios() (+38 more)

### Community 14 - "Vue Objectifs"
Cohesion: 0.13
Nodes (18): GoalRow, GoalSource, accounts, archive(), classes, GoalDraft, goals, inYear() (+10 more)

### Community 15 - "Recurring.vue"
Cohesion: 0.20
Nodes (7): maxCat, mode, open, rename, rep, rows, show

### Community 16 - "load"
Cohesion: 0.33
Nodes (6): copyPrev(), load(), loadPrep(), loadYear(), save(), setBudget()

### Community 17 - "CLAUDE.md project guide"
Cohesion: 0.24
Nodes (12): CI workflow (typecheck, lint, test, build), Release workflow (semantic-release, Windows .exe), semantic-release, CLAUDE.md project guide, Conventional Commits versioning, Gitflow branches (develop / main / hotfix), Shared SQLite file with mtime reload, Déplacement des utilitaires vers src/lib/ (+4 more)

### Community 18 - "Assistant de budgétisation : propositions de budget par scénario"
Cohesion: 0.13
Nodes (14): Anti-objectifs (échec même si « ça marche »), Application, Architecture (décidée), Assistant de budgétisation : propositions de budget par scénario, Charges fixes, Intention, Laissé au constructeur, Mes choix (non validés explicitement par l'utilisateur) (+6 more)

### Community 19 - "eur0"
Cohesion: 0.08
Nodes (35): AllocationRow, Tâche 3 : Tableau de bord (4 graphiques), Tâche 4 : Patrimoine, Allocation, Portefeuille (4 graphiques), apexcharts, merged, props, theme, ChartUi (+27 more)

### Community 20 - "RuleModal.vue"
Cohesion: 0.50
Nodes (4): draft, emit, props, saveRule()

### Community 21 - "Recurring.vue"
Cohesion: 0.05
Nodes (57): CalendarEntry, calendarMonth(), iso(), lastDay(), MONTHS, projectedDates(), normalize(), guessEnvelopeKind() (+49 more)

### Community 22 - "Dashboard.vue"
Cohesion: 0.17
Nodes (11): budgetMois, budgetOptions, budgetSeries, classEntries, classOptions, classSeries, d, moisNw (+3 more)

### Community 23 - "schema.ts"
Cohesion: 0.05
Nodes (55): Account, Asset, AssetRow, BankCategoryMap, BankCategoryMapRow, Category, Goal, ImportAccountMap (+47 more)

### Community 24 - "Store"
Cohesion: 0.15
Nodes (16): createApi(), Store, saveGoal(), importFile(), DEFAULT_SETTINGS_V2, migrate(), SCHEMA_VERSION, linkRefund() (+8 more)

### Community 25 - "Scripts npm"
Cohesion: 0.13
Nodes (15): scripts, build, build:electron, build:mcp, build:renderer, dev, dev:electron, lint (+7 more)

### Community 26 - "electron/main.ts"
Cohesion: 0.23
Nodes (6): check(), isPortable(), setupUpdater(), state, electron, electron-updater

### Community 27 - "Budget.vue"
Cohesion: 0.04
Nodes (47): PrepareReport, BudgetRow, autoCount, b, bPrev, CatMonth, curMonth, curYear (+39 more)

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
Cohesion: 0.15
Nodes (13): dependencies, apexcharts, electron-updater, exceljs, @fontsource-variable/roboto, @material/web, @modelcontextprotocol/sdk, sql.js (+5 more)

### Community 32 - "Principes Vue (skill)"
Cohesion: 0.22
Nodes (4): Component Fallthrough Attributes Best Practices, Teleport Component Best Practices, Avoid Expensive Operations in Updated Hook, Vue Best Practices Workflow (SKILL)

### Community 33 - "Serveur MCP"
Cohesion: 0.31
Nodes (8): defaultDbPath(), VERSION, fail(), main(), text(), wrap(), @modelcontextprotocol/sdk, zod

### Community 34 - "Import.vue"
Cohesion: 0.16
Nodes (11): ImportResult, accounts, addMap(), busy, delMap(), loadMaps(), maps, newMap (+3 more)

### Community 36 - "Animations, slots, composables"
Cohesion: 0.25
Nodes (3): Use Class-based Animations for Non-Enter/Leave Effects, Component Slots Best Practices, Composable Organization Patterns

### Community 38 - "core/api.ts"
Cohesion: 0.14
Nodes (36): CurrentBalance, currentBalances(), dailyBalances(), lastStatementBalances(), portfolioValueByAccount(), addDays(), envelopesReport, isInterest() (+28 more)

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

### Community 49 - "vue"
Cohesion: 0.11
Nodes (17): OperationKind, dialog, emit, el, emit, props, Value, draft (+9 more)

### Community 51 - "sumKind"
Cohesion: 0.29
Nodes (7): exp, inc, pexp, pinc, psav, sav, sumKind()

### Community 54 - "run-ts.mjs"
Cohesion: 0.33
Nodes (4): esbuild, out, r, [script, ...args]

### Community 56 - "notify"
Cohesion: 0.20
Nodes (11): notify(), stopAuto(), backfill(), deleteAsset(), deleteOp(), load(), refresh(), applyAll() (+3 more)

### Community 58 - "hero"
Cohesion: 0.67
Nodes (3): daysIn(), daysLeft, paceLeft

### Community 59 - "cellClass"
Cohesion: 0.50
Nodes (4): cellClass(), isCurCol(), isFutureCol(), monthDone()

### Community 61 - "sgn"
Cohesion: 0.15
Nodes (14): Tâche 5 : Budget (4 graphiques faits main), Budget : les graphiques faits main, Graphique par graphique, Répartition des dépenses et des revenus (anneaux), Taux d'épargne par mois, Écart au budget (barres divergentes), cssVar(), Delta (+6 more)

### Community 62 - "prevRow"
Cohesion: 0.67
Nodes (3): editGroups, exps, prevRow()

### Community 63 - "vue"
Cohesion: 0.11
Nodes (17): vue, vue-router, group, route, tabs, *.vue, monthLong(), toast (+9 more)

### Community 65 - "Plan : refactorisation du renderer"
Cohesion: 0.33
Nodes (7): Plan : refactorisation du renderer, Skill vue-best-practices, Spec : refactorisation des composants UI, Composant KpiCard, Composant PageHeader, Découpage de Portfolio.vue en sous-composants, index.html (renderer entry, /src/main.ts)

### Community 66 - "frontend-design skill (.agents)"
Cohesion: 0.32
Nodes (6): frontend-design LICENSE (Apache 2.0), frontend-design skill (.agents), AI-generated design defaults to avoid, UX writing in design, frontend-design LICENSE (Apache 2.0, .claude copy), frontend-design skill (.claude)

### Community 68 - "update.ts"
Cohesion: 0.48
Nodes (5): UpdateState, checkUpdate(), describe(), installUpdate(), update

### Community 69 - "CHANGELOG (Journal des versions)"
Cohesion: 0.33
Nodes (5): CHANGELOG (Journal des versions), Version 1.4.0 - mises à jour automatiques, Version 1.5.0 - thème Material Design 3, Version 1.7.0 - assistant de budget, Mises à jour automatiques (electron-updater)

### Community 71 - "donutOptions"
Cohesion: 0.67
Nodes (3): donutOptions(), expDonutOpts, incDonutOpts

## Knowledge Gaps
- **15 isolated node(s):** `@semantic-release/changelog`, `@semantic-release/exec`, `@semantic-release/git`, `@types/node`, `@types/sql.js` (+10 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 485 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `vue` to `format.ts`, `Envelopes.vue`, `ScenarioModal.vue`, `appearance.ts`, `Règles de catégorisation`, `Vue Transactions`, `Portfolio.vue`, `Métadonnées package.json`, `Vue Objectifs`, `Recurring.vue`, `eur0`, `RuleModal.vue`, `Recurring.vue`, `Dashboard.vue`, `schema.ts`, `Budget.vue`, `Networth.vue`, `Import.vue`, `vue`, `notify`, `update.ts`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `round2()` (e.g. with `Tâche 1 : calcul pur des scénarios` and `Tâche 2 : moyennes glissantes, réglage des charges, application et API`) actually correct?**
  _`round2()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@semantic-release/changelog`, `@semantic-release/exec`, `@semantic-release/git` to the rest of the system?**
  _15 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `history.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1339031339031339 - nodes in this community are weakly interconnected._
- **Why does `guard()` connect `Règles de catégorisation` to `format.ts`, `Envelopes.vue`, `ScenarioModal.vue`, `Vue Transactions`, `Portfolio.vue`, `Vue Objectifs`, `Recurring.vue`, `load`, `eur0`, `RuleModal.vue`, `Recurring.vue`, `Dashboard.vue`, `schema.ts`, `Budget.vue`, `Networth.vue`, `Import.vue`, `saveAsset`, `vue`, `notify`, `vue`, `setTarget`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Should `format.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14624505928853754 - nodes in this community are weakly interconnected._
- **Why does `devDependencies` connect `Dépendances de développement` to `Métadonnées package.json`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._