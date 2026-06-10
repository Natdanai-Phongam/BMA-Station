/**
 * NOACs Clinical Decision Engine
 *
 * Encodes drug-specific dosing rules for NOAC/DOAC selection in Bangkok Metropolitan
 * Administration (BMA) clinics. All logic is pure (no side effects), suitable for
 * direct use in Vue computed properties.
 *
 * Clinical references:
 *  - 2023 ESC AF Guidelines
 *  - Thai FDA product inserts: Eliquis®, Xarelto®, Pradaxa®, Lixiana®
 *  - BMA pharmacist protocol for anticoagulant management
 */

import type { ConcurrentMedication } from '@/data/types/patient-detail'
import type {
  RecommendationLevel,
  DrugInteractionResult,
  DrugResult,
  NoacEngineInput,
  NoacRecommendationResult,
} from '@/data/types/noac'
import {
  NOAC_REFERENCE,
  evaluateReduction,
  freqThai,
  type Dose,
  type CriterionInput,
  type CriterionResult,
  type NoacDrugRef,
  type ReductionEvaluation,
} from '@/data/noacReference'

// ── Interaction knowledge base ─────────────────────────────────────────────

/** P-gp inhibitors (moderate–strong) */
const PGP_INHIBITORS = [
  'verapamil', 'diltiazem', 'amiodarone', 'dronedarone',
  'ketoconazole', 'itraconazole', 'cyclosporine', 'tacrolimus',
  'quinidine', 'erythromycin', 'clarithromycin',
]

/** Strong dual inhibitors (P-gp AND strong CYP3A4) — higher severity for apixaban/rivaroxaban */
const STRONG_DUAL_INHIBITORS = [
  'ketoconazole', 'itraconazole', 'ritonavir', 'clarithromycin',
]

/** Strong P-gp inhibitors that are absolute contraindications for dabigatran */
const DABIGATRAN_PGPI_CONTRAS = [
  'ketoconazole', 'itraconazole', 'ritonavir', 'cyclosporine', 'tacrolimus',
]

/** P-gp + CYP3A4 inducers (reduce NOAC plasma levels significantly) */
const PGP_INDUCERS = [
  'rifampicin', 'rifampin', 'carbamazepine', 'phenytoin', 'phenobarbital',
  "st. john's wort", 'st john',
]

/** Rifampicin specifically — contraindicated with edoxaban */
const RIFAMPICIN = ['rifampicin', 'rifampin']

/** NSAIDs — increase bleeding risk with all NOACs */
const NSAIDS = [
  'ibuprofen', 'naproxen', 'diclofenac', 'celecoxib',
  'indomethacin', 'mefenamic', 'piroxicam', 'meloxicam', 'ketorolac',
]

/** Antiplatelets — additive bleeding risk */
const ANTIPLATELETS = ['clopidogrel', 'ticagrelor', 'prasugrel', 'dipyridamole']

// ── Helpers ────────────────────────────────────────────────────────────────

function hit(name: string, list: string[]): boolean {
  const n = name.toLowerCase().trim()
  return list.some(k => n.includes(k) || k.includes(n))
}

function matchMeds(meds: ConcurrentMedication[], list: string[]): ConcurrentMedication[] {
  return meds.filter(m => hit(m.name, list))
}

function mkContra(ref: NoacDrugRef, interactions: DrugInteractionResult[], reason: string): DrugResult {
  return {
    drug: ref.drug, nameThai: ref.nameThai, nameEn: ref.nameEn, brandName: ref.brand,
    level: 'contraindicated',
    doseAmount: '—', doseUnit: '', frequency: '—', frequencyThai: 'ห้ามใช้',
    contraindicationReason: reason,
    interactions,
  }
}

/** Build the criterion-test input (P-gp presence uses the moderate–strong inhibitor list). */
function critInput(input: NoacEngineInput): CriterionInput {
  return {
    age: input.age, weightKg: input.weightKg, scrMgDl: input.scrMgDl, crClMlMin: input.crClMlMin,
    hasPgpInhibitor: matchMeds(input.concurrentMeds, PGP_INHIBITORS).length > 0,
  }
}

