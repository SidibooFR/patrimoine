<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { api } from "../lib/api";
import { eur, eur0, pct, date } from "../lib/format";
import { guard } from "../lib/toast";
import Modal from "../components/Modal.vue";
import type { RecurringReport, Recurring } from "../../core/recurring";
import KpiCard from "../components/KpiCard.vue";
import PageHeader from "../components/PageHeader.vue";
import RecurringCalendar from "./recurring/RecurringCalendar.vue";

const rep = ref<RecurringReport>();
const show = ref<"actifs" | "tous">("actifs");
const mode = ref<"liste" | "calendrier">("liste");
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
  <PageHeader title="Abonnements & charges fixes" sub="Détectés automatiquement dans tes relevés : ce qui revient chaque semaine, mois ou année, ce que ça coûte sur un an, et les hausses de prix.">
    <div class="seg"><button :class="{ on: mode === 'liste' }" @click="mode = 'liste'">Liste</button><button :class="{ on: mode === 'calendrier' }" @click="mode = 'calendrier'">Calendrier</button></div>
    <div v-if="mode === 'liste'" class="seg"><button :class="{ on: show === 'actifs' }" @click="show = 'actifs'">En cours</button><button :class="{ on: show === 'tous' }" @click="show = 'tous'">Tout (arrêtés, ignorés)</button></div>
  </PageHeader>

  <template v-if="rep">
    <div class="grid c4 mb-3">
      <KpiCard label="Charges fixes par mois" :value="eur(rep.totals.monthly)" :hint="`${rep.totals.count} prélèvement(s) récurrent(s) en cours`" card />
      <KpiCard label="Sur un an" :value="eur0(rep.totals.annual)" card />
      <KpiCard label="Hausses de prix récentes" :value="rep.increases.length || 'Aucune'" hint="sur les 90 derniers jours" :tone="rep.increases.length ? 'warn' : 'pos'" card />
      <KpiCard label="Historique analysé" :value="`depuis le ${date(rep.since)}`" hint="Plus l'historique est long, plus la détection est sûre (abonnements annuels compris)." small card />
    </div>

    <div v-for="i in rep.increases" :key="'inc' + i.key" class="note warn" style="margin-bottom:8px">
      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> <b>{{ i.label }}</b> est passé de {{ eur(i.change!.from) }} à {{ eur(i.change!.to) }} (+{{ pct(i.change!.pct, 0) }}) depuis le {{ date(i.change!.since) }}, soit <b>+{{ eur((i.change!.to - i.change!.from) * i.perYear) }} par an</b>. Vérifie ton offre ou résilie si tu ne t'en sers plus.
    </div>

    <RecurringCalendar v-if="mode === 'calendrier'" :items="rep.items" style="margin-top:8px" />
    <div v-else class="grid" style="grid-template-columns: minmax(0, 1fr) 260px; margin-top:8px">
      <div class="card pad0">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Libellé</th><th>Catégorie</th><th>Fréquence</th><th class="num">Montant</th><th class="num">Par an</th><th>Dernier</th><th>Prochain</th></tr></thead>
            <tbody>
              <template v-for="i in rows" :key="i.key">
                <tr class="clickable" :class="{ muted: !i.active || i.status === 'ignored' }" @click="open = open === i.key ? null : i.key">
                  <td style="max-width:230px"><b class="nowrap">{{ i.label }}</b> <span v-if="i.status === 'confirmed'" class="tag ok" title="Confirmé"><i class="fa-solid fa-check" aria-hidden="true"></i></span><span v-if="i.status === 'ignored'" class="tag">ignoré</span><span v-if="!i.active" class="tag warn" title="Plus de prélèvement depuis plus d'une période et demie">arrêté ?</span><div class="help ellipsis" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ i.account }} · {{ i.count }} paiements</div></td>
                  <td class="muted ellipsis" style="max-width:120px" :title="i.category ?? ''">{{ i.category ?? "–" }}</td>
                  <td class="nowrap">{{ freq(i.frequency) }}</td>
                  <td class="num">{{ eur(i.lastAmount) }}<div v-if="i.change" :class="i.change.kind === 'hausse' ? 'neg' : 'pos'" style="font-size:11px;font-weight:500;line-height:1.2;margin-top:2px"><i class="fa-solid" :class="i.change.kind === 'hausse' ? 'fa-caret-up' : 'fa-caret-down'" aria-hidden="true"></i> {{ pct(Math.abs(i.change.pct), 0) }}</div></td>
                  <td class="num"><b>{{ eur0(i.annual) }}</b></td>
                  <td class="nowrap">{{ date(i.last) }}</td>
                  <td :class="{ muted: !i.active }" class="nowrap">{{ i.active ? date(i.next) : "–" }}</td>
                </tr>
                <tr v-if="open === i.key"><td colspan="7" style="background:var(--surface-2)">
                  <div class="row-actions mb-1">
                    <md-outlined-button v-if="i.status !== 'confirmed'" class="small" @click="setStatus(i, 'confirmed')"><i slot="icon" class="fa-solid fa-check" aria-hidden="true"></i>Confirmer</md-outlined-button>
                    <md-outlined-button v-if="i.status !== 'ignored'" class="small" @click="setStatus(i, 'ignored')"><i slot="icon" class="fa-solid fa-xmark" aria-hidden="true"></i>Ignorer (pas un abonnement)</md-outlined-button>
                    <md-outlined-button v-if="i.status !== 'auto'" class="small" @click="setStatus(i, 'auto')"><i slot="icon" class="fa-solid fa-rotate-left" aria-hidden="true"></i>Annuler ma décision</md-outlined-button>
                    <md-outlined-button class="small" @click="rename = { item: i, label: i.label }"><i slot="icon" class="fa-solid fa-pen" aria-hidden="true"></i>Renommer</md-outlined-button>
                  </div>
                  <div class="help" style="margin-bottom:4px">Paiements détectés :</div>
                  <span v-for="o in i.occurrences" :key="o.id" class="tag" style="margin:2px 6px 2px 0">{{ date(o.date) }} · {{ eur(o.amount) }}</span>
                  <div class="help mt-1">Libellé bancaire : {{ i.occurrences[i.occurrences.length - 1].label }}</div>
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
          <md-linear-progress :value="c.monthly / maxCat"></md-linear-progress>
          <div class="help">{{ c.count }} · {{ eur0(c.annual) }} / an</div>
        </div>
        <p class="help mt-2">Clique sur une ligne pour voir les paiements, confirmer, ignorer ou renommer.</p>
        <p class="help">Catégories exclues de la détection (dépenses variables) : {{ rep.excludedCategories.join(", ") || "aucune" }}. Modifiable dans Paramètres.</p>
      </div>
    </div>
  </template>

  <Modal v-if="rename" title="Renommer la charge récurrente" @close="rename = null">
    <md-outlined-text-field v-model="rename.label" label="Nom affiché" :placeholder="rename.item.autoLabel" @keyup.enter="saveRename"></md-outlined-text-field>
    <template #foot><md-text-button @click="rename = null">Annuler</md-text-button><md-filled-button @click="saveRename">Enregistrer</md-filled-button></template>
  </Modal>
</template>
