// Warfarin Dose Titration Tool — type definitions
// All dose values in mg/week unless stated otherwise

// ── Pill configuration ────────────────────────────────────────
export type PillStrengthMg = 3 | 5
export type PillColor      = 'blue' | 'pink'

export const PILL_CONFIG: Record<PillStrengthMg, { color: PillColor; label: string }> = {
  3: { color: 'blue', label: 'Warfarin 3 mg (น้ำเงิน)' },
  5: { color: 'pink', label: 'Warfarin 5 mg (ชมพู)'   },
}

// ── Target INR range ──────────────────────────────────────────
export interface InrTargetRange {
  min: number
  max: number
  label: string   // e.g. "Standard (2.0–3.0)"
}

// Pre-defined ranges — extend here when new indications are added
export const INR_TARGET_RANGES: InrTargetRange[] = [
  { min: 2.0, max: 3.0, label: 'Standard (2.0–3.0)'           },
  { min: 2.5, max: 3.5, label: 'Mechanical Valve (2.5–3.5)'   },
  { min: 1.5, max: 2.5, label: 'Low-risk (1.5–2.5)'           },
]

// ── Protocol rules (extensible for future indications) ────────
export interface DoseAdjustmentProtocol {
  id:           string
  label:        string
  // INR thresholds that trigger this protocol
  inrBelow?:    number    // INR < this → increase dose
  inrAbove?:    number    // INR > this → decrease / hold
  // Adjustment bounds (as fractions, e.g. 0.10 = 10%)
  minPct:       number
  maxPct:       number
  // Max single-step change in tablets
  maxStepTab:   number    // 0.5 tablet constraint
  roundingUnit: number    // 0.5
}

export const DEFAULT_PROTOCOL: DoseAdjustmentProtocol = {
  id:           'standard-warfarin-v1',
  label:        'Standard Warfarin Protocol',
  inrBelow:     2.0,
  inrAbove:     3.0,
  minPct:       0.10,
  maxPct:       0.20,
  maxStepTab:   0.5,
  roundingUnit: 0.5,
}

// ── INR record ────────────────────────────────────────────────
export type InrSource = 'manual'  // expand to 'emr' | 'poc' when integration ready

export interface InrRecord {
  id:          string
  patientId:   string
  inrValue:    number
  measuredAt:  string    // ISO datetime — required for Rosendaal interpolation
  source:      InrSource
  notes?:      string
}

// ── Weekly schedule ───────────────────────────────────────────
export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export const DAY_LABELS: Record<DayKey, string> = {
  mon: 'จันทร์', tue: 'อังคาร', wed: 'พุธ',
  thu: 'พฤหัสบดี', fri: 'ศุกร์', sat: 'เสาร์', sun: 'อาทิตย์',
}

export const DAY_KEYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export interface DailyDose {
  tablets: number   // multiples of 0.5 only
  mg:      number   // tablets × pillStrengthMg
}

export interface WeeklySchedule {
  totalMgWk:      number
  pillStrengthMg: PillStrengthMg
  days:           Record<DayKey, DailyDose>
}

// ── Dose adjustment record ────────────────────────────────────
export interface DoseAdjustment {
  id:               string
  patientId:        string
  adjustedAt:       string    // ISO datetime
  adjustedBy:       string    // pharmacist name / user id

  inrAtAdjustment:  number
  inrSource:        InrSource

  oldDoseMgWk:      number
  newDoseMgWk:      number
  percentChange:    number    // e.g. +21.4 or -12.5

  pillStrengthMg:   PillStrengthMg
  weeklySchedule:   WeeklySchedule
  remarks?:         string
  systemSuggested:  boolean
  overrideReason?:  string
}

// ── Concurrent medications & interactions ─────────────────────
export type DrugInteractionEffect   = 'increase' | 'decrease' | 'none'
export type DrugInteractionSeverity = 'major' | 'moderate' | 'minor'

export interface ConcurrentMed {
  name:      string
  effect:    DrugInteractionEffect
  severity?: DrugInteractionSeverity
  note?:     string
}

// ── Warfarin patient profile ──────────────────────────────────
export interface WarfarinProfile {
  patientId:        string
  pillStrengthMg:   PillStrengthMg
  currentDoseMgWk:  number
  targetRange:      InrTargetRange
  therapyStartDate: string    // ISO date
  protocol:         DoseAdjustmentProtocol
  ttrGoalPct:       number    // 70
  concurrentMeds?:  ConcurrentMed[]
}

// ── Computed suggestion (not persisted) ──────────────────────
export interface DoseSuggestion {
  percentChange:  number
  newDoseMgWk:    number
  tabletsPerWeek: number
  schedule:       WeeklySchedule
  label:          string
  holdNote?:      string   // set on "maintain dose" options (e.g. "ติดตาม INR ซ้ำ 1 สัปดาห์")
}

export interface ProtocolSuggestion {
  trigger:    'low' | 'supra' | 'very-high' | 'critical' | 'emergency' | 'therapeutic'
  direction:  'increase' | 'decrease' | 'hold'
  message:    string
  options:    DoseSuggestion[]
  nextSteps?: string[]    // for hold states
  vitaminK?:  string      // for critical / emergency
}

// ── TTR (Rosendaal method) ────────────────────────────────────
export type TtrStatus = 'goal-met' | 'below-goal' | 'insufficient-data'

export interface TtrResult {
  value:            number      // 0–100 percent
  status:           TtrStatus
  goalPct:          number      // 70
  fromDate:         string
  toDate:           string
  daysInRange:      number
  daysCalculable:   number
}

// ── Full page data shape (mock / API response) ────────────────
export interface WarfarinPageData {
  profile:         WarfarinProfile
  latestInr:       InrRecord
  inrHistory:      InrRecord[]
  doseAdjustments: DoseAdjustment[]
  ttr:             TtrResult
}
