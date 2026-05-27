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
  NoacDrug,
  RecommendationLevel,
  DrugInteractionResult,
  DrugResult,
  NoacEngineInput,
  NoacRecommendationResult,
} from '@/data/types/noac'

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

function mkContra(
  drug: NoacDrug,
  nameThai: string,
  nameEn: string,
  brandName: string,
  interactions: DrugInteractionResult[],
  contraindicationReason: string,
): DrugResult {
  return {
    drug, nameThai, nameEn, brandName,
    level: 'contraindicated',
    doseAmount: '—', doseUnit: '', frequency: '—', frequencyThai: 'ห้ามใช้',
    contraindicationReason,
    interactions,
  }
}

// ── Drug evaluators ────────────────────────────────────────────────────────

function evalApixaban(input: NoacEngineInput): DrugResult {
  const { age, weightKg, scrMgDl, crClMlMin, concurrentMeds } = input
  const interactions: DrugInteractionResult[] = []

  // Absolute contraindication: CrCl < 15
  if (crClMlMin < 15) {
    return mkContra(
      'apixaban', 'อะพิกซาแบน', 'Apixaban', 'Eliquis®', interactions,
      `CrCl ${crClMlMin} mL/min (ต่ำกว่า 15) — ห้ามใช้`,
    )
  }

  // Strong dual inhibitors (P-gp + CYP3A4) → contraindicated
  const strongDual = matchMeds(concurrentMeds, STRONG_DUAL_INHIBITORS)
  if (strongDual.length) {
    strongDual.forEach(m => interactions.push({
      medicationName: m.name,
      severity: 'contraindicated',
      note: 'P-gp + CYP3A4 inhibitor อย่างแรง — ห้ามใช้ร่วม',
    }))
    return mkContra(
      'apixaban', 'อะพิกซาแบน', 'Apixaban', 'Eliquis®', interactions,
      `${strongDual.map(m => m.name).join(', ')} — ห้ามใช้ร่วมกัน`,
    )
  }

  // Dose reduction: ≥ 2 of 3 criteria
  const criteria = [age >= 80, weightKg <= 60, scrMgDl >= 1.5]
  const criteriaCount = criteria.filter(Boolean).length

  let level: RecommendationLevel = 'recommended'
  let doseAmount = '5'
  let adjustmentReason: string | undefined

  if (criteriaCount >= 2) {
    doseAmount = '2.5'
    level = 'dose-adjusted'
    const parts: string[] = []
    if (age >= 80)       parts.push(`อายุ ${age} ปี (≥80)`)
    if (weightKg <= 60)  parts.push(`น้ำหนัก ${weightKg} kg (≤60)`)
    if (scrMgDl >= 1.5)  parts.push(`SCr ${scrMgDl} mg/dL (≥1.5)`)
    adjustmentReason = `เกณฑ์ลดขนาดยา: ${parts.join(', ')}`
  }

  // P-gp–only inhibitors (not strong CYP3A4) → monitor
  const pgpOnly = matchMeds(concurrentMeds, PGP_INHIBITORS)
    .filter(m => !hit(m.name, STRONG_DUAL_INHIBITORS))
  pgpOnly.forEach(m => {
    interactions.push({ medicationName: m.name, severity: 'monitor', note: 'P-gp inhibitor: ติดตามอาการเลือดออก' })
    if (level === 'recommended') level = 'caution'
  })

  // Inducers → warning (avoid)
  matchMeds(concurrentMeds, PGP_INDUCERS).forEach(m => {
    interactions.push({ medicationName: m.name, severity: 'warning', note: 'ลดระดับยา Apixaban อย่างมีนัยสำคัญ — หลีกเลี่ยง' })
    level = 'caution'
  })

  // NSAIDs → bleeding risk
  matchMeds(concurrentMeds, NSAIDS).forEach(m => {
    interactions.push({ medicationName: m.name, severity: 'warning', note: 'เพิ่มความเสี่ยงเลือดออก' })
  })

  return {
    drug: 'apixaban', nameThai: 'อะพิกซาแบน', nameEn: 'Apixaban', brandName: 'Eliquis®',
    level, doseAmount, doseUnit: 'mg', frequency: 'BID', frequencyThai: '2 ครั้ง/วัน',
    adjustmentReason, interactions,
  }
}

