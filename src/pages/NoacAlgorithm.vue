<template>
  <div class="na-wrap">

    <!-- ── Loading state ──────────────────────────────────── -->
    <div v-if="loading" class="na-empty">
      <span class="na-empty-text">กำลังโหลดข้อมูล…</span>
    </div>

    <!-- ── Error state ────────────────────────────────────── -->
    <div v-else-if="loadError" class="na-empty">
      <span class="na-empty-text">ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง</span>
    </div>

    <!-- ── Empty / no-data state ──────────────────────────── -->
    <div v-else-if="!p || !noacData?.profile || !latestLab" class="na-empty">
      <span class="na-empty-text">ไม่พบข้อมูล NOACs สำหรับผู้ป่วยรายนี้</span>
    </div>

    <template v-else>

      <!-- ── Row 1: Indication + Kidney Function ──────────── -->
      <div class="na-top-row">

        <!-- Indication card -->
        <div class="na-card na-indication-card">
          <span class="na-card-label">ข้อบ่งใช้ในการรักษา</span>
          <div class="na-indication-row">
            <span class="na-indication-name">{{ indicationLabel.full }}</span>
            <span class="na-indication-badge">{{ noacData?.profile.indication }}</span>
          </div>
          <div class="na-patient-params">
            <div class="na-param">
              <span class="na-param-label">อายุ</span>
              <div class="na-param-val-row">
                <span class="na-param-num">{{ p.age }}</span>
                <span class="na-param-unit">ปี</span>
              </div>
            </div>
            <div class="na-param">
              <span class="na-param-label">น้ำหนัก</span>
              <div class="na-param-val-row">
                <span class="na-param-num">{{ latestLab?.weightKg }}</span>
                <span class="na-param-unit">kg</span>
              </div>
            </div>
            <div class="na-param">
              <span class="na-param-label na-param-label--en">SCr</span>
              <div class="na-param-val-row">
                <span class="na-param-num">{{ latestLab?.scrMgDl.toFixed(1) }}</span>
                <span class="na-param-unit">mg/dL</span>
              </div>
            </div>
          </div>

          <!-- Clinical risk flags -->
          <div class="na-flags-row">
            <template v-if="activeFlags.length">
              <span v-for="flag in activeFlags" :key="flag" class="na-flag-chip">{{ flag }}</span>
            </template>
            <span v-else class="na-no-flags">
              <PhCheck :size="13" weight="bold" />ตรวจสอบแล้ว: {{ safetySummary }}
            </span>
          </div>
        </div>

        <!-- Right column: CrCl + Reference table -->
        <!-- Kidney Function card — wider, threshold table beside hero number -->
        <div class="na-card na-kidney-card">
          <span class="na-card-label">การทำงานของไต (CrCl)</span>
          <div class="na-kidney-inner">
            <!-- Left: hero number + badge + method -->
            <div class="na-crcl-left">
              <div class="na-crcl-hero">
                <span class="na-crcl-num" :class="crClNumClass">{{ latestLab?.crClMlMin }}</span>
                <span class="na-crcl-unit">mL/min</span>
              </div>
              <span class="na-crcl-badge" :class="crClBadgeClass">{{ crClLabel }}</span>
              <div class="na-crcl-method">Cockcroft-Gault</div>
            </div>
            <!-- Right: threshold scaling table -->
            <div class="na-crcl-thresholds">
              <div class="na-threshold" :class="{ 'na-threshold--active': bandGte60 }">
                <span class="na-thr-range">≥ 60</span>
                <span class="na-thr-label">ปกติ</span>
              </div>
              <div class="na-threshold" :class="{ 'na-threshold--active': band30to59 }">
                <span class="na-thr-range">30–59</span>
                <span class="na-thr-label">ลดลงปานกลาง</span>
              </div>
              <div class="na-threshold" :class="{ 'na-threshold--active': band15to29 }">
                <span class="na-thr-range">15–29</span>
                <span class="na-thr-label">ลดลงรุนแรง</span>
              </div>
              <div class="na-threshold na-threshold--danger" :class="{ 'na-threshold--active': bandLt15 }">
                <span class="na-thr-range">&lt; 15</span>
                <span class="na-thr-label">ห้ามใช้</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- ── Row 2: Absolute contraindications — highest priority warning ── -->
      <div
        v-if="result.absoluteContraindications.length"
        class="na-abs-ci-banner"
      >
        <PhProhibit :size="20" class="na-abs-ci-icon" />
        <div class="na-abs-ci-body">
          <span class="na-abs-ci-title">ข้อห้ามใช้สัมบูรณ์ — ห้ามจ่ายยา NOACs</span>
          <ul class="na-abs-ci-list">
            <li v-for="(ci, i) in result.absoluteContraindications" :key="i">{{ ci }}</li>
          </ul>
        </div>
      </div>

      <!-- ── Row 3: General precautions banner (collapsible) ────── -->
      <div
        v-if="result.generalPrecautions.length"
        class="na-precautions"
      >
        <PhWarning :size="16" class="na-precautions-icon" />
        <div class="na-precautions-body">
          <button
            class="na-precautions-toggle"
            :aria-expanded="precautionsOpen"
            @click="precautionsOpen = !precautionsOpen"
          >
            <span class="na-precautions-title">ข้อควรระวังสำหรับทุกยา NOACs ({{ result.generalPrecautions.length }})</span>
            <PhCaretDown :size="14" class="na-precautions-caret" :class="{ 'na-precautions-caret--open': precautionsOpen }" />
          </button>
          <ul v-if="precautionsOpen" class="na-precautions-list">
            <li v-for="(note, i) in result.generalPrecautions" :key="i">{{ note }}</li>
          </ul>
        </div>
      </div>

      <!-- ── Row 4: Recommendation card ──────────────────────── -->
      <div class="na-rec-card">

        <!-- Header zone (surface-light) -->
        <div class="na-rec-header">
          <span class="na-card-label">คำแนะนำการจ่ายยา</span>
          <p class="na-rec-sub">คำนวณตามข้อมูลผู้ป่วย ณ วันนี้ — ยืนยันกับแพทย์ก่อนสั่งยา</p>
        </div>

        <!-- Body zone (white) — advisory (comparison) | concurrent meds -->
        <div class="na-rec-body">
         <div class="na-rec-context">

          <!-- Current vs recommended — merged advisory head (replaces tint banner + ranked list) -->
          <NoacCurrentVsRecommended
            bare
            :result="result"
            :last-dispensing="lastDispensing"
            :days-since="daysSince"
          />

          <!-- Concurrent medications — context for drug selection -->
          <div class="na-rec-meds">
            <span class="na-subsec-label">ยาที่ใช้ร่วมปัจจุบัน</span>
            <div v-if="p?.concurrentMedications?.length" class="na-med-compact-list">
              <div
                v-for="med in p.concurrentMedications"
                :key="med.name"
                class="na-med-compact-row"
              >
                <span class="na-med-compact-name">{{ med.name }}</span>
                <span class="na-med-compact-dose">{{ med.dose }}</span>
                <span
                  v-if="med.interactionLevel"
                  class="na-med-compact-badge"
                  :class="`med-badge--${med.interactionLevel}`"
                >{{ interactionLabel[med.interactionLevel] }}</span>
                <span v-else class="na-med-compact-badge med-badge--none">ไม่มี Interaction</span>
              </div>
            </div>
            <p v-else class="na-no-meds">ไม่มียาร่วมที่บันทึกไว้</p>
          </div>

         </div><!-- /na-rec-context -->
        </div><!-- /na-rec-body -->

        <!-- Footer action zone (surface-light) — primary action after review → compare -->
        <div class="na-rec-footer">
          <button class="na-dispense-cta" @click="drawerOpen = true">
            บันทึกการจ่ายยาสำหรับวันนี้
            <PhArrowRight :size="13" />
          </button>
        </div>
      </div>

      <!-- ── Row 5: Dispensing history log (read-only) ──────────── -->
      <div v-if="visibleHistory.length" class="na-hist-card">
        <div class="na-hist-header">
          <div class="na-hist-title-wrap">
            <span class="na-hist-title">ประวัติการจ่ายยา</span>
            <span class="na-hist-subtitle">NOAC DISPENSING LOG</span>
          </div>
          <span class="na-hist-count">แสดง {{ visibleHistory.length }} / {{ historyNewestFirst.length }} รายการ</span>
        </div>
        <table class="na-hist-table">
          <thead>
            <tr>
              <th>วันที่จ่าย</th>
              <th>ยาที่จ่าย</th>
              <th>CrCl</th>
              <th>แนวทางการจ่ายยา</th>
              <th>หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(rec, idx) in visibleHistory"
              :key="rec.id"
              class="na-hist-row"
              :class="rec.clinicalStatus && rec.clinicalStatus !== 'appropriate' ? `na-hist-row--${rec.clinicalStatus}` : ''"
            >
              <!-- Date — absolute BE + relative (Pattern 10) -->
              <td class="na-hist-date">
                <span class="na-hist-date-abs">
                  {{ dispenseDate(rec.dispensedAt).date }}
                  <span v-if="idx === 0" class="na-hist-latest-tag">ล่าสุด</span>
                </span>
                <span class="na-hist-date-rel">{{ dispenseDate(rec.dispensedAt).rel }}</span>
              </td>

              <!-- Drug + dose, or withheld marker -->
              <td>
                <span v-if="rec.dispensed === false" class="na-hist-withheld">
                  <PhProhibit :size="12" weight="bold" />งดจ่ายยา
                </span>
                <template v-else>
                  <div class="na-hist-drug">
                    <span class="na-hist-drug-name">{{ rec.drugDispensed ? drugNameMap[rec.drugDispensed] : '—' }}</span>
                    <span class="na-hist-drug-dose">{{ rec.dose }}</span>
                  </div>
                  <span
                    v-if="rec.clinicalStatus && rec.clinicalStatus !== 'appropriate'"
                    class="na-hist-status"
                    :class="`na-hist-status--${rec.clinicalStatus}`"
                  >{{ clinicalStatusLabel[rec.clinicalStatus] }}</span>
                </template>
              </td>

              <!-- CrCl at this visit -->
              <td class="na-hist-crcl">
                <span class="na-hist-crcl-num">{{ rec.labData.crClMlMin }}</span>
                <span class="na-hist-crcl-unit">mL/min</span>
              </td>

              <!-- Concordance with system recommendation (shared canonical chip) -->
              <td>
                <span v-if="rec.dispensed === false" class="na-hist-na">—</span>
                <span v-else class="concordance-badge" :class="concordanceBadgeClass(rec)">{{ concordanceLabel(rec) }}</span>
              </td>

              <!-- Note (withhold reason takes precedence) -->
              <td class="na-hist-note">{{ rec.dispensed === false ? rec.withholdReason : (rec.pharmacistNote || rec.overrideNote || '—') }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="historyNewestFirst.length > HISTORY_PREVIEW_COUNT" class="na-hist-show-more">
          <button class="na-btn-show-more" @click="showAllHistory = !showAllHistory">
            <PhCaretDown :size="13" :style="showAllHistory ? 'transform:rotate(180deg);transition:transform .2s' : 'transition:transform .2s'" />
            {{ showAllHistory ? 'ย่อประวัติ' : `ดูประวัติทั้งหมด (${historyNewestFirst.length} visits)` }}
          </button>
        </div>
      </div>

      <!-- ── Row 6: NOAC dosing reference (drug-agnostic lookup, collapsible) ── -->
      <NoacReferenceTable />

    </template>
  </div>

  <!-- ── NOACs Dispensing Drawer ─────────────────── -->
  <NoacDispensingDrawer
    v-if="noacData && p"
    :is-open="drawerOpen"
    :patient-id="props.patientId"
    :noac-data="noacData"
    :patient-detail="p"
    @close="drawerOpen = false"
    @saved="onDispensingRecordSaved"
  />
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, watch, onMounted } from 'vue'
import { PhWarning, PhProhibit, PhArrowRight, PhCheck, PhCaretDown } from '@phosphor-icons/vue'
import type { PatientDetail } from '@/data/types/patient-detail'
import type { NoacIndication } from '@/data/types/noac'
import { concordanceLabel, concordanceBadgeClass } from '@/utils/noac-helpers'
import type { NoacPatientData, NoacDispensingRecord, NoacClinicalStatus } from '@/data/types/noac-dispensing'
import { formatThaiDate } from '@/utils/date'
import { repo } from '@/data/repository'
import { computeNoacRecommendations } from '@/utils/noacEngine'
import { useCrCl } from '@/composables/useCrCl'
import NoacDispensingDrawer from '@/components/noac/NoacDispensingDrawer.vue'
import NoacReferenceTable from '@/components/noac/NoacReferenceTable.vue'
import NoacCurrentVsRecommended from '@/components/noac/NoacCurrentVsRecommended.vue'

