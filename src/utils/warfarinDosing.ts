// Warfarin dose titration — pure business logic
// Extracted from UI components so the algorithm can be tested and audited
// independently from Vue reactivity and rendering.
//
// Entry points:
//   buildWeeklySchedule(totalMgWk, strengthMg)  → WeeklySchedule
//   computeDosingSuggestion(inrValue, profile)   → ProtocolSuggestion

import type {
  WarfarinProfile,
  ProtocolSuggestion,
  DoseSuggestion,
  WeeklySchedule,
  PillStrengthMg,
} from '@/data/types/warfarin'
import { DAY_KEYS, DEFAULT_TARGET_RANGE, DEFAULT_PROTOCOL } from '@/data/types/warfarin'

// ── Schedule builder ────────────────────────────────────────────────────────
// Distributes a weekly dose across 7 days using one or more pill sizes.
// Each day is assigned exactly one pill size (1 day = 1 pill type).
// Half-tablets (0.5×) are allowed for all pill sizes.
// With multiple pills: greedy solver finds the combination with fewest
// half-tablet days, preferring the primary (largest) pill.
export function buildWeeklySchedule(
  totalMgWk: number,
  pills: PillStrengthMg | PillStrengthMg[],
): WeeklySchedule {
  const pillArr = (Array.isArray(pills) ? [...pills] : [pills])
    .sort((a, b) => b - a) as PillStrengthMg[]
  const primaryPill = pillArr[0]

  const assignments = pillArr.length > 1
    ? multiPillAssign(totalMgWk, pillArr)
    : singlePillAssign(totalMgWk, primaryPill)

  const days = {} as WeeklySchedule['days']
  for (let i = 0; i < 7; i++) {
    const { pillMg, tablets } = assignments[i]
    days[DAY_KEYS[i]] = {
      tablets,
      mg:     parseFloat((tablets * pillMg).toFixed(1)),
      pillMg,
    }
  }
  const actualTotal = parseFloat(
    assignments.reduce((s, a) => s + a.tablets * a.pillMg, 0).toFixed(1)
  )
  return {
    totalMgWk:     actualTotal,
    pillStrengthMg: primaryPill,
    activePillsMg:  pillArr,
    days,
  }
}

// ── Single-pill assignment (original algorithm) ─────────────────────────────
function singlePillAssign(
  totalMg: number,
  pill: PillStrengthMg,
): Array<{ pillMg: PillStrengthMg; tablets: number }> {
  const totalTabs = totalMg / pill
  const baseTabs  = Math.floor(totalTabs / 7 / 0.5) * 0.5
  let   extra     = parseFloat((totalTabs - baseTabs * 7).toFixed(1))
  return DAY_KEYS.map(() => {
    let t = baseTabs
    if (extra >= 0.5) { t += 0.5; extra = parseFloat((extra - 0.5).toFixed(1)) }
    return { pillMg: pill, tablets: t }
  })
}

// ── Multi-pill assignment ────────────────────────────────────────────────────
// Enumerates combinations of (n_full, n_half) per pill across 7 days.
// Finds the exact-match assignment with fewest half-tablet days; if no exact
// solution exists, falls back to single-pill primary scheduling.
function multiPillAssign(
  totalMg: number,
  pills: PillStrengthMg[],   // sorted descending
): Array<{ pillMg: PillStrengthMg; tablets: number }> {
  const r = (n: number) => parseFloat(n.toFixed(3))

  // For each combination of (n0_full, n0_half, n1_full, [n2_full...]) summing to 7 days,
  // check if the total mg matches.
  // Limited to 2 active pill sizes for now (covers the clinical use case).
  const [p0, p1] = pills

  let bestResult: Array<{ pillMg: PillStrengthMg; tablets: number }> | null = null
  let bestHalves = Infinity
  let bestSecondary = Infinity

  for (let n0 = 0; n0 <= 7; n0++) {
    for (let n0h = 0; n0h <= 7 - n0; n0h++) {
      for (let n1 = 0; n1 <= 7 - n0 - n0h; n1++) {
        const n1h = 7 - n0 - n0h - n1
        const achieved = r(n0 * p0 + n0h * (p0 / 2) + n1 * p1 + n1h * (p1 / 2))
        if (Math.abs(achieved - totalMg) > 0.01) continue

        // Score: prefer fewer halves, then fewer secondary-pill days
        const halves    = n0h + n1h
        const secondary = n1 + n1h
        if (
          halves < bestHalves ||
          (halves === bestHalves && secondary < bestSecondary)
        ) {
          bestHalves    = halves
          bestSecondary = secondary
          const result: Array<{ pillMg: PillStrengthMg; tablets: number }> = []
          for (let i = 0; i < n0;  i++) result.push({ pillMg: p0, tablets: 1 })
          for (let i = 0; i < n0h; i++) result.push({ pillMg: p0, tablets: 0.5 })
          for (let i = 0; i < n1;  i++) result.push({ pillMg: p1, tablets: 1 })
          for (let i = 0; i < n1h; i++) result.push({ pillMg: p1, tablets: 0.5 })
          bestResult = result
        }
      }
    }
  }

  return bestResult ?? singlePillAssign(totalMg, pills[0])
}

