<template>
  <div class="na-wrap">

    <!-- ── Empty / no-data state ──────────────────────────── -->
    <div v-if="!p || !noacData?.profile || !latestLab" class="na-empty">
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
            <div class="na-param">
              <span class="na-param-label">HAS-BLED</span>
              <div class="na-param-val-row">
                <span class="na-param-num" :class="hasbledClass">{{ noacData?.profile.hasBleedScore }}</span>
                <span class="na-param-unit" :class="hasbledClass">/ 9</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Kidney Function card -->
        <div class="na-card na-kidney-card">
          <span class="na-card-label">การทำงานของไต (CrCl)</span>
          <div class="na-crcl-hero">
            <span class="na-crcl-num" :class="crClNumClass">{{ latestLab?.crClMlMin }}</span>
            <span class="na-crcl-unit">mL/min</span>
          </div>
          <span class="na-crcl-badge" :class="crClBadgeClass">{{ crClLabel }}</span>
          <div class="na-crcl-method">Cockcroft-Gault</div>
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

      <!-- ── Row 2: Precautions banner ──────────────────────── -->
      <div
        v-if="result.generalPrecautions.length"
        class="na-precautions"
        :class="{ 'na-precautions--critical': (noacData?.profile.hasBleedScore ?? 0) >= 5 }"
      >
        <PhWarning :size="16" class="na-precautions-icon" />
        <div class="na-precautions-body">
          <span class="na-precautions-title">ข้อควรระวังสำหรับทุกยา NOACs</span>
          <ul class="na-precautions-list">
            <li v-for="(note, i) in result.generalPrecautions" :key="i">{{ note }}</li>
          </ul>
        </div>
      </div>

      <!-- ── Row 3: Drug Recommendations ────────────────────── -->
      <div class="na-drug-section">
        <div class="na-drug-section-header">
          <span class="na-section-heading">คำแนะนำการจ่ายยา</span>
          <span class="na-section-sub">คำนวณตามข้อมูลผู้ป่วย ณ วันนี้ — ยืนยันกับแพทย์ก่อนสั่งยา</span>
        </div>
        <div class="na-drug-grid">
          <div
            v-for="drug in result.drugs"
            :key="drug.drug"
            class="na-drug-card"
            :class="`na-drug--${drug.level}`"
          >
            <!-- Card header: name + badge -->
            <div class="na-drug-hd">
              <div class="na-drug-names">
                <span class="na-drug-en">{{ drug.nameEn }}</span>
                <span class="na-drug-sub">{{ drug.nameThai }} · {{ drug.brandName }}</span>
              </div>
              <span class="na-level-badge" :class="`level-badge--${drug.level}`">
                {{ levelLabel[drug.level] }}
              </span>
            </div>

            <!-- Card body: dose -->
            <div class="na-drug-body" :class="{ 'na-drug-body--contra': drug.level === 'contraindicated' }">
              <div v-if="drug.level !== 'contraindicated'" class="na-dose-row">
                <span class="na-dose-num">{{ drug.doseAmount }}</span>
                <span class="na-dose-unit">{{ drug.doseUnit }}</span>
              </div>
              <div v-else class="na-contra-dash">—</div>

              <span class="na-dose-freq">{{ drug.frequencyThai }}<span v-if="drug.frequency !== '—'"> ({{ drug.frequency }})</span></span>

              <span v-if="drug.doseNote" class="na-dose-note">{{ drug.doseNote }}</span>
              <span v-if="drug.adjustmentReason" class="na-adj-note">
                <PhWarningCircle :size="11" class="na-note-icon" />
                {{ drug.adjustmentReason }}
              </span>
              <span v-if="drug.contraindicationReason" class="na-contra-note">
                <PhProhibit :size="11" class="na-note-icon" />
                {{ drug.contraindicationReason }}
              </span>
            </div>

            <!-- Card footer: interactions -->
            <div v-if="drug.interactions.length" class="na-drug-ixns">
              <div v-for="ix in drug.interactions" :key="ix.medicationName" class="na-ixn">
                <span class="na-ixn-dot" :class="`ixn-dot--${ix.severity}`" />
                <span class="na-ixn-text">
                  <strong>{{ ix.medicationName }}</strong>
                  <span> — {{ ix.note }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Row 4: Concurrent medications ──────────────────── -->
      <div v-if="p?.concurrentMedications?.length" class="na-card na-concurrent-card">
        <span class="na-card-label">ยาที่ใช้ร่วมอยู่ปัจจุบัน</span>
        <div class="na-med-list">
          <div v-for="med in p?.concurrentMedications" :key="med.name" class="na-med-row">
            <div class="na-med-info">
              <span class="na-med-name">{{ med.name }}</span>
              <span class="na-med-dose">{{ med.dose }}</span>
            </div>
            <span class="na-med-cat">{{ med.category }}</span>
            <span
              v-if="med.interactionLevel"
              class="na-med-badge"
              :class="`med-badge--${med.interactionLevel}`"
            >
              {{ interactionLabel[med.interactionLevel] }}
            </span>
            <span v-else class="na-med-badge med-badge--none">ไม่มี Interaction</span>
          </div>
        </div>
      </div>

      <!-- ── Row 5: Reference table (collapsible) ────────────── -->
      <div class="na-reference">
        <button class="na-ref-toggle" @click="showReference = !showReference">
          <PhCaretDown :size="13" class="na-ref-caret" :class="{ 'na-ref-caret--open': showReference }" />
          ตารางอ้างอิงขนาดยา NOACs — ข้อบ่งใช้ NVAF
        </button>

        <div v-show="showReference" class="na-ref-body">
          <table class="na-ref-table">
            <thead>
              <tr>
                <th>ยา</th>
                <th>ขนาดปกติ</th>
                <th>ขนาดยาที่ปรับลด</th>
                <th>เงื่อนไขการปรับลด</th>
                <th>ข้อห้ามใช้</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="na-ref-drug">Apixaban<br><span class="na-ref-brand">Eliquis®</span></td>
                <td class="na-ref-dose">5 mg BID</td>
                <td class="na-ref-dose">2.5 mg BID</td>
                <td>≥ 2 ใน 3: อายุ ≥80 ปี / น้ำหนัก ≤60 kg / SCr ≥1.5 mg/dL</td>
                <td class="na-ref-contra">CrCl &lt;15 mL/min</td>
              </tr>
              <tr>
                <td class="na-ref-drug">Rivaroxaban<br><span class="na-ref-brand">Xarelto®</span></td>
                <td class="na-ref-dose">20 mg OD</td>
                <td class="na-ref-dose">15 mg OD</td>
                <td>CrCl 15–49 mL/min</td>
                <td class="na-ref-contra">CrCl &lt;15 mL/min</td>
              </tr>
              <tr>
                <td class="na-ref-drug">Dabigatran<br><span class="na-ref-brand">Pradaxa®</span></td>
                <td class="na-ref-dose">150 mg BID</td>
                <td class="na-ref-dose">110 mg BID</td>
                <td>อายุ ≥75 ปี / CrCl 30–49 mL/min / P-gp inhibitor ร่วม</td>
                <td class="na-ref-contra">CrCl &lt;30 mL/min</td>
              </tr>
              <tr>
                <td class="na-ref-drug">Edoxaban<br><span class="na-ref-brand">Lixiana®</span></td>
                <td class="na-ref-dose">60 mg OD</td>
                <td class="na-ref-dose">30 mg OD</td>
                <td>CrCl 15–50 mL/min / น้ำหนัก ≤60 kg / P-gp inhibitor ร่วม</td>
                <td class="na-ref-contra">CrCl &lt;15 mL/min</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { PhWarning, PhWarningCircle, PhProhibit, PhCaretDown } from '@phosphor-icons/vue'
import type { PatientDetail } from '@/data/types/patient-detail'
import type { NoacIndication, RecommendationLevel } from '@/data/types/noac'
import type { NoacPatientData } from '@/data/types/noac-dispensing'
import allDetailRaw from '@/data/mock/patient-detail.json'
import allNoacRaw   from '@/data/mock/noac-patients.json'
import { computeNoacRecommendations } from '@/utils/noacEngine'
import { useCrCl } from '@/composables/useCrCl'

const props = defineProps<{
  patientId: string
  embedded?:  boolean
}>()

const allDetail = allDetailRaw as Record<string, PatientDetail>
const allNoac   = allNoacRaw   as Record<string, NoacPatientData>

/** Patient demographics + concurrent medications */
const p        = computed<PatientDetail | null>(() => allDetail[props.patientId] ?? allDetail['w002'] ?? null)
/** NOACs-specific clinical data */
const noacData = computed<NoacPatientData | null>(() => allNoac[props.patientId] ?? allNoac['w002'] ?? null)
/** Most recent lab snapshot (last dispensing visit) */
const latestLab = computed(() => {
  const history = noacData.value?.dispensingHistory
  if (!history?.length) return null
  return history[history.length - 1].labData
})

const showReference = ref(false)

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

// ── HAS-BLED ───────────────────────────────────────────────────────────────
const hasbledClass = computed(() => {
  const s = noacData.value?.profile.hasBleedScore ?? 0
  if (s >= 5) return 'hasbled--critical'
  if (s >= 3) return 'hasbled--high'
  return ''
})

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
    return { drugs: [], generalPrecautions: [] }
  }
  return computeNoacRecommendations({
    age:            patient.age,
    sex:            patient.sex,
    weightKg:       lab.weightKg,
    scrMgDl:        lab.scrMgDl,
    crClMlMin:      lab.crClMlMin,
    hasBleedScore:  noac.profile.hasBleedScore,
    concurrentMeds: patient.concurrentMedications ?? [],
  })
})