const props = defineProps<{
  patientId: string
  embedded?:  boolean
}>()

// shallowRef: large read-only source maps — avoid Vue deep-proxying the whole
// dataset (perf at scale) and keep nested values as plain objects.
const allDetail = shallowRef<Record<string, PatientDetail>>({})
const allNoac   = shallowRef<Record<string, NoacPatientData>>({})
const loading   = ref(true)
const loadError = ref('')

/** Patient demographics + concurrent medications */
const p        = computed<PatientDetail | null>(() => allDetail.value[props.patientId] ?? null)

/** NOACs clinical data — seeded into a reactive store so a dispensing save
 *  propagates to latestLab / result / CrCl / suggestion / history table without
 *  a page reload. A JSON deep-clone keeps the source map immutable across remounts
 *  (a plain spread would share the nested dispensingHistory array). JSON clone is
 *  proxy-safe — structuredClone throws on Vue reactive proxies / module objects. */
const seedStore = (id: string): NoacPatientData | null => {
  const seed = allNoac.value[id] ?? null   // no fallback to a demo patient — not found → empty state
  return seed ? JSON.parse(JSON.stringify(seed)) as NoacPatientData : null
}
const noacStore = ref<NoacPatientData | null>(null)   // seeded after async load (see onMounted)
const noacData  = computed<NoacPatientData | null>(() => noacStore.value)

