<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { api } from "../lib/api";
import { eur, eur0, pct, date, monthLong, todayIso, thisMonth } from "../lib/format";
import { guard } from "../lib/toast";
import { PALETTE } from "../lib/charts";
import Modal from "../components/Modal.vue";
import PageHeader from "../components/PageHeader.vue";
import { calendarMonth, projectedDates } from "../../core/calendar";
import type { RecurringReport, Recurring } from "../../core/recurring";

const rep = ref<RecurringReport>();
const mode = ref<"echeancier" | "categories">("echeancier");
const all = ref(false);
async function load() { rep.value = await guard(() => api.recurring()); }
onMounted(load);

const today = todayIso();
const DAY = 86_400_000;
const addDays = (d: string, n: number) => new Date(Date.parse(d) + n * DAY).toISOString().slice(0, 10);
const short = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const freq = (f: string) => ({ hebdomadaire: "Hebdo", mensuel: "Mensuel", bimestriel: "Tous les 2 mois", trimestriel: "Trimestriel", semestriel: "Semestriel", annuel: "Annuel" } as Record<string, string>)[f] ?? f;
const freqTxt = (i: Recurring) => i.frequency === "mensuel" ? `Mensuel · le ${Number(i.last.slice(8))}` : i.frequency === "annuel" ? `Annuel · ${short(i.next)}` : freq(i.frequency);
const plural = (n: number, w: string) => `${n} ${w}${n > 1 ? "s" : ""}`;

const items = computed(() => rep.value?.items ?? []);
const counted = computed(() => items.value.filter((i) => i.active && i.status !== "ignored"));
const review = computed(() => counted.value.filter((i) => i.status === "auto"));
const cat = (i: Recurring) => i.category ?? "Sans catégorie";
const cats = computed(() => [...new Set(items.value.map(cat))]);
const color = (c: string) => PALETTE[cats.value.indexOf(c) % PALETTE.length];
function tag(i: Recurring): [string, string] | null {
  if (!i.active) return ["Arrêté ?", "warn"];
  if (i.status === "ignored") return ["Ignoré", "off"];
  if (i.change?.kind === "hausse") return [`▲ ${pct(i.change.pct, 0)}`, "neg"];
  if (i.status === "auto") return ["À confirmer", ""];
  return null;
}

// ---- Échéancier : mois en cours
const monthEntries = computed(() => Object.values(calendarMonth(items.value, thisMonth())).flat());
const paidAmt = computed(() => monthEntries.value.filter((e) => e.paid).reduce((s, e) => s + e.amount, 0));
const rest = computed(() => monthEntries.value.filter((e) => !e.paid));
const restAmt = computed(() => rest.value.reduce((s, e) => s + e.amount, 0));
const monthEnd = (() => { const [y, m] = thisMonth().split("-").map(Number); return new Date(y, m, 0).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }); })();

// ---- Les 30 prochains jours, par semaine
const upcoming = computed(() => counted.value
  .flatMap((i) => projectedDates(i.last, i.frequency, today, addDays(today, 30)).map((d) => ({ i, d })))
  .sort((a, b) => a.d.localeCompare(b.d)));
const weeks = computed(() => {
  const w: Record<number, { i: Recurring; d: string }[]> = {};
  for (const u of upcoming.value) (w[Math.floor((Date.parse(u.d) - Date.parse(today)) / DAY / 7)] ??= []).push(u);
  return Object.entries(w).map(([k, rows]) => ({
    label: k === "0" ? "Cette semaine" : k === "1" ? "Semaine prochaine" : `Semaine du ${short(addDays(today, 7 * Number(k)))}`,
    total: rows.reduce((s, r) => s + r.i.lastAmount, 0), rows,
  }));
});
const weekday = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short" });

// ---- Mini-calendrier
const ym = ref(thisMonth());
const sel = ref<string | null>(null);
const calDays = computed(() => calendarMonth(items.value, ym.value));
const cells = computed(() => {
  const [y, m] = ym.value.split("-").map(Number);
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [...Array(lead).fill(null), ...Array.from({ length: n }, (_, i) => `${ym.value}-${String(i + 1).padStart(2, "0")}`)] as (string | null)[];
});
function shift(k: number) {
  const [y, m] = ym.value.split("-").map(Number);
  ym.value = new Date(Date.UTC(y, m - 1 + k, 1)).toISOString().slice(0, 7);
  sel.value = null;
}
const dayTotal = (d: string) => (calDays.value[d] ?? []).reduce((s, e) => s + e.amount, 0);
const selEntries = computed(() => (sel.value ? calDays.value[sel.value] ?? [] : []));

// ---- Prélèvements annuels
const annuals = computed(() => counted.value.filter((i) => i.frequency === "annuel").sort((a, b) => a.next.localeCompare(b.next)));
const provision = computed(() => annuals.value.reduce((s, i) => s + i.lastAmount / 12, 0));

