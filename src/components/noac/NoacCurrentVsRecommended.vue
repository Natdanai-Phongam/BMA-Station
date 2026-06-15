<template>
  <section class="ncr-card" :class="[`ncr-card--${cmp.state}`, { 'ncr-bare': bare }]">
    <div v-if="!bare" class="ncr-head">
      <span class="ncr-title">ยาปัจจุบัน เทียบ คำแนะนำวันนี้</span>
      <span class="ncr-subtitle">CURRENT vs RECOMMENDED</span>
    </div>

    <div class="ncr-body">
      <div class="ncr-compare">
        <!-- Current (faded) -->
        <div v-if="cmp.current" class="ncr-side ncr-cur">
          <span class="ncr-side-label">ปัจจุบัน<template v-if="daysSince != null"> · {{ daysSince }} วันก่อน</template></span>
          <span class="ncr-drug">{{ cmp.current.nameEn }}</span>
          <span class="ncr-dose ncr-faded">
            <span class="ncr-num">{{ cmp.current.amount }}</span>
            <span class="ncr-unit">{{ cmp.current.unit }}</span>
            <span v-if="cmp.current.freq" class="freq-chip">{{ cmp.current.freq }}</span>
          </span>
        </div>

        <PhArrowRight v-if="cmp.current" :size="18" class="ncr-arrow" />

        <!-- Recommended (tinted) — drug + dose + verdict all inside the box -->
        <div class="ncr-side ncr-tint ncr-rec" :class="`ncr-tint--${cmp.state}`">
          <template v-if="cmp.recommended">
            <span class="ncr-side-label" :class="changed ? 'ncr-side-label--rec' : 'ncr-side-label--keep'">
              {{ cmp.current ? 'ที่ควรเป็น' : 'คำแนะนำ' }}
            </span>
            <div class="ncr-rec-row">
              <span class="ncr-drug" :class="changed ? 'ncr-changed' : 'ncr-keep'">{{ cmp.recommended.nameEn }}</span>
              <span class="ncr-status" :class="`ncr-status--${cmp.recommended.level}`">{{ levelLabel[cmp.recommended.level] }}</span>
            </div>
            <span class="ncr-dose">
              <span class="ncr-num" :class="changed ? 'ncr-changed' : 'ncr-keep'">{{ cmp.recommended.amount }}</span>
              <span class="ncr-unit">{{ cmp.recommended.unit }}</span>
              <span v-if="cmp.recommended.freq" class="freq-chip">{{ cmp.recommended.freq }}</span>
            </span>
          </template>
          <div class="ncr-verdict" :class="`ncr-verdict--${cmp.state}`">
            <component :is="verdict.icon" :size="14" weight="bold" />
            <span class="ncr-verdict-text">{{ verdict.text }}</span>
          </div>
        </div>
      </div>

      <span v-if="altCount > 0" class="ncr-alt-hint">มีทางเลือกอื่นอีก {{ altCount }} ตัว — ดูในขั้นตอนจ่ายยา</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PhArrowRight, PhCheckCircle, PhWarningCircle, PhWarning, PhProhibit, PhInfo } from '@phosphor-icons/vue'
import type { NoacRecommendationResult, DrugResult, RecommendationLevel } from '@/data/types/noac'
import type { NoacDispensingRecord } from '@/data/types/noac-dispensing'
import { NOAC_REFERENCE } from '@/data/noacReference'

const props = defineProps<{
  result:        NoacRecommendationResult
  lastDispensing: NoacDispensingRecord | null
  daysSince:     number | null
  /** Drop the card chrome (border/shadow/header) when embedded inside another card. */
  bare?:         boolean
}>()

const levelLabel: Record<RecommendationLevel, string> = {
  recommended:     'ใช้ได้ทันที',
  'dose-adjusted': 'ปรับขนาดก่อนจ่าย',
  caution:         'ติดตามหลังจ่าย',
  contraindicated: 'ห้ามใช้',
}

type CmpState = 'new' | 'match' | 'reduce' | 'increase' | 'switch' | 'withhold'
interface Side { nameEn: string; amount: string; unit: string; freq: string }
interface RecSide extends Side { level: RecommendationLevel }
interface Cmp {
  state:        CmpState
  current?:     Side
  recommended?: RecSide
  reason?:      string
}