/** Prose summary of met reduction criteria (the structured `criteria` array is canonical). */
function reductionReason(ev: ReductionEvaluation): string {
  const met = ev.results.filter(r => r.met).map(r => `${r.label} ${r.patientValue}`)
  return `ลดขนาดตามเกณฑ์: ${met.join(', ')}`
}

/** Map a reference loading phase into the DrugResult shape. */
function loadingFrom(ref: NoacDrugRef): DrugResult['loadingPhase'] {
  const lp = ref.vte.loading
  if (!lp) return undefined
  return {
    doseAmount: lp.dose.amount, doseUnit: lp.dose.unit,
    frequency: lp.dose.freq, frequencyThai: freqThai(lp.dose.freq),
    durationText: lp.durationText,
  }
}

interface DrugResultParts {
  adjustmentReason?: string
  doseNote?:         string
  loadingPhase?:     DrugResult['loadingPhase']
  interactions:      DrugInteractionResult[]
  criteria?:         CriterionResult[]
}

/** Assemble a usable DrugResult — identity/dose pulled from the reference. */
function drugResult(ref: NoacDrugRef, level: RecommendationLevel, dose: Dose, parts: DrugResultParts): DrugResult {
  return {
    drug: ref.drug, nameThai: ref.nameThai, nameEn: ref.nameEn, brandName: ref.brand,
    level,
    doseAmount: dose.amount, doseUnit: dose.unit,
    frequency: dose.freq, frequencyThai: freqThai(dose.freq),
    adjustmentReason: parts.adjustmentReason,
    doseNote:         parts.doseNote,
    loadingPhase:     parts.loadingPhase,
    interactions:     parts.interactions,
    criteria:         parts.criteria,
  }
}

// ── Drug evaluators ────────────────────────────────────────────────────────

function evalApixaban(input: NoacEngineInput): DrugResult {
  const ref = NOAC_REFERENCE.apixaban
  const meds = input.concurrentMeds
  const interactions: DrugInteractionResult[] = []

  // Absolute contraindication: CrCl below renal cut-off
  if (input.crClMlMin < ref.renalContraCrClBelow) {
    return mkContra(ref, interactions, `CrCl ${input.crClMlMin} mL/min (ต่ำกว่า ${ref.renalContraCrClBelow}) — ห้ามใช้`)
  }

  // Strong dual inhibitors (P-gp + CYP3A4) → contraindicated
  const strongDual = matchMeds(meds, STRONG_DUAL_INHIBITORS)
  if (strongDual.length) {
    strongDual.forEach(m => interactions.push({ medicationName: m.name, severity: 'contraindicated', note: 'P-gp + CYP3A4 inhibitor อย่างแรง — ห้ามใช้ร่วม' }))
    return mkContra(ref, interactions, `${strongDual.map(m => m.name).join(', ')} — ห้ามใช้ร่วมกัน`)
  }

  let level: RecommendationLevel = 'recommended'
  let dose: Dose = ref.nvaf.standard
  let adjustmentReason: string | undefined
  let criteria: CriterionResult[] | undefined
  let loadingPhase: DrugResult['loadingPhase']

  if (input.indication === 'NVAF') {
    // NVAF: 5 mg BID; reduce to 2.5 if ≥ 2 of (age≥80, ≤60kg, SCr≥1.5)
    const ev = evaluateReduction(ref, critInput(input))
    criteria = ev.results
    if (ev.reduce) {
      dose = ref.nvaf.reduced!
      level = 'dose-adjusted'
      adjustmentReason = reductionReason(ev)
    }
  } else {
    // DVT/PE/CAT: loading 10 mg BID ×7 วัน → maintenance 5 mg BID
    loadingPhase = loadingFrom(ref)
    dose = ref.vte.maintenance!
  }

  // P-gp–only inhibitors (not strong CYP3A4) → monitor
  matchMeds(meds, PGP_INHIBITORS)
    .filter(m => !hit(m.name, STRONG_DUAL_INHIBITORS))
    .forEach(m => {
      interactions.push({ medicationName: m.name, severity: 'monitor', note: 'P-gp inhibitor: ติดตามอาการเลือดออก' })
      if (level === 'recommended') level = 'caution'
    })

  // Inducers → warning (avoid)
  matchMeds(meds, PGP_INDUCERS).forEach(m => {
    interactions.push({ medicationName: m.name, severity: 'warning', note: 'ลดระดับยา Apixaban อย่างมีนัยสำคัญ — หลีกเลี่ยง' })
    level = 'caution'
  })

  // NSAIDs → bleeding risk
  matchMeds(meds, NSAIDS).forEach(m => {
    interactions.push({ medicationName: m.name, severity: 'warning', note: 'เพิ่มความเสี่ยงเลือดออก' })
  })

  return drugResult(ref, level, dose, { adjustmentReason, loadingPhase, interactions, criteria })
}