// ── Labels ─────────────────────────────────────────────────────────────────
const levelLabel: Record<RecommendationLevel, string> = {
  'recommended':     'แนะนำ',
  'dose-adjusted':   'ปรับขนาดยา',
  'caution':         'ควรระวัง',
  'contraindicated': 'ห้ามใช้',
}

const interactionLabel: Record<string, string> = {
  'contraindicated': 'ห้ามใช้ร่วม',
  'warning':         'ต้องระวัง',
  'monitor':         'ติดตาม',
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
  font-family: var(--bma-font-thai);
  font-size: 14px;
  color: var(--bma-text-muted);
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
  font-family: var(--bma-font-thai);
  font-size: 11px;
  font-weight: 600;
  color: var(--bma-text-muted);
  margin-bottom: 10px;
}

/* ── Top row ──────────────────────────────────────────────── */
.na-top-row {
  display: flex;
  gap: 14px;
}
.na-indication-card {
  flex: 1;
  min-width: 0;
}
.na-kidney-card {
  width: 240px;
  flex-shrink: 0;
}

/* Indication */
.na-indication-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.na-indication-name {
  font-family: var(--bma-font-thai);
  font-size: 17px;
  font-weight: 700;
  color: var(--bma-text-primary);
}
.na-indication-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--bma-radius-full);
  background: var(--bma-green-50);
  border: 1.5px solid var(--bma-green-200);
  font-family: var(--bma-font-data);
  font-size: 11px;
  font-weight: 700;
  color: var(--bma-green-700);
}

