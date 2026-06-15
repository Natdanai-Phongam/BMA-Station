<template>
  <div class="content-wrap">

    <!-- ── Loading state ──────────────────────────────────────── -->
    <div v-if="loading" class="wf-loading">กำลังโหลดข้อมูล…</div>

    <!-- ── Main ───────────────────────────────────────────────── -->
    <template v-else>
    <div class="main-wrap" :class="{ 'main-wrap--embedded': props.embedded }">

      <!-- ── Status row: INR (60%) + TTR (40%) ──────────────── -->
      <div class="status-row">

        <!-- INR / This Visit Card -->
        <div class="inr-hero" :class="`inr-hero--${latestInrStatus}`">

          <!-- Card header -->
          <div class="inr-hero-header">
            <div class="inr-hero-header-left">
              <span class="inr-hero-eyebrow">THIS VISIT</span>
              <span class="inr-hero-date">{{ formatDate(data.latestInr.measuredAt.slice(0, 10)) }}</span>
            </div>
            <span v-if="visitSaved" class="inr-hero-saved-badge">
              <PhCheckCircle :size="12" /> บันทึกแล้ว
            </span>
          </div>

          <!-- Card body: INR info (left) + current dose (right) -->
          <div class="inr-hero-body-row">
            <div class="inr-hero-left">
              <div class="inr-hero-body">
                <div class="inr-hero-value-col">
                  <div class="inr-hero-value">{{ data.latestInr.inrValue.toFixed(1) }}</div>
                  <div class="inr-target-ref">
                    <span class="inr-target-ref-label">TARGET INR</span>
                    <div class="inr-target-track">
                      <div class="inr-target-zone" :style="targetZoneStyle" />
                      <div class="inr-target-marker" :style="{ left: markerLeft }" :class="`inr-target-marker--${latestInrStatus}`" />
                    </div>
                    <span class="inr-target-ref-val">{{ (data.profile.targetRange ?? DEFAULT_TARGET_RANGE).min.toFixed(1) }}–{{ (data.profile.targetRange ?? DEFAULT_TARGET_RANGE).max.toFixed(1) }}</span>
                  </div>
                </div>
                <div class="inr-hero-meta">
                  <span class="inr-status-badge" :class="`inr-badge--${latestInrStatus}`">
                    {{ inrStatusLabel(latestInrStatus) }}
                  </span>

                  <!-- Hold states: concise bullet directives -->
                  <template v-if="heroSuggestion.direction === 'hold' && heroSuggestion.trigger !== 'therapeutic'">
                    <ul class="inr-hold-steps" :class="`inr-hold-steps--${latestInrStatus}`">
                      <li v-for="step in heroSuggestion.nextSteps?.slice(0, 3)" :key="step">{{ step }}</li>
                    </ul>
                  </template>

                  <!-- Non-hold states: single note -->
                  <template v-else>
                    <div class="inr-note" :class="`inr-note--${latestInrStatus}`">
                      <PhWarning v-if="latestInrStatus !== 'therapeutic'" :size="11" :color="suggestionIconColor" />
                      <PhCheckCircle v-else :size="11" color="var(--bma-success-text)" />
                      <span>{{ latestSuggestionNote }}</span>
                    </div>
                  </template>

                  <v-tooltip
                    v-if="majorInteractions.length"
                    location="bottom"
                    content-class="inr-interact-tooltip"
                    :open-delay="120"
                  >
                    <template #activator="{ props: tipProps }">
                      <div
                        class="inr-interact-flag"
                        :class="`inr-interact-flag--${majorInteractionEffect}`"
                        v-bind="tipProps"
                      >
                        <PhWarning :size="12" />
                        <span>พบการใช้ยาที่มีปฏิกิริยา</span>
                      </div>
                    </template>
                    <div class="interact-tip-inner">
                      <div class="interact-tip-header">ยาที่มีปฏิกิริยาต่อ INR</div>
                      <div v-for="med in majorInteractions" :key="med.name" class="interact-tip-row">
                        <div class="interact-tip-drug">
                          <span class="interact-tip-dir" :class="`interact-tip-dir--${med.effect}`">
                            {{ med.effect === 'increase' ? '↑ INR' : med.effect === 'decrease' ? '↓ INR' : '→' }}
                          </span>
                          <span class="interact-tip-name">{{ med.name }}</span>
                        </div>
                        <p v-if="med.note" class="interact-tip-note">{{ med.note }}</p>
                      </div>
                    </div>
                  </v-tooltip>
                </div>
              </div>
            </div>
            <div class="inr-dose-info">
              <span class="inr-dose-info-label">ขนาดยาปัจจุบัน</span>
              <div class="inr-dose-info-num">
                {{ data.profile.currentDoseMgWk.toFixed(2) }}
                <span class="inr-dose-info-unit">mg/wk</span>
              </div>
            </div>
          </div>

          <!-- Footer: single CTA — always opens Drawer -->
          <div class="inr-hero-footer">
            <template v-if="visitSaved">
              <span class="inr-hero-footer-saved">
                บันทึก: {{ visitSavedDose.toFixed(2) }} mg/wk
              </span>
              <button class="inr-hero-cta inr-hero-cta--redo" @click="visitSaved = false">
                <PhPencilSimple :size="11" /> แก้ไข
              </button>
            </template>
            <template v-else>
              <button
                class="inr-hero-cta"
                :class="`inr-hero-cta--${latestInrStatus}`"
                @click="drawerOpen = true"
              >
                <PhCalculator :size="13" />
                {{ heroCta }}
              </button>
            </template>
          </div>

        </div>

        <!-- TTR Card -->
        <div class="ttr-card" :class="`ttr-card--${ttrColorClass}`">
          <div class="ttr-eyebrow">ANTICOAGULANT STEWARDSHIP (ATS)</div>
          <div class="ttr-value">TTR = {{ data.ttr.value.toFixed(0) }}%</div>
          <div class="ttr-meta">Rosendaal Method · {{ data.ttr.daysCalculable }} วัน · ณ {{ formatDate(data.ttr.toDate) }}</div>
          <div class="ttr-badge" :class="`ttr-badge--${ttrColorClass}`">
            {{ ttrBadgeLabel }}
          </div>
          <div class="ttr-detail">
            {{ data.ttr.daysInRange }} / {{ data.ttr.daysCalculable }} วันในช่วงเป้าหมาย
          </div>
        </div>
      </div>

      <!-- ── Schedule (full width) ──────────────────────────────── -->
      <div class="cur-schedule-card">
        <div class="cur-schedule-header">
          <div class="cur-schedule-title-wrap">
            <PhCalendar :size="15" color="var(--bma-text-tertiary)" />
            <span class="cur-schedule-title">ตารางการกินยาปัจจุบัน</span>
          </div>
          <div class="cur-schedule-actions">
            <button class="btn-print-sched">
              <PhPrinter :size="13" />
              <span>พิมพ์สำหรับผู้ป่วย</span>
            </button>
          </div>
        </div>
        <div class="day-grid">
          <div v-for="day in DAY_KEYS" :key="day" class="day-col">
            <div class="day-label">{{ DAY_LABELS[day] }}</div>
            <div class="pill-icon-wrap">
              <div
                v-for="n in Math.floor(currentSchedule.days[day].tablets)"
                :key="`f${n}`"
                class="pill-icon pill-icon--full"
                :class="`pill-icon--${PILL_CONFIG[currentSchedule.days[day].pillMg].color}`"
              />
              <div
                v-if="currentSchedule.days[day].tablets % 1 !== 0"
                class="pill-icon pill-icon--half"
                :class="`pill-icon--${PILL_CONFIG[currentSchedule.days[day].pillMg].color}`"
              />
            </div>
            <div class="day-tablets">{{ currentSchedule.days[day].tablets }}</div>
            <div class="day-unit">เม็ด</div>
            <div class="day-mg">{{ currentSchedule.days[day].mg.toFixed(1) }} mg</div>
          </div>
        </div>
        <div class="cur-schedule-footer">
          <div class="cur-schedule-footer-data">
            <div class="sched-total-dose">
              <span class="sched-total-label">TOTAL WEEKLY DOSE</span>
              <span class="sched-total-val">{{ currentSchedule.totalMgWk.toFixed(2) }} mg/wk</span>
            </div>
            <div class="sched-pill-ref">
              <span class="sched-ref-label">PILL TYPE REFERENCE</span>
              <div class="sched-ref-items">
                <template v-for="pill in currentSchedule.activePillsMg" :key="pill">
                  <span class="sched-ref-item">
                    <span class="pill-icon pill-icon--full" :class="`pill-icon--${PILL_CONFIG[pill].color}`" />
                    1 เม็ด ({{ pill }} mg)
                  </span>
                  <span class="sched-ref-item">
                    <span class="pill-icon pill-icon--half" :class="`pill-icon--${PILL_CONFIG[pill].color}`" />
                    ½ เม็ด ({{ (pill / 2).toFixed(1) }} mg)
                  </span>
                </template>
              </div>
            </div>
          </div>
          <div class="schedule-warning">
            <PhWarning :size="13" color="var(--inr-low-text)" />
            <span>ห้ามแบ่งเม็ดยาให้น้อยกว่า <strong>"ครึ่งเม็ด" (0.5 เม็ด)</strong> โดยเด็ดขาด</span>
          </div>
        </div>
      </div>

      <!-- ── INR Trend Chart (full width) ─────────────────────── -->
      <div class="chart-card chart-card--wide">
        <div class="chart-header">
          <span class="chart-title">INR TREND MONITORING</span>
          <div class="chart-legend">
            <span class="legend-item">
              <span class="legend-band" />
              Target ({{ (data.profile.targetRange ?? DEFAULT_TARGET_RANGE).min }}–{{ (data.profile.targetRange ?? DEFAULT_TARGET_RANGE).max }})
            </span>
            <span class="legend-item">
              <span class="legend-dot" style="background: var(--bma-complication-bleeding-color)" />
              Out of Range
            </span>
          </div>
        </div>
        <div class="chart-wrap">
          <Line :data="inrChartData" :options="inrChartOptions" />
        </div>
      </div>

      <!-- ── Section E: Unified INR Visit Log ──────────────────── -->
      <div class="log-card">
        <div class="log-header">
          <div class="log-title-wrap">
            <span class="log-title">ประวัติการวัด INR และการจ่ายยา</span>
            <span class="log-subtitle">INR VISIT LOG</span>
          </div>
          <span class="log-count">แสดง {{ visibleLog.length }} / {{ unifiedLog.length }} รายการ</span>
        </div>
        <table class="log-table">
          <thead>
            <tr>
              <th>วันที่</th>
              <th>INR</th>
              <th>ขนาดยา</th>
              <th>การเปลี่ยนแปลง</th>
              <th>แนวทางการจ่ายยา</th>
              <th>หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="row in visibleLog" :key="row.inr.id">
              <tr
                class="log-row"
                :class="[
                  !row.adjustment ? 'log-row--no-action' : '',
                  { 'log-row--out': inrOutOfRange(row.inr.inrValue) },
                ]"
              >
                <!-- Date -->
                <td class="td-date">{{ formatDateTime(row.inr.measuredAt).date }}</td>

                <!-- INR value -->
                <td>
                  <span class="inr-chip" :class="inrChipClass(row.inr.inrValue)">
                    {{ row.inr.inrValue.toFixed(1) }}
                  </span>
                </td>

                <!-- New dose / maintain -->
                <td class="td-dose" :class="row.adjustment && row.adjustment.newDoseMgWk !== row.adjustment.oldDoseMgWk ? 'text-green' : ''">
                  {{ row.adjustment ? row.adjustment.newDoseMgWk.toFixed(1) + ' mg/wk' : '—' }}
                </td>

                <!-- % change -->
                <td>
                  <span
                    v-if="row.adjustment && row.adjustment.percentChange !== 0"
                    class="pct-badge"
                    :class="pctBadgeClass(row.adjustment.percentChange)"
                  >
                    {{ row.adjustment.percentChange >= 0 ? '+' : '' }}{{ row.adjustment.percentChange.toFixed(1) }}%
                  </span>
                  <span v-else-if="row.adjustment" class="log-maintain-text">คงเดิม</span>
                  <span v-else class="col-dash">—</span>
                </td>

                <!-- Concordance badge -->
                <td>
                  <span
                    v-if="row.adjustment"
                    class="concordance-badge"
                    :class="wfConcordanceBadgeClass(row.adjustment)"
                  >{{ wfConcordanceLabel(row.adjustment) }}</span>
                  <span v-else class="log-no-action-text">ไม่มีบันทึก</span>
                </td>

                <!-- Remarks -->
                <td class="td-remarks">{{ row.adjustment?.remarks || '—' }}</td>
              </tr>
            </template>
            <tr v-if="unifiedLog.length === 0">
              <td colspan="6" class="td-empty">ยังไม่มีประวัติการวัด INR และการปรับยา</td>
            </tr>
          </tbody>
        </table>
        <div v-if="unifiedLog.length > LOG_PREVIEW_COUNT" class="log-show-more">
          <button class="btn-show-more" @click="showAllLog = !showAllLog">
            <PhCaretDown
              :size="13"
              :style="showAllLog ? 'transform:rotate(180deg);transition:transform .2s' : 'transition:transform .2s'"
            />
            {{ showAllLog ? 'ย่อประวัติ' : `ดูประวัติทั้งหมด (${unifiedLog.length} visits)` }}
          </button>
        </div>
      </div>


    </div><!-- /.main-wrap -->

    <!-- ── Dose adjustment drawer ───────────────────────────── -->
    <WfDoseDrawer
      :data="data"
      :is-open="drawerOpen"
      :patient-id="props.patientId"
      :hn="patientHn"
      @close="drawerOpen = false"
      @saved="onDrawerSaved"
      @forward-consult="onForwardConsult"
    />
    </template>

  </div><!-- /.content-wrap -->
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, onMounted } from 'vue'
import {
  PhCalculator, PhWarning, PhCheckCircle,
  PhCalendar, PhPrinter,
  PhPencilSimple, PhCaretDown,
} from '@phosphor-icons/vue'
import WfDoseDrawer from '@/components/WfDoseDrawer.vue'
import { useConsultStore } from '@/composables/useConsultStore'
import { useWarfarinStore } from '@/composables/useWarfarinStore'
import {
  Chart as ChartJS, LineElement, PointElement,
  CategoryScale, LinearScale, Tooltip, Filler,
} from 'chart.js'
import type { TooltipItem } from 'chart.js'
import { Line } from 'vue-chartjs'
import type { WarfarinPageData, WeeklySchedule, DoseAdjustment, InrRecord } from '@/data/types/warfarin'
import { PILL_CONFIG, DAY_KEYS, DAY_LABELS, DEFAULT_TARGET_RANGE } from '@/data/types/warfarin'
import { buildWeeklySchedule, computeDosingSuggestion } from '@/utils/warfarinDosing'
import { type InrStatus, getInrStatus, inrStatusLabel } from '@/utils/inrStatus'
import { wfConcordanceBadgeClass, wfConcordanceLabel } from '@/utils/warfarin-helpers'