function evalRivaroxaban(input: NoacEngineInput): DrugResult {
  const ref = NOAC_REFERENCE.rivaroxaban
  const meds = input.concurrentMeds
  const interactions: DrugInteractionResult[] = []

  // Absolute contraindication: CrCl below renal cut-off
  if (input.crClMlMin < ref.renalContraCrClBelow) {
    return mkContra(ref, interactions, `CrCl ${input.crClMlMin} mL/min (ต่ำกว่า ${ref.renalContraCrClBelow}) — ห้ามใช้`)
  }

  // Strong dual inhibitors → contraindicated
  const strongDual = matchMeds(meds, STRONG_DUAL_INHIBITORS)
  if (strongDual.length) {
    strongDual.forEach(m => interactions.push({ medicationName: m.name, severity: 'contraindicated', note: 'P-gp + CYP3A4 inhibitor อย่างแรง — ห้ามใช้ร่วม' }))
    return mkContra(ref, interactions, `${strongDual.map(m => m.name).join(', ')} — ห้ามใช้ร่วมกัน`)
  }

  let level: RecommendationLevel = 'recommended'
  let dose: Dose = ref.nvaf.standard
  let adjustmentReason: string | undefined
  let doseNote: string | undefined
  let criteria: CriterionResult[] | undefined
  let loadingPhase: DrugResult['loadingPhase']

  if (input.indication === 'NVAF') {
    // NVAF: 20 mg OD with food; CrCl 15–49 → 15 mg OD
    const ev = evaluateReduction(ref, critInput(input))
    criteria = ev.results
    if (ev.reduce) {
      dose = ref.nvaf.reduced!
      level = 'dose-adjusted'
      adjustmentReason = `CrCl ${input.crClMlMin} mL/min (15–49): ลดขนาดยาเป็น 15 mg OD`
    } else {
      doseNote = ref.nvaf.note
    }
  } else {
    // DVT/PE/CAT: loading 15 mg BID ×21 วัน → maintenance 20 mg OD (พร้อมอาหาร)
    doseNote = ref.vte.note
    loadingPhase = loadingFrom(ref)
    dose = ref.vte.maintenance!
    if (input.crClMlMin >= 15 && input.crClMlMin < 50) {
      level = 'caution'
      adjustmentReason = `CrCl ${input.crClMlMin} mL/min: ใช้ด้วยความระมัดระวังใน DVT/PE`
    }
  }

  // P-gp–only inhibitors → monitor
  matchMeds(meds, PGP_INHIBITORS)
    .filter(m => !hit(m.name, STRONG_DUAL_INHIBITORS))
    .forEach(m => {
      interactions.push({ medicationName: m.name, severity: 'monitor', note: 'ติดตามระดับยาและอาการเลือดออก' })
      if (level === 'recommended') level = 'caution'
    })

  // Inducers
  matchMeds(meds, PGP_INDUCERS).forEach(m => {
    interactions.push({ medicationName: m.name, severity: 'warning', note: 'ลดระดับยา Rivaroxaban — หลีกเลี่ยง' })
    level = 'caution'
  })

  matchMeds(meds, NSAIDS).forEach(m => {
    interactions.push({ medicationName: m.name, severity: 'warning', note: 'เพิ่มความเสี่ยงเลือดออก' })
  })

  return drugResult(ref, level, dose, { adjustmentReason, doseNote, loadingPhase, interactions, criteria })
}

