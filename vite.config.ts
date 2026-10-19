import { defineConfig, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";
import os from "node:os";

/**
 * En mode `vite dev` (hors Electron), l'API métier est servie en HTTP sur /__api
 * pour développer l'interface dans un simple navigateur. La base utilisée est
 * PATRIMOINE_DB ou un fichier dans le dossier temporaire.
 */
function devApi(): Plugin {
  return {
    name: "patrimoine-dev-api",
    async configureServer(server) {
      const { Store } = await import("./core/db.js");
      const { createApi } = await import("./core/api.js");
      const store = await Store.open(process.env.PATRIMOINE_DB ?? path.join(os.tmpdir(), "patrimoine-dev.sqlite"));
      const api = createApi(store) as Record<string, (...args: unknown[]) => unknown>;
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/__api/")) return next();
        // Refuse les appels venus d'un autre site (POST « simple » sans pré-vérification CORS)
        const site = req.headers["sec-fetch-site"];
        if (site && site !== "same-origin") { res.statusCode = 403; res.end(); return; }
        const method = req.url.slice(7).split("?")[0];
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", async () => {
          res.setHeader("Content-Type", "application/json");
          try {
            if (method === "__paths") { res.end(JSON.stringify({ db: store.file, documents: os.homedir(), mcpServer: path.resolve("dist-mcp/server.cjs") })); return; }
            const args = body ? JSON.parse(body) : [];
            const value = await api[method](...args);
            res.end(JSON.stringify({ ok: true, value: value ?? null }));
          } catch (e) {
            res.end(JSON.stringify({ ok: false, error: (e as Error).message }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  // Les balises md-* sont les composants web de @material/web, pas des composants Vue.
  plugins: [vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith("md-") } } }), devApi()],
  base: "./",
  build: { outDir: "dist", emptyOutDir: true },
  server: { port: 5173, strictPort: true },
});