import { repo } from '@/data/repository'
import type { AtsPatientsData } from '@/data/types/ats-patients'

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler)

// ── Section D: Concurrent meds helpers ───────────────────────
const majorInteractions = computed(() =>
  data.value.profile.concurrentMeds?.filter(m => m.severity === 'major') ?? []
)

const majorInteractionEffect = computed(() => {
  const m = majorInteractions.value
  if (!m.length) return 'increase'
  if (m.every(x => x.effect === 'decrease')) return 'decrease'
  return 'increase'
})


const props = defineProps<{ patientId: string; embedded?: boolean }>()
const consult = useConsultStore()
const store   = useWarfarinStore()

const loading = ref(true)
const atsPatients = shallowRef<AtsPatientsData>({ lastSyncedAt: '', warfarin: [], noacs: [] })

// Valid-but-empty shell so `data.value` is never null → read sites stay simple
// (`data.value.x`, no per-computed guards). Never displayed: the template + drawer
// are gated behind `loading`, which only clears after the store has the record.
const EMPTY_WF: WarfarinPageData = {
  profile:   { patientId: '', pillStrengthMg: 5, activePillsMg: [5], currentDoseMgWk: 0, therapyStartDate: '' },
  latestInr: { id: '', patientId: '', inrValue: 0, measuredAt: '', source: 'manual' },
  inrHistory: [],
  doseAdjustments: [],
  ttr: { value: 0, status: 'insufficient-data', fromDate: '', toDate: '', daysInRange: 0, daysCalculable: 0 },
}