function evalRivaroxaban(input: NoacEngineInput): DrugResult {
  const { crClMlMin, concurrentMeds } = input
  const interactions: DrugInteractionResult[] = []

  // Absolute contraindication: CrCl < 15
  if (crClMlMin < 15) {
    return mkContra(
      'rivaroxaban', 'ริวาร็อกซาแบน', 'Rivaroxaban', 'Xarelto®', interactions,
      `CrCl ${crClMlMin} mL/min (ต่ำกว่า 15) — ห้ามใช้`,
    )
  }

  // Strong dual inhibitors → contraindicated
  const strongDual = matchMeds(concurrentMeds, STRONG_DUAL_INHIBITORS)
  if (strongDual.length) {
    strongDual.forEach(m => interactions.push({
      medicationName: m.name,
      severity: 'contraindicated',
      note: 'P-gp + CYP3A4 inhibitor อย่างแรง — ห้ามใช้ร่วม',
    }))
    return mkContra(
      'rivaroxaban', 'ริวาร็อกซาแบน', 'Rivaroxaban', 'Xarelto®', interactions,
      `${strongDual.map(m => m.name).join(', ')} — ห้ามใช้ร่วมกัน`,
    )
  }

  let level: RecommendationLevel = 'recommended'
  let doseAmount = '20'
  let adjustmentReason: string | undefined
  let doseNote: string | undefined

  // CrCl 15–49 → reduce to 15 mg OD (NVAF indication)
  if (crClMlMin >= 15 && crClMlMin < 50) {
    doseAmount = '15'
    level = 'dose-adjusted'
    adjustmentReason = `CrCl ${crClMlMin} mL/min (15–49): ลดขนาดยาเป็น 15 mg OD`
  }

  if (doseAmount === '20') {
    doseNote = 'รับประทานพร้อมมื้อเย็น (เพิ่มการดูดซึม)'
  }

  // P-gp–only inhibitors → monitor
  matchMeds(concurrentMeds, PGP_INHIBITORS)
    .filter(m => !hit(m.name, STRONG_DUAL_INHIBITORS))
    .forEach(m => {
      interactions.push({ medicationName: m.name, severity: 'monitor', note: 'ติดตามระดับยาและอาการเลือดออก' })
      if (level === 'recommended') level = 'caution'
    })

  // Inducers
  matchMeds(concurrentMeds, PGP_INDUCERS).forEach(m => {
    interactions.push({ medicationName: m.name, severity: 'warning', note: 'ลดระดับยา Rivaroxaban — หลีกเลี่ยง' })
    level = 'caution'
  })

  matchMeds(concurrentMeds, NSAIDS).forEach(m => {
    interactions.push({ medicationName: m.name, severity: 'warning', note: 'เพิ่มความเสี่ยงเลือดออก' })
  })

  return {
    drug: 'rivaroxaban', nameThai: 'ริวาร็อกซาแบน', nameEn: 'Rivaroxaban', brandName: 'Xarelto®',
    level, doseAmount, doseUnit: 'mg', frequency: 'OD', frequencyThai: '1 ครั้ง/วัน',
    doseNote, adjustmentReason, interactions,
  }
}