// ---- Par catégorie
const groups = computed(() => {
  const shown = items.value.filter((i) => all.value || counted.value.includes(i));
  return [...new Set(shown.map(cat))].map((c) => {
    const rows = shown.filter((i) => cat(i) === c).sort((a, b) => Number(counted.value.includes(b)) - Number(counted.value.includes(a)) || b.annual - a.annual);
    return { name: c, color: color(c), monthly: rows.filter((i) => counted.value.includes(i)).reduce((s, i) => s + i.monthly, 0), rows };
  }).sort((a, b) => b.monthly - a.monthly);
});

// ---- Fiche détail
const openKey = ref<string | null>(null);
const it = computed(() => items.value.find((i) => i.key === openKey.value));
const hist = computed(() => it.value?.occurrences.slice(-6) ?? []);
const histMax = computed(() => Math.max(...hist.value.map((o) => o.amount)));
const note = computed((): [string, string] | null => {
  const i = it.value;
  if (!i) return null;
  if (!i.active) return [`Aucun prélèvement depuis le ${short(i.last)} : plus d'une période et demie sans paiement.`, "warn"];
  if (i.change?.kind === "hausse") return [`Hausse de ${pct(i.change.pct, 0)} depuis le ${short(i.change.since)}, soit +${eur0((i.change.to - i.change.from) * i.perYear)} par an.`, "err"];
  if (i.status === "auto") return ["Détecté automatiquement. Confirme qu'il s'agit bien d'un abonnement.", ""];
  if (i.status === "ignored") return ["Ignoré : exclu des totaux.", "off"];
  return null;
});

async function setStatus(i: Recurring, status: "auto" | "confirmed" | "ignored") {
  await guard(() => api.setRecurringStatus(i.key, status, i.label !== i.autoLabel ? i.label : undefined));
  await load();
}
const draft = ref<string | null>(null);
async function saveRename() {
  const i = it.value!;
  await guard(() => api.setRecurringStatus(i.key, i.status === "ignored" ? "ignored" : "confirmed", draft.value!.trim() || undefined), "Renommé");
  draft.value = null; await load();
}
function openItem(key: string) { openKey.value = key; draft.value = null; }
</script>

