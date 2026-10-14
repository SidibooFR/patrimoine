/**
 * Lecture des exports bancaires (BNP Paribas .xls, Boursobank .xlsx, Revolut .csv)
 * et insertion dans la base avec déduplication et catégorisation automatique.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import * as XLSX from "xlsx";
import type { Store } from "./db.js";
import { buildCategorizer } from "./categorize.js";

export type Source = "bnp" | "boursobank" | "revolut";

export interface ParsedTx {
  date: string; // YYYY-MM-DD
  accountKey: string; // libellé de compte dans l'export (ou '*')
  label: string;
  raw_label: string;
  bank_category: string;
  amount: number;
  balance: number | null;
}

export interface ImportResult {
  source: Source;
  file: string;
  parsed: number;
  inserted: number;
  duplicates: number;
  uncategorized: number;
  accounts: Record<string, number>; // libellé compte → nb lignes
  unknownAccounts: string[];
}

// ---------------------------------------------------------------- helpers
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/\s/g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function excelDate(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v ?? "").trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

function readSheet(file: string): unknown[][] {
  const wb = XLSX.read(fs.readFileSync(file), { type: "buffer", cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null });
}

function decodeHtml(s: string): string {
  return s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}

// ---------------------------------------------------------------- parsers
/** BNP Paribas : export .xls « Date operation / Categorie / Sous Categorie / Libelle / Montant ». */
export function parseBnp(file: string): ParsedTx[] {
  const rows = readSheet(file);
  const out: ParsedTx[] = [];
  let header = -1;
  for (let i = 0; i < rows.length; i++) {
    const c0 = String(rows[i]?.[0] ?? "").toLowerCase();
    if (c0.startsWith("date operation") || c0.startsWith("date opération")) { header = i; break; }
  }
  const accountKey = String(rows[0]?.[0] ?? "*").split("****")[0].trim() || "*";
  for (const r of rows.slice(header + 1)) {
    const date = excelDate(r[0]);
    const amount = num(r[4]);
    if (!date || amount === null) continue;
    const label = String(r[3] ?? "").trim();
    out.push({
      date, accountKey,
      label: label.length > 90 ? label.slice(0, 90) + "…" : label,
      raw_label: label,
      bank_category: String(r[2] ?? "").trim(),
      amount, balance: null,
    });
  }
  return out;
}

