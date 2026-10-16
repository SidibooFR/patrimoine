/** État des mises à jour de l'application, partagé entre la barre latérale et les paramètres. */
import { ref } from "vue";
import type { UpdateState } from "../../electron/updater";

const bridge = window.patrimoine?.update;
export const update = ref<UpdateState>(bridge ? { status: "idle" } : { status: "unsupported", reason: "Mode navigateur" });

if (bridge) {
  bridge.onState((s) => (update.value = s));
  bridge.state().then((s) => (update.value = s));
}

export async function checkUpdate() { if (bridge) update.value = await bridge.check(); }
export const installUpdate = () => bridge?.install();

export function describe(s: UpdateState): string {
  switch (s.status) {
    case "unsupported": return s.reason;
    case "idle": return "Pas encore vérifié";
    case "checking": return "Recherche de mises à jour…";
    case "none": return "L'application est à jour";
    case "available": return `Version ${s.version} disponible, téléchargement…`;
    case "downloading": return `Téléchargement de la version ${s.version}… ${s.percent ?? 0} %`;
    case "downloaded": return `Version ${s.version} prête à être installée`;
    case "portable": return `Version ${s.version} disponible (version portable : à télécharger manuellement)`;
    case "error": return `Erreur : ${s.message}`;
  }
}