// Single source of truth — the shared store object (see useWarfarinStore).
const data = computed<WarfarinPageData>(() => store.get(props.patientId) ?? EMPTY_WF)

// Resolve the real Hospital Number (HN) from the patient summary list.
// Falls back to undefined so the drawer can gracefully degrade to showing the ID.
const patientHn = computed(() => {
  const id = props.patientId
  return (
    atsPatients.value.warfarin.find(p => p.id === id)?.hn ??
    atsPatients.value.noacs.find(p => p.id === id)?.hn
  )
})

// ── Drawer state ──────────────────────────────────────────────
const drawerOpen = ref(false)

// ── This Visit: saved state (set only by drawer) ──────────────
const visitSaved     = ref(false)
const visitSavedDose = ref(0)   // seeded from data after async load (see onMounted)

onMounted(async () => {
  try {
    const [, ats] = await Promise.all([
      store.ensureLoaded(),
      repo.getAtsPatients(),
    ])
    atsPatients.value = ats
    visitSavedDose.value = data.value.profile.currentDoseMgWk
  } catch (e) {
    console.error('[WarfarinDoseTool] load failed', e)
  } finally {
    loading.value = false
  }
})

// "ส่งต่อปรึกษาเคส" from the dose tool → post the plan as an approval request.
function onForwardConsult(plan: { oldDose: number; newDose: number; pct: number; inr: number; schedule: WeeklySchedule }) {
  consult.postApprovalRequest(props.patientId, plan)
}

function onDrawerSaved(payload: { newDoseMgWk: number; newAdj: DoseAdjustment; newInr?: InrRecord; postToConsult: boolean }) {
  store.applyDoseAdjustment(props.patientId, payload)
  visitSavedDose.value = payload.newDoseMgWk
  visitSaved.value     = true

  // Opt-in: surface this adjustment in the patient's consultation thread
  if (payload.postToConsult) {
    const a = payload.newAdj
    consult.postDoseAdjustment(props.patientId, {
      oldDose: a.oldDoseMgWk, newDose: a.newDoseMgWk, pct: a.percentChange,
      inr: a.inrAtAdjustment, schedule: a.weeklySchedule,
    })
  }
}

// ── INR status ────────────────────────────────────────────────
const latestInrStatus = computed<InrStatus>(() =>
  getInrStatus(data.value.latestInr.inrValue, data.value.profile.targetRange ?? DEFAULT_TARGET_RANGE)
)
const heroSuggestion = computed(() =>
  computeDosingSuggestion(data.value.latestInr.inrValue, data.value.profile)
)
// CTA label adapts to INR state — signals to the doctor what they're about to do
const heroCta = computed(() => {
  const { direction, trigger } = heroSuggestion.value
  if (direction === 'hold' && trigger !== 'therapeutic') return 'ดูโปรโตคอลและบันทึก'
  if (trigger === 'therapeutic') return 'ยืนยันและบันทึก Visit'
  return 'ดูคำแนะนำและปรับยา'
})

const latestSuggestionNote = computed(() => ({
  low:         'INR ต่ำกว่าเป้าหมาย — แนะนำเพิ่มขนาดยา',
  therapeutic: 'INR อยู่ในช่วงเป้าหมาย — คงขนาดยาเดิม',
  supra:       'INR สูงกว่าเป้าหมาย — แนะนำลดขนาดยา',
  'very-high': 'INR สูงมาก — งด 1 dose และ Recheck',
  critical:    'INR วิกฤต — หยุดยาและพิจารณา Vit K',
  emergency:   'INR อันตราย — ต้องการการดูแลเร่งด่วน',
}[latestInrStatus.value]))

