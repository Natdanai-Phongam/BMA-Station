// ─── G1: Identity & enrollment ───────────────────────────────────────────────
// Produces the internal GenPatient model (superset of PatientDetail) that every
// later phase consumes. Demographics + baseline labs + enrollment + NOAC risk
// flags. Curated edge cases are pinned by id so demos are stable.
// ─────────────────────────────────────────────────────────────────────────────

import type { Allergy, ConcurrentMedication } from '../../src/data/types/patient-detail'
import type { NoacIndication } from '../../src/data/types/noac'
import type { ChildPughClass } from '../../src/data/types/noac'
import { DATA_WINDOW } from '../../src/data/config/data-window'
import {
  rand, randInt, chance, pick, weighted, randNormal, shuffle,
} from './rng'
import {
  FIRST_NAMES_MALE, FIRST_NAMES_FEMALE, LAST_NAMES, HOSPITALS,
  INSURANCE_TYPES, BLOOD_GROUPS, PHYSICIAN_IDS, titleFor,
  isoDate, addDays, parseISO, crCl,
} from './pools'

// Deterministic, non-round counts around ~300 each (a real registry isn't 300/300).
// Total lands ~585–635, split close-to-half but not exact.
export const COUNTS = {
  warfarin: 288 + randInt('count:wf', 0, 27),    // ~288–315
  noacs: 291 + randInt('count:noac', 0, 27),     // ~291–318
}

export type Therapy = 'warfarin' | 'noacs'

export interface GenPatient {
  id: string
  therapy: Therapy
  // identity
  name: string
  hn: string
  age: number
  dob: string                  // ISO/CE
  sex: 'ชาย' | 'หญิง'
  bloodGroup: string
  phone: string
  insuranceType: string
  hospital: string
  attendingPhysicianId: string
  allergies: Allergy[]
  // baseline labs — per-visit values add noise around these
  baseWeightKg: number
  baseScrMgDl: number
  // enrollment
  therapyStart: Date           // may precede the window (ongoing) or fall within (new)
  isNew: boolean               // first enrolled within the window
  // NOAC-only
  indication?: NoacIndication
  dialysis?: boolean
  mechanicalValve?: boolean
  pregnancy?: boolean
  activeBleeding?: boolean
  childPughClass?: ChildPughClass
  cha2ds2vasc?: number
  concurrentMedications?: ConcurrentMedication[]   // feeds the NOAC engine + detail page
  edgeTag?: string             // label for curated edge cases
}

// NOAC concurrent meds — names the engine recognises (so interactions fire)
const NOAC_MED_POOL: { name: string; category: string; level: 'monitor' | 'warning'; dose: string; note: string }[] = [
  { name: 'Amiodarone', category: 'ยาควบคุมจังหวะหัวใจ', level: 'monitor', dose: '200 mg OD', note: 'P-gp inhibitor — ติดตามอาการเลือดออก' },
  { name: 'Verapamil', category: 'ยาลดความดันโลหิต', level: 'monitor', dose: '80 mg BID', note: 'P-gp inhibitor — ติดตามอาการเลือดออก' },
  { name: 'Diltiazem', category: 'ยาลดความดันโลหิต', level: 'monitor', dose: '60 mg TID', note: 'P-gp inhibitor — ติดตาม' },
  { name: 'Clopidogrel', category: 'ยาต้านเกล็ดเลือด', level: 'warning', dose: '75 mg OD', note: 'เพิ่มความเสี่ยงเลือดออก' },
  { name: 'Ibuprofen', category: 'ยาแก้ปวด (NSAID)', level: 'warning', dose: '400 mg PRN', note: 'NSAID — เพิ่มความเสี่ยงเลือดออก' },
]

function genConcurrentMeds(p: GenPatient): ConcurrentMedication[] {
  if (p.edgeTag === 'major-interaction') {
    return [{ name: 'Ketoconazole', dose: '200 mg OD', category: 'ยาต้านเชื้อรา', interactionLevel: 'contraindicated', interactionNote: 'P-gp + CYP3A4 inhibitor อย่างแรง — ห้ามใช้ร่วม' }]
  }
  if (!chance(`${p.id}:cmed`, 0.18)) return []
  const m = pick(`${p.id}:cmedpick`, NOAC_MED_POOL)
  return [{ name: m.name, dose: m.dose, category: m.category, interactionLevel: m.level, interactionNote: m.note }]
}

const WINDOW_START = parseISO(DATA_WINDOW.start)
const WINDOW_END = parseISO(DATA_WINDOW.end)

const ALLERGY_POOL: Allergy[] = [
  { substance: 'Aspirin', reaction: 'ผื่นลมพิษ', severity: 'moderate' },
  { substance: 'Penicillin', reaction: 'ผื่นคัน หายใจลำบาก', severity: 'severe' },
  { substance: 'NSAIDs', reaction: 'ปวดท้อง เลือดออกทางเดินอาหาร', severity: 'moderate' },
  { substance: 'Sulfa', reaction: 'ผื่นแพ้ยา', severity: 'mild' },
  { substance: 'Ibuprofen', reaction: 'บวมที่ใบหน้า', severity: 'moderate' },
]

