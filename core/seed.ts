/**
 * Données par défaut d'une base neuve : comptes, catégories, règles de
 * catégorisation, correspondances des catégories bancaires, cibles d'allocation.
 * Reprend le contenu du classeur Excel d'origine.
 */
import type { Store } from "./db.js";

export const ASSET_CLASSES = ["Liquidités", "Épargne sécurisée", "Actions & ETF", "Crypto", "Autre"] as const;
export const ACCOUNT_TYPES = ["Courant", "Livret", "PEA", "CTO", "Crypto", "Assurance-vie", "PER", "Épargne salariale", "Autre"] as const;
export const CATEGORY_KINDS = ["Revenu", "Dépense", "Épargne", "Transfert"] as const;
export const SOURCES = ["bnp", "boursobank", "revolut"] as const;

const ACCOUNTS: [string, string, string, string][] = [
  ["BNP – Compte courant", "BNP Paribas", "Courant", "Liquidités"],
  ["Revolut – Compte courant", "Revolut", "Courant", "Liquidités"],
  ["Revolut – Compte d'épargne", "Revolut", "Livret", "Épargne sécurisée"],
  ["Revolut – Crypto", "Revolut", "Crypto", "Crypto"],
  ["Revolut – Actions", "Revolut", "CTO", "Actions & ETF"],
  ["Boursobank – Compte courant", "Boursobank", "Courant", "Liquidités"],
  ["Boursobank – LEP", "Boursobank", "Livret", "Épargne sécurisée"],
];

const CATEGORIES: [string, string][] = [
  ["Salaire", "Revenu"], ["Revenus annexes", "Revenu"], ["Allocations & aides", "Revenu"],
  ["Intérêts d'épargne", "Revenu"], ["Remboursements", "Revenu"], ["Autres revenus", "Revenu"],
  ["Loyer & charges", "Dépense"], ["Énergie, internet & téléphone", "Dépense"], ["Courses", "Dépense"],
  ["Transport & carburant", "Dépense"], ["Assurances", "Dépense"], ["Abonnements", "Dépense"],
  ["Tech, hébergement & IA", "Dépense"], ["Santé", "Dépense"], ["Restaurants & sorties", "Dépense"],
  ["Loisirs", "Dépense"], ["Shopping", "Dépense"], ["Maison & équipement", "Dépense"], ["Voyages", "Dépense"],
  ["Crédits", "Dépense"], ["Frais bancaires", "Dépense"], ["Impôts & taxes", "Dépense"], ["Cadeaux", "Dépense"],
  ["Projets & entreprises", "Dépense"], ["Divers", "Dépense"],
  ["Épargne (livrets)", "Épargne"], ["Investissement bourse", "Épargne"], ["Investissement crypto", "Épargne"],
  ["Virement interne", "Transfert"],
];