/** Most recent lab snapshot (last dispensing visit) */
const latestLab = computed(() => {
  const history = noacData.value?.dispensingHistory
  if (!history?.length) return null
  return history[history.length - 1].labData
})

const drawerOpen = ref(false)
const precautionsOpen = ref(false)

// Router reuses this component when only :id changes (no remount) → re-seed the store
// so navigating patient A → B doesn't leave A's data behind.
watch(() => props.patientId, (id) => {
  noacStore.value = seedStore(id)
  drawerOpen.value = false
})

onMounted(async () => {
  try {
    const [detail, noac] = await Promise.all([
      repo.getPatientDetails(),
      repo.getNoacPatients(),
    ])
    allDetail.value = detail
    allNoac.value   = noac
    noacStore.value = seedStore(props.patientId)
  } catch (e) {
    loadError.value = String(e)
    console.error('[NoacAlgorithm] load failed', e)
  } finally {
    loading.value = false
  }
})

function onDispensingRecordSaved(record: NoacDispensingRecord) {
  // Page owns the mutation (mirrors WarfarinDoseTool.onDrawerSaved). Pushing into
  // the reactive store refreshes latestLab, result, CrCl card, suggestion, and the
  // dispensing-history table automatically — no reload needed.
  const store = noacStore.value
  if (!store) return
  store.dispensingHistory.push(record)
  if (record.dispensed === false) {
    // Withheld (absolute CI) — current therapy unchanged; flag for review
    store.profile.needsReview = true
    return
  }
  if (record.drugDispensed) store.profile.currentDrug = record.drugDispensed
  store.profile.currentDose = record.dose
  store.profile.status      = record.clinicalStatus ?? 'appropriate'
  store.profile.needsReview = false
}

