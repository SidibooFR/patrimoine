import { reactive } from "vue";
export const toast = reactive({ text: "", err: false, visible: false, _t: 0 as any });
export function notify(text: string, err = false) {
  toast.text = text; toast.err = err; toast.visible = true;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (toast.visible = false), err ? 6000 : 3500);
}
export async function guard<T>(fn: () => Promise<T>, okText?: string): Promise<T | undefined> {
  try { const r = await fn(); if (okText) notify(okText); return r; } catch (e) { notify((e as Error).message, true); return undefined; }
}