function evalDabigatran(input: NoacEngineInput): DrugResult {
  const ref = NOAC_REFERENCE.dabigatran
  const meds = input.concurrentMeds
  const interactions: DrugInteractionResult[] = []

  // Absolute contraindication: CrCl below renal cut-off
  if (input.crClMlMin < ref.renalContraCrClBelow) {
    return mkContra(ref, interactions, `CrCl ${input.crClMlMin} mL/min (ต่ำกว่า ${ref.renalContraCrClBelow}) — ห้ามใช้`)
  }

  // P-gp inhibitors that are absolute contraindications for Dabigatran
  const pgpContras = matchMeds(meds, DABIGATRAN_PGPI_CONTRAS)
  if (pgpContras.length) {
    pgpContras.forEach(m => interactions.push({ medicationName: m.name, severity: 'contraindicated', note: 'P-gp inhibitor อย่างแรง — ห้ามใช้ร่วมกับ Dabigatran' }))
    return mkContra(ref, interactions, `${pgpContras.map(m => m.name).join(', ')} — ห้ามใช้ร่วมกัน`)
  }

  let level: RecommendationLevel = 'recommended'
  let dose: Dose = ref.nvaf.standard
  let adjustmentReason: string | undefined
  let doseNote: string | undefined

  // Dose reduction (applies to all indications): age≥75 / CrCl 30–49 / P-gp inhibitor
  const ev = evaluateReduction(ref, critInput(input))
  if (ev.reduce) {
    dose = ref.nvaf.reduced!
    level = 'dose-adjusted'
    adjustmentReason = reductionReason(ev)
  }

  if (input.indication !== 'NVAF') {
    // DVT/PE/CAT: requires ≥ 5 days parenteral lead-in (no oral loading phase)
    doseNote = ref.vte.note
    if (input.indication === 'CAT') doseNote += ' · ไม่ใช่ยาหลักสำหรับ CAT'
  }

  // P-gp inhibitors not already contraindicated → warning note
  matchMeds(meds, PGP_INHIBITORS)
    .filter(m => !hit(m.name, DABIGATRAN_PGPI_CONTRAS))
    .forEach(m => {
      interactions.push({ medicationName: m.name, severity: 'warning', note: `เพิ่มระดับ Dabigatran ในเลือด — ลดขนาดยาตามเกณฑ์ด้านบน` })
    })

  // Inducers
  matchMeds(meds, PGP_INDUCERS).forEach(m => {
    interactions.push({ medicationName: m.name, severity: 'warning', note: 'ลดระดับยา Dabigatran อย่างมีนัยสำคัญ — หลีกเลี่ยง' })
    level = 'caution'
  })

  matchMeds(meds, NSAIDS).forEach(m => {
    interactions.push({ medicationName: m.name, severity: 'warning', note: 'เพิ่มความเสี่ยงเลือดออก' })
  })

  return drugResult(ref, level, dose, { adjustmentReason, doseNote, interactions, criteria: ev.results })
}