// ── Nearby-dose suggestions ─────────────────────────────────────
// For a custom (manually-typed) dose, finds the nearest *exactly achievable*
// doses — one strictly below (round-down) and one strictly above (round-up).
//
// "Exactly achievable" means buildWeeklySchedule returns a totalMgWk that
// matches the candidate to within 0.005 mg — no silent rounding will occur.
//
// Strategy:
//   single-pill → scan at (0.5 × pill) steps (only valid granularity)
//   multi-pill  → scan at 0.5 mg steps (covers all achievable combos)
//
// Returns [nearestBelow, nearestAbove] — always 0, 1, or 2 elements.
// If the typed value is already a clean dose the caller should suppress display.
export function suggestNearbyDoses(
  targetMg: number,
  pills: PillStrengthMg | PillStrengthMg[],
): [number | null, number | null] {
  const pillArr = (Array.isArray(pills) ? [...pills] : [pills])
    .sort((a, b) => b - a) as PillStrengthMg[]

  const scanStep   = pillArr.length === 1 ? 0.5 * pillArr[0] : 0.5
  const scanRadius = Math.max(pillArr[0] * 2, 5)           // at least ±5 mg

  // Align the scan start to a multiple of scanStep so we never skip clean doses
  // e.g. searching near 20mg with step=1.5 must start at 13.5 (not 14) to include 19.5
  const rawLo = Math.max(scanStep, targetMg - scanRadius)
  const lo    = parseFloat((Math.floor(rawLo / scanStep) * scanStep).toFixed(3))
  const hi    = parseFloat((targetMg + scanRadius).toFixed(1))

  const below: number[] = []
  const above: number[] = []

  for (let mg = lo; mg <= hi + 1e-9; mg = parseFloat((mg + scanStep).toFixed(1))) {
    const r     = parseFloat(mg.toFixed(1))
    const sched = buildWeeklySchedule(r, pillArr)
    if (Math.abs(sched.totalMgWk - r) < 0.005) {
      if (r < targetMg - 0.005) below.push(r)
      else if (r > targetMg + 0.005) above.push(r)
    }
  }

  // Nearest below = largest of the below-candidates; nearest above = smallest of above
  const nearestBelow = below.length ? below[below.length - 1] : null
  const nearestAbove = above.length ? above[0]                : null
  return [nearestBelow, nearestAbove]
}