// ── Indication ─────────────────────────────────────────────────────────────
const indicationLabels: Record<NoacIndication, { full: string }> = {
  'NVAF': { full: 'ภาวะหัวใจเต้นผิดจังหวะ (AF)' },
  'DVT':  { full: 'ลิ่มเลือดอุดตันในหลอดเลือดดำ (DVT)' },
  'PE':   { full: 'ลิ่มเลือดอุดตันในปอด (PE)' },
  'CAT':  { full: 'ลิ่มเลือดที่เกี่ยวข้องกับมะเร็ง (CAT)' },
}
const indicationLabel = computed(() =>
  indicationLabels[noacData.value?.profile.indication ?? 'NVAF'],
)

// ── CrCl display ───────────────────────────────────────────────────────────
const {
  label:     crClLabel,
  numClass:  crClNumClass,
  badgeClass: crClBadgeClass,
  bandGte60,
  band30to59,
  band15to29,
  bandLt15,
} = useCrCl(() => latestLab.value?.crClMlMin)

// ── Engine ─────────────────────────────────────────────────────────────────
const result = computed(() => {
  const patient = p.value
  const lab     = latestLab.value
  const noac    = noacData.value
  if (!patient || !lab || !noac?.profile.indication) {
    return { drugs: [], generalPrecautions: [], absoluteContraindications: [] }
  }
  const profile = noac.profile
  return computeNoacRecommendations({
    age:              patient.age,
    sex:              patient.sex,
    weightKg:         lab.weightKg,
    scrMgDl:          lab.scrMgDl,
    crClMlMin:        lab.crClMlMin,
    concurrentMeds:   patient.concurrentMedications ?? [],
    indication:       profile.indication,
    dialysis:         profile.dialysis,
    mechanicalValve:  profile.mechanicalValve,
    pregnancy:        profile.pregnancy,
    activeBleeding:   profile.activeBleeding,
    childPughClass:   profile.childPughClass,
  })
})

// ── Clinical risk flags (active only) ─────────────────────────────────────
const activeFlags = computed(() => {
  const profile = noacData.value?.profile
  if (!profile) return []
  const flags: string[] = []
  if (profile.dialysis)        flags.push('Dialysis')
  if (profile.mechanicalValve) flags.push('ลิ้นหัวใจเทียม')
  if (profile.pregnancy)       flags.push('ตั้งครรภ์')
  if (profile.activeBleeding)  flags.push('เลือดออกเฉียบพลัน')
  if (profile.childPughClass === 'C') flags.push('Child-Pugh C')
  return flags
})