const suggestionIconColor = computed(() => ({
  low:          'var(--inr-low-text)',
  therapeutic:  'var(--bma-success-text)',
  supra:        'var(--inr-supra-text)',
  'very-high':  'var(--bma-emergency)',
  critical:     'var(--bma-emergency)',
  emergency:    'var(--inr-emergency-text)',
}[latestInrStatus.value]))

// ── Pill / schedule helpers ───────────────────────────────────
const currentSchedule = computed<WeeklySchedule>(() =>
  buildWeeklySchedule(data.value.profile.currentDoseMgWk, data.value.profile.activePillsMg)
)


// ── INR range micro-track ────────────────────────────────────
const INR_TRACK_MIN = 1.0
const INR_TRACK_MAX = 5.0

const targetZoneStyle = computed(() => {
  const { min, max } = data.value.profile.targetRange ?? DEFAULT_TARGET_RANGE
  const left  = ((min - INR_TRACK_MIN) / (INR_TRACK_MAX - INR_TRACK_MIN)) * 100
  const width = ((max - min) / (INR_TRACK_MAX - INR_TRACK_MIN)) * 100
  return { left: `${left.toFixed(1)}%`, width: `${width.toFixed(1)}%` }
})

const markerLeft = computed(() => {
  const inr = data.value.latestInr.inrValue
  const pct = Math.min(Math.max(
    (inr - INR_TRACK_MIN) / (INR_TRACK_MAX - INR_TRACK_MIN), 0.04
  ), 0.96)
  return `${(pct * 100).toFixed(1)}%`
})

// ── TTR display ───────────────────────────────────────────────
const ttrColorClass = computed(() => ({
  'goal-met':           'green',
  'below-goal':         'red',
  'insufficient-data':  'gray',
}[data.value.ttr.status]))

const ttrBadgeLabel = computed(() => ({
  'goal-met':           'GOAL MET',
  'below-goal':         'BELOW GOAL',
  'insufficient-data':  'ข้อมูลไม่เพียงพอ',
}[data.value.ttr.status]))

// ── Unified INR visit log (INR history + adjustment action per visit) ──────
const LOG_PREVIEW_COUNT = 5
const showAllLog = ref(false)

type VisitRow = {
  inr:        InrRecord
  adjustment: DoseAdjustment | null
}

// Join inrHistory + doseAdjustments by visit date (same-day = same clinical visit)
const unifiedLog = computed<VisitRow[]>(() => {
  const adjByDate = new Map<string, DoseAdjustment>()
  for (const adj of data.value.doseAdjustments)
    adjByDate.set(adj.adjustedAt.slice(0, 10), adj)

  return [...data.value.inrHistory]
    .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))
    .map(inr => ({
      inr,
      adjustment: adjByDate.get(inr.measuredAt.slice(0, 10)) ?? null,
    }))
})

const visibleLog = computed(() =>
  showAllLog.value ? unifiedLog.value : unifiedLog.value.slice(0, LOG_PREVIEW_COUNT)
)

// Visit log is read-only — a decision log is append-only; past entries are
// superseded by new visits, never edited in place (honest "log, not record").

// ── INR chart with target-range band ─────────────────────────
const inrChartData = computed(() => {
  const { min: tMin, max: tMax } = data.value.profile.targetRange ?? DEFAULT_TARGET_RANGE
  const records = [...data.value.inrHistory].sort(
    (a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime()
  )
  const labels = records.map(r => formatDate(r.measuredAt.slice(0, 10)))

  return {
    labels,
    datasets: [
      // Upper bound — fills down to tMin (target range band)
      {
        label: '_upper',
        data:  labels.map(() => tMax),
        fill:  { target: { value: tMin }, above: 'rgba(76,175,80,0.10)' },
        borderColor:  'rgba(76,175,80,0.40)',
        borderDash:   [5, 3] as number[],
        borderWidth:  1.5,
        pointRadius:  0,
        tension:      0,
      },
      // Lower bound line
      {
        label: '_lower',
        data:  labels.map(() => tMin),
        fill:  false as const,
        borderColor:  'rgba(76,175,80,0.40)',
        borderDash:   [5, 3] as number[],
        borderWidth:  1.5,
        pointRadius:  0,
        tension:      0,
      },
      // Actual INR values
      {
        label:             'INR',
        data:              records.map(r => r.inrValue),
        fill:              false as const,
        borderColor:       cssVar('--bma-green-500', '#00744B'),
        backgroundColor:   'transparent',
        pointBackgroundColor: records.map(r =>
          r.inrValue >= tMin && r.inrValue <= tMax
            ? cssVar('--bma-success', '#4CAF50')
            : cssVar('--bma-complication-bleeding-color', '#E57373')
        ),
        pointBorderColor:  cssVar('--bma-surface', '#FFFFFF'),
        pointBorderWidth:  1.5,
        pointRadius:       5,
        pointHoverRadius:  7,
        tension:           0.35,
      },
    ],
  }
})

const inrChartOptions = computed(() => {
  const maxInr = data.value.inrHistory.reduce((m, r) => Math.max(m, r.inrValue), 0)
  const yMax   = Math.ceil(Math.max(5, maxInr) + 0.5)
  return {
    responsive:          true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        filter:    (item: TooltipItem<'line'>) => item.dataset.label === 'INR',
        callbacks: {
          label: (ctx: TooltipItem<'line'>) => `  INR: ${ctx.parsed.y}`,
        },
      },
    },
    scales: {
      x: {
        grid:   { display: false },
        border: { display: false },
        ticks:  { font: { size: 10 }, maxRotation: 40 },
      },
      y: {
        min: 0, max: yMax,
        grid:   { color: cssVar('--bma-border-subtle', '#F0F0F0') },
        border: { display: false },
        ticks:  { stepSize: 1, font: { size: 10 } },
      },
    },
  }
})

// ── Helpers ───────────────────────────────────────────────────

// Canvas API cannot resolve CSS custom properties — read at runtime.
function cssVar(name: string, fallback = ''): string {
  if (typeof document === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}
function formatDateTime(iso: string) {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false }),
  }
}
function inrChipClass(inr: number) {
  const tr = data.value.profile.targetRange ?? DEFAULT_TARGET_RANGE
  if (inr < tr.min) return 'inr-chip--low'
  if (inr > tr.max) return 'inr-chip--high'
  return 'inr-chip--ok'
}
/** Dose given while INR out of target range → per-visit med-dispensing feedback */
function inrOutOfRange(inr: number): boolean {
  const tr = data.value.profile.targetRange ?? DEFAULT_TARGET_RANGE
  return inr < tr.min || inr > tr.max
}
function pctBadgeClass(pct: number) {
  return pct > 0 ? 'pct-badge--up' : pct < 0 ? 'pct-badge--down' : 'pct-badge--neutral'
}
</script>

