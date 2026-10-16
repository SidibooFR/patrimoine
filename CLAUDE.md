# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Personal wealth-management desktop app (Electron + Vue 3 + TypeScript + SQLite via sql.js) with a built-in MCP server. Code, comments, UI text and commit descriptions are in **French** — keep it that way.

## Commands

```bash
npm run dev              # UI only in the browser (http://localhost:5173); the business API is served by Vite on /__api
npm run dev:electron     # Electron wired to the Vite dev server
npm run build            # renderer (vite) + Electron main/preload (esbuild) + MCP server (esbuild)
npm run typecheck        # vue-tsc --noEmit
npm test                 # vitest run
npx vitest run tests/core.test.ts -t "xirr"   # single file / single test by name
npm run package          # Windows installer + portable exe + MCP zip in release/
node scripts/run-ts.mjs <script.ts> [args]   # run a project TS script (esbuild bundle on the fly)
```

CI (`.github/workflows/ci.yml`) runs typecheck → test → build. Tests needing real bank exports in `tests/fixtures/` (not versioned) are skipped via `describe.skipIf(!HAS_FX)`.

Dev DB: `PATRIMOINE_DB` env var, otherwise `npm run dev` uses `<tmpdir>/patrimoine-dev.sqlite`; the app/MCP use `%APPDATA%\Patrimoine\patrimoine.sqlite` (see `defaultDbPath()` in `core/db.ts`).

## Architecture

One business implementation, three façades:

- `core/api.ts` — `createApi(store)` returns the object holding **every** operation. It is the single entry point used by:
  - `electron/main.ts`: generic IPC handler `ipcMain.handle("api", (method, args))` that calls `api[method](...args)`; `electron/preload.ts` exposes it as `window.patrimoine`.
  - `vite.config.ts` dev plugin: same dispatch over HTTP `POST /__api/<method>`.
  - `mcp/server.ts`: stdio MCP server, each tool registered with `server.registerTool(...)` wrapping an `api.*` call.
  - `src/lib/api.ts` (renderer client) picks IPC when `window.patrimoine` exists, otherwise HTTP.

  Adding a feature usually means: logic in a `core/*.ts` module → method in `core/api.ts` → (optionally) MCP tool in `mcp/server.ts` → typed call in `src/lib/api.ts` → Vue view. Keep the README's MCP tool list in sync.

- `core/db.ts` — `Store`: sql.js database kept in memory, written to file after each write. The app and the MCP server share the same file; before each access the store reloads the file if its mtime changed (and nothing is pending locally). There is no locking beyond that.
- `core/schema.ts` creates missing tables; `core/seed.ts` seeds default accounts/categories/rules; `core/migrate.ts` does idempotent data migrations gated by the `schema_version` setting (bump `SCHEMA_VERSION` and add an `if (v < N)` block).
- `core/reports.ts` builds all view reports (dashboard, budget, networth, portfolio, allocation, projection…); domain modules: `importers.ts` (BNP .xls, Boursobank .xlsx, Revolut .csv, dedup by fingerprint), `categorize.ts` (keyword rules, longest match wins), `envelopes.ts` (livret ceilings + official rate history, to update each Feb 1/Aug 1), `prices.ts`/`history.ts` (Yahoo Finance / CoinGecko, no API key), `finance.ts` (XIRR, compounding).
- Settings are a key/value `settings` table; UI appearance prefs are `ui_*` keys applied by `src/lib/appearance.ts` (CSS variables on `:root`, cached in localStorage to avoid a flash).
- Renderer: `src/router.ts` declares routes with sidebar icon/group; all styling is the single global `src/style.css` (Material 3–inspired tokens as CSS variables — use them instead of hardcoded colors); chart colors come from `src/lib/charts.ts`.
- sql.js needs `sql-wasm.wasm` next to each bundle: `scripts/copy-wasm.mjs` copies it into `dist-electron/` and `dist-mcp/`.
- `electron/updater.ts` — electron-updater against GitHub releases (installed build auto-updates; portable build only notifies).

## Releases

Every push to `main` runs semantic-release (`.releaserc.json`): version is derived from **Conventional Commits** (`fix:` → patch, `feat:` → minor, `feat!:`/`BREAKING CHANGE:` → major; `docs/chore/ci/refactor/test` → no release). It updates `package.json` and `CHANGELOG.md` itself — don't bump the version by hand. `core/version.ts` reads the version from `package.json`.