/** Maintenance dose amount from a stored dose string (handles "… → 5 mg BID"). */
function maintAmount(doseStr: string): number {
  const tail = doseStr.includes('→') ? doseStr.split('→').pop()! : doseStr
  const m = tail.match(/([\d.]+)/)
  return m ? parseFloat(m[1]) : NaN
}
/** Structured display for the current regimen, matched against the reference doses. */
function currentSide(drugKey: string, doseStr: string): Side {
  const ref = NOAC_REFERENCE[drugKey as keyof typeof NOAC_REFERENCE]
  const amt = maintAmount(doseStr)
  let unit = ref?.nvaf.standard.unit ?? 'mg'
  let freq: string = ref?.nvaf.standard.freq ?? ''
  if (ref) {
    const r = ref.nvaf.reduced
    if (r && parseFloat(r.amount) === amt) { unit = r.unit; freq = r.freq }
  }
  return { nameEn: ref?.nameEn ?? drugKey, amount: isFinite(amt) ? String(amt) : doseStr, unit, freq }
}
const recSide = (d: DrugResult): RecSide => ({ nameEn: d.nameEn, amount: d.doseAmount, unit: d.doseUnit, freq: d.frequency === '—' ? '' : d.frequency, level: d.level })
function metReason(d: DrugResult): string {
  return (d.criteria ?? []).filter(c => c.met).map(c => `${c.label} ${c.patientValue}`).join(' · ')
}

const cmp = computed<Cmp>(() => {
  const last  = props.lastDispensing
  const drugs = props.result.drugs
  const usable = drugs.filter(d => d.level !== 'contraindicated')

  // No current regimen (new patient, or last visit withheld)
  if (!last || last.dispensed === false || !last.drugDispensed) {
    if (!usable.length) return { state: 'withhold', reason: props.result.absoluteContraindications[0] }
    return { state: 'new', recommended: recSide(usable[0]) }
  }

  const curKey  = last.drugDispensed
  const current = currentSide(curKey, last.dose)
  const curEval = drugs.find(d => d.drug === curKey)

  // Current drug is now contraindicated → switch (or withhold if nothing usable)
  if (!curEval || curEval.level === 'contraindicated') {
    if (!usable.length) return { state: 'withhold', current, reason: curEval?.contraindicationReason }
    return { state: 'switch', current, recommended: recSide(usable[0]), reason: curEval?.contraindicationReason }
  }

  // Same drug — compare the dose against what the condition needs now
  const recAmt = parseFloat(curEval.doseAmount)
  const curAmt = maintAmount(last.dose)
  const recommended = recSide(curEval)
  if (!isFinite(curAmt) || curAmt === recAmt) return { state: 'match', current, recommended }
  return curAmt > recAmt
    ? { state: 'reduce', current, recommended, reason: metReason(curEval) }
    : { state: 'increase', current, recommended }
})

const changed  = computed(() => ['reduce', 'increase', 'switch'].includes(cmp.value.state))
const altCount = computed(() => Math.max(0, props.result.drugs.filter(d => d.level !== 'contraindicated').length - 1))

const verdict = computed(() => {
  const c = cmp.value
  switch (c.state) {
    case 'match':    return { icon: PhCheckCircle,  text: 'ยังเหมาะสมตามสภาวะปัจจุบัน' }
    case 'reduce':   return { icon: PhWarningCircle, text: `ควรลดขนาด${c.reason ? ' — ' + c.reason : ''}` }
    case 'increase': return { icon: PhWarningCircle, text: 'ควรเพิ่มขนาด — ไม่เข้าเกณฑ์ลดขนาดแล้ว (สภาวะดีขึ้น)' }
    case 'switch':   return { icon: PhWarning,       text: `ควรเปลี่ยนยา${c.reason ? ' — ' + c.reason : ''}` }
    case 'withhold': return { icon: PhProhibit,      text: `งดจ่ายยา${c.reason ? ' — ' + c.reason : ''}` }
    default:         return { icon: PhInfo,          text: 'เริ่มจ่ายตามคำแนะนำ' }
  }
})
</script>

<style scoped>
.ncr-card {
  background: var(--bma-surface);
  border: 1px solid var(--bma-border-card);
  border-radius: var(--bma-radius-lg);
  box-shadow: var(--bma-shadow-card);
  overflow: hidden;
}
/* Embedded inside another card — no nested-card chrome */
.ncr-bare { border: none; box-shadow: none; border-radius: 0; background: transparent; overflow: visible; }
.ncr-bare .ncr-body { padding: 0; }

