/**
 * Couche base de données : SQLite via sql.js (WebAssembly, aucune compilation native).
 *
 * La base vit en mémoire et est persistée dans un fichier après chaque écriture.
 * L'application et le serveur MCP peuvent utiliser le même fichier : avant chaque
 * accès, on recharge le fichier s'il a été modifié par l'autre processus.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import initSqlJs, { type Database, type SqlJsStatic, type SqlValue } from "sql.js";
import { SCHEMA } from "./schema.js";
import { seedDefaults } from "./seed.js";
import { migrate } from "./migrate.js";

export type Row = Record<string, SqlValue>;

export function defaultDbPath(): string {
  if (process.env.PATRIMOINE_DB) return process.env.PATRIMOINE_DB;
  const home = os.homedir();
  let base: string;
  if (process.platform === "win32") base = process.env.APPDATA || path.join(home, "AppData", "Roaming");
  else if (process.platform === "darwin") base = path.join(home, "Library", "Application Support");
  else base = process.env.XDG_CONFIG_HOME || path.join(home, ".config");
  return path.join(base, "Patrimoine", "patrimoine.sqlite");
}

/** Localise sql-wasm.wasm : à côté du bundle (build), sinon dans node_modules (dev/tests). */
function locateWasm(file: string): string {
  const candidates: string[] = [];
  if (typeof __dirname !== "undefined") candidates.push(path.join(__dirname, file));
  candidates.push(path.join(process.cwd(), "node_modules", "sql.js", "dist", file));
  if (process.resourcesPath) candidates.push(path.join(process.resourcesPath, file));
  return candidates.find((c) => fs.existsSync(c)) ?? candidates[0];
}

export class Store {
  private static SQL: SqlJsStatic;
  private db!: Database;
  private mtime = 0;
  private dirty = false;

  private constructor(public readonly file: string | null) {}

  /** Ouvre (ou crée) la base. `file === null` → base en mémoire uniquement (tests). */
  static async open(file: string | null): Promise<Store> {
    Store.SQL ??= await initSqlJs({ locateFile: locateWasm });
    const store = new Store(file);
    if (file && fs.existsSync(file)) {
      store.db = new Store.SQL.Database(fs.readFileSync(file));
      store.mtime = fs.statSync(file).mtimeMs;
    } else {
      store.db = new Store.SQL.Database();
    }
    store.db.exec("PRAGMA foreign_keys = ON");
    store.db.exec(SCHEMA);
    if (!store.scalar("SELECT COUNT(*) FROM categories")) {
      seedDefaults(store);
    }
    migrate(store);
    store.flush();
    return store;
  }

  /** Recharge le fichier s'il a été modifié par un autre processus. */
  private reloadIfChanged(): void {
    if (!this.file || !fs.existsSync(this.file)) return;
    const m = fs.statSync(this.file).mtimeMs;
    if (m > this.mtime && !this.dirty) {
      const bytes = fs.readFileSync(this.file);
      this.db.close();
      this.db = new Store.SQL.Database(bytes);
      this.db.exec("PRAGMA foreign_keys = ON");
      this.mtime = m;
    }
  }

  flush(): void {
    if (!this.file) return;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = this.file + ".tmp";
    fs.writeFileSync(tmp, Buffer.from(this.db.export()));
    fs.renameSync(tmp, this.file);
    this.mtime = fs.statSync(this.file).mtimeMs;
    this.dirty = false;
  }

  all<T = Row>(sql: string, params: SqlValue[] = []): T[] {
    this.reloadIfChanged();
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const out: T[] = [];
    while (stmt.step()) out.push(stmt.getAsObject() as T);
    stmt.free();
    return out;
  }

  get<T = Row>(sql: string, params: SqlValue[] = []): T | undefined {
    return this.all<T>(sql, params)[0];
  }

  scalar<T = number>(sql: string, params: SqlValue[] = []): T {
    const r = this.get(sql, params);
    return (r ? Object.values(r)[0] : null) as T;
  }

  /** Exécute une écriture et persiste. Retourne l'id inséré (si INSERT). */
  run(sql: string, params: SqlValue[] = []): number {
    this.reloadIfChanged();
    this.db.run(sql, params);
    const id = this.scalarNoReload("SELECT last_insert_rowid()");
    this.dirty = true;
    this.flush();
    return id;
  }

  /** Plusieurs écritures dans une seule transaction, un seul flush. */
  transaction<T>(fn: () => T): T {
    this.reloadIfChanged();
    this.db.exec("BEGIN");
    this.dirty = true;
    try {
      const flushBackup = this.flush;
      this.flush = () => {}; // pas de flush intermédiaire
      let result: T;
      try {
        result = fn();
      } finally {
        this.flush = flushBackup;
      }
      this.db.exec("COMMIT");
      this.flush();
      return result;
    } catch (e) {
      this.db.exec("ROLLBACK");
      this.dirty = false;
      throw e;
    }
  }

  private scalarNoReload(sql: string): number {
    const stmt = this.db.prepare(sql);
    stmt.step();
    const v = stmt.get()[0] as number;
    stmt.free();
    return v;
  }

  export(): Uint8Array {
    this.reloadIfChanged();
    return this.db.export();
  }

  close(): void {
    this.db.close();
  }
}