<template>
  <PageHeader title="Abonnements & charges fixes" :sub="rep ? `${plural(rep.totals.count, 'prélèvement')} récurrent${rep.totals.count > 1 ? 's' : ''} détecté${rep.totals.count > 1 ? 's' : ''} dans tes relevés${rep.since ? ` depuis le ${date(rep.since)}` : ''}.` : ''">
    <div v-if="mode === 'categories'" class="seg"><button :class="{ on: !all }" @click="all = false">En cours</button><button :class="{ on: all }" @click="all = true">Tout (arrêtés, ignorés)</button></div>
    <div class="seg"><button :class="{ on: mode === 'echeancier' }" @click="mode = 'echeancier'">Échéancier</button><button :class="{ on: mode === 'categories' }" @click="mode = 'categories'">Par catégorie</button></div>
  </PageHeader>

  <template v-if="rep">
    <div v-if="!items.length" class="card empty">Aucune charge récurrente détectée. Il faut au moins deux paiements identiques à un mois d'écart.</div>

    <!-- Échéancier -->
    <div v-else-if="mode === 'echeancier'" class="rec-stack">
      <div class="card">
        <p class="rec-lead">Encore <span class="rec-hl">{{ plural(rest.length, "prélèvement") }}</span> d'ici le {{ monthEnd }}, pour {{ eur(restAmt) }}.</p>
        <div class="rec-bar"><div :style="{ width: (paidAmt + restAmt ? paidAmt / (paidAmt + restAmt) * 100 : 0) + '%' }"></div></div>
        <div class="rec-split help"><span><b>{{ eur(paidAmt) }}</b> déjà prélevés en {{ monthLong(thisMonth()).split(" ")[0] }}</span><span>{{ eur(paidAmt + restAmt) }} au total sur le mois</span></div>
      </div>
      <div class="rec-cols">
        <div class="card rec-list">
          <div class="rec-h"><h2>Les 30 prochains jours</h2><span class="help">{{ eur(upcoming.reduce((s, u) => s + u.i.lastAmount, 0)) }} au total</span></div>
          <div v-if="!weeks.length" class="help rec-pad">Aucun prélèvement prévu.</div>
          <div v-for="w in weeks" :key="w.label" class="rec-week">
            <div class="rec-week-h help"><b>{{ w.label }}</b><span>{{ eur(w.total) }}</span></div>
            <div v-for="r in w.rows" :key="r.i.key + r.d" class="rec-row rec-due" @click="openItem(r.i.key)">
              <div class="rec-date" :class="{ today: r.d === today }"><b>{{ Number(r.d.slice(8)) }}</b><span>{{ weekday(r.d) }}</span></div>
              <div class="rec-min"><div class="rec-name"><span class="ellipsis">{{ r.i.label }}</span><span v-if="r.i.frequency === 'annuel'" class="tag warn">Annuel</span></div><div class="help ellipsis">{{ r.i.account }}{{ r.i.frequency === "annuel" ? "" : ` · ${freq(r.i.frequency).toLowerCase()}` }}</div></div>
              <b class="num">{{ eur(r.i.lastAmount) }}</b>
            </div>
          </div>
        </div>
        <div class="rec-stack">
          <div v-if="review.length" class="card">
            <div class="rec-h"><h2>À confirmer</h2><span class="help">{{ plural(review.length, "prélèvement") }} détecté{{ review.length > 1 ? "s" : "" }} automatiquement, pas encore validé{{ review.length > 1 ? "s" : "" }}</span></div>
            <div v-for="i in review" :key="i.key" class="rec-review">
              <div class="rec-min" style="flex:1 1 160px"><b>{{ i.label }}</b><div class="help">{{ cat(i) }} · {{ freqTxt(i) }} · {{ i.account }}</div></div>
              <b class="num">{{ eur(i.lastAmount) }}</b>
              <div class="row-actions"><md-outlined-button class="small" @click="setStatus(i, 'ignored')">Pas un abonnement</md-outlined-button><md-filled-button class="small" @click="setStatus(i, 'confirmed')"><i slot="icon" class="fa-solid fa-check" aria-hidden="true"></i>Confirmer</md-filled-button></div>
            </div>
          </div>
          <div class="card">
            <div class="rec-cal-h"><md-icon-button aria-label="Mois précédent" title="Mois précédent" @click="shift(-1)"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></md-icon-button><h2 class="cal-month">{{ monthLong(ym) }}</h2><md-icon-button aria-label="Mois suivant" title="Mois suivant" @click="shift(1)"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></md-icon-button></div>
            <div class="rec-cal">
              <span v-for="(h, k) in ['L', 'M', 'M', 'J', 'V', 'S', 'D']" :key="k" class="help">{{ h }}</span>
              <template v-for="(d, k) in cells" :key="d ?? 'v' + k">
                <div v-if="!d" />
                <div v-else class="rec-cell" :class="{ has: !!calDays[d], past: d < today, today: d === today, sel: d === sel }" @click="calDays[d] && (sel = d)">
                  <span>{{ Number(d.slice(8)) }}</span><small>{{ calDays[d] ? eur0(dayTotal(d)) : "" }}</small>
                </div>
              </template>
            </div>
            <div class="rec-day">
              <div class="help">{{ sel ? `${Number(sel.slice(8))} ${monthLong(ym).split(" ")[0]} · ${plural(selEntries.length, "prélèvement")}` : "Clique sur un jour pour voir le détail." }}</div>
              <div v-for="(e, k) in selEntries" :key="k" class="rec-day-row" @click="openItem(e.key)"><span>{{ e.label }} <span v-if="e.paid" class="tag ok">payé</span></span><b>{{ eur(e.amount) }}</b></div>
            </div>
          </div>
          <div v-if="annuals.length" class="card">
            <h2 style="margin-bottom:4px">Prélèvements annuels</h2>
            <p class="help" style="margin:0 0 12px">Mettre de côté <b>{{ eur(provision) }} par mois</b> pour ne pas être surpris.</p>
            <div v-for="i in annuals" :key="i.key" class="rec-annual" @click="openItem(i.key)">
              <b>{{ i.label }}</b><b class="num">{{ eur(i.lastAmount) }}</b>
              <span class="help">Prochain le {{ date(i.next) }}</span><span class="help num">{{ eur(i.lastAmount / 12) }} / mois</span>
            </div>
          </div>
        </div>
      </div>
      <p class="help">Catégories exclues de la détection (dépenses variables) : {{ rep.excludedCategories.join(", ") || "aucune" }}. Modifiable dans Paramètres.</p>
    </div>

    <!-- Par catégorie -->
    <div v-else class="rec-stack">
      <p class="rec-lead">Tes charges fixes coûtent <span class="rec-hl">{{ eur(rep.totals.monthly) }} par mois</span>, soit {{ eur0(rep.totals.annual) }} sur un an.</p>
      <div v-for="i in rep.increases" :key="'inc' + i.key" class="note warn rec-inc">
        <i class="fa-solid fa-arrow-trend-up" aria-hidden="true"></i>
        <span style="flex:1 1 300px"><b>{{ i.label }}</b> est passé de {{ eur(i.change!.from) }} à {{ eur(i.change!.to) }} (+{{ pct(i.change!.pct, 0) }}) depuis le {{ short(i.change!.since) }}, soit <b>+{{ eur0((i.change!.to - i.change!.from) * i.perYear) }} par an</b>.</span>
        <md-outlined-button class="small" @click="openItem(i.key)">Voir le détail</md-outlined-button>
      </div>
      <div v-if="review.length" class="card">
        <div class="rec-h"><h2>À confirmer</h2><span class="help">{{ plural(review.length, "prélèvement") }} détecté{{ review.length > 1 ? "s" : "" }} automatiquement, pas encore validé{{ review.length > 1 ? "s" : "" }}</span></div>
        <div v-for="i in review" :key="i.key" class="rec-review">
          <div class="rec-min" style="flex:1 1 220px"><b>{{ i.label }}</b><div class="help">{{ cat(i) }} · {{ freqTxt(i) }} · {{ i.account }}</div></div>
          <b class="num">{{ eur(i.lastAmount) }}</b>
          <div class="row-actions"><md-outlined-button class="small" @click="setStatus(i, 'ignored')">Pas un abonnement</md-outlined-button><md-filled-button class="small" @click="setStatus(i, 'confirmed')"><i slot="icon" class="fa-solid fa-check" aria-hidden="true"></i>Confirmer</md-filled-button></div>
        </div>
      </div>
      <div class="rec-groups">
        <div v-for="g in groups" :key="g.name" class="card rec-list">
          <div class="rec-gh"><span class="rec-dot" :style="{ background: g.color }"></span><h2 class="ellipsis">{{ g.name }}</h2><b class="num">{{ eur(g.monthly) }}</b><span class="help">/ mois</span></div>
          <div v-for="i in g.rows" :key="i.key" class="rec-row rec-item" :class="{ off: !counted.includes(i) }" @click="openItem(i.key)">
            <div class="rec-name"><span class="ellipsis">{{ i.label }}</span><span v-if="tag(i)" class="tag" :class="tag(i)![1]">{{ tag(i)![0] }}</span></div>
            <b class="num">{{ eur(i.lastAmount) }}</b>
            <span class="help ellipsis">{{ i.active ? `${freqTxt(i)} · prochain ${short(i.next)}` : `Dernier paiement ${short(i.last)}` }}</span>
            <span class="help num">{{ eur0(i.annual) }} / an</span>
          </div>
        </div>
      </div>
    </div>
  </template>

  <Modal v-if="it" :title="it.label" @close="openKey = null">
    <p class="help" style="margin:0 0 12px">{{ cat(it) }} · {{ freq(it.frequency) }} · {{ it.account }}</p>
    <div v-if="draft !== null" class="row-actions mb-2"><md-outlined-text-field v-model="draft" label="Nom affiché" :placeholder="it.autoLabel" style="flex:1" @keyup.enter="saveRename"></md-outlined-text-field><md-filled-button @click="saveRename">OK</md-filled-button></div>
    <div v-if="note" class="note mb-2" :class="note[1]">{{ note[0] }}</div>
    <div class="rec-stats mb-2">
      <div><span class="help">Montant</span><b>{{ eur(it.lastAmount) }}</b></div>
      <div><span class="help">Par an</span><b>{{ eur0(it.annual) }}</b></div>
      <div><span class="help">{{ it.active ? "Prochain" : "Dernier" }}</span><b>{{ short(it.active ? it.next : it.last) }}</b></div>
    </div>
    <h2 style="font-size:14px;margin-bottom:10px">Paiements détectés</h2>
    <div class="rec-hist">
      <div v-for="(o, k) in hist" :key="o.id"><span class="help">{{ eur(o.amount) }}</span><div :class="{ up: it.change?.kind === 'hausse' && o.amount > it.change.from, last: k === hist.length - 1 }" :style="{ height: Math.max(4, o.amount / histMax * 80) + 'px' }"></div><span class="help">{{ short(o.date) }}</span></div>
    </div>
    <p class="help">Libellé bancaire : {{ it.occurrences[it.occurrences.length - 1].label }}</p>
    <template #foot>
      <md-text-button v-if="draft === null" @click="draft = it.label"><i slot="icon" class="fa-solid fa-pen" aria-hidden="true"></i>Renommer</md-text-button>
      <span style="flex:1"></span>
      <md-text-button v-if="it.status !== 'auto'" @click="setStatus(it, 'auto')">Annuler ma décision</md-text-button>
      <md-outlined-button v-if="it.status !== 'ignored'" @click="setStatus(it, 'ignored')">Pas un abonnement</md-outlined-button>
      <md-filled-button v-if="it.status !== 'confirmed'" @click="setStatus(it, 'confirmed')"><i slot="icon" class="fa-solid fa-check" aria-hidden="true"></i>Confirmer</md-filled-button>
      <md-filled-button v-else @click="openKey = null">Fermer</md-filled-button>
    </template>
  </Modal>
</template>