const safetySummary = computed(() => {
  const profile = noacData.value?.profile
  if (!profile) return 'ไม่มีข้อมูล'
  const parts: string[] = []
  if (!profile.dialysis)        parts.push('ไม่มี Dialysis')
  if (!profile.mechanicalValve) parts.push('ไม่มีลิ้นหัวใจเทียม')
  if (!profile.pregnancy)       parts.push('ไม่ตั้งครรภ์')
  if (!profile.activeBleeding)  parts.push('ไม่มีเลือดออก')
  if (profile.childPughClass)   parts.push(`Child-Pugh ${profile.childPughClass}`)
  return parts.join(' · ')
})

// ── Last dispensing suggestion ─────────────────────────────────────────────
const drugNameMap: Record<string, string> = {
  apixaban: 'Apixaban', rivaroxaban: 'Rivaroxaban',
  dabigatran: 'Dabigatran', edoxaban: 'Edoxaban',
}

const lastDispensing = computed(() => {
  const h = noacData.value?.dispensingHistory
  return h?.length ? h[h.length - 1] : null
})

const daysSince = computed(() => {
  const rec = lastDispensing.value
  if (!rec) return null
  const diff = Date.now() - new Date(rec.dispensedAt).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
})

// ── Labels ─────────────────────────────────────────────────────────────────
const interactionLabel: Record<string, string> = {
  'contraindicated': 'ห้ามใช้ร่วม',
  'warning':         'ต้องระวัง',
  'monitor':         'ติดตาม',
}

// ── Dispensing history table (Phase 1: read-only preview) ──────────────────
/** Newest-first copy — the just-saved record surfaces at the top of the table */
const HISTORY_PREVIEW_COUNT = 5
const showAllHistory = ref(false)
const historyNewestFirst = computed(() => {
  const h = noacData.value?.dispensingHistory ?? []
  return [...h].reverse()
})
const visibleHistory = computed(() =>
  showAllHistory.value ? historyNewestFirst.value : historyNewestFirst.value.slice(0, HISTORY_PREVIEW_COUNT),
)

const clinicalStatusLabel: Record<NoacClinicalStatus, string> = {
  'appropriate': 'เหมาะสม',
  'underdose':   'ขนาดต่ำ',
  'overdose':    'ขนาดเกิน',
  'contra':      'มีข้อห้าม',
  'interaction': 'Interaction',
}

/** Absolute BE date + relative days for the history table (DESIGN Pattern 10) */
function dispenseDate(iso: string) {
  const date = formatThaiDate(iso.slice(0, 10))
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  const rel  = days <= 0 ? 'วันนี้' : `${days} วันที่แล้ว`
  return { date, rel }
}
</script>

<style scoped>
/* ── Outer wrap ───────────────────────────────────────────── */
.na-wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Empty state ──────────────────────────────────────────── */
.na-empty {
  padding: 48px;
  text-align: center;
}
.na-empty-text {
  
  font-size: 14px;
  color: var(--bma-text-tertiary);
}

/* ── Base card ────────────────────────────────────────────── */
.na-card {
  background: var(--bma-surface);
  border: 1px solid var(--bma-border-card);
  border-radius: var(--bma-radius-lg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 16px 20px;
}

.na-card-label {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: var(--bma-text-primary);
  margin-bottom: 12px;
}

/* ── Top row ──────────────────────────────────────────────── */
/* Row 1 — equal-height proportional grid (mirrors WarfarinDoseTool .status-row) */
.na-top-row {
  display: grid;
  grid-template-columns: var(--bma-cols-status-row);
  gap: 16px;
  align-items: stretch;
}
.na-indication-card { min-width: 0; }
.na-kidney-card     { min-width: 0; }

/* Inner 2-column layout: hero left, threshold table right */
.na-kidney-inner {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  margin-top: 8px;
}
.na-crcl-left { flex-shrink: 0; }

/* Indication */
.na-indication-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.na-indication-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--bma-text-primary);
}
.na-indication-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--bma-radius-full);
  background: var(--bma-green-50);
  border: 1px solid var(--bma-green-200);
  font-family: var(--bma-font-data);
  font-size: 11px;
  font-weight: 700;
  color: var(--bma-green-700);
}

/* Patient parameter mini-stats */
.na-patient-params {
  display: flex;
  gap: 0;
  margin-top: 16px;
  border-top: 1px solid var(--bma-border-subtle);
  padding-top: 12px;
}
.na-param {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-right: 12px;
}
.na-param + .na-param {
  padding-left: 12px;
  border-left: 1px solid var(--bma-border-subtle);
}
.na-param:last-child { padding-right: 0; }
.na-param-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--bma-text-tertiary);
}
.na-param-label--en { font-family: var(--bma-font-data); }
.na-param-val-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.na-param-num {
  font-family: var(--bma-font-data);
  font-size: 18px;
  font-weight: 700;
  color: var(--bma-text-primary);
  line-height: 1;
}
.na-param-unit {
  font-family: var(--bma-font-data);
  font-size: 11px;
  color: var(--bma-text-tertiary);
}