function evalDabigatran(input: NoacEngineInput): DrugResult {
  const { age, crClMlMin, concurrentMeds } = input
  const interactions: DrugInteractionResult[] = []

  // Absolute contraindication: CrCl < 30
  if (crClMlMin < 30) {
    return mkContra(
      'dabigatran', 'ดาบิแกตแรน', 'Dabigatran', 'Pradaxa®', interactions,
      `CrCl ${crClMlMin} mL/min (ต่ำกว่า 30) — ห้ามใช้`,
    )
  }

  // P-gp inhibitors that are absolute contraindications for Dabigatran
  const pgpContras = matchMeds(concurrentMeds, DABIGATRAN_PGPI_CONTRAS)
  if (pgpContras.length) {
    pgpContras.forEach(m => interactions.push({
      medicationName: m.name,
      severity: 'contraindicated',
      note: 'P-gp inhibitor อย่างแรง — ห้ามใช้ร่วมกับ Dabigatran',
    }))
    return mkContra(
      'dabigatran', 'ดาบิแกตแรน', 'Dabigatran', 'Pradaxa®', interactions,
      `${pgpContras.map(m => m.name).join(', ')} — ห้ามใช้ร่วมกัน`,
    )
  }

  let level: RecommendationLevel = 'recommended'
  let doseAmount = '150'
  let adjustmentReason: string | undefined

  // Dose reduction criteria
  const ageAdj      = age >= 75
  const crClAdj     = crClMlMin >= 30 && crClMlMin < 50
  const pgpPresent  = matchMeds(concurrentMeds, PGP_INHIBITORS).length > 0

  if (ageAdj || crClAdj || pgpPresent) {
    doseAmount = '110'
    level = 'dose-adjusted'
    const parts: string[] = []
    if (ageAdj)     parts.push(`อายุ ${age} ปี (≥75)`)
    if (crClAdj)    parts.push(`CrCl ${crClMlMin} mL/min (30–49)`)
    if (pgpPresent) parts.push('P-gp inhibitor ร่วม')
    adjustmentReason = `ลดขนาดยา: ${parts.join(', ')}`
  }

  // P-gp inhibitors not already contraindicated → warning note
  matchMeds(concurrentMeds, PGP_INHIBITORS)
    .filter(m => !hit(m.name, DABIGATRAN_PGPI_CONTRAS))
    .forEach(m => {
      interactions.push({
        medicationName: m.name,
        severity: 'warning',
        note: `เพิ่มระดับ Dabigatran ในเลือด — ลดขนาดยาตามเกณฑ์ด้านบน`,
      })
    })

  // Inducers
  matchMeds(concurrentMeds, PGP_INDUCERS).forEach(m => {
    interactions.push({ medicationName: m.name, severity: 'warning', note: 'ลดระดับยา Dabigatran อย่างมีนัยสำคัญ — หลีกเลี่ยง' })
    level = 'caution'
  })

  matchMeds(concurrentMeds, NSAIDS).forEach(m => {
    interactions.push({ medicationName: m.name, severity: 'warning', note: 'เพิ่มความเสี่ยงเลือดออก' })
  })

  return {
    drug: 'dabigatran', nameThai: 'ดาบิแกตแรน', nameEn: 'Dabigatran', brandName: 'Pradaxa®',
    level, doseAmount, doseUnit: 'mg', frequency: 'BID', frequencyThai: '2 ครั้ง/วัน',
    adjustmentReason, interactions,
  }
}

