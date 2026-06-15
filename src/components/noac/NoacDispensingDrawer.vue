<template>
  <!-- ── Backdrop ─────────────────────────────────── -->
  <Transition name="ndd-overlay">
    <div
      v-if="isOpen"
      class="ndd-overlay"
      aria-hidden="true"
      @click="emit('close')"
    />
  </Transition>

  <!-- ── Drawer panel ──────────────────────────────── -->
  <Transition name="ndd-slide">
    <div
      v-if="isOpen"
      class="ndd-panel"
      role="dialog"
      aria-modal="true"
      :aria-label="`บันทึกการจ่ายยา NOACs — ${patientDetail?.name ?? ''}`"
    >

      <!-- ── Toast ──────────────────────────────────── -->
      <Transition name="ndd-toast">
        <div v-if="toast.show" class="ndd-toast" :class="`ndd-toast--${toast.type}`">
          <PhCheckCircle v-if="toast.type === 'success'" :size="16" />
          <PhWarning v-else :size="16" />
          {{ toast.message }}
        </div>
      </Transition>

      <!-- ── Header (fixed) ──────────────────────── -->
      <div class="ndd-header">
        <div class="ndd-header-top">
          <button class="ndd-close-btn" aria-label="ปิด" @click="emit('close')">
            <PhX :size="18" />
          </button>
          <div class="ndd-title-wrap">
            <span class="ndd-title">บันทึกการจ่ายยา NOACs</span>
          </div>
        </div>
        <!-- Context strip — matches WfDoseDrawer dwr-ctx pattern -->
        <div class="ndd-ctx">
          <div class="ndd-ctx-group">
            <span class="ndd-ctx-label">HN</span>
            <span class="ndd-ctx-hn">{{ patientDetail?.hn ?? patientId }}</span>
          </div>
          <div class="ndd-ctx-div" />
          <div class="ndd-ctx-group">
            <span class="ndd-ctx-label">CrCl</span>
            <span class="ndd-ctx-crcl" :class="crClBadgeClass">
              {{ labFields.crClMlMin }} mL/min
            </span>
          </div>
          <div class="ndd-ctx-div" />
          <div class="ndd-ctx-group">
            <span class="ndd-ctx-label">INDICATION</span>
            <span class="ndd-ctx-indication">{{ noacData.profile.indication }}</span>
          </div>
          <template v-if="labChanged">
            <div class="ndd-ctx-div" />
            <div class="ndd-ctx-group">
              <span class="ndd-ctx-label">LAB</span>
              <span class="ndd-ctx-lab-updated">อัปเดตแล้ว</span>
            </div>
          </template>
        </div>
      </div>

      <!-- ── Body (scrollable) ────────────────────── -->
      <div class="ndd-body" ref="bodyEl">

        <!-- Absolute contraindication banner -->
        <div
          v-if="localResult.absoluteContraindications.length"
          class="ndd-abs-ci-banner"
        >
          <PhProhibit :size="18" />
          <div class="ndd-abs-ci-text">
            <span class="ndd-abs-ci-title">ข้อห้ามใช้สัมบูรณ์ — ห้ามจ่ายยา NOACs</span>
            <span
              v-for="(ci, i) in localResult.absoluteContraindications"
              :key="i"
              class="ndd-abs-ci-item"
            >{{ ci }}</span>
          </div>
        </div>

        <!-- ① Lab values ─────────────────────────── -->
        <section class="ndd-section ndd-step">
          <div class="ndd-step-hd">
            <span class="ndd-step-num">1</span>
            <span class="ndd-step-title">ข้อมูล Lab ณ วันนี้</span>
          </div>
          <div class="ndd-lab-grid">
            <div class="ndd-lab-field">
              <label class="ndd-lab-label">CrCl (mL/min)</label>
              <input
                v-model.number="labFields.crClMlMin"
                type="number"
                min="0"
                max="200"
                step="0.1"
                class="ndd-lab-input"
                :class="{ 'ndd-lab-input--changed': labDelta.crCl }"
                @change="onLabChange"
              />
              <span v-if="labDelta.crCl" class="ndd-lab-delta">
                เดิม {{ prevLab?.crClMlMin }}
              </span>
            </div>
            <div class="ndd-lab-field">
              <label class="ndd-lab-label">น้ำหนัก (kg)</label>
              <input
                v-model.number="labFields.weightKg"
                type="number"
                min="20"
                max="200"
                step="0.1"
                class="ndd-lab-input"
                :class="{ 'ndd-lab-input--changed': labDelta.weight }"
                @change="onLabChange"
              />
              <span v-if="labDelta.weight" class="ndd-lab-delta">
                เดิม {{ prevLab?.weightKg }}
              </span>
            </div>
            <div class="ndd-lab-field">
              <label class="ndd-lab-label">SCr (mg/dL)</label>
              <input
                v-model.number="labFields.scrMgDl"
                type="number"
                min="0"
                max="20"
                step="0.01"
                class="ndd-lab-input"
                :class="{ 'ndd-lab-input--changed': labDelta.scr }"
                @change="onLabChange"
              />
              <span v-if="labDelta.scr" class="ndd-lab-delta">
                เดิม {{ prevLab?.scrMgDl }}
              </span>
            </div>
          </div>
          <p v-if="labChanged" class="ndd-lab-recompute-note">
            <PhArrowsClockwise :size="12" />
            คำแนะนำยาอัปเดตตาม Lab ใหม่
          </p>
        </section>

        <!-- ② General precautions ──────────────── -->
        <section
          v-if="localResult.generalPrecautions.length"
          class="ndd-section ndd-section--precautions"
        >
          <span class="ndd-section-eyebrow">ข้อควรระวัง</span>
          <ul class="ndd-precaution-list">
            <li
              v-for="(note, i) in localResult.generalPrecautions"
              :key="i"
              class="ndd-precaution-item"
            >
              <PhWarning :size="12" />
              {{ note }}
            </li>
          </ul>
        </section>

        <!-- ③ Drug selection ────────────────────── -->
        <section class="ndd-section ndd-step">
          <div class="ndd-step-hd">
            <span class="ndd-step-num">2</span>
            <span class="ndd-step-title">{{ isWithhold ? 'การจ่ายยา' : 'เลือกยาที่จ่าย' }}</span>
          </div>

          <!-- Withhold card — absolute CI: no drug can be dispensed, record the withhold -->
          <div v-if="isWithhold" class="ndd-withhold-card">
            <PhProhibit :size="20" />
            <div class="ndd-withhold-body">
              <span class="ndd-withhold-title">งดจ่ายยา NOACs</span>
              <span class="ndd-withhold-sub">{{ withholdReasonText }} — บันทึกเพื่อเก็บประวัติการตรวจ</span>
            </div>
          </div>

          <div v-else class="ndd-drug-list">
            <div
              v-for="(drug, idx) in localResult.drugs"
              :key="drug.drug"
              class="ndd-drug"
              :class="[
                selectedIdx === idx ? 'ndd-drug--selected' : '',
                drug.level === 'contraindicated' ? 'ndd-drug--contra' : '',
                selectedIdx === idx && (isDrugOverride || isDoseOverride) ? 'ndd-drug--override' : '',
              ]"
            >
              <!-- Head — selects the drug -->
              <button
                class="ndd-drug-head"
                :class="idx === 0 ? 'ndd-drug-head--rank-first' : ''"
                :disabled="drug.level === 'contraindicated' || isWithhold"
                @click="selectDrug(idx)"
              >
                <div class="ndd-drug-rank">
                  <PhCheck v-if="selectedIdx === idx" :size="14" weight="bold" class="ndd-drug-rank-check" />
                  <span v-else class="ndd-drug-rank-num">{{ idx + 1 }}</span>
                </div>

                <div class="ndd-drug-info">
                  <div class="ndd-drug-name-row">
                    <span class="ndd-drug-name">{{ drug.nameEn }}</span>
                    <span v-if="idx === 0" class="ndd-rec-chip">แนะนำ</span>
                    <span class="ndd-drug-thai">{{ drug.nameThai }}</span>
                  </div>
                  <div class="ndd-drug-dose-row">
                    <span class="ndd-drug-dose">{{ drug.doseAmount }} {{ drug.doseUnit }}</span>
                    <span v-if="drug.frequency && drug.frequency !== '—'" class="freq-chip" :title="drug.frequencyThai">{{ drug.frequency }}</span>
                  </div>
                  <span v-if="drug.loadingPhase" class="ndd-drug-loading">
                    <PhInfo :size="11" weight="bold" />เริ่ม {{ drug.loadingPhase.doseAmount }} {{ drug.loadingPhase.doseUnit }} {{ drug.loadingPhase.frequency }} ×{{ drug.loadingPhase.durationText }} → คงระดับ {{ drug.doseAmount }} {{ drug.doseUnit }} {{ drug.frequency }}
                  </span>
                  <span v-if="drug.contraindicationReason" class="ndd-drug-ci-reason">
                    <PhWarning :size="11" weight="bold" />{{ drug.contraindicationReason }}
                  </span>
                  <span v-if="drug.doseNote" class="ndd-drug-note">
                    <PhInfo :size="11" weight="bold" />{{ drug.doseNote }}
                  </span>
                </div>

                <span class="ndd-drug-level-badge" :class="`ndd-level--${drug.level}`">
                  <PhStar v-if="drug.level === 'recommended'" :size="10" weight="fill" />
                  {{ levelLabel[drug.level] }}
                </span>
              </button>

              <!-- Expand — criteria checklist vs current condition + dose-level choice -->
              <Transition name="ndd-expand">
                <div v-if="selectedIdx === idx && !isWithhold" class="ndd-drug-body">
                  <div class="ndd-crit">
                    <span class="ndd-crit-title">เกณฑ์ลดขนาดตามสภาวะคนไข้</span>
                    <template v-if="drug.criteria && drug.criteria.length">
                      <div
                        v-for="c in drug.criteria"
                        :key="c.key"
                        class="ndd-crit-row"
                        :class="c.met ? 'ndd-crit-row--met' : ''"
                      >
                        <PhX v-if="c.met" :size="12" weight="bold" class="ndd-crit-ic" />
                        <span v-else class="ndd-crit-spacer" aria-hidden="true" />
                        <span class="ndd-crit-label">{{ c.label }}</span>
                        <span class="ndd-crit-val">{{ c.patientValue }}</span>
                        <span class="ndd-crit-thr">· เกณฑ์ {{ c.threshold }}</span>
                      </div>
                    </template>
                    <span v-else class="ndd-crit-none">ไม่มีเกณฑ์ลดขนาดสำหรับข้อบ่งใช้นี้</span>
                  </div>

                  <div class="ndd-dose">
                    <span class="ndd-dose-label">ขนาดที่จ่าย</span>
                    <div class="ndd-seg">
                      <button
                        v-for="opt in doseOptions(drug)"
                        :key="opt.key"
                        class="ndd-seg-opt"
                        :class="selectedDose === opt.key ? 'ndd-seg-opt--active' : ''"
                        @click="selectDose(opt.key)"
                      >
                        <span class="ndd-seg-val">{{ opt.label }}</span>
                        <span v-if="opt.key === recommendedKey(drug)" class="ndd-seg-rec">
                          <PhStar :size="9" weight="fill" />แนะนำ
                        </span>
                      </button>
                    </div>
                    <span v-if="selectedStatus && selectedStatus !== 'appropriate'" class="ndd-dose-warn">
                      <PhWarning :size="12" weight="bold" />{{ statusLabel[selectedStatus as 'underdose' | 'overdose'] }}
                    </span>
                  </div>
                </div>
              </Transition>
            </div>
          </div>

        </section>

        <!-- ③ Override reason — when a non-rank-1 drug OR a non-recommended dose is chosen -->
        <Transition name="ndd-expand">
          <section v-if="needsOverride && !isWithhold" class="ndd-section ndd-step ndd-step--override">
            <div class="ndd-step-hd">
              <span class="ndd-step-num ndd-step-num--override">3</span>
              <span class="ndd-step-title ndd-step-title--override">
                {{ isDrugOverride && isDoseOverride ? 'ระบุเหตุผล (เลือกยา + ขนาดนอกคำแนะนำ)' : isDoseOverride ? 'ระบุเหตุผลที่จ่ายขนาดนอกคำแนะนำ' : 'ระบุเหตุผลที่เลือกยานอกแนวทาง' }}
              </span>
            </div>
            <select
              v-model="overrideCode"
              class="ndd-native-select"
              :class="{ 'ndd-native-select--empty': !overrideCode }"
            >
              <option value="" disabled>เลือกเหตุผล...</option>
              <option v-for="opt in OVERRIDE_OPTIONS" :key="opt.code" :value="opt.code">
                {{ opt.label }}
              </option>
            </select>
            <textarea
              v-model="overrideNote"
              class="ndd-native-textarea"
              placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)..."
              rows="2"
            />
          </section>
        </Transition>

        <!-- Days supply — step number shifts when override is active (hidden when withholding) -->
        <section v-if="!isWithhold" class="ndd-section ndd-step">
          <div class="ndd-step-hd">
            <span class="ndd-step-num">{{ daysSupplyStep }}</span>
            <span class="ndd-step-title">รายละเอียดการจ่ายยา</span>
          </div>
          <span class="ndd-subsection-label">จำนวนวันที่จ่าย (Days Supply)</span>
          <div class="ndd-seg">
            <button
              v-for="d in DAYS_OPTIONS"
              :key="d"
              class="ndd-seg-opt"
              :class="daysSupply === d ? 'ndd-seg-opt--active' : ''"
              @click="daysSupply = d"
            >
              <span class="ndd-seg-val">{{ d }} วัน</span>
              <span v-if="d === suggestedDays" class="ndd-seg-rec">
                <PhStar :size="9" weight="fill" />แนะนำ
              </span>
            </button>
          </div>
          <p v-if="daysCautionNote" class="ndd-days-caution">
            <PhInfo :size="12" />
            {{ daysCautionNote }}
          </p>
        </section>

        <!-- ⑤ Pharmacist note + save ───────────────── -->
        <section class="ndd-section ndd-section--last">
          <span class="ndd-subsection-label">หมายเหตุ (ไม่บังคับ)</span>
          <textarea
            v-model="pharmacistNote"
            class="ndd-native-textarea"
            placeholder="บันทึกเพิ่มเติม..."
            rows="3"
          />
          <div class="ndd-btn-row">
            <v-btn
              color="primary"
              variant="outlined"
              class="ndd-btn-consult"
              @click="forwardToConsult"
            >
              <PhChatCircle :size="16" />
              ส่งต่อปรึกษาเคส
            </v-btn>
            <v-btn
              color="confirm"
              variant="flat"
              :loading="isSaving"
              :disabled="!canSave"
              class="ndd-btn-save"
              @click="save"
            >
              <PhCheckCircle :size="16" />
              ยอมรับตามคำแนะนำ
            </v-btn>
          </div>
        </section>

      </div><!-- /ndd-body -->

    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import {
  PhX, PhCheckCircle, PhWarning, PhProhibit,
  PhStar, PhInfo, PhArrowsClockwise, PhCheck, PhChatCircle,
} from '@phosphor-icons/vue'
import type { PatientDetail } from '@/data/types/patient-detail'
import type { NoacOverrideCode, RecommendationLevel, DrugResult } from '@/data/types/noac'
import type { NoacPatientData, NoacDispensingRecord, NoacClinicalStatus } from '@/data/types/noac-dispensing'
import { computeNoacRecommendations } from '@/utils/noacEngine'
import { NOAC_REFERENCE, formatDose, followUpDaysForCrCl } from '@/data/noacReference'
import { useCrCl } from '@/composables/useCrCl'