const RULES: [string, string][] = [
  ["THEO VACANT", "Virement interne"], ["VACANT THEO", "Virement interne"], ["M THEO VACANT", "Virement interne"],
  ["EUR Compte d'épargne", "Virement interne"], ["Recharge sur Apple Pay", "Virement interne"],
  ["VIR CREATION COMPTE", "Virement interne"],
  ["Revolut Digital Assets", "Investissement crypto"],
  ["Intérêts nets versés pour", "Intérêts d'épargne"],
  ["LA POSTE RH", "Salaire"], ["SIAGILUS", "Salaire"],
  ["FRANCE TRAVAIL", "Allocations & aides"], ["CAF ", "Allocations & aides"],
  ["CENTURY 21", "Loyer & charges"],
  ["ENGIE", "Énergie, internet & téléphone"], ["FREE", "Énergie, internet & téléphone"],
  ["AXA", "Assurances"], ["COFIDIS", "Crédits"],
  ["CARREFOUR", "Courses"], ["LECLERC", "Courses"], ["AUCHAN", "Courses"], ["MATCH SUPERMARCH", "Courses"],
  ["GRAND FRAIS", "Courses"], ["LIDL", "Courses"], ["ALDI", "Courses"], ["INTERMARCHE", "Courses"],
  ["BOULANG", "Courses"], ["BLACH", "Courses"], ["LA BAGUETTE", "Courses"], ["BAKERY", "Courses"],
  ["Pêché Gourmand", "Courses"], ["Freres Marchand", "Courses"],
  ["MCDONALD", "Restaurants & sorties"], ["BUFFALO GRILL", "Restaurants & sorties"], ["UBER EATS", "Restaurants & sorties"],
  ["DELIVEROO", "Restaurants & sorties"], ["RAMEN", "Restaurants & sorties"], ["PATATERIE", "Restaurants & sorties"],
  ["BAGELSTEIN", "Restaurants & sorties"], ["AB COFFEE", "Restaurants & sorties"], ["SHAMROCK", "Restaurants & sorties"],
  ["Rest Chambard", "Restaurants & sorties"], ["JU YUAN", "Restaurants & sorties"], ["AUX DELICES", "Restaurants & sorties"],
  ["ARAL", "Transport & carburant"], ["TOTALENERGIES", "Transport & carburant"], ["STATION U", "Transport & carburant"],
  ["RELAIS LA RAMUS", "Transport & carburant"], ["EASYPARK", "Transport & carburant"], ["URBIS PARK", "Transport & carburant"],
  ["P.STAT", "Transport & carburant"], ["FEU VERT", "Transport & carburant"],
  ["PHARMACIE", "Santé"], ["PHIE ", "Santé"],
  ["IKEA", "Maison & équipement"], ["LEROY MERLIN", "Maison & équipement"], ["CASTORAMA", "Maison & équipement"],
  ["ESPACE ELEC", "Maison & équipement"],
  ["AIRBNB", "Voyages"],
  ["STEAM", "Loisirs"], ["XSOLLA", "Loisirs"], ["SKINBARON", "Loisirs"], ["CLASHGG", "Loisirs"], ["K4G", "Loisirs"],
  ["BATTLE.NET", "Loisirs"], ["HALL DU LIVRE", "Loisirs"], ["FNAC", "Loisirs"], ["ULULE", "Loisirs"],
  ["GALERIES LAFAYETTE", "Shopping"],
  ["ANTHROPIC", "Tech, hébergement & IA"], ["OPENAI", "Tech, hébergement & IA"], ["CURSOR", "Tech, hébergement & IA"],
  ["SCALEWAY", "Tech, hébergement & IA"], ["OVH", "Tech, hébergement & IA"], ["GOOGLE", "Tech, hébergement & IA"],
  ["DISCORD", "Abonnements"], ["PROTON", "Abonnements"], ["APPLE", "Abonnements"], ["YOUTUBE", "Abonnements"],
  ["AMAZON PRIME", "Abonnements"], ["NETFLIX", "Abonnements"], ["SPOTIFY", "Abonnements"],
  ["PRIME BNP", "Autres revenus"], ["COMMISSIONS COTISATION", "Frais bancaires"],
  ["RETROCESSION", "Remboursements"], ["REMBOURSEMENT", "Remboursements"],
  ["MLLE MELANIE RAMAUX", "Remboursements"], ["VACANT LOTITO", "Remboursements"],
  ["DA SILVA PEREIRA", "Remboursements"], ["BLAIN ERIKA", "Remboursements"], ["MANDICA", "Remboursements"],
  ["Virement à : Elaan", "Projets & entreprises"],
];