function evalEdoxaban(input: NoacEngineInput): DrugResult {
  const ref = NOAC_REFERENCE.edoxaban
  const meds = input.concurrentMeds
  const interactions: DrugInteractionResult[] = []

  // Absolute contraindication: CrCl below renal cut-off
  if (input.crClMlMin < ref.renalContraCrClBelow) {
    return mkContra(ref, interactions, `CrCl ${input.crClMlMin} mL/min (ต่ำกว่า ${ref.renalContraCrClBelow}) — ห้ามใช้`)
  }

  // Rifampicin is contraindicated with edoxaban
  const rifam = matchMeds(meds, RIFAMPICIN)
  if (rifam.length) {
    rifam.forEach(m => interactions.push({ medicationName: m.name, severity: 'contraindicated', note: 'P-gp inducer อย่างแรง — ลดระดับยาอย่างมีนัยสำคัญ ห้ามใช้ร่วม' }))
    return mkContra(ref, interactions, `${rifam.map(m => m.name).join(', ')} — ห้ามใช้ร่วมกัน`)
  }

  let level: RecommendationLevel = 'recommended'
  let dose: Dose = ref.nvaf.standard
  let adjustmentReason: string | undefined
  let doseNote: string | undefined

  // Dose reduction (applies to all indications): CrCl 15–50 / weight ≤60 / P-gp inhibitor
  const ev = evaluateReduction(ref, critInput(input))
  if (ev.reduce) {
    dose = ref.nvaf.reduced!
    level = 'dose-adjusted'
    adjustmentReason = reductionReason(ev)
  }

  if (input.indication !== 'NVAF') {
    // DVT/PE/CAT: requires ≥ 5 days parenteral lead-in (no oral loading phase)
    doseNote = ref.vte.note
  }

  // P-gp inhibitor notes
  matchMeds(meds, PGP_INHIBITORS).forEach(m => {
    interactions.push({ medicationName: m.name, severity: 'warning', note: 'P-gp inhibitor: ลดขนาดยา Edoxaban (ดูด้านบน)' })
  })

  // Other inducers
  matchMeds(meds, PGP_INDUCERS)
    .filter(m => !hit(m.name, RIFAMPICIN))
    .forEach(m => {
      interactions.push({ medicationName: m.name, severity: 'warning', note: 'ลดระดับยา Edoxaban — หลีกเลี่ยง' })
      level = 'caution'
    })

  matchMeds(meds, NSAIDS).forEach(m => {
    interactions.push({ medicationName: m.name, severity: 'warning', note: 'เพิ่มความเสี่ยงเลือดออก' })
  })

  return drugResult(ref, level, dose, { adjustmentReason, doseNote, interactions, criteria: ev.results })
}

// ── Main export ────────────────────────────────────────────────────────────