/** Dose-level key — the two NVAF dose options every NOAC has in the reference. */
type DoseKey = 'standard' | 'reduced'

// ── Props / Emits ─────────────────────────────────────────────────────────────
const props = defineProps<{
  isOpen:        boolean
  patientId:     string
  noacData:      NoacPatientData
  patientDetail: PatientDetail | null
}>()

const emit = defineEmits<{
  close: []
  saved: [record: NoacDispensingRecord]
  forwardConsult: []
}>()

// ── Constants ─────────────────────────────────────────────────────────────────
const DAYS_OPTIONS = [30, 60, 90] as const   // capped at the renal-monitoring cadence (≤90)

const OVERRIDE_OPTIONS: { code: NoacOverrideCode; label: string }[] = [
  { code: 'patient-preference',    label: 'ผู้ป่วยต้องการยาเฉพาะ' },
  { code: 'cost-accessibility',    label: 'ค่าใช้จ่าย / ยาไม่พร้อมจ่าย' },
  { code: 'drug-interaction',      label: 'หลีกเลี่ยง Drug Interaction เฉพาะ' },
  { code: 'renal-function-change', label: 'ค่าไตเปลี่ยนแปลงต้องปรับยา' },
  { code: 'physician-directive',   label: 'แพทย์สั่งเฉพาะ' },
  { code: 'formulary-restriction', label: 'Formulary โรงพยาบาล' },
  { code: 'prior-adverse-event',   label: 'ประวัติ Adverse Event กับยาที่แนะนำ' },
  { code: 'other',                 label: 'อื่นๆ (ระบุในหมายเหตุ)' },
]

