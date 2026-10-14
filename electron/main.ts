/** Processus principal Electron : fenêtre, base de données, pont IPC vers l'API métier. */
import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from "electron";
import path from "node:path";
import { Store, defaultDbPath } from "../core/db.js";
import { createApi, type Api } from "../core/api.js";

let api: Api;
let store: Store;

async function createWindow() {
  const win = new BrowserWindow({
    width: 1380, height: 880, minWidth: 1024, minHeight: 640,
    title: "Patrimoine",
    backgroundColor: "#f4f6fa",
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
  if (process.env.VITE_DEV_SERVER_URL) {
    await win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    await win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.whenReady().then(async () => {
  store = await Store.open(defaultDbPath());
  api = createApi(store);

  ipcMain.handle("api", async (_e, method: string, args: unknown[]) => {
    const fn = (api as any)[method];
    if (typeof fn !== "function") throw new Error(`Méthode inconnue : ${method}`);
    try {
      return { ok: true, value: await fn.apply(api, args ?? []) };
    } catch (e) {
      return { ok: false, error: (e as Error).message ?? String(e) };
    }
  });
  ipcMain.handle("dialog:open", async (_e, opts: { title?: string; filters?: { name: string; extensions: string[] }[]; multi?: boolean }) => {
    const r = await dialog.showOpenDialog({ title: opts.title, filters: opts.filters, properties: opts.multi ? ["openFile", "multiSelections"] : ["openFile"] });
    return r.canceled ? [] : r.filePaths;
  });
  ipcMain.handle("dialog:save", async (_e, opts: { title?: string; defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => {
    const r = await dialog.showSaveDialog({ title: opts.title, defaultPath: opts.defaultPath, filters: opts.filters });
    return r.canceled ? null : r.filePath;
  });
  ipcMain.handle("shell:showItem", (_e, p: string) => shell.showItemInFolder(p));
  ipcMain.handle("shell:openExternal", (_e, url: string) => { if (/^https?:\/\//.test(url)) shell.openExternal(url); });
  ipcMain.handle("app:paths", () => ({ db: store.file, documents: app.getPath("documents"), mcpServer: path.join(app.isPackaged ? process.resourcesPath : path.join(__dirname, ".."), app.isPackaged ? "mcp" : "dist-mcp", "server.cjs") }));

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: "Fichier", submenu: [{ role: "reload", label: "Recharger" }, { type: "separator" }, { role: "quit", label: "Quitter" }] },
    { label: "Édition", submenu: [{ role: "undo", label: "Annuler" }, { role: "redo", label: "Rétablir" }, { type: "separator" }, { role: "cut", label: "Couper" }, { role: "copy", label: "Copier" }, { role: "paste", label: "Coller" }, { role: "selectAll", label: "Tout sélectionner" }] },
    { label: "Affichage", submenu: [{ role: "zoomIn", label: "Zoom +" }, { role: "zoomOut", label: "Zoom −" }, { role: "resetZoom", label: "Zoom normal" }, { type: "separator" }, { role: "togglefullscreen", label: "Plein écran" }, { role: "toggleDevTools", label: "Outils de développement" }] },
  ]));

  await createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
