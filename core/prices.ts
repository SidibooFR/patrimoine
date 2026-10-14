/**
 * Récupération des cours : Yahoo Finance (ETF / actions) et CoinGecko (cryptos).
 * Aucune clé d'API nécessaire. En cas d'échec, le cours manuel est conservé.
 */
import type { Store } from "./db.js";
import { currencyOf, recordPrice } from "./history.js";

const UA = "Mozilla/5.0 (compatible; Patrimoine/1.0)";

export async function fetchYahooPrice(symbol: string): Promise<{ price: number; currency: string } | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol.trim())}?range=1d&interval=1d`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!res.ok) return null;
    const j: any = await res.json();
    const meta = j?.chart?.result?.[0]?.meta;
    const p = meta?.regularMarketPrice;
    if (typeof p !== "number") return null;
    return { price: p, currency: String(meta.currency ?? "") };
  } catch {
    return null;
  }
}

export async function fetchCoinGeckoPrices(ids: string[], currency = "EUR"): Promise<Record<string, number>> {
  if (!ids.length) return {};
  const vs = currency.toLowerCase();
  const url = `https://api.coingecko.com/api/v3/simple/price?vs_currencies=${vs}&ids=${encodeURIComponent(ids.join(","))}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!res.ok) return {};
    const j: any = await res.json();
    const out: Record<string, number> = {};
    for (const id of ids) if (typeof j?.[id]?.[vs] === "number") out[id] = j[id][vs];
    return out;
  } catch {
    return {};
  }
}

export interface RefreshResult { updated: number; failed: string[]; at: string }

/** Met à jour `assets.price` pour tous les actifs ayant un symbole. */
export async function refreshPrices(store: Store): Promise<RefreshResult> {
  const assets = store.all<{ id: number; name: string; symbol: string; asset_class: string }>(
    "SELECT id, name, symbol, asset_class FROM assets WHERE TRIM(symbol) <> ''",
  );
  const at = new Date().toISOString();
  const res: RefreshResult = { updated: 0, failed: [], at };
  const cryptos = assets.filter((a) => a.asset_class === "Crypto");
  const others = assets.filter((a) => a.asset_class !== "Crypto");
  const currency = currencyOf(store);
  const gecko = await fetchCoinGeckoPrices(cryptos.map((a) => a.symbol.trim().toLowerCase()), currency);
  const updates: [number, number, string][] = [];
  for (const a of cryptos) {
    const p = gecko[a.symbol.trim().toLowerCase()];
    if (p === undefined) res.failed.push(a.name); else updates.push([a.id, p, "CoinGecko"]);
  }
  for (const a of others) {
    const y = await fetchYahooPrice(a.symbol);
    if (!y) { res.failed.push(a.name); continue; }
    if (y.currency && y.currency !== currency) { res.failed.push(`${a.name} (coté en ${y.currency})`); continue; }
    updates.push([a.id, y.price, "Yahoo Finance"]);
  }
  store.transaction(() => {
    for (const [id, p, src] of updates) {
      store.run("UPDATE assets SET price=?, price_source=?, price_updated_at=? WHERE id=?", [p, src, at, id]);
      recordPrice(store, id, at.slice(0, 10), p, src);
      res.updated++;
    }
  });
  return res;
}