const levelLabel: Record<RecommendationLevel, string> = {
  recommended:     'ใช้ได้ทันที',
  'dose-adjusted': 'ปรับขนาดก่อนจ่าย',
  caution:         'ติดตามหลังจ่าย',
  contraindicated: 'ห้ามใช้',
}

// ── Reactive state ────────────────────────────────────────────────────────────
const prevLab = computed(() => {
  const h = props.noacData.dispensingHistory
  return h?.length ? h[h.length - 1].labData : null
})

const labFields = ref<{ weightKg: number; scrMgDl: number; crClMlMin: number }>({
  weightKg:  prevLab.value?.weightKg  ?? 60,
  scrMgDl:   prevLab.value?.scrMgDl   ?? 1.0,
  crClMlMin: prevLab.value?.crClMlMin ?? 60,
})

const selectedIdx    = ref<number | null>(null)   // null = ยังไม่เลือก (ไม่ pre-select)
const selectedDose   = ref<DoseKey | null>(null)  // dose level chosen for the selected drug
const overrideCode   = ref<NoacOverrideCode | ''>('')
const overrideNote   = ref('')
const daysSupply     = ref<30 | 60 | 90>(followUpDaysForCrCl(prevLab.value?.crClMlMin ?? 60))
const pharmacistNote = ref('')
const isSaving       = ref(false)
const bodyEl         = ref<HTMLElement | null>(null)

