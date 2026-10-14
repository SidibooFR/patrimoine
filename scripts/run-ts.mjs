// Exécute un script TypeScript du projet (bundle esbuild à la volée).
import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const [script, ...args] = process.argv.slice(2);
const out = path.join(os.tmpdir(), `patrimoine-${path.basename(script, ".ts")}.cjs`);
await build({ entryPoints: [script], bundle: true, platform: "node", format: "cjs", outfile: out, logLevel: "error" });
fs.copyFileSync("node_modules/sql.js/dist/sql-wasm.wasm", path.join(os.tmpdir(), "sql-wasm.wasm"));
const r = spawnSync(process.execPath, [out, ...args], { stdio: "inherit" });
process.exit(r.status ?? 1);
