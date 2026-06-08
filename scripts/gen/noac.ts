// ─── G4: NOAC dispensing ─────────────────────────────────────────────────────
// Per NOAC patient → NoacPatientData. Each visit runs the REAL engine
// (computeNoacRecommendations) so drug/dose/level/contraindication match runtime.
// Labs evolve COHERENTLY (small noise around baseline — fixes the old n001 bug
// where weight swung 24 kg between visits). Dose concordance ~84% → the rest are
// realistic under/overdose. Absolute-CI patients are withheld.
// ─────────────────────────────────────────────────────────────────────────────

import { computeNoacRecommendations } from '../../src/utils/noacEngine'
import type { DrugResult, NoacDrug, NoacEngineInput, NoacRecommendationResult, RecommendationLevel } from '../../src/data/types/noac'
import type {
  NoacPatientData, NoacProfile, NoacDispensingRecord, NoacLabData, NoacClinicalStatus,
} from '../../src/data/types/noac-dispensing'
import { rand, randInt, randNormal, chance, weighted } from './rng'
import { isoDate, crCl, addDays } from './pools'
import { noacVisits } from './schedule'
import type { GenPatient } from './identity'

const LVL: Record<RecommendationLevel, number> = { recommended: 0, 'dose-adjusted': 1, caution: 2, contraindicated: 3 }
const STD_DOSE: Record<NoacDrug, string> = { apixaban: '5 mg BID', rivaroxaban: '20 mg OD', dabigatran: '150 mg BID', edoxaban: '60 mg OD' }
const LOW_DOSE: Record<NoacDrug, string> = { apixaban: '2.5 mg BID', rivaroxaban: '15 mg OD', dabigatran: '110 mg BID', edoxaban: '30 mg OD' }

function ranked(drugs: DrugResult[]): DrugResult[] {
  return drugs.map((d, i) => ({ d, i })).sort((a, b) => LVL[a.d.level] - LVL[b.d.level] || a.i - b.i).map(x => x.d)
}

function doseString(dr: DrugResult): string {
  return `${dr.doseAmount} ${dr.doseUnit} ${dr.frequency}`.replace(/\s+/g, ' ').trim()
}

function visitLab(p: GenPatient, date: Date, i: number): NoacLabData {
  // coherent: small noise around baseline (±~2 kg, ±~0.15 mg/dL)
  const weightKg = Math.round(randNormal(`${p.id}:vwt${i}`, p.baseWeightKg, 1.6, p.baseWeightKg - 4, p.baseWeightKg + 4, 1) * 10) / 10
  const scrMgDl = Math.round(randNormal(`${p.id}:vscr${i}`, p.baseScrMgDl, 0.12, Math.max(0.5, p.baseScrMgDl - 0.4), p.baseScrMgDl + 0.4, 2) * 100) / 100
  return { weightKg, scrMgDl, crClMlMin: crCl(p.age, weightKg, scrMgDl, p.sex), measuredAt: isoDate(date) }
}

function engineInput(p: GenPatient, lab: NoacLabData): NoacEngineInput {
  return {
    age: p.age, sex: p.sex, weightKg: lab.weightKg, scrMgDl: lab.scrMgDl, crClMlMin: lab.crClMlMin,
    concurrentMeds: p.concurrentMedications ?? [],
    indication: p.indication!,
    dialysis: p.dialysis, mechanicalValve: p.mechanicalValve, pregnancy: p.pregnancy,
    activeBleeding: p.activeBleeding, childPughClass: p.childPughClass, cha2ds2vasc: p.cha2ds2vasc,
  }
}

function followUpMonths(crcl: number): number {
  return crcl >= 60 ? 6 : crcl >= 30 ? 3 : 1
}
function followUpDays(crcl: number): number {
  return crcl >= 60 ? 90 : crcl >= 30 ? 60 : 30
}

/** Patient's drug — chosen once at baseline from the top usable recommendation. */
function chooseDrug(p: GenPatient): NoacDrug {
  const lab: NoacLabData = { weightKg: p.baseWeightKg, scrMgDl: p.baseScrMgDl, crClMlMin: crCl(p.age, p.baseWeightKg, p.baseScrMgDl, p.sex), measuredAt: '' }
  const usable = ranked(computeNoacRecommendations(engineInput(p, lab)).drugs).filter(d => d.level !== 'contraindicated')
  if (!usable.length) return 'apixaban' // withhold patient — nominal drug
  if (chance(`${p.id}:drugtop`, 0.7)) return usable[0].drug
  return weighted(`${p.id}:drugpick`, usable.map(d => [d.drug, ({ apixaban: 50, rivaroxaban: 25, edoxaban: 15, dabigatran: 10 })[d.drug]] as const))
}