// ── Dose titration algorithm ────────────────────────────────────────────────
// Returns a ProtocolSuggestion for the given INR value and patient profile.
// Pure function — no side effects, no Vue reactivity.
//
// Protocol thresholds (Standard Warfarin v1):
//   INR ≥ 10.0  → EMERGENCY  (hold + IV Vitamin K)
//   INR ≥ 5.0   → CRITICAL   (hold + oral Vitamin K)
//   INR > 4.5   → VERY HIGH  (hold 1 dose)
//   INR > max   → SUPRA      (decrease 5–15%)
//   INR in range→ THERAPEUTIC (maintain)
//   INR < min   → LOW        (increase 10–20%)
export function computeDosingSuggestion(
  inrValue: number,
  profile: WarfarinProfile,
): ProtocolSuggestion {
  const { min, max }     = profile.targetRange ?? DEFAULT_TARGET_RANGE
  const { roundingUnit } = profile.protocol    ?? DEFAULT_PROTOCOL
  const current          = profile.currentDoseMgWk
  const strength         = profile.pillStrengthMg
  // Use all active pill sizes when building schedules (multi-pill aware)
  const pills: PillStrengthMg | PillStrengthMg[] =
    profile.activePillsMg && profile.activePillsMg.length > 0
      ? profile.activePillsMg
      : strength

  // Round a dose to the nearest pill-rounding unit (e.g. 0.5 tablets × strength)
  function rounded(dose: number): number {
    return Math.round(dose / strength / roundingUnit) * roundingUnit * strength
  }

  // Build a single dose option from a target percentage change
  function buildOpt(pct: number): DoseSuggestion {
    const newDose   = rounded(current * (1 + pct))
    const actualPct = parseFloat(((newDose - current) / current * 100).toFixed(1))
    const schedule  = buildWeeklySchedule(newDose, pills)
    // Sum across all days — accurate for both single-pill and multi-pill schedules.
    // (newDose / strength would be wrong whenever more than one pill size is used.)
    const tabs = parseFloat(
      Object.values(schedule.days).reduce((s, d) => s + d.tablets, 0).toFixed(1)
    )
    return {
      percentChange:  actualPct,
      newDoseMgWk:    newDose,
      tabletsPerWeek: tabs,
      schedule,
      label:          `${actualPct >= 0 ? '+' : ''}${actualPct}% (${newDose.toFixed(1)} mg)`,
    }
  }

  // Remove options that round to the same final dose (keep first occurrence)
  function dedup(opts: DoseSuggestion[]): DoseSuggestion[] {
    const seen = new Set<number>()
    return opts.filter(o => {
      if (seen.has(o.newDoseMgWk)) return false
      seen.add(o.newDoseMgWk)
      return true
    })
  }

  // ── Emergency: INR ≥ 10 ──────────────────────────────────────
  if (inrValue >= 10.0) return {
    trigger:   'emergency',
    direction: 'hold',
    message:   'หยุดยา Warfarin ทันที และรายงานแพทย์เจ้าของไข้ด่วน',
    options:   [],
    vitaminK:  'Vitamin K1 5–10 mg IV slow infusion (ใน 100 mL NSS ฉีดช้า > 20 นาที)',
    nextSteps: [
      'หยุดยา Warfarin ทันที',
      'ให้ Vitamin K1 5–10 mg IV ช้า (> 20 นาที)',
      'ตรวจ INR ซ้ำใน 6–12 ชั่วโมง',
      'ประเมินอาการเลือดออกอย่างเร่งด่วน',
      'รายงานแพทย์เจ้าของไข้ทันที',
    ],
  }

  // ── Critical: INR ≥ 5 ───────────────────────────────────────
  if (inrValue >= 5.0) return {
    trigger:   'critical',
    direction: 'hold',
    message:   'หยุดยา Warfarin และพิจารณาให้ Vitamin K1 oral',
    options:   [],
    vitaminK:  'Vitamin K1 (Phytomenadione) oral 1.0–2.5 mg',
    nextSteps: [
      'หยุดยา Warfarin ทั้งหมด',
      'ให้ Vitamin K1 oral 1.0–2.5 mg',
      'ตรวจ INR ซ้ำใน 24–48 ชั่วโมง',
      'ประเมินภาวะเลือดออก',
    ],
  }

  // ── Very high: INR 4.6–4.9 ── hold 1 dose ───────────────────
  if (inrValue > 4.5) return {
    trigger:   'very-high',
    direction: 'hold',
    message:   'งด Warfarin 1 dose วันนี้ แล้ว Recheck INR ใน 3–5 วัน',
    options:   [],
    nextSteps: [
      'งดยา Warfarin 1 dose (วันนี้)',
      'ตรวจ INR ซ้ำใน 3–5 วัน',
      'เมื่อ INR กลับสู่ช่วงเป้าหมาย ให้ปรับลดขนาดยา 10–15%',
    ],
  }

  // ── Low: INR < target min ── increase 10–20% ─────────────────
  if (inrValue < min) return {
    trigger:   'low',
    direction: 'increase',
    message:   'แนะนำเพิ่มขนาดยา +10% ถึง +20% โดยปรับครั้งละไม่เกิน 0.5 เม็ด',
    options:   dedup([buildOpt(0.10), buildOpt(0.15), buildOpt(0.20)]),
  }

  // ── Supra: INR > target max (≤ 4.5) ── decrease 5–15% ───────
  if (inrValue > max) {
    const holdOpt: DoseSuggestion = {
      percentChange:  0,
      newDoseMgWk:    current,
      tabletsPerWeek: current / strength,
      schedule:       buildWeeklySchedule(current, pills),
      label:          'คงขนาดยาเดิม',
      holdNote:       'ติดตาม INR ซ้ำ 1 สัปดาห์',
    }
    return {
      trigger:   'supra',
      direction: 'decrease',
      message:   'แนะนำลดขนาดยา 5–15% หรือคงขนาดยาเดิมแล้วติดตามผลใน 1 สัปดาห์',
      options:   [...dedup([buildOpt(-0.15), buildOpt(-0.10), buildOpt(-0.05)]), holdOpt],
    }
  }

  // ── Therapeutic: INR in range ────────────────────────────────
  return { trigger: 'therapeutic', direction: 'hold', message: '', options: [] }
}