const toast = ref({ show: false, type: 'success' as 'success' | 'error', message: '' })

// ── Reset when drawer opens ────────────────────────────────────────────────────
watch(() => props.isOpen, (open) => {
  if (!open) return
  labFields.value = {
    weightKg:  prevLab.value?.weightKg  ?? 60,
    scrMgDl:   prevLab.value?.scrMgDl   ?? 1.0,
    crClMlMin: prevLab.value?.crClMlMin ?? 60,
  }
  selectedIdx.value  = null
  selectedDose.value = null
  overrideCode.value = ''
  overrideNote.value = ''
  pharmacistNote.value = ''
  daysSupply.value   = followUpDaysForCrCl(prevLab.value?.crClMlMin ?? 60)
  nextTick(() => { bodyEl.value?.scrollTo({ top: 0 }) })
})

// ── CrCl display ──────────────────────────────────────────────────────────────
const { badgeClass: crClBadgeClass } = useCrCl(
  () => labFields.value.crClMlMin
)

// ── Engine recompute ──────────────────────────────────────────────────────────
const localResult = computed(() => {
  const patient = props.patientDetail
  const profile = props.noacData.profile
  if (!patient) return { drugs: [], generalPrecautions: [], absoluteContraindications: [] }
  return computeNoacRecommendations({
    age:            patient.age,
    sex:            patient.sex,
    weightKg:       labFields.value.weightKg,
    scrMgDl:        labFields.value.scrMgDl,
    crClMlMin:      labFields.value.crClMlMin,
    concurrentMeds: patient.concurrentMedications ?? [],
    indication:     profile.indication,
    dialysis:       profile.dialysis,
    mechanicalValve: profile.mechanicalValve,
    pregnancy:      profile.pregnancy,
    activeBleeding: profile.activeBleeding,
    childPughClass: profile.childPughClass,
  })
})

// ── Lab delta ─────────────────────────────────────────────────────────────────
const labDelta = computed(() => {
  const prev = prevLab.value
  if (!prev) return { crCl: false, weight: false, scr: false }
  return {
    crCl:   Math.abs(labFields.value.crClMlMin - prev.crClMlMin) >= 1,
    weight: Math.abs(labFields.value.weightKg   - prev.weightKg)  >= 0.5,
    scr:    Math.abs(labFields.value.scrMgDl    - prev.scrMgDl)   >= 0.05,
  }
})

const labChanged = computed(() => Object.values(labDelta.value).some(Boolean))

function onLabChange() {
  // Lab changed → recommendations recompute; clear selection (pharmacist must re-choose)
  selectedIdx.value = null
  selectedDose.value = null
}

// ── Dose-level helpers ─────────────────────────────────────────────────────────
// Every NOAC has a standard + reduced NVAF dose in the reference. The engine's
// recommended dose (drug.doseAmount, condition-aware) matches one of them; the
// other is the deviation. Appropriateness = chosen dose vs the condition-correct
// dose — independent of which drug was picked.
interface DoseOption { key: DoseKey; label: string }

function recommendedKey(d: DrugResult): DoseKey {
  const reduced = NOAC_REFERENCE[d.drug].nvaf.reduced
  return reduced && d.doseAmount === reduced.amount ? 'reduced' : 'standard'
}
function doseOptions(d: DrugResult): DoseOption[] {
  const ref = NOAC_REFERENCE[d.drug].nvaf
  const opts: DoseOption[] = [{ key: 'standard', label: formatDose(ref.standard) }]
  if (ref.reduced) opts.push({ key: 'reduced', label: formatDose(ref.reduced) })
  return opts
}
/** clinicalStatus for a (drug, dose) vs the condition-correct dose. */
function statusFor(d: DrugResult, key: DoseKey): NoacClinicalStatus {
  if (key === recommendedKey(d)) return 'appropriate'
  return key === 'reduced' ? 'underdose' : 'overdose'   // gave less / more than condition needs
}

const statusLabel: Record<'underdose' | 'overdose', string> = {
  underdose: 'ต่ำกว่าที่สภาวะต้องการ (underdose)',
  overdose:  'สูงกว่าที่สภาวะต้องการ (overdose)',
}

// ── Selection state ────────────────────────────────────────────────────────────
const selectedDrug   = computed(() => selectedIdx.value !== null ? localResult.value.drugs[selectedIdx.value] : null)
const selectedStatus = computed<NoacClinicalStatus | null>(() =>
  selectedDrug.value && selectedDose.value ? statusFor(selectedDrug.value, selectedDose.value) : null)

const isDrugOverride = computed(() => selectedIdx.value !== null && selectedIdx.value !== 0)
const isDoseOverride = computed(() =>
  !!selectedDrug.value && !!selectedDose.value && selectedDose.value !== recommendedKey(selectedDrug.value))
const needsOverride  = computed(() => isDrugOverride.value || isDoseOverride.value)
const daysSupplyStep = computed(() => needsOverride.value ? 4 : 3)

function clearOverrideIfConcordant() {
  if (!needsOverride.value) { overrideCode.value = ''; overrideNote.value = '' }
}
function selectDrug(idx: number) {
  const drug = localResult.value.drugs[idx]
  if (drug?.level === 'contraindicated') return
  selectedIdx.value  = idx
  selectedDose.value = recommendedKey(drug)   // default to the condition-correct dose
  clearOverrideIfConcordant()
}
function selectDose(key: DoseKey) {
  selectedDose.value = key
  clearOverrideIfConcordant()
}