/* Patient parameter mini-stats */
.na-patient-params {
  display: flex;
  gap: 0;
  border-top: 1px solid var(--bma-border-subtle);
  padding-top: 14px;
}
.na-param {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-right: 14px;
}
.na-param + .na-param {
  padding-left: 14px;
  border-left: 1px solid var(--bma-border-subtle);
}
.na-param:last-child { padding-right: 0; }
.na-param-label {
  font-family: var(--bma-font-thai);
  font-size: 11px;
  font-weight: 600;
  color: var(--bma-text-muted);
}
.na-param-label--en { font-family: var(--bma-font-data); }
.na-param-val-row {
  display: flex;
  align-items: baseline;
  gap: 3px;
}
.na-param-num {
  font-family: var(--bma-font-data);
  font-size: 18px;
  font-weight: 900;
  color: var(--bma-text-primary);
  line-height: 1;
}
.na-param-unit {
  font-family: var(--bma-font-data);
  font-size: 11px;
  color: var(--bma-text-muted);
}

/* HAS-BLED coloring */
.hasbled--high     { color: var(--bma-urgency-text); }
.hasbled--critical { color: var(--bma-emergency); }

/* Kidney card */
.na-crcl-hero {
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin-bottom: 6px;
}
.na-crcl-num {
  font-family: var(--bma-font-data);
  font-size: 40px;
  font-weight: 900;
  line-height: 1;
}
.na-crcl-unit {
  font-family: var(--bma-font-data);
  font-size: 13px;
  color: var(--bma-text-muted);
}
.crcl-num--normal  { color: var(--bma-success-text); }
.crcl-num--caution { color: var(--bma-urgency-text); }
.crcl-num--severe  { color: var(--bma-emergency); }

.na-crcl-badge {
  display: inline-block;
  font-family: var(--bma-font-thai);
  font-size: 12px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: var(--bma-radius-full);
  margin-bottom: 10px;
}
.crcl-badge--normal  { background: var(--bma-success-bg);  color: var(--bma-success-text); }
.crcl-badge--caution { background: var(--bma-urgency-bg);  color: var(--bma-urgency-text); }
.crcl-badge--severe  { background: var(--bma-emergency-bg); color: var(--bma-emergency); }

