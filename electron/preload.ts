/** Pont sécurisé entre la page (Vue) et le processus principal. */
import { contextBridge, ipcRenderer, webFrame } from "electron";

contextBridge.exposeInMainWorld("patrimoine", {
  call: (method: string, args: unknown[]) => ipcRenderer.invoke("api", method, args),
  openFiles: (opts: unknown) => ipcRenderer.invoke("dialog:open", opts),
  saveFile: (opts: unknown) => ipcRenderer.invoke("dialog:save", opts),
  showItem: (p: string) => ipcRenderer.invoke("shell:showItem", p),
  openExternal: (url: string) => ipcRenderer.invoke("shell:openExternal", url),
  paths: () => ipcRenderer.invoke("app:paths"),
  setZoom: (factor: number) => webFrame.setZoomFactor(factor),
  update: {
    state: () => ipcRenderer.invoke("update:state"),
    check: () => ipcRenderer.invoke("update:check"),
    install: () => ipcRenderer.invoke("update:install"),
    onState: (cb: (s: unknown) => void) => { ipcRenderer.on("update:state", (_e, s) => cb(s)); },
  },
});