const BANK_MAP: [string, string][] = [
  ["Alimentation", "Courses"], ["Restaurants, bars, discothèques…", "Restaurants & sorties"],
  ["Carburant", "Transport & carburant"], ["Parking", "Transport & carburant"], ["Entretien - Réparation", "Transport & carburant"],
  ["Multimedia à domicile (TV, internet, téléphonie…)", "Abonnements"],
  ["Téléphonie (fixe et mobile)", "Énergie, internet & téléphone"],
  ["Energie (électricité, gaz, fuel, chauffage…)", "Énergie, internet & téléphone"],
  ["Assurance habitation et RC", "Assurances"], ["Salaire fixe", "Salaire"],
  ["Allocation chômage", "Allocations & aides"], ["Allocations familiales", "Allocations & aides"],
  ["Crédit conso", "Crédits"], ["Electronique et informatique", "Tech, hébergement & IA"],
  ["Livres, CD/DVD, bijoux, jouets…", "Loisirs"], ["Vêtements et accessoires", "Shopping"],
  ["Mobilier, électroménager, décoration…", "Maison & équipement"], ["Bricolage et jardinage", "Maison & équipement"],
  ["Vie quotidienne", "Divers"], ["Vie Quotidienne - Autres", "Divers"],
  ["Virements émis de comptes à comptes", "Virement interne"], ["Virements reçus de comptes à comptes", "Virement interne"],
  ["Électricité, gaz", "Énergie, internet & téléphone"], ["Internet, TV", "Énergie, internet & téléphone"],
  ["Assurances", "Assurances"], ["Loyer", "Loyer & charges"], ["Remboursement", "Remboursements"],
  ["Frais bancaires", "Frais bancaires"], ["Banque - Autres", "Divers"], ["Voyages, vacances", "Voyages"],
  ["Restaurants, bars", "Restaurants & sorties"],
];

const TARGETS: [string, number][] = [
  ["Liquidités", 0.05], ["Épargne sécurisée", 0.15], ["Actions & ETF", 0.70], ["Crypto", 0.10], ["Autre", 0],
];

export function seedDefaults(store: Store): void {
  store.transaction(() => {
    ACCOUNTS.forEach(([name, inst, type, cls], i) =>
      store.run("INSERT INTO accounts(name,institution,type,asset_class,sort) VALUES(?,?,?,?,?)", [name, inst, type, cls, i]));
    CATEGORIES.forEach(([name, kind], i) =>
      store.run("INSERT INTO categories(name,kind,sort) VALUES(?,?,?)", [name, kind, i]));
    const cat = (name: string) => store.scalar<number>("SELECT id FROM categories WHERE name=?", [name]);
    const acc = (name: string) => store.scalar<number>("SELECT id FROM accounts WHERE name=?", [name]);
    RULES.forEach(([kw, c]) => store.run("INSERT INTO rules(keyword,category_id) VALUES(?,?)", [kw, cat(c)]));
    BANK_MAP.forEach(([l, c]) => store.run("INSERT INTO bank_category_map(bank_label,category_id) VALUES(?,?)", [l, cat(c)]));
    TARGETS.forEach(([cls, p]) => store.run("INSERT INTO targets(asset_class,pct) VALUES(?,?)", [cls, p]));
    const maps: [string, string, string][] = [
      ["bnp", "*", "BNP – Compte courant"],
      ["boursobank", "*", "Boursobank – Compte courant"],
      ["boursobank", "BoursoBank", "Boursobank – Compte courant"],
      ["boursobank", "LIVRET D'EPARGNE POPULAIRE", "Boursobank – LEP"],
      ["revolut", "*", "Revolut – Compte courant"],
      ["revolut", "Valeur actuelle", "Revolut – Compte courant"],
      ["revolut", "Dépôt", "Revolut – Compte d'épargne"],
    ];
    maps.forEach(([s, k, a]) => store.run("INSERT INTO import_account_map(source,key,account_id) VALUES(?,?,?)", [s, k, acc(a)]));
    const settings: [string, string][] = [
      ["emergency_months", "6"], ["allocation_tolerance", "0.05"], ["start_month", "2026-07-01"],
      ["projection_monthly", "400"], ["projection_rate_low", "0.04"], ["projection_rate_mid", "0.06"],
      ["projection_rate_high", "0.08"], ["projection_inflation", "0.02"], ["projection_goal", "100000"],
      ["next_deposit", "400"],
    ];
    settings.forEach(([k, v]) => store.run("INSERT INTO settings(key,value) VALUES(?,?)", [k, v]));
  });
}