/** Boursobank : export .xlsx sans en-tête, 13 colonnes (compte courant) ou 12 (livrets). */
export function parseBoursobank(file: string): ParsedTx[] {
  const rows = readSheet(file);
  const out: ParsedTx[] = [];
  for (const r of rows) {
    if (!r || r.length < 10) continue;
    const date = excelDate(r[0]);
    if (!date) continue;
    // Deux formats : [date, dateVal, libelléBrut, commentaire?, libellé, sousCat, cat, montant, ?, n°, compte, solde, pointé]
    //                [date, dateVal, libelléBrut, libellé, sousCat, cat, montant, ?, n°, compte, solde, pointé]
    const thirteen = num(r[7]) !== null && (r.length >= 13 || typeof r[10] === "string");
    const o = thirteen ? 0 : -1;
    const amount = num(r[7 + o]);
    if (amount === null) continue;
    const raw = String(r[2] ?? "").trim();
    const simple = String(r[4 + o] ?? "").trim();
    out.push({
      date,
      accountKey: String(r[10 + o] ?? "*").trim() || "*",
      label: simple || raw,
      raw_label: raw,
      bank_category: String(r[5 + o] ?? "").trim(),
      amount,
      balance: num(r[11 + o]),
    });
  }
  return out;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

/** Revolut : relevé .csv « Type,Produit,Date de début,Date de fin,Description,Montant,Frais,Devise,État,Solde ». */
export function parseRevolut(file: string): ParsedTx[] {
  const text = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (names: string[]) => header.findIndex((h) => names.includes(h));
  const iType = idx(["type"]), iProd = idx(["produit", "product"]), iDate = idx(["date de début", "started date"]);
  const iDesc = idx(["description"]), iAmt = idx(["montant", "amount"]), iFee = idx(["frais", "fee"]);
  const iState = idx(["état", "state"]), iBal = idx(["solde", "balance"]);
  const out: ParsedTx[] = [];
  for (const line of lines.slice(1)) {
    const c = parseCsvLine(line);
    const state = (c[iState] ?? "").toUpperCase();
    if (!state.startsWith("TERMIN") && !state.startsWith("COMPLET")) continue;
    const date = excelDate(c[iDate]);
    const amt = num(c[iAmt]);
    if (!date || amt === null) continue;
    const fee = num(c[iFee]) ?? 0;
    out.push({
      date,
      accountKey: (c[iProd] ?? "*").trim() || "*",
      label: decodeHtml(c[iDesc] ?? "").trim(),
      raw_label: `${c[iType] ?? ""} | ${decodeHtml(c[iDesc] ?? "")}`.trim(),
      bank_category: (c[iType] ?? "").trim(),
      amount: Math.round((amt - fee) * 100) / 100,
      balance: num(c[iBal]),
    });
  }
  return out;
}

/** Devine la banque d'après le nom et le contenu du fichier. */
export function detectSource(file: string): Source | null {
  const ext = path.extname(file).toLowerCase();
  const base = path.basename(file).toLowerCase();
  if (ext === ".csv") {
    const head = fs.readFileSync(file, "utf8").slice(0, 300).toLowerCase();
    if (head.includes("type,produit") || head.includes("type,product")) return "revolut";
    return null;
  }
  if (ext === ".xls") return "bnp";
  if (ext === ".xlsx") {
    if (base.startsWith("export-operations")) return "boursobank";
    const rows = readSheet(file);
    const r = rows[0] ?? [];
    if (String(r[0] ?? "").match(/^\d{4}-\d{2}-\d{2}$/)) return "boursobank";
    if (String(r[0] ?? "").toLowerCase().startsWith("compte")) return "bnp";
  }
  return null;
}

export function parseFile(file: string, source?: Source | null): { source: Source; rows: ParsedTx[] } {
  const s = source ?? detectSource(file);
  if (!s) throw new Error(`Format non reconnu : ${path.basename(file)}. Attendu : export BNP (.xls), Boursobank (.xlsx) ou Revolut (.csv).`);
  const rows = s === "bnp" ? parseBnp(file) : s === "boursobank" ? parseBoursobank(file) : parseRevolut(file);
  return { source: s, rows };
}

// ---------------------------------------------------------------- insertion
export function fingerprint(source: string, accountId: number, t: ParsedTx): string {
  const h = createHash("sha1");
  h.update([source, accountId, t.date, t.amount.toFixed(2), t.raw_label, t.balance ?? ""].join("|"));
  return h.digest("hex");
}

/** Insère les lignes d'un export. Les doublons (même empreinte) sont ignorés. */
export function importFile(store: Store, file: string, source?: Source | null): ImportResult {
  const { source: s, rows } = parseFile(file, source);
  const maps = store.all<{ key: string; account_id: number }>("SELECT key, account_id FROM import_account_map WHERE source=?", [s]);
  const byKey = new Map(maps.map((m) => [m.key, m.account_id]));
  const def = byKey.get("*");
  const categorize = buildCategorizer(store);
  const res: ImportResult = { source: s, file: path.basename(file), parsed: rows.length, inserted: 0, duplicates: 0, uncategorized: 0, accounts: {}, unknownAccounts: [] };
  // Même exécution : certaines lignes identiques (ex. 20 transferts crypto à la même seconde)
  // sont réelles → on suffixe un compteur d'occurrence dans l'empreinte.
  const seen = new Map<string, number>();
  store.transaction(() => {
    for (const t of rows) {
      let accountId = byKey.get(t.accountKey);
      if (accountId === undefined) {
        const lk = t.accountKey.toLowerCase();
        for (const [k, v] of byKey) if (k !== "*" && lk.includes(k.toLowerCase())) { accountId = v; break; }
      }
      if (accountId === undefined) {
        if (def === undefined) { if (!res.unknownAccounts.includes(t.accountKey)) res.unknownAccounts.push(t.accountKey); continue; }
        accountId = def;
      }
      const base = fingerprint(s, accountId, t);
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      const fp = n === 1 ? base : `${base}#${n}`;
      if (store.get("SELECT id FROM transactions WHERE fingerprint=?", [fp])) { res.duplicates++; continue; }
      const cat = categorize(t);
      store.run(
        `INSERT INTO transactions(date,account_id,label,raw_label,bank_category,amount,category_id,source,balance,fingerprint)
         VALUES(?,?,?,?,?,?,?,?,?,?)`,
        [t.date, accountId, t.label, t.raw_label, t.bank_category, t.amount, cat, s, t.balance, fp],
      );
      res.inserted++;
      if (cat === null) res.uncategorized++;
      res.accounts[t.accountKey] = (res.accounts[t.accountKey] ?? 0) + 1;
    }
  });
  return res;
}
