<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { eur, monthLong, todayIso, thisMonth } from "../../lib/format";
import { calendarMonth } from "../../../core/calendar";
import type { Recurring } from "../../../core/recurring";

const props = defineProps<{ items: Recurring[] }>();

const ym = ref(thisMonth());
const today = todayIso();
const days = computed(() => calendarMonth(props.items, ym.value));
const total = computed(() => Object.values(days.value).flat().reduce((s, e) => s + e.amount, 0));

/** Cases du mois, semaine commençant le lundi (null : case vide avant le 1er). */
const cells = computed(() => {
  const [y, m] = ym.value.split("-").map(Number);
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [...Array(lead).fill(null), ...Array.from({ length: n }, (_, i) => `${ym.value}-${String(i + 1).padStart(2, "0")}`)] as (string | null)[];
});
function shift(k: number) {
  const [y, m] = ym.value.split("-").map(Number);
  ym.value = new Date(Date.UTC(y, m - 1 + k, 1)).toISOString().slice(0, 7);
}

const MAX = 2;
const freq = (f: string) => ({ hebdomadaire: "hebdo", mensuel: "mensuel", bimestriel: "tous les 2 mois", trimestriel: "trimestriel", semestriel: "semestriel", annuel: "annuel" } as Record<string, string>)[f] ?? f;
const longDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

// Popover natif : fermeture au clic à côté et à Échap gérée par le navigateur
const pop = ref<HTMLElement>();
const day = ref<string | null>(null);
const dayEntries = computed(() => (day.value ? days.value[day.value] ?? [] : []));
async function openDay(d: string, ev: MouseEvent) {
  if (!days.value[d]) return;
  day.value = d;
  await nextTick();
  const el = pop.value!, r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
  el.showPopover();
  // Calcul en pixels écran, puis ramené à l'échelle de l'interface (zoom CSS sur <html>, cf. appearance.ts)
  const z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
  const { width: w, height: h } = el.getBoundingClientRect();
  el.style.left = `${Math.max(8, Math.min(r.left, innerWidth - w - 8)) / z}px`;
  el.style.top = `${(r.bottom + 6 + h > innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6) / z}px`;
}
</script>

<template>
  <div class="card">
    <div class="card-title">
      <div class="row-actions"><md-icon-button aria-label="Mois précédent" title="Mois précédent" @click="shift(-1)">‹</md-icon-button><h3 class="cal-month">{{ monthLong(ym) }}</h3><md-icon-button aria-label="Mois suivant" title="Mois suivant" @click="shift(1)">›</md-icon-button></div>
      <span class="help">Total du mois : <b>{{ eur(total) }}</b></span>
    </div>
    <div class="cal">
      <div v-for="h in ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']" :key="h" class="cal-h">{{ h }}</div>
      <template v-for="(d, i) in cells" :key="d ?? 'v' + i">
        <div v-if="!d" />
        <div v-else class="cal-day" :class="{ past: d < today, today: d === today, clickable: !!days[d] }" @click="openDay(d, $event)">
          <div class="cal-n">{{ Number(d.slice(8)) }}</div>
          <span v-for="(e, j) in (days[d] ?? []).slice(0, MAX)" :key="j" class="cal-chip" :title="`${e.label} · ${eur(e.amount)}`">{{ e.label }} · {{ eur(e.amount) }}</span>
          <span v-if="(days[d]?.length ?? 0) > MAX" class="help">+{{ days[d].length - MAX }} autre{{ days[d].length - MAX > 1 ? "s" : "" }}</span>
        </div>
      </template>
    </div>
    <p class="help mt-1">Jours passés : paiements réellement détectés. Jours à venir : prélèvements prévus d'après la périodicité et le dernier montant.</p>

    <div ref="pop" popover class="cal-pop">
      <template v-if="day">
        <b>{{ longDate(day) }}</b> · {{ dayEntries.length }} abonnement{{ dayEntries.length > 1 ? "s" : "" }}
        <table>
          <tr v-for="(e, j) in dayEntries" :key="j">
            <td>{{ e.label }} <span v-if="e.paid" class="tag ok">payé</span><div class="help">{{ e.account }} · {{ freq(e.frequency) }}</div></td>
            <td class="num">{{ eur(e.amount) }}</td>
          </tr>
          <tr v-if="dayEntries.length > 1"><td><b>Total</b></td><td class="num"><b>{{ eur(dayEntries.reduce((s, e) => s + e.amount, 0)) }}</b></td></tr>
        </table>
      </template>
    </div>
  </div>
</template>
