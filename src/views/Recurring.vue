<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { api } from "../api";
import { eur, eur0, pct, date } from "../format";
import { guard } from "../toast";
import Modal from "../components/Modal.vue";
import type { RecurringReport, Recurring } from "../../core/recurring";

const rep = ref<RecurringReport>();
const show = ref<"actifs" | "tous">("actifs");
const open = ref<string | null>(null);
async function load() { rep.value = await guard(() => api.recurring()); }
onMounted(load);

const rows = computed(() => (rep.value?.items ?? []).filter((i) => show.value === "tous" || (i.active && i.status !== "ignored")));
const maxCat = computed(() => Math.max(1, ...(rep.value?.byCategory ?? []).map((c) => c.monthly)));

async function setStatus(i: Recurring, status: "auto" | "confirmed" | "ignored") {
  await guard(() => api.setRecurringStatus(i.key, status, i.label !== i.autoLabel ? i.label : undefined));
  await load();
}
const rename = ref<{ item: Recurring; label: string } | null>(null);
async function saveRename() {
  const r = rename.value!;
  await guard(() => api.setRecurringStatus(r.item.key, r.item.status === "ignored" ? "ignored" : "confirmed", r.label.trim() || undefined), "Renommé");
  rename.value = null; await load();
}
const freq = (f: string) => ({ hebdomadaire: "Hebdo", mensuel: "Mensuel", bimestriel: "Tous les 2 mois", trimestriel: "Trimestriel", semestriel: "Semestriel", annuel: "Annuel" } as Record<string, string>)[f] ?? f;
</script>