export function computeNoacRecommendations(input: NoacEngineInput): NoacRecommendationResult {

  // ── Step 1: Absolute contraindications — checked BEFORE individual drug eval ──
  // If any absolute CI is present, all drugs are blocked regardless of renal function.
  const absoluteContraindications: string[] = []

  if (input.mechanicalValve) {
    absoluteContraindications.push(
      'ลิ้นหัวใจเทียมชนิดเครื่องกล (Mechanical valve): ห้ามใช้ NOACs ทุกชนิด — ต้องใช้ Warfarin เท่านั้น'
    )
  }
  if (input.pregnancy) {
    absoluteContraindications.push('ตั้งครรภ์: ห้ามใช้ NOACs ทุกชนิด')
  }
  if (input.activeBleeding) {
    absoluteContraindications.push('มีเลือดออกเฉียบพลัน (Active bleeding): ห้ามใช้ NOACs จนกว่าจะควบคุมเลือดออกได้')
  }
  if (input.childPughClass === 'C') {
    absoluteContraindications.push('Child-Pugh C (ตับวาย): ห้ามใช้ NOACs ทุกชนิด')
  }

  // If absolute CI present → mark all drugs contraindicated and return early
  if (absoluteContraindications.length > 0) {
    const blockedDrugs: DrugResult[] = (['apixaban', 'rivaroxaban', 'dabigatran', 'edoxaban'] as const).map(drug => ({
      drug,
      nameThai:               { apixaban: 'อะพิกซาแบน', rivaroxaban: 'ริวาโรซาแบน', dabigatran: 'ดาบิกาทราน', edoxaban: 'อีด็อกซาแบน' }[drug],
      nameEn:                 { apixaban: 'Apixaban', rivaroxaban: 'Rivaroxaban', dabigatran: 'Dabigatran', edoxaban: 'Edoxaban' }[drug],
      brandName:              { apixaban: 'Eliquis®', rivaroxaban: 'Xarelto®', dabigatran: 'Pradaxa®', edoxaban: 'Lixiana®' }[drug],
      level:                  'contraindicated' as const,
      doseAmount:             '—',
      doseUnit:               '',
      frequency:              '—',
      frequencyThai:          '—',
      contraindicationReason: absoluteContraindications[0],
      interactions:           [],
    }))
    return { drugs: blockedDrugs, generalPrecautions: [], absoluteContraindications }
  }

  // ── Step 2: Dialysis — special case: Apixaban caution, others contraindicated ─
  // Clinical evidence supports Apixaban use in ESRD/dialysis with caution
  // (2023 AHA/ACC/ACCP/HRS guideline; FDA allows Apixaban 5mg BID in ESRD)
  if (input.dialysis) {
    absoluteContraindications.push(
      'ผู้ป่วยฟอกเลือด (Dialysis/ESRD): Rivaroxaban, Dabigatran, Edoxaban — ห้ามใช้; Apixaban — ใช้ได้ด้วยความระมัดระวัง'
    )
  }

  // ── Step 3: Hepatic caution (Child-Pugh B) ────────────────────────────────────
  // Child-Pugh B: not absolute CI but warrants caution and possibly lower ranking

  // ── Step 4: Individual drug evaluation ───────────────────────────────────────
  let drugs: DrugResult[]

  if (input.dialysis) {
    // Only Apixaban usable; others blocked
    const apixabanResult = evalApixaban(input)
    // Add dialysis caution note to Apixaban
    const apixabanWithCaution: DrugResult = {
      ...apixabanResult,
      doseNote: (apixabanResult.doseNote ?? '') + ' (ผู้ป่วยฟอกเลือด: ใช้ด้วยความระมัดระวัง)',
    }
    const blockedDrugs = (['rivaroxaban', 'dabigatran', 'edoxaban'] as const).map(drug => ({
      drug,
      nameThai:               { rivaroxaban: 'ริวาโรซาแบน', dabigatran: 'ดาบิกาทราน', edoxaban: 'อีด็อกซาแบน' }[drug],
      nameEn:                 { rivaroxaban: 'Rivaroxaban', dabigatran: 'Dabigatran', edoxaban: 'Edoxaban' }[drug],
      brandName:              { rivaroxaban: 'Xarelto®', dabigatran: 'Pradaxa®', edoxaban: 'Lixiana®' }[drug],
      level:                  'contraindicated' as const,
      doseAmount:             '—',
      doseUnit:               '',
      frequency:              '—',
      frequencyThai:          '—',
      contraindicationReason: 'ห้ามใช้ในผู้ป่วยฟอกเลือด (ESRD/Dialysis)',
      interactions:           [],
    }))
    drugs = [apixabanWithCaution, ...blockedDrugs]
  } else {
    drugs = [
      evalApixaban(input),
      evalRivaroxaban(input),
      evalDabigatran(input),
      evalEdoxaban(input),
    ]
  }

  // ── Step 5: General precautions (apply to all) ───────────────────────────────
  const generalPrecautions: string[] = []

  const nsaids = matchMeds(input.concurrentMeds, NSAIDS)
  if (nsaids.length) {
    generalPrecautions.push(`${nsaids.map(m => m.name).join(', ')}: เพิ่มความเสี่ยงเลือดออกในทุกยา NOACs`)
  }

  const aps = matchMeds(input.concurrentMeds, ANTIPLATELETS)
  if (aps.length) {
    generalPrecautions.push(`${aps.map(m => m.name).join(', ')}: ยาต้านเกล็ดเลือด — เพิ่มความเสี่ยงเลือดออก`)
  }

  return { drugs, generalPrecautions, absoluteContraindications }
}