.na-crcl-method {
  font-family: var(--bma-font-data);
  font-size: 10px;
  color: var(--bma-text-muted);
  margin-bottom: 10px;
  letter-spacing: 0.02em;
}

/* CrCl threshold bands */
.na-crcl-thresholds {
  display: flex;
  flex-direction: column;
  gap: 3px;
  border-top: 1px solid var(--bma-border-subtle);
  padding-top: 10px;
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
  font-family: var(--bma-font-thai);
  font-size: 11px;
  color: var(--bma-text-secondary);
}
.na-threshold--danger .na-thr-range,
.na-threshold--danger .na-thr-label { color: var(--bma-emergency); }

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
.na-precautions-body { display: flex; flex-direction: column; gap: 4px; }
.na-precautions-title {
  font-family: var(--bma-font-thai);
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
  gap: 3px;
}
.na-precautions-list li {
  font-family: var(--bma-font-thai);
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
.na-drug-section { display: flex; flex-direction: column; gap: 12px; }
.na-drug-section-header { display: flex; align-items: baseline; gap: 12px; }
.na-section-heading {
  font-family: var(--bma-font-thai);
  font-size: 15px;
  font-weight: 700;
  color: var(--bma-text-primary);
}
.na-section-sub {
  font-family: var(--bma-font-thai);
  font-size: 11px;
  color: var(--bma-text-muted);
}

/* Drug grid */
.na-drug-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

/* Drug card */
.na-drug-card {
  background: var(--bma-surface);
  border: 1px solid var(--bma-border-card);
  border-radius: var(--bma-radius-lg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.na-drug--contraindicated { border-color: rgba(183, 44, 44, 0.22); }
.na-drug--dose-adjusted   { border-color: rgba(251, 140, 0, 0.22); }
.na-drug--caution         { border-color: rgba(251, 140, 0, 0.15); }

/* Drug header */
.na-drug-hd {
  padding: 13px 14px 11px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.na-drug-names {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.na-drug-en {
  font-family: var(--bma-font-data);
  font-size: 14px;
  font-weight: 700;
  color: var(--bma-text-primary);
}
.na-drug-sub {
  font-family: var(--bma-font-thai);
  font-size: 10px;
  color: var(--bma-text-muted);
}

/* Level badge */
.na-level-badge {
  display: inline-block;
  font-family: var(--bma-font-data);
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: var(--bma-radius-full);
  white-space: nowrap;
  flex-shrink: 0;
  letter-spacing: 0.02em;
  margin-top: 1px;
}
.level-badge--recommended     { background: var(--bma-green-50);      color: var(--bma-success-text); }
.level-badge--dose-adjusted   { background: var(--bma-urgency-bg);    color: var(--bma-urgency-text); }
.level-badge--caution         { background: var(--bma-urgency-bg);    color: var(--bma-urgency-text); }
.level-badge--contraindicated { background: var(--bma-emergency-bg);  color: var(--bma-emergency); }

/* Drug body */
.na-drug-body {
  flex: 1;
  padding: 10px 14px 13px;
  border-top: 1px solid var(--bma-border-subtle);
  display: flex;
  flex-direction: column;
  gap: 0;
}
.na-drug-body--contra { opacity: 0.45; }

.na-dose-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 1px;
}
.na-dose-num {
  font-family: var(--bma-font-data);
  font-size: 28px;
  font-weight: 900;
  color: var(--bma-text-primary);
  line-height: 1;
}
.na-dose-unit {
  font-family: var(--bma-font-data);
  font-size: 13px;
  font-weight: 500;
  color: var(--bma-text-muted);
}
.na-contra-dash {
  font-family: var(--bma-font-data);
  font-size: 28px;
  color: var(--bma-text-disabled);
  line-height: 1;
  margin-bottom: 1px;
}
.na-dose-freq {
  font-family: var(--bma-font-thai);
  font-size: 12px;
  color: var(--bma-text-secondary);
  margin-bottom: 6px;
}
.na-dose-note {
  font-family: var(--bma-font-thai);
  font-size: 11px;
  color: var(--bma-text-muted);
  font-style: italic;
  margin-top: 2px;
}
.na-adj-note {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  font-family: var(--bma-font-thai);
  font-size: 11px;
  color: var(--bma-urgency-text);
  margin-top: 7px;
  line-height: 1.5;
}
.na-contra-note {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  font-family: var(--bma-font-thai);
  font-size: 11px;
  color: var(--bma-emergency);
  margin-top: 7px;
  line-height: 1.5;
}
.na-note-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

/* Drug interactions footer */
.na-drug-ixns {
  padding: 7px 14px 10px;
  border-top: 1px solid var(--bma-border-subtle);
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.na-ixn {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}
.na-ixn-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
}
.ixn-dot--contraindicated { background: var(--bma-emergency); }
.ixn-dot--warning         { background: var(--bma-urgency); }
.ixn-dot--monitor         { background: var(--bma-neutral-300); }
.na-ixn-text {
  font-family: var(--bma-font-thai);
  font-size: 11px;
  color: var(--bma-text-secondary);
  line-height: 1.5;
}
.na-ixn-text strong {
  color: var(--bma-text-primary);
  font-family: var(--bma-font-data);
}

/* ── Concurrent medications ───────────────────────────────── */
.na-concurrent-card { }
.na-med-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.na-med-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 9px 0;
}
.na-med-row + .na-med-row { border-top: 1px solid var(--bma-border-subtle); }
.na-med-info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.na-med-name {
  font-family: var(--bma-font-data);
  font-size: 13px;
  font-weight: 700;
  color: var(--bma-text-primary);
}
.na-med-dose {
  font-family: var(--bma-font-data);
  font-size: 12px;
  color: var(--bma-text-muted);
}
.na-med-cat {
  font-family: var(--bma-font-thai);
  font-size: 11px;
  color: var(--bma-text-muted);
  white-space: nowrap;
}
.na-med-badge {
  display: inline-block;
  font-family: var(--bma-font-thai);
  font-size: 11px;
  font-weight: 600;
  padding: 2px 9px;
  border-radius: var(--bma-radius-full);
  white-space: nowrap;
  flex-shrink: 0;
}
.med-badge--contraindicated { background: var(--bma-emergency-bg);  color: var(--bma-emergency); }
.med-badge--warning         { background: var(--bma-urgency-bg);    color: var(--bma-urgency-text); }
.med-badge--monitor         { background: var(--bma-surface-subtle); color: var(--bma-text-muted); }
.med-badge--none            { background: var(--bma-surface-subtle); color: var(--bma-text-muted); }

/* ── Reference table ──────────────────────────────────────── */
.na-reference { display: flex; flex-direction: column; gap: 0; }

.na-ref-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--bma-font-thai);
  font-size: 13px;
  font-weight: 600;
  color: var(--bma-text-secondary);
  transition: color var(--bma-transition-fast);
}
.na-ref-toggle:hover { color: var(--bma-text-primary); }

.na-ref-caret {
  transition: transform 0.2s ease-out;
  color: var(--bma-text-muted);
}
.na-ref-caret--open { transform: rotate(180deg); }

.na-ref-body {
  margin-top: 12px;
  background: var(--bma-surface);
  border: 1px solid var(--bma-border-card);
  border-radius: var(--bma-radius-lg);
  overflow: hidden;
}

.na-ref-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.na-ref-table thead tr {
  background: var(--bma-surface-light);
  border-bottom: 1.5px solid var(--bma-border-subtle);
}
.na-ref-table th {
  padding: 9px 14px;
  font-size: 11px;
  font-weight: 700;
  color: var(--bma-text-muted);
  text-align: left;
  white-space: nowrap;
  font-family: var(--bma-font-thai);
}
.na-ref-table tbody tr {
  border-bottom: 1px solid var(--bma-border-subtle);
}
.na-ref-table tbody tr:last-child { border-bottom: none; }
.na-ref-table td {
  padding: 10px 14px;
  color: var(--bma-text-primary);
  font-family: var(--bma-font-thai);
  vertical-align: middle;
}
.na-ref-drug {
  font-family: var(--bma-font-data) !important;
  font-weight: 700;
  font-size: 13px;
  white-space: nowrap;
}
.na-ref-brand {
  display: block;
  font-family: var(--bma-font-data);
  font-size: 10px;
  color: var(--bma-text-muted);
  font-weight: 400;
  margin-top: 1px;
}
.na-ref-dose {
  font-family: var(--bma-font-data) !important;
  font-weight: 700;
  white-space: nowrap;
}
.na-ref-contra {
  font-family: var(--bma-font-data) !important;
  font-weight: 600;
  color: var(--bma-emergency);
  white-space: nowrap;
}
</style>
