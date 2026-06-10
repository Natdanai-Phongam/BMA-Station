// ─── NOAC drug reference — single source of truth ────────────────────────────
// Every dosing number, renal cut-off, and dose-reduction criterion lives HERE.
// Both consume this module so they can never drift apart:
//   • noacEngine.ts        — evaluates a patient against these rules
//   • NoacReferenceTable   — renders the rules as a static lookup table
//
// Clinical sources: 2023 ESC AF Guidelines · Thai FDA inserts (Eliquis®,
// Xarelto®, Pradaxa®, Lixiana®) · BMA pharmacist anticoagulant protocol.
// ─────────────────────────────────────────────────────────────────────────────

import type { NoacDrug } from './types/noac'

// ── Criterion evaluation ─────────────────────────────────────────────────────

/** Patient inputs a dose-reduction criterion is tested against. */
export interface CriterionInput {
  age:             number
  weightKg:        number
  scrMgDl:         number
  crClMlMin:       number
  hasPgpInhibitor: boolean
}

/** A single dose-reduction criterion: how it reads, and how it's tested. */
export interface DoseCriterion {
  key:       string
  label:     string                          // 'อายุ'
  threshold: string                          // '≥ 80 ปี'
  test:      (p: CriterionInput) => boolean
  value:     (p: CriterionInput) => string   // patient's value for display, e.g. '82 ปี'
}

/** A criterion evaluated against a patient — feeds the live checklist. */
export interface CriterionResult {
  key:          string
  label:        string
  threshold:    string
  patientValue: string
  met:          boolean
}

/** min2 = reduce when ≥2 criteria met (Apixaban) · any = reduce when ≥1 (others). */
export type ReductionMode = 'min2' | 'any'

// ── Structured dose ──────────────────────────────────────────────────────────

export interface Dose {
  amount: string
  unit:   string        // 'mg'
  freq:   'BID' | 'OD'
}

const FREQ_THAI: Record<Dose['freq'], string> = {
  BID: '2 ครั้ง/วัน',
  OD:  '1 ครั้ง/วัน',
}

export function freqThai(freq: Dose['freq']): string {
  return FREQ_THAI[freq]
}

export function formatDose(d: Dose): string {
  return `${d.amount} ${d.unit} ${d.freq}`
}

// ── Drug reference shape ─────────────────────────────────────────────────────

export interface NoacDrugRef {
  drug:     NoacDrug
  nameEn:   string
  nameThai: string
  brand:    string
  /** CrCl (mL/min) strictly below this = absolute renal contraindication. */
  renalContraCrClBelow: number
  nvaf: {
    standard: Dose
    reduced?: Dose
    reduction?: {
      mode:       ReductionMode
      criteria:   DoseCriterion[]
      resultText: string          // 'ลดเป็น 2.5 mg BID'
    }
    note?: string                 // 'รับประทานพร้อมมื้อเย็น'
  }
  vte: {
    available:             boolean
    loading?:             { dose: Dose; durationText: string }   // oral loading phase
    maintenance?:          Dose
    parenteralLeadInDays?: number   // requires injectable lead-in instead of oral loading
    note?:                 string
  }
  interactions: {
    contraindicated: string
    caution?:        string
  }
}

// ── The four NOACs ───────────────────────────────────────────────────────────