/* Kidney card */
.na-crcl-hero {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 8px;
}
.na-crcl-num {
  font-family: var(--bma-font-data);
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
}
.na-crcl-unit {
  font-family: var(--bma-font-data);
  font-size: 13px;
  color: var(--bma-text-tertiary);
}
.crcl-num--normal  { color: var(--bma-success-text); }
.crcl-num--caution { color: var(--bma-urgency-text); }
.crcl-num--severe  { color: var(--bma-emergency); }

.na-crcl-badge {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: var(--bma-radius-full);
  margin-bottom: 8px;
}
.crcl-badge--normal  { background: var(--bma-success-bg);  color: var(--bma-success-text); }
.crcl-badge--caution { background: var(--bma-urgency-bg);  color: var(--bma-urgency-text); }
.crcl-badge--severe  { background: var(--bma-emergency-bg); color: var(--bma-emergency); }

.na-crcl-method {
  font-family: var(--bma-font-data);
  font-size: 10px;
  color: var(--bma-text-tertiary);
  margin-bottom: 8px;
  letter-spacing: 0.04em;
}

/* CrCl threshold bands */
.na-crcl-thresholds {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-left: 1px solid var(--bma-border-subtle);
  padding-left: 16px;
}
.na-threshold {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 6px;
  border-radius: 4px;
  opacity: 0.4;
  transition: opacity 0.15s;
}
.na-threshold--active  { opacity: 1; background: var(--bma-surface-light); }
.na-threshold--danger  { }
.na-thr-range {
  font-family: var(--bma-font-data);
  font-size: 11px;
  font-weight: 700;
  color: var(--bma-text-primary);
  min-width: 38px;
}
.na-thr-label {
  
  font-size: 11px;
  color: var(--bma-text-secondary);
}
.na-threshold--danger .na-thr-range,
.na-threshold--danger .na-thr-label { color: var(--bma-emergency); }

/* ── Absolute contraindication banner — highest priority ───── */
.na-abs-ci-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: var(--bma-emergency-bg-soft);
  border: 1px solid var(--bma-emergency);
  border-radius: var(--bma-radius-lg);
}
.na-abs-ci-icon { color: var(--bma-emergency); flex-shrink: 0; margin-top: 1px; }
.na-abs-ci-body { display: flex; flex-direction: column; gap: 8px; }
.na-abs-ci-title {
  font-size: 14px; font-weight: 700;
  color: var(--bma-emergency);
}
.na-abs-ci-list {
  margin: 0; padding-left: 16px;
  display: flex; flex-direction: column; gap: 4px;
}
.na-abs-ci-list li { font-size: 13px; color: var(--bma-emergency); }