// ── Days supply suggestions ───────────────────────────────────────────────────
// Suggested supply = the renal-monitoring cadence for the CURRENT CrCl (shared with the generator)
const suggestedDays = computed((): 30 | 60 | 90 => followUpDaysForCrCl(labFields.value.crClMlMin))

const daysCautionNote = computed((): string | null => {
  const crcl = labFields.value.crClMlMin
  if (crcl < 30) return `CrCl ${crcl} mL/min: การทำงานของไตต่ำ — นัดตรวจ Lab ซ้ำทุก 30 วันก่อน refill`
  if (crcl < 60) return `CrCl ${crcl} mL/min: นัดตรวจ Lab ซ้ำทุก ~60 วัน`
  return null
})

// ── Validation ─────────────────────────────────────────────────────────────────
// Withhold = NO NOAC is dispensable (total CI: valve/pregnancy/bleeding/Child-Pugh C,
// or CrCl too low for every drug). Dialysis is NOT total — Apixaban stays usable.
const isWithhold = computed(() => {
  const ds = localResult.value.drugs
  return ds.length > 0 && ds.every(d => d.level === 'contraindicated')
})
const withholdReasonText = computed(() =>
  localResult.value.absoluteContraindications.length
    ? localResult.value.absoluteContraindications.join(' · ')
    : 'ไม่มี NOAC ที่จ่ายได้ตาม Lab ปัจจุบัน (CrCl ต่ำเกินไป)',
)
const canSave = computed(() => {
  if (isWithhold.value) return true   // withhold can always be recorded (audit trail)
  if (selectedIdx.value === null || selectedDose.value === null) return false   // must actively choose drug + dose
  const drug = localResult.value.drugs[selectedIdx.value]
  if (!drug || drug.level === 'contraindicated') return false
  if (needsOverride.value && !overrideCode.value) return false
  return true
})

// ── Save ──────────────────────────────────────────────────────────────────────
// Unidirectional, mirrors WfDoseDrawer → WarfarinDoseTool: the drawer does NOT mutate
// props. It emits the record; NoacAlgorithm.onDispensingRecordSaved applies it.
// "ส่งต่อปรึกษาเคส" — secondary action. Behaviour TBD; emits an event the parent
// can wire later (forward this case to the consultation room).
function forwardToConsult() {
  emit('forwardConsult')
}

async function save() {
  if (!canSave.value) return
  isSaving.value = true

  const now = new Date()
  const labData = {
    weightKg:   labFields.value.weightKg,
    scrMgDl:    labFields.value.scrMgDl,
    crClMlMin:  labFields.value.crClMlMin,
    measuredAt: now.toISOString().slice(0, 10),
  }
  const followUp = (days: number) => {
    const d = new Date(now); d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
  }

  let record: NoacDispensingRecord
  if (isWithhold.value) {
    record = {
      id:               `disp-${Date.now()}`,
      patientId:        props.patientId,
      dispensedAt:      now.toISOString(),
      labData,
      dispensed:        false,
      dose:             '—',
      withholdReason:   withholdReasonText.value,
      systemRank:       0,
      wasTopRecommendation: false,
      pharmacistNote:   pharmacistNote.value || null,
      nextFollowUpDate: followUp(14),   // re-evaluate sooner when withholding
      schemaVersion:    1,
    }
  } else {
    const idx = selectedIdx.value
    const doseKey = selectedDose.value
    if (idx === null || doseKey === null) { isSaving.value = false; return }
    const drug = localResult.value.drugs[idx]
    const ref = NOAC_REFERENCE[drug.drug].nvaf
    const chosen = doseKey === 'reduced' && ref.reduced ? ref.reduced : ref.standard
    const lp = drug.loadingPhase
    const doseStr = lp
      ? `${lp.doseAmount} ${lp.doseUnit} ${lp.frequency} ×${lp.durationText} → ${formatDose(chosen)}`
      : formatDose(chosen)
    record = {
      id:               `disp-${Date.now()}`,
      patientId:        props.patientId,
      dispensedAt:      now.toISOString(),
      labData,
      dispensed:        true,
      drugDispensed:    drug.drug,
      dose:             doseStr,
      systemRank:       idx + 1,
      wasTopRecommendation: idx === 0 && doseKey === recommendedKey(drug),
      clinicalStatus:   statusFor(drug, doseKey),
      overrideCode:     needsOverride.value ? (overrideCode.value as NoacOverrideCode) : undefined,
      overrideNote:     overrideNote.value || undefined,
      pharmacistNote:   pharmacistNote.value || null,
      nextFollowUpDate: followUp(daysSupply.value),
      daysSupply:       daysSupply.value,
      schemaVersion:    1,
    }
  }

  isSaving.value = false
  toast.value = { show: true, type: 'success', message: isWithhold.value ? 'บันทึกการตัดสินใจงดจ่ายยาแล้ว' : 'บันทึกการตัดสินใจแล้ว — ดำเนินการสั่งจ่ายในระบบ HIS' }
  setTimeout(() => { toast.value.show = false }, 1400)
  setTimeout(() => emit('saved', record), 1400)
  setTimeout(() => emit('close'), 1500)
}
</script>

<style scoped>
/* ── Overlay — z-index matches WfDoseDrawer (must clear Vuetify nav) ──── */
.ndd-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.32);
  z-index: 1100;
}