export function generateNoac(p: GenPatient): NoacPatientData {
  const patientDrug = chooseDrug(p)
  const visits = noacVisits(p)
  const history: NoacDispensingRecord[] = []

  visits.forEach((date, i) => {
    const lab = visitLab(p, date, i)
    const res: NoacRecommendationResult = computeNoacRecommendations(engineInput(p, lab))
    const rd = ranked(res.drugs)
    const dispensedAt = `${isoDate(date)}T09:${String(randInt(`${p.id}:m${i}`, 0, 59)).padStart(2, '0')}:00`
    const nextFollowUpDate = isoDate(addDays(date, followUpDays(lab.crClMlMin)))

    // All contraindicated → withhold
    if (rd[0].level === 'contraindicated') {
      history.push({
        id: `disp-${p.id}-${i + 1}`, patientId: p.id, dispensedAt, labData: lab,
        dose: '—', dispensed: false,
        withholdReason: res.absoluteContraindications.join(' · ') || rd[0].contraindicationReason || 'มีข้อห้ามใช้',
        systemRank: 1, wasTopRecommendation: false, clinicalStatus: 'contra',
        pharmacistNote: null, nextFollowUpDate, schemaVersion: 1,
      })
      return
    }

    // Dispense patient's drug; switch to top usable if it's now contraindicated
    let chosen = res.drugs.find(d => d.drug === patientDrug)!
    let switched = false
    if (!chosen || chosen.level === 'contraindicated') { chosen = rd[0]; switched = true }

    // Dose concordance — NVAF can deviate (under/overdose); phased indications stay concordant
    const concordant = p.indication !== 'NVAF' ? true : chance(`${p.id}:dose${i}`, 0.84)
    let dose: string
    let clinicalStatus: NoacClinicalStatus
    if (concordant) {
      dose = doseString(chosen)
      clinicalStatus = 'appropriate'
    } else if (chosen.level === 'dose-adjusted') {
      dose = STD_DOSE[chosen.drug]; clinicalStatus = 'overdose'   // engine wanted reduced, gave standard
    } else {
      dose = LOW_DOSE[chosen.drug]; clinicalStatus = 'underdose'  // engine wanted standard, gave reduced
    }

    const systemRank = rd.findIndex(d => d.drug === chosen.drug) + 1
    const wasTop = chosen.drug === rd[0].drug && concordant
    const daysSupply = weighted(`${p.id}:supply${i}`, [[30, 60], [90, 30], [60, 10]] as const) as 30 | 60 | 90

    history.push({
      id: `disp-${p.id}-${i + 1}`, patientId: p.id, dispensedAt, labData: lab,
      drugDispensed: chosen.drug, dose, daysSupply, dispensed: true,
      systemRank, wasTopRecommendation: wasTop, clinicalStatus,
      ...(wasTop ? {} : {
        overrideCode: switched ? 'renal-function-change' : 'physician-directive',
        overrideNote: switched ? 'ปรับยาตามการเปลี่ยนแปลงการทำงานของไต/ข้อห้ามใช้' : 'เภสัชกร/แพทย์ปรับขนาดตามดุลยพินิจ',
      }),
      pharmacistNote: null, nextFollowUpDate, schemaVersion: 1,
    })
  })

  const last = history[history.length - 1]
  const withheld = last?.dispensed === false
  const profile: NoacProfile = {
    patientId: p.id,
    indication: p.indication!,
    currentDrug: (last?.drugDispensed ?? patientDrug),
    currentDose: last?.dose ?? '—',
    therapyStartDate: buddhist(p.therapyStart),
    followUpMonths: followUpMonths(last?.labData.crClMlMin ?? crCl(p.age, p.baseWeightKg, p.baseScrMgDl, p.sex)),
    status: (last?.clinicalStatus ?? 'appropriate'),
    ...(withheld ? { needsReview: true } : {}),
    ...(p.dialysis ? { dialysis: true } : {}),
    ...(p.mechanicalValve ? { mechanicalValve: true } : {}),
    ...(p.pregnancy ? { pregnancy: true } : {}),
    ...(p.activeBleeding ? { activeBleeding: true } : {}),
    ...(p.childPughClass ? { childPughClass: p.childPughClass } : {}),
    ...(p.cha2ds2vasc != null ? { cha2ds2vasc: p.cha2ds2vasc } : {}),
  }

  return { profile, dispensingHistory: history }
}

function buddhist(d: Date): string {
  return `${d.getUTCFullYear() + 543}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}
