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
import { DAY_KEYS } from '@/data/types/warfarin'

// ── Schedule builder ────────────────────────────────────────────────────────
// Distributes a weekly dose evenly across 7 days, rounding to 0.5-tablet steps.
// Extra half-tablets are front-loaded Mon → Sun so the total is always exact.
export function buildWeeklySchedule(
  totalMgWk: number,
  strengthMg: PillStrengthMg,
): WeeklySchedule {
  const totalTabs = totalMgWk / strengthMg
  const baseTabs  = Math.floor(totalTabs / 7 / 0.5) * 0.5
  let   extra     = parseFloat((totalTabs - baseTabs * 7).toFixed(1))

  const days = {} as WeeklySchedule['days']
  for (const day of DAY_KEYS) {
    let t = baseTabs
    if (extra >= 0.5) { t += 0.5; extra = parseFloat((extra - 0.5).toFixed(1)) }
    days[day] = { tablets: t, mg: parseFloat((t * strengthMg).toFixed(1)) }
  }
  return { totalMgWk, pillStrengthMg: strengthMg, days }
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
  const { min, max }     = profile.targetRange
  const { roundingUnit } = profile.protocol
  const current          = profile.currentDoseMgWk
  const strength         = profile.pillStrengthMg

  // Round a dose to the nearest pill-rounding unit (e.g. 0.5 tablets × strength)
  function rounded(dose: number): number {
    return Math.round(dose / strength / roundingUnit) * roundingUnit * strength
  }

  // Build a single dose option from a target percentage change
  function buildOpt(pct: number): DoseSuggestion {
    const newDose   = rounded(current * (1 + pct))
    const tabs      = newDose / strength
    const actualPct = parseFloat(((newDose - current) / current * 100).toFixed(1))
    return {
      percentChange:  actualPct,
      newDoseMgWk:    newDose,
      tabletsPerWeek: tabs,
      schedule:       buildWeeklySchedule(newDose, strength),
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
      schedule:       buildWeeklySchedule(current, strength),
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