/* ── Drawer panel ──────────────────────────────────────────────────────── */
.ndd-panel {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: var(--bma-drawer-width, 42%);
  min-width: var(--bma-drawer-min-width, 440px);
  background: var(--bma-surface);
  box-shadow: -6px 0 32px rgba(0, 0, 0, 0.14);
  z-index: 1101;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Toast ───────────────────────────────────────────────────── */
.ndd-toast {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: var(--bma-radius-full);
  font-size: 13px;
  font-weight: 600;
  z-index: 10;
}
.ndd-toast--success { background: var(--bma-green-toast); color: var(--bma-surface); }
.ndd-toast--error   { background: var(--bma-emergency); color: var(--bma-surface); }

/* ── Header — mirrors WfDoseDrawer exactly ─────────────────────────────── */
.ndd-header {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--bma-border-subtle);
  flex-shrink: 0;
  background: var(--bma-surface);
}
.ndd-header-top {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
}
/* Bordered close button (matches dwr-close-btn) */
.ndd-close-btn {
  width: 32px; height: 32px;
  border-radius: var(--bma-radius-md);
  border: 1.5px solid var(--bma-border);
  background: var(--bma-surface);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0;
  color: var(--bma-text-tertiary);
  transition: background var(--bma-transition-fast);
}
.ndd-close-btn:hover { background: var(--bma-surface-subtle); }
.ndd-title-wrap { display: flex; align-items: center; gap: 8px; }
.ndd-title {
  font-size: 14px; font-weight: 700;
  color: var(--bma-text-primary);
}
/* ndd-subtitle removed — patient info lives in context strip only */

/* Context strip — horizontal divider row (matches dwr-ctx) */
.ndd-ctx {
  display: flex;
  align-items: stretch;
  border-top: 1px solid var(--bma-border-subtle);
  background: var(--bma-surface-light);
}
.ndd-ctx-group {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px 12px;
  flex: 1;
}
.ndd-ctx-div {
  width: 1px;
  background: var(--bma-border-subtle);
  flex-shrink: 0;
}
/* Eyebrow label style — matches dwr-ctx-label */
.ndd-ctx-label {
  font-family: var(--bma-font-data);
  font-size: 10px; font-weight: 700;
  color: var(--bma-text-tertiary);
  text-transform: uppercase;
  letter-spacing: .07em;
}
.ndd-ctx-hn {
  font-family: var(--bma-font-data);
  font-size: 13px; font-weight: 700;
  color: var(--bma-text-primary);
}
.ndd-ctx-crcl {
  font-family: var(--bma-font-data);
  font-size: 11px; font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--bma-radius-full);
  align-self: flex-start;
}
.ndd-ctx-indication {
  font-family: var(--bma-font-data);
  font-size: 12px; font-weight: 700;
  color: var(--bma-elective);
  background: var(--bma-elective-bg);
  padding: 2px 8px;
  border-radius: var(--bma-radius-full);
  align-self: flex-start;
}
.ndd-ctx-lab-updated {
  font-size: 11px; font-weight: 700;
  color: var(--inr-supra-text);
  background: var(--inr-supra-bg);
  padding: 2px 8px;
  border-radius: var(--bma-radius-full);
  align-self: flex-start;
}

/* ── Body — matches dwr-body exactly ──────────────────────────── */
.ndd-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--bma-surface);
}

/* ── Absolute CI banner ──────────────────────────────────────── */
.ndd-abs-ci-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background: var(--bma-emergency-bg-soft);
  border: 1px solid var(--bma-emergency-ring);
  border-radius: var(--bma-radius-md);
  color: var(--bma-emergency);
}
.ndd-abs-ci-text { display: flex; flex-direction: column; gap: 4px; }
.ndd-abs-ci-title { font-size: 13px; font-weight: 700; }
.ndd-abs-ci-item  { font-size: 12px; }

/* ── Sections — no padding (body handles it), border-top between steps ── */
.ndd-section { /* base — additional class on ndd-step handles border */ }
.ndd-section--precautions { background: var(--bma-urgency-bg-soft); border-radius: var(--bma-radius-md); padding: 12px; }
.ndd-section--last { display: flex; flex-direction: column; gap: 8px; }
/* ── Step structure — exact dwr-step values ─────────────────── */
.ndd-step { display: flex; flex-direction: column; gap: 8px; }
.ndd-step + .ndd-step { padding-top: 16px; border-top: 1px solid var(--bma-border-subtle); }
.ndd-step-hd { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
.ndd-step-num {
  width: 20px; height: 20px; border-radius: 50%;
  background: var(--bma-green-500); color: var(--bma-surface);
  font-family: var(--bma-font-data); font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.ndd-step-num--override       { background: var(--inr-supra-text); }
.ndd-step-title {
  font-size: 11px; font-weight: 700;
  color: var(--bma-text-secondary);
  text-transform: uppercase; letter-spacing: .05em;
}
.ndd-step-title--override { color: var(--inr-supra-text); }
/* Sub-label within a step */
.ndd-subsection-label {
  display: block;
  font-size: 10px; font-weight: 700;
  letter-spacing: .07em; text-transform: uppercase;
  color: var(--bma-text-tertiary);
  margin-bottom: 8px;
}
/* Legacy eyebrow (kept for override section only) */
.ndd-section-eyebrow--override { color: var(--inr-supra-text); font-size: 10px; font-weight: 700; }

/* ── Lab grid ────────────────────────────────────────────────── */
.ndd-lab-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 8px;
}
.ndd-lab-field { display: flex; flex-direction: column; gap: 4px; }
/* Labels — matches dwr-lbl */
.ndd-lab-label {
  font-size: 11px; font-weight: 600;
  color: var(--bma-text-secondary);
  display: block; margin-bottom: 4px;
}
/* Inputs — numbers use --bma-font-data per DESIGN.md */
.ndd-lab-input {
  height: 36px;
  border: 1.5px solid var(--bma-border);
  border-radius: 8px;
  padding: 0 8px;
  font-family: var(--bma-font-data);
  font-size: 13px;
  color: var(--bma-text-primary);
  background: var(--bma-surface);
  outline: none;
  transition: border-color .15s;
  width: 100%;
}
.ndd-lab-input:focus { border-color: var(--bma-green-500); }
.ndd-lab-input--changed { border-color: var(--inr-supra-ring); background: var(--inr-supra-bg); }
.ndd-lab-delta {
  font-size: 10px;
  color: var(--inr-supra-text);
}
.ndd-lab-recompute-note {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--inr-supra-text);
}

