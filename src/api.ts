/** Client API côté interface : Electron (IPC) ou serveur de dev Vite (HTTP). */
import type { Api } from "../core/api";

type Bridge = {
  call: (m: string, a: unknown[]) => Promise<{ ok: boolean; value?: unknown; error?: string }>;
  openFiles: (o: unknown) => Promise<string[]>;
  saveFile: (o: unknown) => Promise<string | null>;
  showItem: (p: string) => Promise<void>;
  openExternal: (u: string) => Promise<void>;
  paths: () => Promise<{ db: string; documents: string; mcpServer: string }>;
  setZoom?: (factor: number) => void;
};
declare global { interface Window { patrimoine?: Bridge } }

const bridge = window.patrimoine;
export const isElectron = !!bridge;

async function call(method: string, args: unknown[]): Promise<unknown> {
  const r = bridge
    ? await bridge.call(method, args)
    : await fetch(`/__api/${method}`, { method: "POST", body: JSON.stringify(args) }).then((x) => x.json());
  if (!r.ok) throw new Error(r.error ?? "Erreur inconnue");
  return r.value;
}

type Promisify<T> = { [K in keyof T]: T[K] extends (...a: infer A) => infer R ? (...a: A) => Promise<Awaited<R>> : never };

/** `api.budget(2026)` → appel IPC typé. */
export const api = new Proxy({}, { get: (_t, method: string) => (...args: unknown[]) => call(method, args) }) as Promisify<Api>;

export const files = {
  async open(opts: { title?: string; filters?: { name: string; extensions: string[] }[]; multi?: boolean }): Promise<string[]> {
    if (bridge) return bridge.openFiles(opts);
    const p = window.prompt("Chemin du fichier (mode navigateur) :");
    return p ? [p] : [];
  },
  async save(opts: { title?: string; defaultPath?: string; filters?: { name: string; extensions: string[] }[] }): Promise<string | null> {
    if (bridge) return bridge.saveFile(opts);
    return window.prompt("Chemin du fichier à créer (mode navigateur) :", opts.defaultPath ?? "");
  },
  showItem: (p: string) => bridge?.showItem(p),
  openExternal: (u: string) => (bridge ? bridge.openExternal(u) : window.open(u, "_blank")),
  paths: () => (bridge ? bridge.paths() : fetch("/__api/__paths").then((r) => r.json())),
};