.ncr-head {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--bma-border-subtle);
}
.ncr-title { font-size: 14px; font-weight: 700; color: var(--bma-text-primary); }
.ncr-subtitle {
  font-family: var(--bma-font-data); font-size: 10px; font-weight: 700;
  letter-spacing: .07em; color: var(--bma-text-tertiary);
}

.ncr-body { padding: 16px; display: flex; flex-direction: column; gap: 10px; }

/* ── Comparison — upright sides, rows aligned left↔right ── */
.ncr-compare { display: flex; align-items: flex-start; gap: 16px; flex-wrap: wrap; }

.ncr-side { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
/* Current side gets the tint box's top padding so its rows line up with the box */
.ncr-cur { padding: 8px 0; }
.ncr-rec-row { line-height: 1.2; }
.ncr-arrow { align-self: center; }
.ncr-side-label { font-size: 11px; font-weight: 700; color: var(--bma-text-tertiary); }
.ncr-side-label--rec  { color: var(--inr-supra-text); }
.ncr-side-label--keep { color: var(--bma-green-700); }
.ncr-rec-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.ncr-drug { font-family: var(--bma-font-data); font-size: 16px; font-weight: 700; color: var(--bma-text-primary); }
.ncr-dose { display: inline-flex; align-items: center; gap: 6px; }
.ncr-num { font-family: var(--bma-font-data); font-size: 16px; font-weight: 700; color: var(--bma-text-primary); }
.ncr-unit { font-family: var(--bma-font-data); font-size: 12px; color: var(--bma-text-secondary); }
/* Faded "current" — the regimen being replaced (recedes vs the recommendation) */
.ncr-faded .ncr-num, .ncr-faded .ncr-unit { color: var(--bma-text-tertiary); font-weight: 600; }
/* Recommended emphasis — green when keeping, amber when changing */
.ncr-keep    { color: var(--bma-green-600) !important; }
.ncr-changed { color: var(--inr-supra-text) !important; }
.ncr-arrow { color: var(--bma-text-tertiary); flex-shrink: 0; }

/* freq pill — mirrors the recommendation card's .freq-chip */
.freq-chip {
  display: inline-flex; align-items: center;
  font-family: var(--bma-font-data); font-size: 11px; font-weight: 700;
  color: var(--bma-text-secondary); background: var(--bma-surface-subtle);
  border: 1px solid var(--bma-border);
  padding: 1px 7px; border-radius: var(--bma-radius-full); letter-spacing: .02em;
}
/* Level status chip — border in its own text colour so it lifts off the same-hue tint */
.ncr-status {
  display: inline-flex; align-items: center;
  font-size: 11px; font-weight: 600;
  padding: 2px 8px; border-radius: var(--bma-radius-sm);
  border: 1px solid currentColor;
}
.ncr-status--recommended    { color: var(--bma-success-text); background: var(--bma-success-bg-solid); }
.ncr-status--dose-adjusted,
.ncr-status--caution        { color: var(--bma-urgency-text); background: var(--bma-urgency-bg-soft); }
.ncr-status--contraindicated { color: var(--bma-emergency); background: var(--bma-emergency-bg-soft); }

/* ── State tint on the "ที่ควรเป็น" box — green = keep · amber = change ── */
.ncr-tint { padding: 8px 12px; border-radius: var(--bma-radius-md); }
.ncr-tint--match    { background: var(--bma-green-50); }
.ncr-tint--reduce,
.ncr-tint--increase { background: var(--inr-supra-bg); }
.ncr-tint--switch   { background: var(--bma-urgency-bg-soft); }
.ncr-tint--new      { background: var(--bma-elective-bg); }
.ncr-tint--withhold { background: var(--bma-emergency-bg-soft); }

/* ── Aside: slim verdict + alternatives ── */
.ncr-verdict {
  display: flex; align-items: flex-start; gap: 6px;
  font-size: 12px; font-weight: 600; line-height: 1.4;
}
.ncr-verdict > svg { flex-shrink: 0; margin-top: 1px; }
.ncr-verdict--match    { color: var(--bma-green-700); }
.ncr-verdict--reduce,
.ncr-verdict--increase { color: var(--inr-supra-text); }
.ncr-verdict--switch   { color: var(--bma-urgency-text); }
.ncr-verdict--withhold { color: var(--bma-emergency); }
.ncr-verdict--new      { color: var(--bma-elective); }

.ncr-alt-hint { font-size: 11px; color: var(--bma-text-tertiary); line-height: 1.4; }
</style>