/* ── Precautions ─────────────────────────────────────────────── */
.ndd-precaution-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.ndd-precaution-item {
  display: flex; align-items: flex-start; gap: 8px;
  font-size: 12px;
  color: var(--bma-urgency-text);
}

/* ── Drug cards ──────────────────────────────────────────────── */
.ndd-drug-list { display: flex; flex-direction: column; gap: 8px; }

/* Wrapper card — owns the border + selected state, expands to reveal the body */
.ndd-drug {
  border: 1.5px solid var(--bma-border-card);
  border-radius: var(--bma-radius-md);
  background: var(--bma-surface);
  overflow: hidden;
  transition: border-color var(--bma-transition-fast);
}
.ndd-drug--selected { border-color: var(--bma-green-500); }
.ndd-drug--override.ndd-drug--selected { border-color: var(--inr-supra-ring); }
.ndd-drug--contra { opacity: .5; background: var(--bma-surface-subtle); }

/* Head — clickable drug-select button */
.ndd-drug-head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 120px 12px 12px;
  width: 100%;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  position: relative;
  transition: background var(--bma-transition-fast);
}
.ndd-drug-head:disabled { cursor: not-allowed; }
/* Rank-1 hover → green (on-track); non-rank-1 hover → amber (signals override) */
.ndd-drug-head--rank-first:hover:not(:disabled) { background: var(--bma-green-50); }
.ndd-drug-head:not(.ndd-drug-head--rank-first):hover:not(:disabled) { background: var(--inr-supra-bg); }
/* Selected base tints the head */
.ndd-drug--selected .ndd-drug-head { background: var(--bma-green-50); }
.ndd-drug--override.ndd-drug--selected .ndd-drug-head { background: var(--inr-supra-bg); }

/* Rank badge */
/* Fixed-width left slot — same for every card; rank number swaps to a check when
   selected so the layout never shifts between selected / unselected cards */
.ndd-drug-rank {
  display: flex; align-items: center; justify-content: center;
  width: 14px; flex-shrink: 0; padding-top: 1px;
}
.ndd-drug-rank-num {
  font-family: var(--bma-font-data);
  font-size: 12px; font-weight: 700;
  color: var(--bma-text-tertiary);
  width: 14px; text-align: center;
}
.ndd-drug-rank-check { color: var(--bma-green-600); }

