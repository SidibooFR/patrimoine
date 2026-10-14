// Copie le moteur SQLite (WebAssembly) à côté du bundle qui l'utilise.
import fs from "node:fs";
import path from "node:path";
const dest = process.argv[2];
fs.mkdirSync(dest, { recursive: true });
fs.copyFileSync(path.join("node_modules", "sql.js", "dist", "sql-wasm.wasm"), path.join(dest, "sql-wasm.wasm"));