function makeName(id: string, sex: 'ชาย' | 'หญิง', age: number): string {
  const first = pick(`${id}:first`, sex === 'ชาย' ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE)
  const last = pick(`${id}:last`, LAST_NAMES)
  return `${titleFor(sex, age)} ${first} ${last}`
}

function makeHn(id: string): string {
  // 9 digits, "69" prefix (matches existing 69x… pattern)
  return `69${randInt(`${id}:hn`, 1000000, 9999999)}`
}

function makePhone(id: string): string {
  const a = randInt(`${id}:ph1`, 0, 9)
  const b = String(randInt(`${id}:ph2`, 100, 999))
  const c = String(randInt(`${id}:ph3`, 1000, 9999))
  return `08${a}-${b}-${c}`
}

function dobFromAge(id: string, age: number): string {
  const dayOffset = randInt(`${id}:dob`, 0, 364)
  const d = new Date(Date.UTC(WINDOW_END.getUTCFullYear() - age, 0, 1))
  return isoDate(addDays(d, dayOffset))
}

function ageFor(id: string, indication?: NoacIndication): number {
  // anticoag skews elderly; DVT/PE skew younger
  if (indication === 'DVT' || indication === 'PE') return Math.round(randNormal(`${id}:age`, 55, 13, 30, 80, 0))
  if (indication === 'CAT') return Math.round(randNormal(`${id}:age`, 62, 12, 40, 85, 0))
  return Math.round(randNormal(`${id}:age`, 70, 11, 48, 92, 0))
}

function enrollment(id: string): { start: Date; isNew: boolean } {
  // ~40% are NEW (first enrolled within window); ~60% ongoing (started earlier)
  if (chance(`${id}:new`, 0.4)) {
    const offset = randInt(`${id}:newday`, 0, Math.round((+WINDOW_END - +WINDOW_START) / 86400000))
    return { start: addDays(WINDOW_START, offset), isNew: true }
  }
  // ongoing: started 60–730 days before window
  return { start: addDays(WINDOW_START, -randInt(`${id}:oldday`, 60, 730)), isNew: false }
}

function baseLabs(id: string, age: number): { weight: number; scr: number } {
  const weight = randNormal(`${id}:wt`, 63, 12, 42, 100, 1)
  const scrMean = age >= 72 ? 1.1 : 0.95
  const scr = randNormal(`${id}:scr`, scrMean, 0.28, 0.6, 2.4, 2)
  return { weight, scr }
}

function commonIdentity(id: string, therapy: Therapy, age: number, sex: 'ชาย' | 'หญิง'): GenPatient {
  const { start, isNew } = enrollment(id)
  const { weight, scr } = baseLabs(id, age)
  const nAllergy = weighted(`${id}:nallergy`, [[0, 70], [1, 22], [2, 8]])
  const allergies: Allergy[] = []
  for (let i = 0; i < nAllergy; i++) allergies.push(pick(`${id}:allergy${i}`, ALLERGY_POOL))
  // dedupe by substance
  const uniqAllergies = allergies.filter((a, i, arr) => arr.findIndex(x => x.substance === a.substance) === i)
  return {
    id, therapy,
    name: makeName(id, sex, age),
    hn: makeHn(id),
    age, dob: dobFromAge(id, age), sex,
    bloodGroup: weighted(`${id}:blood`, BLOOD_GROUPS),
    phone: makePhone(id),
    insuranceType: weighted(`${id}:ins`, INSURANCE_TYPES),
    hospital: pick(`${id}:hosp`, HOSPITALS),
    attendingPhysicianId: pick(`${id}:dr`, PHYSICIAN_IDS),
    allergies: uniqAllergies,
    baseWeightKg: weight,
    baseScrMgDl: scr,
    therapyStart: start, isNew,
  }
}

// ── Curated edge / demo cases (pinned ids → stable demos) ─────────────────────
// Applied as overrides after base generation. Each exercises an engine branch.
const NOAC_EDGE: Record<string, Partial<GenPatient> & { edgeTag: string }> = {
  n001: { edgeTag: 'demo-nvaf-normal', indication: 'NVAF', age: 52, sex: 'หญิง', baseWeightKg: 62, baseScrMgDl: 0.9 },
  n002: { edgeTag: 'dialysis', indication: 'NVAF', age: 67, baseWeightKg: 78, baseScrMgDl: 4.0, dialysis: true },
  n003: { edgeTag: 'crcl-lt-15', indication: 'NVAF', age: 84, sex: 'หญิง', baseWeightKg: 46, baseScrMgDl: 3.4 },
  n004: { edgeTag: 'mechanical-valve', indication: 'NVAF', age: 58, mechanicalValve: true },
  n005: { edgeTag: 'major-interaction', indication: 'NVAF', age: 71 },
  n006: { edgeTag: 'dvt-phased', indication: 'DVT', age: 49, sex: 'ชาย' },
  n007: { edgeTag: 'cat', indication: 'CAT', age: 64 },
} as const

