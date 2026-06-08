// ─── G3: Warfarin records ────────────────────────────────────────────────────
// Per WF patient → WarfarinPageData. INR history wanders around the target by a
// per-patient control quality; each visit runs the REAL engine
// (computeDosingSuggestion + buildWeeklySchedule) so dose/schedule/concordance
// match runtime logic. TTR is computed by the Rosendaal method.
// ─────────────────────────────────────────────────────────────────────────────

import { computeDosingSuggestion } from '../../src/utils/warfarinDosing'
import {
  DEFAULT_TARGET_RANGE, DEFAULT_TTR_GOAL_PCT, INR_TARGET_RANGES,
} from '../../src/data/types/warfarin'
import type {
  WarfarinPageData, WarfarinProfile, InrRecord, DoseAdjustment, TtrResult,
  PillStrengthMg, InrTargetRange, ConcurrentMed,
} from '../../src/data/types/warfarin'
import { randInt, randNormal, chance, pick, weighted } from './rng'
import { isoDate } from './pools'
import { warfarinVisits } from './schedule'
import type { GenPatient } from './identity'

const PHARMACISTS = ['ภญ. ศิริพร วงศ์ทอง', 'ภก. ธนกร ใจเย็น', 'ภญ. กมลชนก สุขใส', 'ภก. วิทยา มั่นคง']

const WF_INTERACTIONS: ConcurrentMed[] = [
  { name: 'Amiodarone', effect: 'increase', severity: 'major', note: 'เพิ่มฤทธิ์ warfarin — ติดตาม INR ใกล้ชิด' },
  { name: 'Rifampicin', effect: 'decrease', severity: 'major', note: 'ลดฤทธิ์ warfarin — อาจต้องเพิ่มขนาด' },
  { name: 'Fluconazole', effect: 'increase', severity: 'major', note: 'เพิ่มระดับ warfarin' },
  { name: 'Carbamazepine', effect: 'decrease', severity: 'moderate', note: 'เหนี่ยวนำเอนไซม์ตับ' },
  { name: 'Simvastatin', effect: 'increase', severity: 'minor', note: 'อาจเพิ่ม INR เล็กน้อย' },
]

function pickPills(id: string): { active: PillStrengthMg[]; primary: PillStrengthMg } {
  const active = weighted<PillStrengthMg[]>(`${id}:pills`, [
    [[3], 38], [[5], 34], [[2], 14], [[2, 5], 8], [[3, 5], 6],
  ])
  return { active, primary: Math.max(...active) as PillStrengthMg }
}

function pickRange(id: string): InrTargetRange {
  // ~12% mechanical-valve target (2.5–3.5); rest standard
  return chance(`${id}:range`, 0.12) ? INR_TARGET_RANGES[1] : DEFAULT_TARGET_RANGE
}