<style scoped>
.content-wrap { display: flex; flex-direction: column; min-height: 100%; }
.wf-loading {
  padding: 48px 24px;
  text-align: center;
  font-family: var(--bma-font-thai);
  font-size: var(--bma-text-sm);
  color: var(--bma-text-tertiary);
}

/* ── Main wrap ───────────────────────────────────────────────── */
.main-wrap { padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }
.main-wrap--embedded { padding: 0; }

/* ── Status row: INR (60%) + TTR (40%) ──────────────────────── */
.status-row {
  display: grid;
  grid-template-columns: var(--bma-cols-status-row);
  gap: 16px;
  align-items: stretch;
}

/* INR / This Visit Hero */
.inr-hero {
  background: var(--bma-surface); border-radius: var(--bma-radius-lg);
  border: 1px solid var(--bma-border-card); box-shadow: var(--bma-shadow-card);
  display: flex; flex-direction: column; overflow: hidden;
}

/* Header row */
.inr-hero-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 20px;
  background: var(--bma-surface-light);
  border-bottom: 1px solid var(--bma-border-subtle);
}
.inr-hero-header-left { display: flex; align-items: center; gap: 10px; }
.inr-hero-eyebrow {
  font-family: var(--bma-font-data); font-size: 10px; font-weight: 700;
  color: var(--bma-text-muted); letter-spacing: .1em; text-transform: uppercase;
}
.inr-hero-saved-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--bma-font-data); font-size: 11px; font-weight: 700;
  color: var(--bma-success-text); background: var(--bma-success-bg-solid);
  border: 1px solid var(--bma-success-ring); border-radius: var(--bma-radius-full); padding: 2px 9px;
}

/* Body row: INR left + dose info right */
.inr-hero-body-row { display: flex; flex-direction: row; flex: 1; }
.inr-hero-left {
  flex: 1; min-width: 0;
  padding: 14px 20px;
}

/* Dose info column (right) */
.inr-dose-info {
  flex-shrink: 0; min-width: 148px;
  display: flex; flex-direction: column; gap: 4px; justify-content: center;
  padding: 14px 20px;
  border-left: 1px solid var(--bma-border-subtle);
}
.inr-dose-info-label {
  font-family: var(--bma-font-data); font-size: 10px; font-weight: 700;
  color: var(--bma-text-muted); text-transform: uppercase; letter-spacing: .08em;
}
.inr-dose-info-num {
  font-family: var(--bma-font-data); font-size: var(--bma-text-kpi-card); font-weight: 900;
  color: var(--bma-text-primary); line-height: 1;
  display: flex; align-items: baseline; gap: 4px;
}
.inr-dose-info-unit {
  font-family: var(--bma-font-data); font-size: 12px; font-weight: 500;
  color: var(--bma-text-muted);
}

/* Footer action bar */
.inr-hero-footer {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 20px;
  border-top: 1px solid var(--bma-border-subtle);
  background: var(--bma-surface-light);
}
.inr-hero-footer-saved {
  flex: 1; font-size: 13px; font-weight: 600; color: var(--bma-text-primary);
}

/* Single CTA — color driven by INR state */
.inr-hero-cta {
  height: 34px; padding: 0 18px; border: none; border-radius: var(--bma-radius-md);
  background: var(--bma-green-500); color: var(--bma-surface);
  font-family: var(--bma-font-thai); font-size: 13px; font-weight: 700;
  cursor: pointer; display: inline-flex; align-items: center; gap: 7px;
  transition: background var(--bma-transition-fast);
}
.inr-hero-cta--therapeutic      { background: var(--bma-green-500); }
.inr-hero-cta--therapeutic:hover { background: var(--bma-green-600); }
.inr-hero-cta--low               { background: var(--inr-supra-text); }
.inr-hero-cta--low:hover         { background: var(--inr-supra-hover); }
.inr-hero-cta--supra             { background: var(--inr-supra-text); }
.inr-hero-cta--supra:hover       { background: var(--inr-supra-hover); }
.inr-hero-cta--very-high         { background: var(--bma-emergency); }
.inr-hero-cta--very-high:hover   { background: var(--inr-critical-text); }
.inr-hero-cta--critical          { background: var(--bma-emergency); }
.inr-hero-cta--critical:hover    { background: var(--inr-critical-text); }
.inr-hero-cta--emergency         { background: var(--inr-emergency-deep); }
.inr-hero-cta--emergency:hover   { background: var(--inr-emergency-hover); }

/* Redo / edit button (post-save state) */
.inr-hero-cta--redo {
  background: none; border: 1px solid var(--bma-border);
  color: var(--bma-text-tertiary); font-size: 11px;
  height: 28px; padding: 0 10px;
}
.inr-hero-cta--redo:hover { border-color: var(--bma-green-500); color: var(--bma-green-500); }
.inr-hero--emergency   { border-color: var(--inr-emergency-ring);    animation: pulse-emergency 2s ease-in-out infinite; }
.inr-hero--critical    { border-color: var(--inr-critical-ring); }
.inr-hero--very-high   { border-color: var(--inr-supra-ring); }
.inr-hero--supra       { border-color: var(--inr-supra-ring); }
.inr-hero--low         { border-color: var(--inr-low-ring); }
.inr-hero--therapeutic { border-color: var(--inr-therapeutic-ring); }

/* (inr-hero-eyebrow and inr-hero-label replaced by header row above) */
.inr-hero-date {
  font-family: var(--bma-font-data); font-size: 11px; font-weight: 600; color: var(--bma-text-muted);
  background: var(--bma-surface-subtle); border: 1px solid var(--bma-border-subtle);
  border-radius: var(--bma-radius-sm); padding: 2px 7px;
}

.inr-hero-body { display: flex; align-items: flex-start; gap: 18px; flex: 1; }
.inr-hero-value-col { display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; }
.inr-hero-value {
  font-family: var(--bma-font-data); font-size: 56px; font-weight: 900; line-height: 1;
  color: var(--bma-text-primary);
}
.inr-hero--low         .inr-hero-value { color: var(--inr-low-text); }
.inr-hero--therapeutic .inr-hero-value { color: var(--bma-success-text); }
.inr-hero--supra       .inr-hero-value { color: var(--inr-supra-text); }
.inr-hero--very-high   .inr-hero-value { color: var(--bma-emergency); }
.inr-hero--critical    .inr-hero-value { color: var(--inr-critical-text); }
.inr-hero--emergency   .inr-hero-value { color: var(--inr-emergency-text); }