export const NOAC_REFERENCE: Record<NoacDrug, NoacDrugRef> = {
  apixaban: {
    drug: 'apixaban', nameEn: 'Apixaban', nameThai: 'อะพิกซาแบน', brand: 'Eliquis®',
    renalContraCrClBelow: 15,
    nvaf: {
      standard: { amount: '5', unit: 'mg', freq: 'BID' },
      reduced:  { amount: '2.5', unit: 'mg', freq: 'BID' },
      reduction: {
        mode: 'min2',
        resultText: 'เข้าเกณฑ์ ≥ 2 ข้อ → ลดเป็น 2.5 mg BID',
        criteria: [
          { key: 'age',    label: 'อายุ',    threshold: '≥ 80 ปี',     test: p => p.age >= 80,      value: p => `${p.age} ปี` },
          { key: 'weight', label: 'น้ำหนัก', threshold: '≤ 60 kg',     test: p => p.weightKg <= 60, value: p => `${p.weightKg} kg` },
          { key: 'scr',    label: 'SCr',     threshold: '≥ 1.5 mg/dL', test: p => p.scrMgDl >= 1.5, value: p => `${p.scrMgDl} mg/dL` },
        ],
      },
    },
    vte: {
      available: true,
      loading: { dose: { amount: '10', unit: 'mg', freq: 'BID' }, durationText: '7 วันแรก' },
      maintenance: { amount: '5', unit: 'mg', freq: 'BID' },
    },
    interactions: {
      contraindicated: 'ketoconazole, itraconazole, ritonavir, clarithromycin (P-gp + CYP3A4 inhibitor แรง)',
      caution: 'P-gp inhibitor, ตัวกระตุ้น (inducer), NSAIDs',
    },
  },

  rivaroxaban: {
    drug: 'rivaroxaban', nameEn: 'Rivaroxaban', nameThai: 'ริวาร็อกซาแบน', brand: 'Xarelto®',
    renalContraCrClBelow: 15,
    nvaf: {
      standard: { amount: '20', unit: 'mg', freq: 'OD' },
      reduced:  { amount: '15', unit: 'mg', freq: 'OD' },
      reduction: {
        mode: 'any',
        resultText: 'CrCl 15–49 → ลดเป็น 15 mg OD',
        criteria: [
          { key: 'crcl', label: 'CrCl', threshold: '15–49 mL/min', test: p => p.crClMlMin >= 15 && p.crClMlMin < 50, value: p => `${p.crClMlMin} mL/min` },
        ],
      },
      note: 'รับประทานพร้อมมื้อเย็น (เพิ่มการดูดซึม)',
    },
    vte: {
      available: true,
      loading: { dose: { amount: '15', unit: 'mg', freq: 'BID' }, durationText: '21 วันแรก' },
      maintenance: { amount: '20', unit: 'mg', freq: 'OD' },
      note: 'รับประทานพร้อมอาหาร',
    },
    interactions: {
      contraindicated: 'ketoconazole, itraconazole, ritonavir, clarithromycin (P-gp + CYP3A4 inhibitor แรง)',
      caution: 'P-gp inhibitor, ตัวกระตุ้น (inducer), NSAIDs',
    },
  },

  dabigatran: {
    drug: 'dabigatran', nameEn: 'Dabigatran', nameThai: 'ดาบิแกตแรน', brand: 'Pradaxa®',
    renalContraCrClBelow: 30,
    nvaf: {
      standard: { amount: '150', unit: 'mg', freq: 'BID' },
      reduced:  { amount: '110', unit: 'mg', freq: 'BID' },
      reduction: {
        mode: 'any',
        resultText: 'เข้าเกณฑ์ ≥ 1 ข้อ → ลดเป็น 110 mg BID',
        criteria: [
          { key: 'age',  label: 'อายุ',           threshold: '≥ 75 ปี',      test: p => p.age >= 75,                              value: p => `${p.age} ปี` },
          { key: 'crcl', label: 'CrCl',           threshold: '30–49 mL/min', test: p => p.crClMlMin >= 30 && p.crClMlMin < 50,    value: p => `${p.crClMlMin} mL/min` },
          { key: 'pgp',  label: 'P-gp inhibitor', threshold: 'มีใช้ร่วม',     test: p => p.hasPgpInhibitor,                        value: p => p.hasPgpInhibitor ? 'มี' : 'ไม่มี' },
        ],
      },
    },
    vte: {
      available: true,
      parenteralLeadInDays: 5,
      note: 'เริ่มหลังให้ยาฉีด (parenteral) อย่างน้อย 5 วัน',   // engine appends CAT caveat
    },
    interactions: {
      contraindicated: 'ketoconazole, itraconazole, ritonavir, cyclosporine, tacrolimus (P-gp inhibitor แรง)',
      caution: 'P-gp inhibitor, ตัวกระตุ้น (inducer), NSAIDs',
    },
  },

  edoxaban: {
    drug: 'edoxaban', nameEn: 'Edoxaban', nameThai: 'เอโดซาแบน', brand: 'Lixiana®',
    renalContraCrClBelow: 15,
    nvaf: {
      standard: { amount: '60', unit: 'mg', freq: 'OD' },
      reduced:  { amount: '30', unit: 'mg', freq: 'OD' },
      reduction: {
        mode: 'any',
        resultText: 'เข้าเกณฑ์ ≥ 1 ข้อ → ลดเป็น 30 mg OD',
        criteria: [
          { key: 'crcl',   label: 'CrCl',           threshold: '15–50 mL/min', test: p => p.crClMlMin >= 15 && p.crClMlMin <= 50, value: p => `${p.crClMlMin} mL/min` },
          { key: 'weight', label: 'น้ำหนัก',         threshold: '≤ 60 kg',      test: p => p.weightKg <= 60,                       value: p => `${p.weightKg} kg` },
          { key: 'pgp',    label: 'P-gp inhibitor', threshold: 'มีใช้ร่วม',     test: p => p.hasPgpInhibitor,                      value: p => p.hasPgpInhibitor ? 'มี' : 'ไม่มี' },
        ],
      },
    },
    vte: {
      available: true,
      parenteralLeadInDays: 5,
      note: 'เริ่มหลังให้ยาฉีด (parenteral) อย่างน้อย 5 วัน',
    },
    interactions: {
      contraindicated: 'rifampicin (P-gp inducer แรง)',
      caution: 'P-gp inhibitor → ลดขนาด · ตัวกระตุ้นอื่น · NSAIDs',
    },
  },
}

/** Ordered list for table rendering (apixaban first, as in the engine). */
export const NOAC_REFERENCE_LIST: NoacDrugRef[] = [
  NOAC_REFERENCE.apixaban,
  NOAC_REFERENCE.rivaroxaban,
  NOAC_REFERENCE.dabigatran,
  NOAC_REFERENCE.edoxaban,
]

// ── Shared evaluation — used by the engine AND the live drawer checklist ──────

export interface ReductionEvaluation {
  results:  CriterionResult[]
  metCount: number
  reduce:   boolean
}

/** Renal-monitoring cadence — days of supply / follow-up interval by CrCl.
 *  Single source shared by the engine-driven generator and the dispensing drawer:
 *  CrCl ≥ 60 → 90 วัน · 30–59 → 60 วัน · < 30 → 30 วัน. */
export function followUpDaysForCrCl(crClMlMin: number): 30 | 60 | 90 {
  if (crClMlMin >= 60) return 90
  if (crClMlMin >= 30) return 60
  return 30
}

/** Evaluate a drug's NVAF dose-reduction criteria against a patient. */
export function evaluateReduction(ref: NoacDrugRef, input: CriterionInput): ReductionEvaluation {
  const red = ref.nvaf.reduction
  if (!red) return { results: [], metCount: 0, reduce: false }
  const results: CriterionResult[] = red.criteria.map(c => ({
    key: c.key, label: c.label, threshold: c.threshold,
    patientValue: c.value(input), met: c.test(input),
  }))
  const metCount = results.filter(r => r.met).length
  const reduce = red.mode === 'min2' ? metCount >= 2 : metCount >= 1
  return { results, metCount, reduce }
}
