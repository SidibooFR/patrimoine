# Patrimoine

Application bureau de gestion de patrimoine personnel : comptes bancaires, budget, relevé de patrimoine mensuel, portefeuille bourse & crypto, allocation, projection — avec un **serveur MCP** pour que Claude lise et modifie les mêmes données.

- **Stack** : Electron · Vue 3 · TypeScript · SQLite (sql.js, sans compilation native) · Chart.js · exceljs
- **Données** : un seul fichier SQLite local, aucun cloud, aucun compte. Export Excel complet en un clic.
- **MCP** : serveur stdio (SDK officiel `@modelcontextprotocol/sdk`), 42 outils, même code métier que l'application.

## Prérequis

- Node.js 20 ou plus récent (22 recommandé)
- Windows 10/11 (macOS et Linux fonctionnent aussi : cibles `dmg` et `AppImage` déclarées)

## Installation et lancement

```bash
npm install
npm run build          # interface + processus Electron + serveur MCP
npx electron .         # lance l'application
```

En développement :

```bash
npm run dev            # interface seule dans le navigateur (http://localhost:5173), API servie par Vite
npm run dev:electron   # Electron branché sur le serveur Vite (rechargement à chaud)
npm test               # tests du cœur métier (parsers des 3 banques, catégorisation, budget, TRI, export…)
```

Les relevés bancaires réels utilisés par une partie des tests (`tests/fixtures/` : `bnp.xls`, `export-operations-bourso-courant.xlsx`, `export-operations-bourso-lep.xlsx`, `revolut.csv`) ne sont pas versionnés. Sans eux, ces tests sont ignorés et les autres s'exécutent normalement.

```bash
```

## Créer l'exécutable Windows

```bash
npm run package        # → release/Patrimoine Setup 1.1.0.exe (installeur) et Patrimoine 1.1.0.exe (portable)
```

Le serveur MCP est copié dans `resources/mcp/server.cjs` à côté de l'application installée.

## Versions et releases automatiques

Chaque push sur `main` déclenche le workflow **Release** (GitHub Actions) :

1. tests, vérification des types et build sur Linux (workflow **CI**, aussi lancé sur les autres branches et les pull requests) ;
2. sur un runner Windows, **semantic-release** lit les messages de commit depuis la dernière version, calcule le nouveau numéro, met à jour `package.json` et `CHANGELOG.md`, construit les exécutables puis publie la release GitHub avec :
   - `Patrimoine-Setup-x.y.z.exe` : installeur (choix du dossier, raccourci bureau) ;
   - `Patrimoine-Portable-x.y.z.exe` : version portable, sans installation ;
   - `patrimoine-mcp-x.y.z.zip` : le serveur MCP seul, pour Claude Desktop ;
   - `latest.yml` et `Patrimoine-Setup-x.y.z.exe.blockmap` : utilisés par les mises à jour automatiques.

### Mises à jour automatiques

Une fois installée avec `Patrimoine-Setup-x.y.z.exe`, l'application vérifie au démarrage puis toutes les 6 heures si une nouvelle release existe sur GitHub ([electron-updater](https://www.electron.build/auto-update)). La nouvelle version est téléchargée en arrière-plan ; un bouton « Installer la version x.y.z » apparaît alors en bas de la barre latérale (et dans Paramètres → Mises à jour). Sinon, elle s'installe toute seule à la prochaine fermeture. La base de données, stockée hors du dossier d'installation, n'est pas touchée.

La version portable ne peut pas se remplacer elle-même : elle signale seulement la nouvelle version et ouvre la page de téléchargement. Les versions installées avant la 1.3 doivent être mises à jour une dernière fois à la main.