.inr-hero-meta { display: flex; flex-direction: column; gap: 6px; }
.inr-note {
  display: flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 600; color: var(--bma-text-tertiary);
}
.inr-note--low         { color: var(--inr-low-text); }
.inr-note--therapeutic { color: var(--bma-success-text); }
.inr-note--supra       { color: var(--inr-supra-text); }
.inr-note--very-high   { color: var(--bma-emergency); }
.inr-note--critical    { color: var(--bma-emergency); }
.inr-note--emergency   { color: var(--inr-emergency-text); }

/* Current schedule card (merged into left panel) */
.cur-schedule-card {
  background: var(--bma-surface); border-radius: var(--bma-radius-lg);
  border: 1px solid var(--bma-border-card); box-shadow: var(--bma-shadow-card);
  padding: 14px 16px;
}
.cur-schedule-header {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;
}
.cur-schedule-title-wrap { display: flex; align-items: center; gap: 7px; }
.cur-schedule-title      { font-size: 13px; font-weight: 700; color: var(--bma-text-primary); }
.cur-schedule-footer {
  display: flex; flex-direction: column; gap: 10px;
  margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--bma-border-subtle);
}
.cur-schedule-footer-data {
  display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
}

.sched-total-dose { display: flex; flex-direction: column; gap: 1px; flex-shrink: 0; }
.sched-total-label {
  font-family: var(--bma-font-data); font-size: 10px; font-weight: 700;
  color: var(--bma-text-muted); text-transform: uppercase; letter-spacing: .08em;
}
.sched-total-val {
  font-family: var(--bma-font-data); font-size: var(--bma-text-kpi-card); font-weight: 900;
  color: var(--bma-green-500); line-height: 1.1;
}

.sched-pill-ref { display: flex; flex-direction: column; gap: 5px; flex-shrink: 0; }
.sched-ref-label {
  font-family: var(--bma-font-data); font-size: 10px; font-weight: 700;
  color: var(--bma-text-muted); text-transform: uppercase; letter-spacing: .08em;
}
.sched-ref-items { display: flex; gap: 12px; align-items: center; }
.sched-ref-item {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--bma-font-data); font-size: 12px; font-weight: 600; color: var(--bma-text-tertiary);
}

/* Schedule header actions */
.cur-schedule-actions { display: flex; align-items: center; gap: 8px; }

.btn-schedule-cta {
  height: 34px; padding: 0 14px; border: none; border-radius: var(--bma-radius-md);
  background: var(--bma-green-500); color: var(--bma-surface);
  font-family: var(--bma-font-thai); font-size: 13px; font-weight: 700;
  cursor: pointer; display: inline-flex; align-items: center; gap: 7px;
  transition: background var(--bma-transition-fast); white-space: nowrap;
}
.btn-schedule-cta:hover { background: var(--bma-green-600); }

.btn-print-sched {
  height: 34px; padding: 0 12px; border-radius: var(--bma-radius-md);
  border: 1.5px solid var(--bma-border); background: var(--bma-surface);
  color: var(--bma-text-tertiary); font-family: var(--bma-font-thai); font-size: 13px; font-weight: 600;
  cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
  transition: background var(--bma-transition-fast); white-space: nowrap;
}
.btn-print-sched:hover { background: var(--bma-surface-subtle); }

/* INR status badge (shared by hero + log) */
.inr-status-badge { padding: 4px 12px; border-radius: var(--bma-radius-full); font-family: var(--bma-font-data); font-size: 13px; font-weight: 700; }
.inr-badge--low          { background: var(--inr-very-high-bg);   color: var(--bma-emergency); }
.inr-badge--therapeutic  { background: var(--bma-green-50);       color: var(--bma-success-text); }
.inr-badge--supra        { background: var(--inr-supra-bg);       color: var(--inr-supra-text); }
.inr-badge--very-high    { background: var(--inr-very-high-bg);   color: var(--bma-emergency); border: 1px solid var(--inr-very-high-ring); }
.inr-badge--critical     { background: var(--bma-emergency);      color: var(--bma-surface); }
.inr-badge--emergency    { background: var(--inr-emergency-deep); color: var(--bma-surface); letter-spacing: .03em; }

.text-green { color: var(--bma-success-text); }
.text-red   { color: var(--bma-emergency); }

/* ── Interaction flag (INR hero) ─────────────────────────────── */
.inr-interact-flag {
  display: inline-flex; align-items: center; gap: 5px; align-self: flex-start;
  font-family: var(--bma-font-data); font-size: 11px; font-weight: 700;
  padding: 4px 9px; border-radius: var(--bma-radius-sm);
  line-height: 1.3; letter-spacing: 0.01em;
}
.inr-interact-flag--increase { background: var(--wf-interact-increase-bg); color: var(--wf-interact-increase-text); border: 1px solid var(--wf-interact-increase-ring); }
.inr-interact-flag--decrease { background: var(--wf-interact-decrease-bg); color: var(--wf-interact-decrease-text); border: 1px solid var(--wf-interact-decrease-ring); }

/* ── INR target ref + micro-track ────────────────────────────── */
.inr-target-ref { display: flex; flex-direction: column; gap: 3px; min-width: 80px; }
.inr-target-ref-label {
  font-family: var(--bma-font-data); font-size: 10px; font-weight: 700;
  color: var(--bma-text-muted); text-transform: uppercase; letter-spacing: .08em;
}
.inr-target-track {
  position: relative; height: 6px; border-radius: 3px;
  background: var(--bma-border-subtle); overflow: visible;
}
.inr-target-zone {
  position: absolute; top: 0; bottom: 0;
  background: rgba(76, 175, 80, 0.22); border-radius: 3px;
}
.inr-target-marker {
  position: absolute; top: 50%; transform: translate(-50%, -50%);
  width: 10px; height: 10px; border-radius: 50%; z-index: 1;
  background: var(--bma-text-muted);
  border: 2px solid var(--bma-surface);
  box-shadow: 0 1px 3px rgba(0,0,0,0.20);
}
.inr-target-marker--therapeutic { background: var(--bma-success-text); }
.inr-target-marker--low         { background: var(--inr-low-text); }
.inr-target-marker--supra       { background: var(--inr-supra-text); }
.inr-target-marker--very-high   { background: var(--bma-emergency); }
.inr-target-marker--critical    { background: var(--inr-critical-text); }
.inr-target-marker--emergency   { background: var(--inr-emergency-fill); }
.inr-target-ref-val {
  font-family: var(--bma-font-data); font-size: 12px; font-weight: 700;
  color: var(--bma-text-secondary);
}

/* (inr-dose-block removed — replaced by inr-dose-info in the body-row) */
/* ── TTR card ────────────────────────────────────────────────── */
.ttr-card {
  border-radius: var(--bma-radius-lg); padding: 18px 20px;
  display: flex; flex-direction: column; gap: 5px; color: var(--bma-surface);
}
.ttr-card--green { background: var(--bma-green-500); }
.ttr-card--red   { background: var(--bma-emergency); }
.ttr-card--gray  { background: var(--bma-neutral-600); }