const NOAC_MIX = { NVAF: 0.80, DVT: 0.08, PE: 0.07, CAT: 0.05 } as const

/** Exact-count quota (NVAF = remainder so it sums to total). */
function indicationQuota(total: number): Record<NoacIndication, number> {
  const dvt = Math.round(total * NOAC_MIX.DVT)
  const pe = Math.round(total * NOAC_MIX.PE)
  const cat = Math.round(total * NOAC_MIX.CAT)
  return { NVAF: total - dvt - pe - cat, DVT: dvt, PE: pe, CAT: cat }
}

/** Edge cases keep forced indications; the rest get a quota-exact, deterministically
 *  shuffled distribution so the overall mix matches NOAC_MIX precisely. */
function assignIndications(ids: string[]): Record<string, NoacIndication> {
  const quota = indicationQuota(ids.length)
  const result: Record<string, NoacIndication> = {}
  const forced: Record<NoacIndication, number> = { NVAF: 0, DVT: 0, PE: 0, CAT: 0 }
  const freeIds: string[] = []
  for (const id of ids) {
    const f = NOAC_EDGE[id]?.indication
    if (f) { result[id] = f; forced[f]++ } else freeIds.push(id)
  }
  const pool: NoacIndication[] = []
  for (const ind of ['NVAF', 'DVT', 'PE', 'CAT'] as NoacIndication[]) {
    for (let i = 0; i < Math.max(0, quota[ind] - forced[ind]); i++) pool.push(ind)
  }
  while (pool.length < freeIds.length) pool.push('NVAF')  // rounding safety
  pool.length = freeIds.length
  const shuffled = shuffle('noac:indication', pool)
  freeIds.forEach((id, i) => { result[id] = shuffled[i] })
  return result
}

export function generateIdentities(): GenPatient[] {
  const out: GenPatient[] = []

  // Warfarin
  for (let i = 1; i <= COUNTS.warfarin; i++) {
    const id = `w${String(i).padStart(3, '0')}`
    const sex = chance(`${id}:sex`, 0.48) ? 'หญิง' : 'ชาย'
    const age = ageFor(id)
    out.push(commonIdentity(id, 'warfarin', age, sex))
  }

  // NOAC
  const noacIds = Array.from({ length: COUNTS.noacs }, (_, i) => `n${String(i + 1).padStart(3, '0')}`)
  const indications = assignIndications(noacIds)
  for (const id of noacIds) {
    const edge = NOAC_EDGE[id]
    const indication = indications[id]
    const sex = edge?.sex ?? (chance(`${id}:sex`, 0.48) ? 'หญิง' : 'ชาย')
    const age = edge?.age ?? ageFor(id, indication)
    const p = commonIdentity(id, 'noacs', age, sex)
    p.indication = indication
    p.childPughClass = weighted(`${id}:cp`, [['A', 88], ['B', 10], ['C', 2]])
    p.cha2ds2vasc = indication === 'NVAF' ? randInt(`${id}:cha`, 1, 6) : undefined
    if (edge) {
      Object.assign(p, edge)
      // recompute name if age/sex pinned
      p.name = makeName(id, p.sex, p.age)
    }
    p.concurrentMedications = genConcurrentMeds(p)
    out.push(p)
  }

  return out
}

/** Quick distribution summary for review. */
export function summarize(patients: GenPatient[]) {
  const wf = patients.filter(p => p.therapy === 'warfarin')
  const no = patients.filter(p => p.therapy === 'noacs')
  const dist = (arr: GenPatient[], f: (p: GenPatient) => string) => {
    const m: Record<string, number> = {}
    for (const p of arr) m[f(p)] = (m[f(p)] ?? 0) + 1
    return m
  }
  return {
    total: patients.length,
    warfarin: wf.length,
    noacs: no.length,
    newPct: Math.round((patients.filter(p => p.isNew).length / patients.length) * 100),
    sex: dist(patients, p => p.sex),
    ageBands: dist(patients, p => p.age < 60 ? '<60' : p.age < 75 ? '60-74' : '≥75'),
    noacIndication: dist(no, p => p.indication ?? '?'),
    edgeCases: no.filter(p => p.edgeTag).map(p => `${p.id}:${p.edgeTag}`),
    sampleCrCl: patients.slice(0, 3).map(p => ({
      id: p.id, age: p.age, sex: p.sex, wt: p.baseWeightKg, scr: p.baseScrMgDl,
      crcl: crCl(p.age, p.baseWeightKg, p.baseScrMgDl, p.sex),
    })),
  }
}