Le numéro de version dépend du préfixe des commits ([Conventional Commits](https://www.conventionalcommits.org/fr/)) :

| Commit | Effet | Exemple |
|---|---|---|
| `fix: …` | correctif → 1.1.**1** | `fix(import): solde Revolut avec deux opérations le même jour` |
| `feat: …` | fonctionnalité → 1.**2**.0 | `feat(budget): export PDF mensuel` |
| `feat!: …` ou pied `BREAKING CHANGE:` | rupture → **2**.0.0 | `feat!: nouveau format de base` |
| `docs:`, `chore:`, `ci:`, `refactor:`, `test:` | pas de release | `docs: README` |

Les exécutables ne sont pas signés : au premier lancement, Windows SmartScreen affiche « Windows a protégé votre ordinateur » → « Informations complémentaires » → « Exécuter quand même ».

## Où sont les données

| Système | Fichier |
|---|---|
| Windows | `%APPDATA%\Patrimoine\patrimoine.sqlite` |
| macOS | `~/Library/Application Support/Patrimoine/patrimoine.sqlite` |
| Linux | `~/.config/Patrimoine/patrimoine.sqlite` |

La variable d'environnement `PATRIMOINE_DB` permet de pointer vers un autre fichier (application et MCP).
Sauvegarde = copier ce fichier. Pour repartir de zéro, le supprimer : il est recréé avec les comptes, catégories et règles par défaut.

### Base pré-remplie

Le dossier `donnees/` contient `patrimoine.sqlite`, construite à partir des exports BNP, Boursobank (compte courant + LEP) et Revolut de juillet à octobre 2026, du relevé de patrimoine d'octobre, des 6 achats d'ETF, des 18 positions crypto, du LEP (versement programmé de 10 €/mois) et d'un objectif d'épargne de précaution.

Une base existante (version 1.0) est mise à niveau automatiquement à l'ouverture : nouvelles tables, réglages, et enveloppes déduites des comptes (LEP, Livret A, PEA…). Aucune donnée n'est modifiée. Pour l'utiliser : copier ce fichier à l'emplacement ci-dessus avant le premier lancement (ou définir `PATRIMOINE_DB`).

Pour la reconstruire depuis des exports : `node scripts/run-ts.mjs scripts/seed-data.ts <dossier des exports> <fichier.sqlite>`.

## Connexion à Claude (MCP)

1. `npm run build` (ou application installée).
2. Dans Claude Desktop : Paramètres → Développeur → Modifier la configuration, puis ajouter :

```json
{
  "mcpServers": {
    "patrimoine": {
      "command": "node",
      "args": ["C:/chemin/vers/patrimoine/dist-mcp/server.cjs"]
    }
  }
}
```

(La page Paramètres de l'application affiche la configuration exacte avec le bon chemin et un bouton « Copier ».)

3. Redémarrer Claude Desktop. Exemples : « Quel est mon taux d'épargne de septembre ? », « Classe les virements à Elaan en Projets & entreprises », « Importe C:\Users\theo\Downloads\export.csv », « Où placer 300 € ce mois-ci ? », « Actualise les cours et donne-moi la performance de mon portefeuille », « Combien me coûtent mes abonnements par an ? », « Rapproche les remboursements de Mélanie », « Où placer mon épargne pour qu'elle rapporte le plus ? », « Crée un objectif de 3 000 € pour septembre 2027 ».

Outils exposés : `get_dashboard`, `list_accounts`, `list_categories`, `list_transactions`, `add_transaction`, `set_transaction_category`, `delete_transaction`, `import_bank_file`, `list_rules`, `add_rule`, `delete_rule`, `recategorize`, `get_budget`, `set_budget`, `get_budget_scenarios`, `get_budget_month`, `copy_budgets`, `get_networth`, `set_snapshot`, `suggest_balances`, `get_portfolio`, `refresh_prices`, `list_assets`, `save_asset`, `list_operations`, `add_operation`, `delete_operation`, `get_allocation`, `set_target`, `get_projection`, `get_settings`, `set_setting`, `export_excel`, `get_envelopes`, `save_envelope`, `get_recurring_charges`, `set_recurring_status`, `list_goals`, `save_goal`, `delete_goal`, `get_refunds`, `link_refund`, `unlink_refund`, `get_portfolio_history`, `backfill_price_history`.

L'application et le serveur MCP partagent le fichier SQLite : chaque processus recharge le fichier s'il a été modifié par l'autre avant de lire ou d'écrire. Dans l'application, `Ctrl+R` rafraîchit la page après une modification faite par Claude.

## Fonctionnement

| Onglet | Ce qu'il fait |
|---|---|
| Tableau de bord | Patrimoine, budget du mois, performance des investissements, alertes, 4 graphiques |
| Relevés | Toutes les opérations (importées + manuelles), filtres, changement de catégorie en ligne, création de règle en un clic |
| Remboursements | Rapproche chaque remboursement de la dépense d'origine (suggestions notées : montant total ou part 1/2…1/6, proximité de date, historique du payeur) ou d'une catégorie ; règles « payeur → catégorie » pour les contributions régulières. Un remboursement rapproché est déduit de la dépense dans le budget au lieu de compter comme revenu |
| Importer | Exports BNP (.xls), Boursobank (.xlsx, tous comptes), Revolut (.csv). Détection automatique, aperçu, déduplication par empreinte, correspondance export → compte |
| Règles | Mots-clés → catégorie (le plus long l'emporte), correspondance des catégories bancaires, catégories bancaires non mappées |
| Budget | Réel par catégorie et par mois, budget prévu (totaux, reste et taux d'épargne prévus), écarts, mois hors budget surlignés, suivi du mois (réel vs budget, rythme, projection de fin de mois, dépenses hors budget), reprise du budget N−1, assistant « Proposer un budget » (5 scénarios) |
| Abonnements | Charges récurrentes détectées (hebdomadaires à annuelles), coût mensuel et annuel, prochaine échéance, hausses de prix ; confirmer, ignorer, renommer |
| Objectifs | Montant + échéance ; avancement suivi sur un compte, une classe d'actif, l'épargne de précaution ou un montant saisi ; versement mensuel nécessaire (intérêts du livret compris), rythme constaté, date d'atteinte, comparaison avec la capacité d'épargne |
| Patrimoine | Relevé mensuel des soldes (pré-rempli depuis les relevés importés), évolution, répartition par classe |
| Livrets & PEA | Plafond, place restante, taux net (officiel avec historique JO, saisi, ou constaté sur les intérêts versés), intérêts perçus et estimés (règle des quinzaines), ancienneté fiscale du PEA, transferts conseillés vers les livrets mieux rémunérés avec le gain annuel |
| Portefeuille | Actifs, opérations (achat/vente/dividende/frais), PRU, plus-values latentes et réalisées, TRI (XIRR) avec indicateur de fiabilité, cours Yahoo Finance / CoinGecko avec cours manuel de secours, historique des cours, courbe valeur / montant investi, performance pondérée par le temps (1 mois, 3 mois, depuis le 1er janvier, 1 an, depuis le début) |
| Allocation | Réel vs cible par classe, action (renforcer/alléger), répartition du prochain versement, épargne de précaution |
| Projection | 3 scénarios à intérêts composés, en euros constants, année d'atteinte de l'objectif |
| Paramètres | Comptes, catégories, réglages, export Excel, configuration MCP |

## Structure du code

```
core/        cœur métier partagé (db.ts, migrate.ts, importers.ts, categorize.ts, reports.ts, balances.ts, envelopes.ts,
             recurring.ts, goals.ts, refunds.ts, history.ts, prices.ts, export.ts, api.ts)
electron/    processus principal + preload (pont IPC → core/api.ts), mises à jour automatiques (updater.ts)
mcp/         serveur MCP stdio (→ core/api.ts)
src/         interface Vue 3 (views/, components/, lib/api.ts client IPC/HTTP)
tests/       vitest + fixtures (exports bancaires réels)
scripts/     copie du wasm SQLite, exécution de scripts TS, construction d'une base pré-remplie
```

## Limites connues

- Les cours web dépendent d'API publiques sans clé (Yahoo Finance non officielle, CoinGecko ~10-30 requêtes/min). En cas d'échec, le cours manuel est utilisé et la colonne Source l'indique.
- Les comptes d'investissement (crypto, actions) n'ont pas d'export : leur solde se saisit à la main dans Patrimoine.
- Historique des cours : CoinGecko ne fournit que 365 jours d'historique sans clé ; le téléchargement prend environ une minute pour 18 cryptos (limite de débit). Sans historique, les performances par période ne sont pas affichées (la hausse s'accumulerait sur le dernier jour).
- Taux officiels des livrets dans `core/envelopes.ts` (au 1er août 2026) : à compléter à chaque révision (1er février, 1er août), ou saisir le taux dans l'enveloppe.
- Détection des abonnements : il faut au moins deux paiements quasi identiques ; les abonnements annuels n'apparaissent qu'après un an d'historique.
- Ce logiciel est un outil de suivi, pas un conseil financier.