.ttr-eyebrow { font-family: var(--bma-font-data); font-size: 10px; font-weight: 700; letter-spacing: .1em; opacity: .8; }
.ttr-value   { font-family: var(--bma-font-data); font-size: 34px; font-weight: 900; line-height: 1.1; }
.ttr-meta    { font-size: 11px; opacity: .75; }
.ttr-badge   {
  display: inline-block; align-self: flex-start;
  padding: 3px 10px; border-radius: var(--bma-radius-full); margin-top: 4px;
  background: rgba(255,255,255,.22); color: var(--bma-surface);
  font-family: var(--bma-font-data); font-size: 11px; font-weight: 700;
}
.ttr-detail { font-size: 11px; opacity: .72; }

/* ── Chart card (compact) ────────────────────────────────────── */
.chart-card {
  background: var(--bma-surface); border-radius: var(--bma-radius-lg);
  border: 1px solid var(--bma-border-card); box-shadow: var(--bma-shadow-card);
  padding: 14px 16px;
}
.chart-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;
  flex-wrap: wrap; gap: 6px;
}
.chart-title  { font-family: var(--bma-font-data); font-size: 11px; font-weight: 700; color: var(--bma-text-primary); letter-spacing: .05em; }
.chart-legend { display: flex; gap: 12px; flex-wrap: wrap; }
.legend-item  { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--bma-text-tertiary); }
.legend-dot   { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.legend-band  { width: 16px; height: 8px; border-radius: 3px; background: rgba(76,175,80,0.25); border: 1px dashed rgba(76,175,80,.6); flex-shrink: 0; }
.chart-wrap   { height: 175px; }


.day-grid { display: grid; grid-template-columns: var(--bma-cols-day-grid); gap: 8px; margin-bottom: 14px; }
.day-col {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 10px 6px; border-radius: var(--bma-radius-lg);
  border: 1px solid var(--bma-border-subtle); background: var(--bma-surface-light);
}
.day-label   { font-size: 12px; font-weight: 700; color: var(--bma-text-tertiary); }
.day-tablets { font-family: var(--bma-font-data); font-size: 18px; font-weight: 700; color: var(--bma-text-primary); line-height: 1; }
.day-unit    { font-size: 11px; color: var(--bma-text-muted); }
.day-mg      { font-family: var(--bma-font-data); font-size: 10px; color: var(--bma-text-disabled); }

.pill-icon-wrap { display: flex; gap: 2px; align-items: center; height: 24px; }
.pill-icon {
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: inset 0 -1px 3px rgba(0,0,0,.20), inset 0 1px 2px rgba(255,255,255,.35);
}
.pill-icon--full { width: 14px; height: 14px; }
.pill-icon--half { width: 7px;  height: 14px; border-radius: 7px 0 0 7px; }
.pill-icon--orange { background: var(--wf-pill-orange); }
.pill-icon--blue   { background: var(--wf-pill-blue); }
.pill-icon--pink   { background: var(--wf-pill-pink); }

.pill-dot {
  width: 12px; height: 12px; border-radius: 50%;
  flex-shrink: 0; display: inline-block;
  box-shadow: inset 0 -1px 3px rgba(0,0,0,.20), inset 0 1px 2px rgba(255,255,255,.35);
}
.pill-dot--half   { width: 6px; border-radius: 6px 0 0 6px; }
.pill-dot--orange { background: var(--wf-pill-orange); }
.pill-dot--blue   { background: var(--wf-pill-blue); }
.pill-dot--pink   { background: var(--wf-pill-pink); }

.schedule-warning {
  display: flex; align-items: center; gap: 6px;
  background: var(--inr-low-bg); border: 1px solid var(--inr-low-ring); border-radius: var(--bma-radius-md);
  padding: 7px 12px; font-size: 12px; color: var(--inr-low-text);
}

/* ── Log card ────────────────────────────────────────────────── */
.log-card {
  background: var(--bma-surface); border-radius: var(--bma-radius-lg);
  border: 1px solid var(--bma-border-card); box-shadow: var(--bma-shadow-card);
  overflow: hidden;
}
.log-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 18px; border-bottom: 1px solid var(--bma-border-subtle);
}
.log-title-wrap { display: flex; align-items: center; gap: 8px; }
.log-title    { font-size: 14px; font-weight: 700; color: var(--bma-text-primary); }
.log-subtitle {
  font-family: var(--bma-font-data); font-size: 10px; font-weight: 700;
  color: var(--bma-text-tertiary); background: var(--bma-surface-subtle); border: 1px solid var(--bma-border-card);
  padding: 2px 8px; border-radius: var(--bma-radius-full); letter-spacing: .04em;
}
.log-count { font-family: var(--bma-font-data); font-size: 11px; color: var(--bma-text-tertiary); white-space: nowrap; }

.log-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.log-table thead tr { background: var(--bma-surface-light); border-bottom: 2px solid var(--bma-border-subtle); }
.log-table th { padding: 9px 14px; font-size: 11px; font-weight: 700; color: var(--bma-text-secondary); text-align: left; white-space: nowrap; }
.log-row { border-bottom: 1px solid var(--bma-surface-subtle); transition: background .1s; }
.log-row:hover { background: var(--bma-surface-light); }
.log-row:last-child { border-bottom: none; }
.log-table td { padding: 10px 14px; color: var(--bma-text-primary); vertical-align: middle; }
.td-date  { font-family: var(--bma-font-data); font-size: 12px; white-space: nowrap; }
.td-empty { text-align: center; padding: 28px 16px; font-family: var(--bma-font-thai); font-size: 13px; color: var(--bma-text-disabled); font-style: italic; }
.td-time  { color: var(--bma-text-muted); font-size: 11px; margin-top: 2px; }
.td-dose  { font-family: var(--bma-font-data); font-weight: 600; }
.td-remarks { font-size: 12px; color: var(--bma-text-tertiary); max-width: 180px; }

.inr-chip { display: inline-block; padding: 2px 8px; border-radius: var(--bma-radius-sm); font-family: var(--bma-font-data); font-size: 12px; font-weight: 700; }
.inr-chip--low  { background: var(--inr-very-high-bg); color: var(--bma-emergency); }
.inr-chip--high { background: var(--inr-supra-bg); color: var(--inr-supra-text); }
.inr-chip--ok   { background: var(--bma-success-bg); color: var(--bma-success-text); }

.pct-badge { display: inline-block; padding: 3px 8px; border-radius: var(--bma-radius-sm); font-family: var(--bma-font-data); font-size: 12px; font-weight: 700; }
.pct-badge--up      { background: var(--bma-success-bg); color: var(--bma-success-text); }
.pct-badge--down    { background: var(--inr-very-high-bg); color: var(--bma-emergency); }
.pct-badge--neutral { background: var(--bma-surface-subtle); color: var(--bma-text-muted); }

