<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { api } from "../../lib/api";
import { eur0, month, pct } from "../../lib/format";
import { guard, notify } from "../../lib/toast";
import type { BudgetScenarios, ScenarioKey } from "../../../core/budgetPlan";
import Modal from "../../components/Modal.vue";

const props = defineProps<{ year: number }>();
const emit = defineEmits<{ close: []; applied: [] }>();

const data = ref<BudgetScenarios>();
const choice = ref<ScenarioKey | null>(null);
const showWhy = ref(false);
const busy = ref(false);

async function load() {
  data.value = await guard(() => api.budgetScenarios(props.year));
  if (data.value && choice.value === null) choice.value = data.value.followed;
}
onMounted(load);

const empty = computed(() => !!data.value && data.value.scenarios.every((s) => s.amounts.length === 0));
const chosen = computed(() => data.value?.scenarios.find((s) => s.key === choice.value));
const rateTone = (r: number | null) => (r === null ? "" : r >= 0.2 ? "ok" : r < 0.1 ? "warn" : "");

async function toggleCharge(name: string, checked: boolean) {
  if (!data.value) return;
  const names = data.value.fixedCandidates.filter((c) => (c.name === name ? checked : c.checked)).map((c) => c.name);
  await guard(() => api.setSetting("budget_fixed_categories", names.join("|")));
  await load();
}

/** Remplit une fois les catégories vides avec les montants du scénario (figés ensuite). */
async function applyOnce() {
  if (!choice.value) return;
  busy.value = true;
  const r = await guard(() => api.applyBudgetScenario(props.year, choice.value!));
  busy.value = false;
  if (!r) return;
  notify(`${r.filled} catégorie(s) remplie(s)` + (r.skipped ? ` (${r.skipped} déjà renseignée(s), conservée(s))` : ""));
  emit("applied");
  emit("close");
}

/** Suit le scénario : les catégories sans budget saisi prennent ses montants, recalculés avec les relevés et les objectifs. */
async function follow() {
  if (!choice.value) return;
  busy.value = true;
  const r = await guard(() => api.setBudgetScenario(choice.value!));
  busy.value = false;
  if (r === undefined) return;
  notify(`Budget automatique : scénario « ${chosen.value?.label} » suivi. Tes montants saisis restent prioritaires.`);
  emit("applied");
  emit("close");
}
</script>

<template>
  <Modal title="Proposer un budget" wide @close="emit('close')">
    <p v-if="data" class="muted" style="margin:0 0 12px">Basé sur {{ month(data.period.from) }} → {{ month(data.period.to) }} (12 mois complets){{ data.goals.length ? ` et ${data.goals.length} objectif(s) à financer` : "" }}. Les catégories avec un montant saisi à la main ne sont jamais modifiées.</p>

    <p v-if="!data" class="muted scenarios" style="align-items:center">Calcul des propositions…</p>
    <p v-else-if="empty" class="note warn">Pas assez d'historique : importe des relevés pour obtenir des propositions.</p>
    <div v-else class="scenarios" role="radiogroup" aria-label="Scénarios">
      <label v-for="s in data.scenarios" :key="s.key" class="scenario" :class="{ on: choice === s.key }">
        <input v-model="choice" type="radio" name="scenario" :value="s.key" />
        <span class="head">
          {{ s.label }}
          <md-icon-button v-if="s.key === 'moyenne'" class="small" aria-label="Pourquoi ce chiffre peut différer de la grille" :aria-expanded="showWhy" @click.prevent.stop="showWhy = !showWhy">ⓘ</md-icon-button>
          <span v-if="data.followed === s.key" class="badge">Suivi</span>
          <span v-else-if="choice === s.key" class="badge">✓ Choisi</span>
        </span>
        <span class="line">{{ s.hint }}</span>
        <span class="line" style="margin-top:4px">Épargne</span>
        <span class="big">{{ eur0(s.savings) }} <span class="line">/ mois</span></span>
        <span><span class="tag" :class="rateTone(s.rate)">{{ pct(s.rate, 0) }} d'épargne</span></span>
        <span class="line">Dépenses : {{ eur0(s.expense) }} / mois</span>
        <span class="line" :title="`Somme des budgets proposés pour les catégories d'épargne ; le reste (${eur0(s.savings - s.placed)}) demeure sur le compte courant`">Placé : {{ eur0(s.placed) }} / mois{{ s.key === 'investissement' ? ` · bourse & crypto ${eur0(s.invest)}` : "" }}</span>
        <span v-if="s.goalsMonthly" class="line" :class="{ warn: s.goalsShortfall > 0 }">Objectifs : {{ eur0(s.goalsMonthly) }} / mois{{ s.goalsShortfall > 0 ? ` · il manque ${eur0(s.goalsShortfall)}` : " ✓" }}</span>
      </label>
    </div>
    <p v-if="showWhy" class="note" style="margin-top:12px">Cette moyenne couvre les 12 derniers mois complets. La colonne « Moy. / mois » de la grille ne compte que l'année affichée, mois en cours compris : les deux chiffres peuvent donc différer.</p>

    <fieldset v-if="data" class="charge-list">
      <legend>Charges fixes : elles gardent leur moyenne dans tous les scénarios</legend>
      <label v-for="c in data.fixedCandidates" :key="c.name">
        <md-checkbox :checked="c.checked" @change="toggleCharge(c.name, ($event.target as HTMLInputElement).checked)"></md-checkbox> {{ c.name }}
      </label>
    </fieldset>

    <p v-if="data && data.goals.length" class="help" style="margin:12px 0 0">
      Objectifs servis en premier dans l'épargne : <span v-for="(g, i) in data.goals" :key="g.goal_id">{{ i ? " · " : "" }}{{ g.name }} {{ eur0(g.monthly) }} / mois{{ g.target_date ? ` (${month(g.target_date)})` : "" }}</span>. Le versement vient de l'onglet Objectifs et suit le solde de tes comptes.
    </p>

    <template #foot>
      <span v-if="chosen" class="muted" style="margin-right:auto;align-self:center;font-size:13px">Suivre : budget recalculé à chaque relevé · Appliquer une fois : {{ chosen.fillable }} catégorie(s) remplie(s), montants figés</span>
      <md-text-button @click="emit('close')">Annuler</md-text-button>
      <md-outlined-button :disabled="!chosen || empty || chosen.fillable === 0 || busy" @click="applyOnce">Appliquer une fois</md-outlined-button>
      <md-filled-button :disabled="!chosen || empty || busy || data?.followed === choice" @click="follow">Suivre ce scénario</md-filled-button>
    </template>
  </Modal>
</template>