function evalEdoxaban(input: NoacEngineInput): DrugResult {
  const { weightKg, crClMlMin, concurrentMeds } = input
  const interactions: DrugInteractionResult[] = []

  // Absolute contraindication: CrCl < 15
  if (crClMlMin < 15) {
    return mkContra(
      'edoxaban', 'เอโดซาแบน', 'Edoxaban', 'Lixiana®', interactions,
      `CrCl ${crClMlMin} mL/min (ต่ำกว่า 15) — ห้ามใช้`,
    )
  }

  // Rifampicin is contraindicated with edoxaban
  const rifam = matchMeds(concurrentMeds, RIFAMPICIN)
  if (rifam.length) {
    rifam.forEach(m => interactions.push({
      medicationName: m.name,
      severity: 'contraindicated',
      note: 'P-gp inducer อย่างแรง — ลดระดับยาอย่างมีนัยสำคัญ ห้ามใช้ร่วม',
    }))
    return mkContra(
      'edoxaban', 'เอโดซาแบน', 'Edoxaban', 'Lixiana®', interactions,
      `${rifam.map(m => m.name).join(', ')} — ห้ามใช้ร่วมกัน`,
    )
  }

  let level: RecommendationLevel = 'recommended'
  let doseAmount = '60'
  let adjustmentReason: string | undefined

  // Dose reduction: CrCl 15–50 OR weight ≤60 OR P-gp inhibitor
  const crClAdj    = crClMlMin >= 15 && crClMlMin <= 50
  const weightAdj  = weightKg <= 60
  const pgpAdj     = matchMeds(concurrentMeds, PGP_INHIBITORS).length > 0

  if (crClAdj || weightAdj || pgpAdj) {
    doseAmount = '30'
    level = 'dose-adjusted'
    const parts: string[] = []
    if (crClAdj)   parts.push(`CrCl ${crClMlMin} mL/min (15–50)`)
    if (weightAdj) parts.push(`น้ำหนัก ${weightKg} kg (≤60)`)
    if (pgpAdj)    parts.push('P-gp inhibitor ร่วม')
    adjustmentReason = `ลดขนาดยา: ${parts.join(', ')}`
  }

  // P-gp inhibitor notes
  matchMeds(concurrentMeds, PGP_INHIBITORS).forEach(m => {
    interactions.push({ medicationName: m.name, severity: 'warning', note: 'P-gp inhibitor: ลดขนาดยา Edoxaban (ดูด้านบน)' })
  })

  // Other inducers
  matchMeds(concurrentMeds, PGP_INDUCERS)
    .filter(m => !hit(m.name, RIFAMPICIN))
    .forEach(m => {
      interactions.push({ medicationName: m.name, severity: 'warning', note: 'ลดระดับยา Edoxaban — หลีกเลี่ยง' })
      level = 'caution'
    })

  matchMeds(concurrentMeds, NSAIDS).forEach(m => {
    interactions.push({ medicationName: m.name, severity: 'warning', note: 'เพิ่มความเสี่ยงเลือดออก' })
  })

  return {
    drug: 'edoxaban', nameThai: 'เอโดซาแบน', nameEn: 'Edoxaban', brandName: 'Lixiana®',
    level, doseAmount, doseUnit: 'mg', frequency: 'OD', frequencyThai: '1 ครั้ง/วัน',
    adjustmentReason, interactions,
  }
}

// ── Main export ────────────────────────────────────────────────────────────

export function computeNoacRecommendations(input: NoacEngineInput): NoacRecommendationResult {
  const drugs: DrugResult[] = [
    evalApixaban(input),
    evalRivaroxaban(input),
    evalDabigatran(input),
    evalEdoxaban(input),
  ]

  const generalPrecautions: string[] = []

  // HAS-BLED ≥ 3 → high bleeding risk
  if (input.hasBleedScore >= 3) {
    generalPrecautions.push(
      `HAS-BLED ${input.hasBleedScore} — ความเสี่ยงการเลือดออกสูง (score ≥3) ควรพิจารณาลดปัจจัยเสี่ยงที่แก้ไขได้ก่อนเริ่มยา`,
    )
  }

  // NSAIDs affect all NOACs
  const nsaids = matchMeds(input.concurrentMeds, NSAIDS)
  if (nsaids.length) {
    generalPrecautions.push(`${nsaids.map(m => m.name).join(', ')}: เพิ่มความเสี่ยงเลือดออกในทุกยา NOACs`)
  }

  // Antiplatelets — additive risk
  const aps = matchMeds(input.concurrentMeds, ANTIPLATELETS)
  if (aps.length) {
    generalPrecautions.push(`${aps.map(m => m.name).join(', ')}: ยาต้านเกล็ดเลือด — เพิ่มความเสี่ยงเลือดออก`)
  }

  return { drugs, generalPrecautions }
}