.log-show-more { border-top: 1px solid var(--bma-border-subtle); padding: 10px; text-align: center; }
.btn-show-more {
  display: inline-flex; align-items: center; gap: 5px;
  background: none; border: none;
  font-family: var(--bma-font-thai); font-size: 13px; color: var(--bma-green-500); font-weight: 600; cursor: pointer;
}
.btn-show-more:hover { text-decoration: underline; }

@keyframes pulse-emergency {
  0%, 100% { box-shadow: 0 0 0 0 rgba(183, 28, 28, 0); }
  50%       { box-shadow: 0 0 0 5px rgba(183, 28, 28, .18); }
}

/* ── Transitions ─────────────────────────────────────────────── */
.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-enter-active, .slide-leave-active { transition: all .2s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-6px); }

/* ── Section D: Info card (shared base — used in drawer) ─────── */
.info-card {
  background: var(--bma-surface); border-radius: var(--bma-radius-lg);
  border: 1px solid var(--bma-border-card); box-shadow: var(--bma-shadow-card);
  padding: 18px 20px;
}
.info-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.info-card-title  { font-size: 14px; font-weight: 700; color: var(--bma-text-primary); }
.info-card-badge  {
  font-family: var(--bma-font-data); font-size: 10px; font-weight: 700;
  color: var(--bma-text-muted); background: var(--bma-surface-subtle); border: 1px solid var(--bma-border-card);
  padding: 2px 8px; border-radius: var(--bma-radius-full); letter-spacing: .04em;
}

/* ── INR chart full-width ────────────────────────────────────── */
.chart-card--wide             { padding: 16px 20px; }
.chart-card--wide .chart-wrap { height: 220px; }


/* ── P0-C: Log row states ────────────────────────────────────── */
.log-row--no-action { opacity: 0.55; }
/* Dose given while INR out of target range — per-visit dispensing feedback */
.log-row--out, .log-row--out:hover { background: var(--bma-urgency-bg-soft); }
.log-maintain-text  { font-family: var(--bma-font-thai); font-size: 12px; color: var(--bma-text-muted); }
.log-no-action-text { font-family: var(--bma-font-thai); font-size: 11px; color: var(--bma-text-disabled); font-style: italic; }

/* ── Hold state directives ───────────────────────────────────── */
.inr-hold-steps {
  margin: 0; padding: 0; list-style: none;
  display: flex; flex-direction: column; gap: 5px;
}
.inr-hold-steps li {
  display: flex; align-items: flex-start; gap: 7px;
  font-size: 12px; font-weight: 600; color: var(--bma-text-primary); line-height: 1.4;
}
.inr-hold-steps li::before {
  content: '·'; font-size: 16px; line-height: 1; flex-shrink: 0;
  color: var(--bma-text-muted); font-weight: 400; margin-top: -1px;
}
.inr-hold-steps--very-high li { color: var(--bma-emergency); }
.inr-hold-steps--very-high li::before { color: var(--bma-emergency); opacity: .6; }
.inr-hold-steps--critical li  { color: var(--inr-critical-text); }
.inr-hold-steps--critical li::before  { color: var(--inr-critical-text); opacity: .6; }
.inr-hold-steps--emergency li { color: var(--inr-emergency-text); }
.inr-hold-steps--emergency li::before { color: var(--inr-emergency-text); opacity: .6; }

/* Hold primary button */
.inr-hero-btn-hold {
  height: 34px; padding: 0 16px; border: none; border-radius: var(--bma-radius-md);
  background: var(--bma-emergency); color: var(--bma-surface);
  font-family: var(--bma-font-thai); font-size: 13px; font-weight: 700;
  cursor: pointer; display: inline-flex; align-items: center; gap: 7px;
  transition: background var(--bma-transition-fast);
}
.inr-hero-btn-hold:hover { background: var(--inr-critical-text); }

/* ── Interaction flag cursor ─────────────────────────────────── */
.inr-interact-flag { cursor: default; }

/* ── Responsive ──────────────────────────────────────────────── */
/* Grid columns now driven by --bma-cols-* tokens — see overrides.scss */
@media (max-width: 767px) {
  .main-wrap   { padding: 16px; gap: 12px; }
  .cur-schedule-actions { flex-wrap: wrap; gap: 8px; }
  .day-grid    { gap: 4px; }
  .day-col     { padding: 8px 4px; }
  .day-label   { font-size: 11px; }
  .day-tablets { font-size: 15px; }
  .log-table th, .log-table td { padding: 8px 10px; }
  .inr-hero-body-row { flex-direction: column; }
  .inr-dose-info { border-left: none; border-top: 1px solid var(--bma-border-subtle); }
}
</style>

<!-- Interaction tooltip — rendered outside component, cannot be scoped -->
<style>
.inr-interact-tooltip.v-overlay__content {
  background: #fff !important;
  color: var(--bma-text-primary) !important;
  border: 1px solid var(--bma-border-muted) !important;
  border-radius: 10px !important;
  box-shadow: 0 4px 20px rgba(0,0,0,0.13) !important;
  padding: 0 !important;
  max-width: 288px;
  min-width: 200px;
  overflow: hidden;
}
.interact-tip-inner { font-size: 0; /* collapse whitespace */ }
.interact-tip-header {
  font-family: 'Sarabun', sans-serif;
  font-size: 10px; font-weight: 700;
  color: var(--bma-green-500);
  text-transform: uppercase; letter-spacing: .08em;
  padding: 10px 14px 8px;
  border-bottom: 1px solid var(--bma-border-subtle);
}
.interact-tip-row {
  padding: 8px 14px;
  border-top: 1px solid var(--bma-surface-subtle);
}
.interact-tip-row:first-of-type { border-top: none; }
.interact-tip-drug {
  display: flex; align-items: center; gap: 7px;
}
.interact-tip-dir {
  font-family: 'Sarabun', sans-serif;
  font-size: 10px; font-weight: 700;
  padding: 2px 6px; border-radius: 4px;
  flex-shrink: 0; white-space: nowrap;
}
.interact-tip-dir--increase {
  background: var(--inr-low-bg); color: var(--inr-low-text); border: 1px solid var(--inr-low-ring);
}
.interact-tip-dir--decrease {
  background: var(--bma-complication-thrombosis-bg); color: var(--bma-complication-thrombosis-color); border: 1px solid var(--bma-complication-thrombosis-bg);
}
.interact-tip-name {
  font-family: 'Sarabun', sans-serif;
  font-size: 12px; font-weight: 700;
  color: var(--bma-text-primary);
}
.interact-tip-note {
  font-family: 'Sarabun', sans-serif;
  font-size: 12px; line-height: 1.45;
  color: var(--bma-text-muted);
  margin: 4px 0 0;
}
</style>