/* Drug info */
.ndd-drug-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.ndd-drug-name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ndd-drug-name {
  font-family: var(--bma-font-data);
  font-size: 14px; font-weight: 700;
  color: var(--bma-text-primary);
}
.ndd-drug-thai {
  font-size: 12px; color: var(--bma-text-secondary);
}
.ndd-drug-dose-row { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.ndd-drug-dose {
  font-family: var(--bma-font-data);
  font-size: 16px; font-weight: 700;
  color: var(--bma-green-500);
}
/* "แนะนำ" chip — marks the system's #1 recommendation for the dispenser (filled, dark) */
.ndd-rec-chip {
  font-family: var(--bma-font-thai); font-size: 10px; font-weight: 700;
  color: var(--bma-surface); background: var(--bma-green-600);
  padding: 1px 8px; border-radius: var(--bma-radius-full);
}
/* Withhold card — absolute CI; mirrors the abs-CI banner register (emergency) */
.ndd-withhold-card {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px;
  background: var(--bma-emergency-bg-soft);
  border: 1px solid var(--bma-emergency-border-light);
  border-radius: var(--bma-radius-md);
  color: var(--bma-emergency);
}
.ndd-withhold-body { display: flex; flex-direction: column; gap: 2px; }
.ndd-withhold-title { font-size: 14px; font-weight: 700; color: var(--bma-emergency); }
.ndd-withhold-sub { font-size: 12px; color: var(--bma-text-secondary); }
.ndd-drug-ci-reason,
.ndd-drug-note {
  display: inline-flex; align-items: baseline; gap: 4px;
  font-size: 12px; font-weight: 600;
}
.ndd-drug-loading {
  display: inline-flex; align-items: baseline; gap: 4px;
  font-size: 12px; font-weight: 600; color: var(--bma-elective);
}
.ndd-drug-ci-reason { color: var(--bma-emergency); }
.ndd-drug-note      { color: var(--bma-text-secondary); font-weight: 500; }

/* Level badge — absolute top-right of card */
.ndd-drug-level-badge {
  position: absolute;
  top: 12px; right: 12px;
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; font-weight: 700;
  padding: 3px 8px;
  border-radius: var(--bma-radius-full);
  white-space: nowrap;
  pointer-events: none;
}
/* Solid dark — definitive verdict (go / stop) */
.ndd-level--recommended     { background: var(--bma-green-500); color: var(--bma-surface); }
.ndd-level--contraindicated { background: var(--bma-emergency);  color: var(--bma-surface); }
/* Light tonal — border matches text color for visual separation on any card background */
.ndd-level--dose-adjusted { background: var(--inr-supra-bg);       color: var(--inr-supra-text);   border: 1.5px solid var(--inr-supra-text); }
.ndd-level--caution       { background: var(--bma-urgency-bg-soft); color: var(--bma-urgency-text); border: 1.5px solid var(--bma-urgency-text); }

/* ── Expand body — criteria checklist + dose-level choice ──────── */
.ndd-drug-body {
  padding: 12px;
  border-top: 1px solid var(--bma-border-subtle);
  display: flex; flex-direction: column; gap: 14px;
}
/* Criteria checklist */
.ndd-crit { display: flex; flex-direction: column; gap: 6px; }
.ndd-crit-title {
  font-size: 10px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase;
  color: var(--bma-text-tertiary);
}
/* Fixed columns: [icon] [label] [value] [threshold] — values line up across rows */
.ndd-crit-row {
  display: grid;
  grid-template-columns: 14px 60px 92px 1fr;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: var(--bma-radius-sm);
  font-size: 12px;
}
/* Met = an active dose-reduction factor → soft amber highlight (informational, not alarming) */
.ndd-crit-row--met { background: var(--inr-supra-bg); }
.ndd-crit-ic { color: var(--inr-supra-text); }
.ndd-crit-label { color: var(--bma-text-secondary); }
.ndd-crit-val {
  font-family: var(--bma-font-data); font-weight: 700;
  color: var(--bma-text-primary);
}
.ndd-crit-row--met .ndd-crit-val { color: var(--inr-supra-text); }
.ndd-crit-thr {
  font-family: var(--bma-font-data); font-size: 11px;
  color: var(--bma-text-tertiary); white-space: nowrap;
}
.ndd-crit-none { font-size: 12px; color: var(--bma-text-tertiary); }

/* Dose-level choice */
.ndd-dose { display: flex; flex-direction: column; gap: 6px; }
.ndd-dose-label {
  font-size: 10px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase;
  color: var(--bma-text-tertiary);
}
.ndd-dose-warn {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 12px; font-weight: 600; color: var(--inr-supra-text);
}

/* ── Segmented selector — shared by dose-level + days-supply (native, on-token) ── */
.ndd-seg { display: flex; gap: 8px; }
.ndd-seg-opt {
  flex: 1;
  display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
  padding: 8px 12px;
  border: 1.5px solid var(--bma-border);
  border-radius: var(--bma-radius-md);
  background: var(--bma-surface);
  cursor: pointer;
  text-align: left;
  transition: border-color .15s, background .15s;
}
.ndd-seg-opt:hover { border-color: var(--bma-green-300); }
.ndd-seg-opt--active { border-color: var(--bma-green-500); background: var(--bma-green-50); }
.ndd-seg-val {
  font-family: var(--bma-font-data); font-size: 14px; font-weight: 700;
  color: var(--bma-text-primary);
}
.ndd-seg-rec {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 10px; font-weight: 700; color: var(--bma-green-600);
}

/* ── Override section ────────────────────────────────────────── */
/* ── Native form elements — consistent with system design tokens ── */
.ndd-native-select,
.ndd-native-textarea {
  width: 100%;
  border: 1.5px solid var(--bma-border);
  border-radius: var(--bma-radius-md);
  background: var(--bma-surface);
  color: var(--bma-text-primary);
  font-family: inherit;
  font-size: 13px;
  transition: border-color .15s;
  outline: none;
}
.ndd-native-select {
  height: 40px;
  padding: 0 12px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 256 256'%3E%3Cpath fill='%238C8C8C' d='m213.66 101.66-80 80a8 8 0 0 1-11.32 0l-80-80a8 8 0 0 1 11.32-11.32L128 164.69l74.34-74.35a8 8 0 0 1 11.32 11.32Z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}
.ndd-native-select--empty { color: var(--bma-text-muted); }
.ndd-native-textarea {
  padding: 8px 12px;
  resize: none;
  line-height: 1.6;
}
.ndd-native-select:focus,
.ndd-native-textarea:focus { border-color: var(--bma-green-500); }
.ndd-native-select:focus { outline: none; }
/* Override step inputs focus → amber to match context */
.ndd-step--override .ndd-native-select:focus,
.ndd-step--override .ndd-native-textarea:focus { border-color: var(--inr-supra-ring); }
/* ── Days supply caution ─────────────────────────────────────── */
.ndd-days-caution {
  display: flex; align-items: center; gap: 4px;
  margin-top: 8px;
  font-size: 11px;
  color: var(--inr-supra-text);
}

/* ── Footer — matches WfDoseDrawer step-3 save area ─────────── */
/* Two-button row: secondary (outlined) + primary accept (filled, wider). */
.ndd-btn-row { display: flex; gap: 8px; align-items: stretch; }
.ndd-btn-consult { flex: 1; }        /* secondary — narrower */
.ndd-btn-save    { flex: 1.8; }      /* primary accept — wider */

/* Save / consult buttons — v-btn handles states via Vuetify theme.
   Only override font to ensure Sarabun (Vuetify defaults to system font for label) */
.ndd-btn-save,
.ndd-btn-consult {
  font-family: var(--bma-font-thai) !important;
  font-size: 14px !important;
  font-weight: 700 !important;
}
.ndd-btn-save :deep(.v-btn__content),
.ndd-btn-consult :deep(.v-btn__content) { gap: 8px; }

/* ── Animations — exact WfDoseDrawer timing ──────────────────── */
.ndd-overlay-enter-active, .ndd-overlay-leave-active { transition: opacity .25s ease; }
.ndd-overlay-enter-from,   .ndd-overlay-leave-to     { opacity: 0; }

.ndd-slide-enter-active, .ndd-slide-leave-active {
  transition: transform .32s cubic-bezier(0.16, 1, 0.3, 1);
}
.ndd-slide-enter-from,
.ndd-slide-leave-to { transform: translateX(100%); }

.ndd-expand-enter-active { transition: opacity 180ms ease, max-height 200ms ease; max-height: 200px; }
.ndd-expand-leave-active { transition: opacity 150ms ease, max-height 180ms ease; }
.ndd-expand-enter-from, .ndd-expand-leave-to { opacity: 0; max-height: 0; overflow: hidden; }

.ndd-toast-enter-active, .ndd-toast-leave-active { transition: opacity 200ms ease, transform 200ms ease; }
.ndd-toast-enter-from, .ndd-toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(-8px); }

/* ── Responsive ──────────────────────────────────────────────── */
@media (max-width: 1023px) {
  .ndd-panel {
    width: 80%;
    min-width: unset;
  }
}

@media (max-width: 767px) {
  .ndd-panel {
    top: auto;
    left: 0;
    right: 0;
    bottom: 0;
    height: auto;
    width: 100%;
    min-width: unset;
    max-height: 92dvh;
    border-radius: var(--bma-radius-xl) var(--bma-radius-xl) 0 0;
    box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.18);
  }
  /* Override slide direction for bottom sheet */
  .ndd-slide-enter-from,
  .ndd-slide-leave-to { transform: translateY(100%) !important; }

  .ndd-lab-grid { grid-template-columns: 1fr; }
}
</style>