/* ── Precautions banner ───────────────────────────────────── */
.na-precautions {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  background: var(--bma-urgency-bg);
  border: 1px solid var(--bma-urgency-ring);
  border-radius: var(--bma-radius-lg);
}
.na-precautions--critical {
  background: var(--bma-emergency-bg);
  border-color: var(--bma-emergency-ring);
}
.na-precautions-icon {
  color: var(--bma-urgency-text);
  flex-shrink: 0;
  margin-top: 1px;
}
.na-precautions--critical .na-precautions-icon { color: var(--bma-emergency); }
.na-precautions-body { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
.na-precautions-toggle {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  width: 100%; padding: 0; background: none; border: none; cursor: pointer;
  text-align: left; font-family: inherit;
}
.na-precautions-caret { color: var(--bma-urgency-text); flex-shrink: 0; transition: transform .15s; }
.na-precautions-caret--open { transform: rotate(180deg); }
.na-precautions-title {
  
  font-size: 13px;
  font-weight: 700;
  color: var(--bma-urgency-text);
}
.na-precautions--critical .na-precautions-title { color: var(--bma-emergency); }
.na-precautions-list {
  margin: 0; padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.na-precautions-list li {
  
  font-size: 12px;
  color: var(--bma-text-secondary);
  padding-left: 12px;
  position: relative;
}
.na-precautions-list li::before {
  content: '·';
  position: absolute;
  left: 3px;
  color: var(--bma-urgency-text);
}
.na-precautions--critical .na-precautions-list li::before { color: var(--bma-emergency); }

/* ── Drug section ─────────────────────────────────────────── */
/* ── Recommendation card ──────────────────────────────────── */
/* Recommendation card — canonical 3-part shell (mirrors WarfarinDoseTool .inr-hero) */
.na-rec-card {
  background: var(--bma-surface);
  border: 1px solid var(--bma-border-card);
  border-radius: var(--bma-radius-lg);
  box-shadow: var(--bma-shadow-card);
  display: flex; flex-direction: column;
  overflow: hidden;
}
.na-rec-header {
  display: flex; flex-direction: column; gap: 2px;
  padding: 12px 20px;
  background: var(--bma-surface-light);
  border-bottom: 1px solid var(--bma-border-subtle);
}
.na-rec-body {
  display: flex; flex-direction: column; gap: 12px;
  padding: 16px 20px;
}
.na-rec-sub  { font-size: 12px; color: var(--bma-text-tertiary); margin: 0; }
/* Footer action zone (surface-light) — separates the primary action from the body */
.na-rec-footer {
  padding: 12px 20px;
  background: var(--bma-surface-light);
  border-top: 1px solid var(--bma-border-subtle);
}

/* Clinical flags */
/* Clinical flags — inline chips (active only) */
.na-flags-row {
  display: flex; flex-wrap: wrap; gap: 8px;
  margin-top: 16px;
  border-top: 1px solid var(--bma-border-subtle);
  padding-top: 12px;
}
.na-flag-chip {
  display: inline-flex; align-items: center;
  padding: 2px 8px;
  background: var(--bma-emergency-bg); color: var(--bma-emergency);
  border: 1px solid var(--bma-emergency-ring);
  border-radius: var(--bma-radius-full);
  font-size: 12px; font-weight: 600;
}
.na-no-flags {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 12px; font-weight: 600;
  color: var(--bma-success-text);
}

/* Dispense CTA — matches consult-dose-cta pattern */
/* Primary CTA — filled green, mirrors WarfarinDoseTool .inr-hero-cta */
.na-dispense-cta {
  display: inline-flex; align-items: center; gap: 7px;
  height: 34px; padding: 0 18px;
  background: var(--bma-green-500);
  border: none;
  border-radius: var(--bma-radius-md);
  font-size: 13px; font-weight: 700;
  color: var(--bma-surface);
  cursor: pointer;
  transition: background var(--bma-transition-fast);
}
.na-dispense-cta:hover { background: var(--bma-green-600); }

/* Recommendation card body — advisory (comparison) | concurrent meds */
.na-rec-context { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 20px; align-items: start; }
.na-rec-meds { display: flex; flex-direction: column; gap: 8px; }

/* Thai section label — Sarabun, used by advisory + meds */
.na-subsec-label {
  font-size: 11px; font-weight: 700;
  color: var(--bma-text-tertiary);
}
.na-med-compact-list { display: flex; flex-direction: column; gap: 4px; }
.na-med-compact-row {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  font-size: 13px;
}
.na-med-compact-name { font-family: var(--bma-font-data); font-weight: 600; color: var(--bma-text-primary); }
.na-med-compact-dose { font-family: var(--bma-font-data); font-size: 12px; color: var(--bma-text-tertiary); }
.na-med-compact-badge {
  display: inline-flex; align-items: center;
  font-size: 11px; font-weight: 600;
  padding: 2px 8px; border-radius: var(--bma-radius-full);
  white-space: nowrap;
}
.na-no-meds { font-size: 12px; color: var(--bma-text-tertiary); margin: 0; }
.med-badge--contraindicated { background: var(--bma-emergency-bg);   color: var(--bma-emergency); }
.med-badge--warning         { background: var(--bma-urgency-bg);     color: var(--bma-urgency-text); }
.med-badge--monitor         { background: var(--bma-surface-subtle);  color: var(--bma-text-tertiary); }
.med-badge--none            { background: var(--bma-surface-subtle);  color: var(--bma-text-tertiary); }

/* ── Dispensing history table (Row 4, read-only) ───────────── */
/* Edge-to-edge log card — seamless rows flush to card edges (mirrors .log-card) */
.na-hist-card {
  background: var(--bma-surface); border-radius: var(--bma-radius-lg);
  border: 1px solid var(--bma-border-card); box-shadow: var(--bma-shadow-card);
  overflow: hidden;
}
.na-hist-header {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 14px 18px; border-bottom: 1px solid var(--bma-border-subtle);
}
.na-hist-title-wrap { display: flex; align-items: center; gap: 8px; }
.na-hist-title { font-size: 14px; font-weight: 700; color: var(--bma-text-primary); }
.na-hist-subtitle {
  font-family: var(--bma-font-data); font-size: 10px; font-weight: 700;
  color: var(--bma-text-tertiary); background: var(--bma-surface-subtle);
  border: 1px solid var(--bma-border-card);
  padding: 2px 8px; border-radius: var(--bma-radius-full); letter-spacing: .04em;
}
/* Record-window meta (Pattern 14) — Sarabun (Thai phrase "แสดง N/N รายการ"), 11px tertiary 7:1 ✓ */
.na-hist-count {
  font-size: 11px; color: var(--bma-text-tertiary);
  white-space: nowrap;
}

.na-hist-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.na-hist-table thead tr {
  background: var(--bma-surface-light);
  border-bottom: 2px solid var(--bma-border-subtle);
}
/* 11px column eyebrow: --bma-text-secondary keeps WCAG AA (9.73:1 on light) */
.na-hist-table th {
  padding: 9px 14px; font-size: 11px; font-weight: 700;
  color: var(--bma-text-secondary); text-align: left; white-space: nowrap;
}
.na-hist-table td {
  padding: 10px 14px; color: var(--bma-text-primary); vertical-align: middle;
}
.na-hist-row { border-bottom: 1px solid var(--bma-border-subtle); transition: background .1s; }
.na-hist-row:last-child { border-bottom: none; }
.na-hist-row:hover { background: var(--bma-surface-light); }
/* Clinical-status row tints (DESIGN row-tint tokens) */
.na-hist-row--underdose   { background: var(--bma-row-underdose-bg); }
.na-hist-row--underdose:hover { background: var(--bma-row-underdose-hover); }
.na-hist-row--overdose,
.na-hist-row--contra,
.na-hist-row--interaction { background: var(--bma-row-overdose-bg); }
.na-hist-row--overdose:hover,
.na-hist-row--contra:hover,
.na-hist-row--interaction:hover { background: var(--bma-row-overdose-hover); }

.na-hist-date { white-space: nowrap; }
/* 10px "ล่าสุด" tag: green-600 (#006A33) on green-50 (#E6F5EE) = 8.6:1 ✓ WCAG AA */
.na-hist-latest-tag {
  display: inline-block; margin-left: 6px; padding: 1px 6px;
  border-radius: var(--bma-radius-full);
  background: var(--bma-green-50); color: var(--bma-green-600);
  font-size: 10px; font-weight: 700; vertical-align: middle;
}
.na-hist-date-abs {
  display: block; font-family: var(--bma-font-data); font-size: 13px; font-weight: 600;
  color: var(--bma-text-primary);
}
/* 11px relative time: --bma-text-tertiary (#595959) = 7.0:1 on white ✓ WCAG AA */
.na-hist-date-rel {
  display: block; font-size: 11px; color: var(--bma-text-tertiary); margin-top: 2px;
}

.na-hist-drug { display: flex; align-items: baseline; gap: 6px; }
.na-hist-drug-name { font-weight: 600; color: var(--bma-text-primary); }
.na-hist-drug-dose { font-family: var(--bma-font-data); font-size: 12px; color: var(--bma-text-tertiary); }
.na-hist-status {
  display: inline-block; margin-top: 4px; padding: 2px 8px; border-radius: var(--bma-radius-full);
  font-size: 11px; font-weight: 600;
}
.na-hist-status--underdose   { background: var(--bma-urgency-bg-solid); color: var(--bma-underdose-text); }
.na-hist-status--overdose    { background: var(--bma-emergency-bg);     color: var(--bma-emergency); }
.na-hist-status--contra      { background: var(--bma-contra-bg);        color: var(--bma-elective); }
.na-hist-status--interaction { background: var(--bma-interaction-bg);   color: var(--bma-interaction-text); }

.na-hist-crcl { white-space: nowrap; }
.na-hist-crcl-num  { font-family: var(--bma-font-data); font-weight: 700; color: var(--bma-text-primary); }
.na-hist-crcl-unit { font-family: var(--bma-font-data); font-size: 11px; color: var(--bma-text-tertiary); margin-left: 3px; }


.na-hist-note {
  font-size: 12px; color: var(--bma-text-tertiary); max-width: 240px;
}
.na-hist-withheld { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; color: var(--bma-emergency); white-space: nowrap; }
.na-hist-na { color: var(--bma-text-disabled); }
/* Show-more toggle (mirrors WarfarinDoseTool .btn-show-more) */
.na-hist-show-more {
  display: flex; justify-content: center;
  padding: 10px 18px; border-top: 1px solid var(--bma-border-subtle);
}
.na-btn-show-more {
  display: inline-flex; align-items: center; gap: 5px;
  background: none; border: none; cursor: pointer;
  font-size: 13px; font-weight: 600; color: var(--bma-green-500);
}

/* ── Responsive ────────────────────────────────────────────── */
@media (max-width: 767px) {
  /* .na-top-row columns collapse via --bma-cols-status-row token (overrides.scss) */
  .na-rec-context { grid-template-columns: 1fr; }   /* advisory + meds stack */
  .na-dispense-cta { width: 100%; justify-content: center; }
  .na-patient-params { flex-wrap: wrap; }
  .na-param { min-width: 80px; }
  .na-hist-card { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .na-hist-table { min-width: 560px; }
}
</style>
