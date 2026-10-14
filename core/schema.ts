// Schéma SQLite de l'application (source unique).
export const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  institution TEXT NOT NULL DEFAULT '',
  type        TEXT NOT NULL DEFAULT 'Courant',
  asset_class TEXT NOT NULL DEFAULT 'Liquidités',
  sort        INTEGER NOT NULL DEFAULT 0,
  archived    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS categories (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('Revenu','Dépense','Épargne','Transfert')),
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  date          TEXT NOT NULL,              -- YYYY-MM-DD
  account_id    INTEGER NOT NULL REFERENCES accounts(id),
  label         TEXT NOT NULL,
  raw_label     TEXT NOT NULL DEFAULT '',
  bank_category TEXT NOT NULL DEFAULT '',
  amount        REAL NOT NULL,              -- signé : négatif = sortie
  category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  category_manual INTEGER NOT NULL DEFAULT 0, -- 1 = fixée à la main, non recalculée
  source        TEXT NOT NULL DEFAULT 'manuel', -- manuel | bnp | boursobank | revolut
  balance       REAL,
  fingerprint   TEXT UNIQUE,
  note          TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_tx_account ON transactions(account_id);

CREATE TABLE IF NOT EXISTS rules (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword     TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bank_category_map (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  bank_label  TEXT NOT NULL UNIQUE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS import_account_map (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  source     TEXT NOT NULL,                 -- bnp | boursobank | revolut
  key        TEXT NOT NULL,                 -- libellé de compte dans l'export ('*' = défaut)
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  UNIQUE(source, key)
);

CREATE TABLE IF NOT EXISTS budgets (
  category_id    INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  year           INTEGER NOT NULL,
  monthly_amount REAL NOT NULL,
  PRIMARY KEY (category_id, year)
);

CREATE TABLE IF NOT EXISTS snapshots (
  month      TEXT NOT NULL,                 -- YYYY-MM-01
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  balance    REAL NOT NULL,
  PRIMARY KEY (month, account_id)
);

CREATE TABLE IF NOT EXISTS assets (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL UNIQUE,
  symbol           TEXT NOT NULL DEFAULT '',  -- symbole Yahoo (VUAA.DE) ou id CoinGecko (bitcoin)
  account_id       INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  asset_class      TEXT NOT NULL DEFAULT 'Actions & ETF',
  manual_price     REAL,
  price            REAL,
  price_source     TEXT NOT NULL DEFAULT '',
  price_updated_at TEXT
);

CREATE TABLE IF NOT EXISTS operations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  date       TEXT NOT NULL,
  asset_id   INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('Achat','Vente','Dividende','Frais')),
  quantity   REAL NOT NULL DEFAULT 0,
  unit_price REAL NOT NULL DEFAULT 0,
  fees       REAL NOT NULL DEFAULT 0,
  note       TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS targets (
  asset_class TEXT PRIMARY KEY,
  pct         REAL NOT NULL
);

-- Enveloppes réglementées / fiscales rattachées à un compte (LEP, Livret A, PEA…)
CREATE TABLE IF NOT EXISTS envelopes (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id       INTEGER NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
  kind             TEXT NOT NULL,               -- LEP | Livret A | LDDS | Livret jeune | PEA | PEA-PME | Compte rémunéré | Assurance-vie | Autre
  ceiling          REAL,                        -- plafond (NULL = celui du type, ou aucun)
  rate             REAL,                        -- taux annuel net (NULL = taux officiel du type, ou taux constaté)
  opened_on        TEXT,                        -- date d'ouverture (ancienneté fiscale PEA)
  initial_deposits REAL NOT NULL DEFAULT 0,     -- versements antérieurs aux relevés importés (PEA)
  monthly_deposit  REAL NOT NULL DEFAULT 0,     -- versement programmé (pour l'estimation des intérêts)
  note             TEXT NOT NULL DEFAULT ''
);

-- Décisions de l'utilisateur sur les charges récurrentes détectées
CREATE TABLE IF NOT EXISTS recurring_overrides (
  merchant TEXT PRIMARY KEY,                    -- clé marchand normalisée
  status   TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','ignored')),
  label    TEXT NOT NULL DEFAULT ''             -- nom d'affichage choisi
);

-- Objectifs d'épargne
CREATE TABLE IF NOT EXISTS goals (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  target        REAL,                           -- NULL autorisé pour la source 'emergency' (objectif calculé)
  target_date   TEXT,                           -- AAAA-MM-JJ
  source        TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','account','class','emergency')),
  account_id    INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  asset_class   TEXT,
  manual_amount REAL NOT NULL DEFAULT 0,
  sort          INTEGER NOT NULL DEFAULT 0,
  archived      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (date('now'))
);

-- Rapprochement remboursement → dépense d'origine (ou catégorie)
CREATE TABLE IF NOT EXISTS refund_links (
  refund_id   INTEGER PRIMARY KEY REFERENCES transactions(id) ON DELETE CASCADE,
  expense_id  INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  CHECK ((expense_id IS NULL) <> (category_id IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_refund_expense ON refund_links(expense_id);

-- « Les virements de X remboursent toujours la catégorie Y »
CREATE TABLE IF NOT EXISTS refund_rules (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword     TEXT NOT NULL UNIQUE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE
);

-- Historique des cours (un point par actif et par jour)
CREATE TABLE IF NOT EXISTS price_history (
  asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  date     TEXT NOT NULL,
  price    REAL NOT NULL,
  source   TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (asset_id, date)
);
`;
