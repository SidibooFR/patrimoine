/** Mises à jour automatiques depuis les releases GitHub (electron-updater, installeur NSIS). */
import { app, BrowserWindow, ipcMain, shell } from "electron";
import { autoUpdater } from "electron-updater";

export type UpdateState =
  | { status: "unsupported"; reason: string }
  | { status: "idle" | "checking" | "none" }
  | { status: "available" | "downloading"; version: string; percent?: number }
  | { status: "downloaded"; version: string }
  | { status: "portable"; version: string }
  | { status: "error"; message: string };

const RELEASES_URL = "https://github.com/SidibooFR/patrimoine/releases/latest";
const CHECK_EVERY_MS = 6 * 3600_000;

let state: UpdateState = { status: "idle" };

function set(s: UpdateState) {
  state = s;
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send("update:state", state);
}

/** La version portable ne peut pas se remplacer elle-même : on signale seulement la nouvelle version. */
const isPortable = () => !!process.env.PORTABLE_EXECUTABLE_FILE;

async function check() {
  if (state.status === "unsupported" || state.status === "downloading" || state.status === "downloaded") return state;
  try {
    await autoUpdater.checkForUpdates();
  } catch (e) {
    set({ status: "error", message: (e as Error).message ?? String(e) });
  }
  return state;
}

export function setupUpdater() {
  ipcMain.handle("update:state", () => state);
  ipcMain.handle("update:check", () => check());
  ipcMain.handle("update:install", () => {
    if (state.status === "downloaded") setImmediate(() => autoUpdater.quitAndInstall(false, true));
    else if (state.status === "portable") shell.openExternal(RELEASES_URL);
  });

  if (!app.isPackaged) { state = { status: "unsupported", reason: "Mode développement" }; return; }
  if (process.platform !== "win32") { state = { status: "unsupported", reason: "Mises à jour automatiques disponibles sous Windows uniquement" }; return; }

  autoUpdater.autoDownload = !isPortable();
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on("checking-for-update", () => set({ status: "checking" }));
  autoUpdater.on("update-not-available", () => set({ status: "none" }));
  autoUpdater.on("update-available", (i) => set(isPortable() ? { status: "portable", version: i.version } : { status: "available", version: i.version }));
  autoUpdater.on("download-progress", (p) => set({ status: "downloading", version: "version" in state ? state.version : "", percent: Math.round(p.percent) }));
  autoUpdater.on("update-downloaded", (i) => set({ status: "downloaded", version: i.version }));
  autoUpdater.on("error", (e) => set({ status: "error", message: e?.message ?? String(e) }));

  setTimeout(check, 5000);
  setInterval(check, CHECK_EVERY_MS);
}