function timeAt(d: Date, id: string, i: number): string {
  const h = randInt(`${id}:t${i}h`, 8, 15)
  const m = randInt(`${id}:t${i}m`, 0, 59)
  return `${isoDate(d)}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
}

/** Rosendaal linear-interpolation TTR. */
function rosendaal(history: InrRecord[], range: InrTargetRange): { value: number; daysInRange: number; daysCalculable: number } {
  if (history.length < 2) return { value: 0, daysInRange: 0, daysCalculable: 0 }
  const pts = [...history].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))
  let inRange = 0, total = 0
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1]
    const days = Math.round((+new Date(a.measuredAt.slice(0, 10)) === +new Date(b.measuredAt.slice(0, 10)) ? 0
      : (+new Date(b.measuredAt.slice(0, 10)) - +new Date(a.measuredAt.slice(0, 10))) / 86400000))
    if (days <= 0) continue
    for (let d = 0; d < days; d++) {
      const t = d / days
      const inr = a.inrValue + (b.inrValue - a.inrValue) * t
      if (inr >= range.min && inr <= range.max) inRange++
      total++
    }
  }
  return { value: total ? Math.round((inRange / total) * 1000) / 10 : 0, daysInRange: inRange, daysCalculable: total }
}

export function generateWarfarin(p: GenPatient): WarfarinPageData {
  const good = chance(`${p.id}:control`, 0.68)       // well-controlled → TTR ≥ goal
  const range = pickRange(p.id)
  const mid = (range.min + range.max) / 2
  const sd = good ? 0.23 : 0.85
  const { active, primary } = pickPills(p.id)

  // concurrent meds — ~15% have a clinically significant interaction
  const concurrentMeds: ConcurrentMed[] = chance(`${p.id}:ixn`, 0.15)
    ? [pick(`${p.id}:ixnpick`, WF_INTERACTIONS)]
    : []

  // evolving profile (mutated as visits adjust the dose)
  const profile: WarfarinProfile = {
    patientId: p.id,
    pillStrengthMg: primary,
    activePillsMg: active,
    currentDoseMgWk: Math.round(randNormal(`${p.id}:dose0`, 31, 7, 17.5, 56, 1) * 2) / 2,
    therapyStartDate: buddhist(p.therapyStart),
    ttrGoalPct: DEFAULT_TTR_GOAL_PCT,
    ...(range !== DEFAULT_TARGET_RANGE ? { targetRange: range } : {}),
    ...(concurrentMeds.length ? { concurrentMeds } : {}),
  }

  const visits = warfarinVisits(p, good)
  const inrHistory: InrRecord[] = []
  const doseAdjustments: DoseAdjustment[] = []

  visits.forEach((date, i) => {
    const inr = Math.round(randNormal(`${p.id}:inr${i}`, mid, sd, 1.2, 5.0, 1) * 10) / 10
    const measuredAt = timeAt(date, p.id, i)
    inrHistory.push({ id: `inr-${p.id}-${i + 1}`, patientId: p.id, inrValue: inr, measuredAt, source: 'manual' })

    const sugg = computeDosingSuggestion(inr, profile)
    const opt = sugg.options[0]
    const newDose = opt?.newDoseMgWk ?? profile.currentDoseMgWk
    const schedule = opt?.schedule ?? { totalMgWk: newDose, pillStrengthMg: primary, activePillsMg: active, days: {} as never }
    const oldDose = profile.currentDoseMgWk
    const pct = oldDose ? Math.round(((newDose - oldDose) / oldDose) * 1000) / 10 : 0

    const systemSuggested = chance(`${p.id}:concord${i}`, 0.80)
    doseAdjustments.push({
      id: `adj-${p.id}-${i + 1}`,
      patientId: p.id,
      adjustedAt: measuredAt,
      adjustedBy: pick(`${p.id}:rph${i}`, PHARMACISTS),
      inrAtAdjustment: inr,
      inrSource: 'manual',
      oldDoseMgWk: oldDose,
      newDoseMgWk: newDose,
      percentChange: pct,
      pillStrengthMg: schedule.pillStrengthMg ?? primary,
      activePillsMg: schedule.activePillsMg ?? active,
      weeklySchedule: schedule,
      systemSuggested,
      ...(systemSuggested ? {} : { overrideReason: 'เภสัชกรปรับตามดุลยพินิจ (ปัจจัยผู้ป่วยเฉพาะราย)' }),
    })

    profile.currentDoseMgWk = newDose
    profile.activePillsMg = schedule.activePillsMg ?? active
    profile.pillStrengthMg = schedule.pillStrengthMg ?? primary
  })

  const r = rosendaal(inrHistory, range)
  const ttr: TtrResult = {
    value: r.value,
    status: inrHistory.length < 2 ? 'insufficient-data' : r.value >= DEFAULT_TTR_GOAL_PCT ? 'goal-met' : 'below-goal',
    goalPct: DEFAULT_TTR_GOAL_PCT,
    fromDate: inrHistory[0]?.measuredAt.slice(0, 10) ?? isoDate(p.therapyStart),
    toDate: inrHistory[inrHistory.length - 1]?.measuredAt.slice(0, 10) ?? isoDate(p.therapyStart),
    daysInRange: r.daysInRange,
    daysCalculable: r.daysCalculable,
  }

  return { profile, latestInr: inrHistory[inrHistory.length - 1], inrHistory, doseAdjustments, ttr }
}

// Buddhist-year ISO for therapyStartDate (matches existing data convention)
function buddhist(d: Date): string {
  return `${d.getUTCFullYear() + 543}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}
