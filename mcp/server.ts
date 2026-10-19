/**
 * Serveur MCP (stdio) pour Claude : expose les données et actions de l'application.
 *
 * Configuration Claude Desktop (claude_desktop_config.json) :
 *   "patrimoine": { "command": "node", "args": ["C:/chemin/vers/patrimoine/dist-mcp/server.cjs"] }
 * Variable optionnelle PATRIMOINE_DB pour pointer vers un autre fichier de base.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Store, defaultDbPath } from "../core/db.js";
import { createApi } from "../core/api.js";
import { VERSION } from "../core/version.js";

const text = (v: unknown) => ({ content: [{ type: "text" as const, text: typeof v === "string" ? v : JSON.stringify(v, null, 2) }] });
const fail = (e: unknown) => ({ content: [{ type: "text" as const, text: `Erreur : ${(e as Error).message ?? e}` }], isError: true });
const wrap = <A extends unknown[]>(fn: (...a: A) => unknown) => async (...a: A) => { try { return text(await fn(...a)); } catch (e) { return fail(e); } };

async function main() {
  const store = await Store.open(defaultDbPath());
  const api = createApi(store);
  const server = new McpServer({ name: "patrimoine", version: VERSION }, {
    instructions:
      "Outils de gestion de patrimoine personnel de l'utilisateur (comptes bancaires, budget, bourse, crypto). " +
      "Les montants sont en euros. Les opérations ont un montant signé (négatif = sortie). " +
      "Commence par `get_dashboard` pour une vue d'ensemble. Les identifiants (comptes, catégories, actifs) s'obtiennent via les outils list_*. " +
      "Taux et fractions sont exprimés en décimal (0.025 = 2,5 %).",
  });

  const ro = { readOnlyHint: true };
  const rw = { readOnlyHint: false, destructiveHint: false };

  server.registerTool("get_dashboard", { description: "Vue d'ensemble : patrimoine total, budget du mois, performance des investissements, alertes.", annotations: ro }, wrap(() => api.dashboard()));
  server.registerTool("list_accounts", { description: "Liste des comptes bancaires et d'investissement avec leur classe d'actif.", annotations: ro }, wrap(() => api.listAccounts()));
  server.registerTool("list_categories", { description: "Liste des catégories de budget (Revenu, Dépense, Épargne, Transfert).", annotations: ro }, wrap(() => api.listCategories()));

  server.registerTool("list_transactions", {
    description: "Recherche dans les opérations bancaires (relevés importés + saisies manuelles). Retourne total, somme et lignes.",
    inputSchema: {
      from: z.string().optional().describe("Date de début AAAA-MM-JJ"), to: z.string().optional().describe("Date de fin AAAA-MM-JJ"),
      account_id: z.number().optional(), category_id: z.number().optional(), kind: z.enum(["Revenu", "Dépense", "Épargne", "Transfert"]).optional(),
      search: z.string().optional().describe("Texte cherché dans le libellé"), uncategorized: z.boolean().optional().describe("Seulement les opérations sans catégorie"),
      limit: z.number().int().min(1).max(2000).optional().default(100), offset: z.number().int().min(0).optional(),
    }, annotations: ro,
  }, wrap((f) => api.listTransactions(f)));

  server.registerTool("add_transaction", {
    description: "Ajoute une opération manuelle (ex. dépense en espèces). Montant signé : négatif = dépense, positif = revenu. Sans category_id, la catégorie est devinée par les règles.",
    inputSchema: { date: z.string(), account_id: z.number(), label: z.string(), amount: z.number(), category_id: z.number().nullable().optional(), note: z.string().optional() }, annotations: rw,
  }, wrap((t) => ({ id: api.addTransaction(t) })));

  server.registerTool("set_transaction_category", {
    description: "Fixe la catégorie d'une opération (marquée manuelle : elle ne sera plus recalculée).",
    inputSchema: { id: z.number(), category_id: z.number().nullable() }, annotations: rw,
  }, wrap(({ id, category_id }) => api.updateTransaction(id, { category_id })));

  server.registerTool("delete_transaction", { description: "Supprime une opération.", inputSchema: { id: z.number() }, annotations: { destructiveHint: true } }, wrap(({ id }) => api.deleteTransaction(id)));

  server.registerTool("import_bank_file", {
    description: "Importe un export bancaire (BNP .xls, Boursobank .xlsx, Revolut .csv) depuis un chemin de fichier local. Doublons ignorés, catégorisation automatique.",
    inputSchema: { path: z.string().describe("Chemin complet du fichier"), source: z.enum(["bnp", "boursobank", "revolut"]).optional().describe("Banque ; détectée automatiquement si omise") }, annotations: rw,
  }, wrap(({ path, source }) => api.importFile(path, source)));

  server.registerTool("list_rules", { description: "Règles de catégorisation par mot-clé et correspondances des catégories bancaires.", annotations: ro },
    wrap(() => ({ keywordRules: api.listRules(), bankCategoryMap: api.listBankCategoryMap(), unmappedBankCategories: api.unmappedBankCategories() })));
  server.registerTool("add_rule", {
    description: "Ajoute une règle « mot-clé dans le libellé → catégorie » puis recatégorise toutes les opérations non fixées à la main.",
    inputSchema: { keyword: z.string(), category_id: z.number() }, annotations: rw,
  }, wrap(({ keyword, category_id }) => { const id = api.saveRule({ keyword, category_id }); return { id, ...api.recategorize() }; }));
  server.registerTool("delete_rule", { description: "Supprime une règle de catégorisation.", inputSchema: { id: z.number() }, annotations: { destructiveHint: true } }, wrap(({ id }) => { api.deleteRule(id); return api.recategorize(); }));
  server.registerTool("recategorize", { description: "Recalcule la catégorie de toutes les opérations non fixées à la main.", annotations: rw }, wrap(() => api.recategorize()));

  server.registerTool("get_budget", {
    description: "Budget annuel : réel par catégorie et par mois, totaux, taux d'épargne, écart vs budget prévu.",
    inputSchema: { year: z.number().int().optional() }, annotations: ro,
  }, wrap(({ year }) => api.budget(year)));
  server.registerTool("set_budget", {
    description: "Définit le budget mensuel prévu d'une catégorie pour une année (null pour supprimer).",
    inputSchema: { category_id: z.number(), year: z.number().int(), monthly_amount: z.number().nullable() }, annotations: rw,
  }, wrap(({ category_id, year, monthly_amount }) => api.setBudget(category_id, year, monthly_amount)));
  server.registerTool("get_budget_scenarios", {
    description: "Propose 5 scénarios de budget (moyenne 12 mois, équilibré, économe, loisirs, investissement) calculés sur les 12 derniers mois complets ; les charges fixes ne bougent pas. Appliquer via set_budget.",
    inputSchema: { year: z.number().int().optional(), fixed: z.array(z.string()).optional() }, annotations: ro,
  }, wrap(({ year, fixed }) => api.budgetScenarios(year ?? new Date().getFullYear(), fixed)));
  server.registerTool("get_budget_month", {
    description: "Suivi du mois : réel contre budget pour chaque catégorie budgétée (reste, rythme, projection de fin de mois, statut ok/warn/over/under) et dépenses hors budget. Mois AAAA-MM, défaut : mois courant.",
    inputSchema: { month: z.string().regex(/^\d{4}-\d{2}$/).optional() }, annotations: ro,
  }, wrap(({ month }) => api.budgetMonth(month)));
  server.registerTool("copy_budgets", {
    description: "Reprend les budgets d'une année sur une autre (ex. N−1 → N) sans écraser les montants déjà saisis.",
    inputSchema: { from_year: z.number().int(), to_year: z.number().int() }, annotations: rw,
  }, wrap(({ from_year, to_year }) => api.copyBudgets(from_year, to_year)));

  server.registerTool("get_networth", { description: "Patrimoine : relevés mensuels des soldes par compte, total, variations, répartition par classe d'actif.", annotations: ro }, wrap(() => api.networth()));
  server.registerTool("set_snapshot", {
    description: "Enregistre les soldes d'un mois (relevé de patrimoine). `balances` : objet { account_id: solde }.",
    inputSchema: { month: z.string().describe("AAAA-MM"), balances: z.record(z.string(), z.number().nullable()) }, annotations: rw,
  }, wrap(({ month, balances }) => api.setSnapshotMonth(month, balances)));
  server.registerTool("suggest_balances", { description: "Derniers soldes connus par compte d'après les relevés importés (pour préparer un relevé de patrimoine).", annotations: ro }, wrap(() => api.suggestedBalances()));

  server.registerTool("get_portfolio", {
    description: "Portefeuille bourse & crypto : positions, PRU, valeur, plus-values, performance totale, TRI annualisé. `refresh` = actualiser d'abord les cours sur le web.",
    inputSchema: { refresh: z.boolean().optional().default(false) }, annotations: ro,
  }, wrap(async ({ refresh }) => { const prices = refresh ? await api.refreshPrices() : null; return { prices, ...api.portfolio() }; }));
  server.registerTool("refresh_prices", { description: "Actualise les cours (Yahoo Finance pour les ETF/actions, CoinGecko pour les cryptos).", annotations: rw }, wrap(() => api.refreshPrices()));
  server.registerTool("list_assets", { description: "Actifs du portefeuille (ETF, actions, cryptos) avec symbole de cotation.", annotations: ro }, wrap(() => api.listAssets()));
  server.registerTool("save_asset", {
    description: "Crée ou modifie un actif. `symbol` : symbole Yahoo (ex. VUAA.DE) ou identifiant CoinGecko (ex. bitcoin). `manual_price` : cours de secours.",
    inputSchema: { id: z.number().optional(), name: z.string(), symbol: z.string().optional(), account_id: z.number().nullable().optional(), asset_class: z.string().optional(), manual_price: z.number().nullable().optional() }, annotations: rw,
  }, wrap((a) => ({ id: api.saveAsset(a) })));
  server.registerTool("list_operations", { description: "Achats, ventes, dividendes et frais sur les actifs.", inputSchema: { asset_id: z.number().optional() }, annotations: ro }, wrap(({ asset_id }) => api.listOperations(asset_id)));
  server.registerTool("add_operation", {
    description: "Ajoute une opération sur un actif. Dividende : quantity=1 et unit_price=montant reçu.",
    inputSchema: { date: z.string(), asset_id: z.number(), kind: z.enum(["Achat", "Vente", "Dividende", "Frais"]), quantity: z.number(), unit_price: z.number(), fees: z.number().optional(), note: z.string().optional() }, annotations: rw,
  }, wrap((o) => ({ id: api.saveOperation(o) })));
  server.registerTool("delete_operation", { description: "Supprime une opération d'actif.", inputSchema: { id: z.number() }, annotations: { destructiveHint: true } }, wrap(({ id }) => api.deleteOperation(id)));

  server.registerTool("get_allocation", {
    description: "Allocation actuelle vs cible par classe d'actif, répartition conseillée du prochain versement, épargne de précaution.",
    inputSchema: { next_deposit: z.number().optional().describe("Montant à placer ce mois-ci") }, annotations: ro,
  }, wrap(({ next_deposit }) => api.allocation(next_deposit)));
  server.registerTool("set_target", { description: "Définit la cible d'allocation d'une classe d'actif (fraction, ex. 0.7).", inputSchema: { asset_class: z.string(), pct: z.number().min(0).max(1) }, annotations: rw }, wrap(({ asset_class, pct }) => api.setTarget(asset_class, pct)));
  server.registerTool("get_projection", {
    description: "Projection de patrimoine à intérêts composés (3 scénarios) et année d'atteinte de l'objectif.",
    inputSchema: { initial: z.number().optional(), monthly: z.number().optional(), rateLow: z.number().optional(), rateMid: z.number().optional(), rateHigh: z.number().optional(), inflation: z.number().optional(), goal: z.number().optional(), years: z.number().int().optional() }, annotations: ro,
  }, wrap((p) => api.projection(p)));

  server.registerTool("get_settings", { description: "Réglages (mois d'épargne de précaution, tolérance d'allocation, paramètres de projection…) et chemin de la base.", annotations: ro }, wrap(() => ({ ...api.meta(), settings: api.settings() })));
  server.registerTool("set_setting", { description: "Modifie un réglage.", inputSchema: { key: z.string(), value: z.string() }, annotations: rw }, wrap(({ key, value }) => api.setSetting(key, value)));
  server.registerTool("export_excel", { description: "Exporte toutes les données et synthèses dans un fichier Excel.", inputSchema: { path: z.string().describe("Chemin du fichier .xlsx à créer") }, annotations: rw }, wrap(({ path }) => api.exportExcel(path)));

  // ---------------------------------------------------------------- enveloppes
  server.registerTool("get_envelopes", {
    description: "Livrets réglementés et enveloppes (LEP, Livret A, LDDS, PEA…) : solde, plafond, place restante, taux net (officiel, personnalisé ou constaté), intérêts perçus et estimés pour l'année, et transferts conseillés vers les livrets mieux rémunérés avec le gain annuel.",
    annotations: ro,
  }, wrap(() => api.envelopes()));
  server.registerTool("save_envelope", {
    description: "Déclare ou modifie l'enveloppe d'un compte. kind : LEP, Livret A, LDDS, Livret jeune, PEA, PEA-PME, Compte rémunéré, Assurance-vie, Autre. ceiling/rate null = valeurs officielles du type (ou taux constaté pour un compte rémunéré). opened_on : date d'ouverture (PEA : ancienneté fiscale). initial_deposits : versements antérieurs aux relevés (PEA). monthly_deposit : versement programmé.",
    inputSchema: { account_id: z.number(), kind: z.string(), ceiling: z.number().nullable().optional(), rate: z.number().nullable().optional().describe("Taux annuel net en décimal"), opened_on: z.string().nullable().optional(), initial_deposits: z.number().optional(), monthly_deposit: z.number().optional(), note: z.string().optional() },
    annotations: rw,
  }, wrap((e) => ({ id: api.saveEnvelope(e) })));

  // ---------------------------------------------------------------- charges récurrentes
  server.registerTool("get_recurring_charges", {
    description: "Abonnements et charges récurrentes détectés dans les dépenses : marchand, fréquence, dernier montant, coût mensuel et annuel, prochaine échéance, hausse ou baisse de prix, statut (auto/confirmed/ignored). Totaux par catégorie.",
    annotations: ro,
  }, wrap(() => api.recurring()));
  server.registerTool("set_recurring_status", {
    description: "Confirme, ignore (faux positif) ou renomme une charge récurrente. `key` : champ key renvoyé par get_recurring_charges (ou `merchant` pour toutes les charges d'un marchand). status 'auto' = annule la décision.",
    inputSchema: { key: z.string(), status: z.enum(["auto", "confirmed", "ignored"]), label: z.string().optional() }, annotations: rw,
  }, wrap(({ key, status, label }) => api.setRecurringStatus(key, status, label)));

  // ---------------------------------------------------------------- objectifs
  server.registerTool("list_goals", {
    description: "Objectifs d'épargne : montant actuel, cible, progression, versement mensuel nécessaire pour l'échéance, rythme constaté, date d'atteinte prévue, statut ; et capacité d'épargne mensuelle moyenne comparée aux besoins.",
    annotations: ro,
  }, wrap(() => api.goals()));
  server.registerTool("save_goal", {
    description: "Crée ou modifie un objectif d'épargne. source : manual (manual_amount saisi), account (solde d'account_id), class (somme des comptes d'une asset_class), emergency (épargne de précaution ; target null = objectif calculé selon les dépenses).",
    inputSchema: { id: z.number().optional(), name: z.string(), target: z.number().nullable().optional(), target_date: z.string().nullable().optional().describe("AAAA-MM-JJ"), source: z.enum(["manual", "account", "class", "emergency"]).optional(), account_id: z.number().nullable().optional(), asset_class: z.string().nullable().optional(), manual_amount: z.number().optional(), archived: z.number().int().min(0).max(1).optional() },
    annotations: rw,
  }, wrap((g) => ({ id: api.saveGoal(g) })));
  server.registerTool("delete_goal", { description: "Supprime un objectif d'épargne.", inputSchema: { id: z.number() }, annotations: { destructiveHint: true } }, wrap(({ id }) => api.deleteGoal(id)));

  // ---------------------------------------------------------------- remboursements
  server.registerTool("get_refunds", {
    description: "Remboursements reçus (catégorie Remboursements) avec leur rapprochement (dépense d'origine, catégorie ou règle payeur) et des suggestions de dépense d'origine notées de 0 à 1. Un remboursement rapproché est déduit de la dépense dans le budget au lieu d'être compté comme revenu.",
    inputSchema: { year: z.number().int().optional() }, annotations: ro,
  }, wrap(({ year }) => api.refunds(year)));
  server.registerTool("link_refund", {
    description: "Rapproche un remboursement : soit d'une dépense précise (expense_id, déduit le mois de la dépense), soit d'une catégorie (category_id, déduit le mois du remboursement). remember=true avec category_id : crée une règle pour tous les remboursements de ce payeur.",
    inputSchema: { refund_id: z.number(), expense_id: z.number().optional(), category_id: z.number().optional(), remember: z.boolean().optional() }, annotations: rw,
  }, wrap(({ refund_id, expense_id, category_id, remember }) => api.linkRefund(refund_id, { expense_id, category_id }, remember ?? false)));
  server.registerTool("unlink_refund", { description: "Annule le rapprochement d'un remboursement (il redevient un revenu).", inputSchema: { refund_id: z.number() }, annotations: rw }, wrap(({ refund_id }) => api.unlinkRefund(refund_id)));

  // ---------------------------------------------------------------- historique
  server.registerTool("get_portfolio_history", {
    description: "Évolution de la valeur du portefeuille et du montant investi dans le temps, par classe d'actif, et performance pondérée par le temps (TWR) sur 1 mois, 3 mois, depuis le 1er janvier, 1 an et depuis le début. `reliable` indique si de vrais cours historiques couvrent la période.",
    annotations: ro,
  }, wrap(() => { const h = api.portfolioHistory(); return { ...h, points: h.points.filter((_, i, a) => i % Math.ceil(a.length / 40) === 0 || i === a.length - 1) }; }));
  server.registerTool("backfill_price_history", {
    description: "Télécharge l'historique quotidien des cours depuis le premier achat de chaque actif (Yahoo Finance ; CoinGecko limité à 365 jours). Peut prendre une minute (limite de débit CoinGecko).",
    annotations: rw,
  }, wrap(() => api.backfillPriceHistory()));

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => { console.error(e); process.exit(1); });