<template>
  <div class="page-head">
    <div><h1>Abonnements &amp; charges fixes</h1><p class="sub">Détectés automatiquement dans tes relevés : ce qui revient chaque semaine, mois ou année, ce que ça coûte sur un an, et les hausses de prix.</p></div>
    <div class="actions"><div class="seg"><button :class="{ on: show === 'actifs' }" @click="show = 'actifs'">En cours</button><button :class="{ on: show === 'tous' }" @click="show = 'tous'">Tout (arrêtés, ignorés)</button></div></div>
  </div>

  <template v-if="rep">
    <div class="grid c4" style="margin-bottom:16px">
      <div class="card kpi"><span class="label">Charges fixes par mois</span><span class="value">{{ eur(rep.totals.monthly) }}</span><span class="hint">{{ rep.totals.count }} prélèvement(s) récurrent(s) en cours</span></div>
      <div class="card kpi"><span class="label">Sur un an</span><span class="value">{{ eur0(rep.totals.annual) }}</span></div>
      <div class="card kpi"><span class="label">Hausses de prix récentes</span><span class="value" :class="rep.increases.length ? 'warn' : 'pos'">{{ rep.increases.length || "Aucune" }}</span><span class="hint">sur les 90 derniers jours</span></div>
      <div class="card kpi"><span class="label">Historique analysé</span><span class="value small">depuis le {{ date(rep.since) }}</span><span class="hint">Plus l'historique est long, plus la détection est sûre (abonnements annuels compris).</span></div>
    </div>

    <div v-for="i in rep.increases" :key="'inc' + i.key" class="note warn" style="margin-bottom:8px">
      ⚠ <b>{{ i.label }}</b> est passé de {{ eur(i.change!.from) }} à {{ eur(i.change!.to) }} (+{{ pct(i.change!.pct, 0) }}) depuis le {{ date(i.change!.since) }}, soit <b>+{{ eur((i.change!.to - i.change!.from) * i.perYear) }} par an</b>. Vérifie ton offre ou résilie si tu ne t'en sers plus.
    </div>

    <div class="grid" style="grid-template-columns: minmax(0, 1fr) 260px; margin-top:8px">
      <div class="card pad0">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Libellé</th><th>Catégorie</th><th>Fréquence</th><th class="num">Montant</th><th class="num">Par an</th><th>Dernier</th><th>Prochain</th></tr></thead>
            <tbody>
              <template v-for="i in rows" :key="i.key">
                <tr class="clickable" :class="{ muted: !i.active || i.status === 'ignored' }" @click="open = open === i.key ? null : i.key">
                  <td style="max-width:230px"><b style="white-space:nowrap">{{ i.label }}</b> <span v-if="i.status === 'confirmed'" class="tag ok" title="Confirmé">✓</span><span v-if="i.status === 'ignored'" class="tag">ignoré</span><span v-if="!i.active" class="tag warn" title="Plus de prélèvement depuis plus d'une période et demie">arrêté ?</span><div class="help ellipsis" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ i.account }} · {{ i.count }} paiements</div></td>
                  <td class="muted ellipsis" style="max-width:120px" :title="i.category ?? ''">{{ i.category ?? "–" }}</td>
                  <td style="white-space:nowrap">{{ freq(i.frequency) }}</td>
                  <td class="num">{{ eur(i.lastAmount) }}<div v-if="i.change" class="tag" :class="i.change.kind === 'hausse' ? 'neg' : 'ok'" style="margin-top:2px">{{ i.change.kind === "hausse" ? "▲" : "▼" }} {{ pct(Math.abs(i.change.pct), 0) }}</div></td>
                  <td class="num"><b>{{ eur0(i.annual) }}</b></td>
                  <td style="white-space:nowrap">{{ date(i.last) }}</td>
                  <td style="white-space:nowrap" :class="{ muted: !i.active }">{{ i.active ? date(i.next) : "–" }}</td>
                </tr>
                <tr v-if="open === i.key"><td colspan="7" style="background:#f8fafc">
                  <div style="display:flex;gap:6px;margin-bottom:8px">
                    <button v-if="i.status !== 'confirmed'" class="small" @click="setStatus(i, 'confirmed')">✓ Confirmer</button>
                    <button v-if="i.status !== 'ignored'" class="small" @click="setStatus(i, 'ignored')">✕ Ignorer (pas un abonnement)</button>
                    <button v-if="i.status !== 'auto'" class="small" @click="setStatus(i, 'auto')">↶ Annuler ma décision</button>
                    <button class="small" @click="rename = { item: i, label: i.label }">✎ Renommer</button>
                  </div>
                  <div class="help" style="margin-bottom:4px">Paiements détectés :</div>
                  <span v-for="o in i.occurrences" :key="o.id" class="tag" style="margin:2px 6px 2px 0">{{ date(o.date) }} · {{ eur(o.amount) }}</span>
                  <div class="help" style="margin-top:6px">Libellé bancaire : {{ i.occurrences[i.occurrences.length - 1].label }}</div>
                </td></tr>
              </template>
            </tbody>
          </table>
          <div v-if="!rows.length" class="empty">Aucune charge récurrente détectée. Il faut au moins deux paiements identiques à un mois d'écart.</div>
        </div>
      </div>
      <div class="card">
        <h3>Par catégorie (par mois)</h3>
        <div v-for="c in rep.byCategory" :key="c.category" style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;font-size:13px"><span>{{ c.category }}</span><b>{{ eur(c.monthly) }}</b></div>
          <div class="progress"><span :style="{ width: (c.monthly / maxCat) * 100 + '%' }"></span></div>
          <div class="help">{{ c.count }} · {{ eur0(c.annual) }} / an</div>
        </div>
        <p class="help" style="margin-top:12px">Clique sur une ligne pour voir les paiements, confirmer, ignorer ou renommer.</p>
        <p class="help">Catégories exclues de la détection (dépenses variables) : {{ rep.excludedCategories.join(", ") || "aucune" }}. Modifiable dans Paramètres.</p>
      </div>
    </div>
  </template>

  <Modal v-if="rename" title="Renommer la charge récurrente" @close="rename = null">
    <label class="field">Nom affiché<input v-model="rename.label" :placeholder="rename.item.autoLabel" @keyup.enter="saveRename" /></label>
    <template #foot><button @click="rename = null">Annuler</button><button class="primary" @click="saveRename">Enregistrer</button></template>
  </Modal>
</template>
