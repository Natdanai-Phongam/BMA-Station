// DD-ATS KPI Dashboard — type definitions
// Covers Parts 1–4 from the programme KPI specification.
// Parts 5 (cost-effectiveness) and 6 (user satisfaction) are intentionally
// omitted until data collection is in place.

export type KpiPeriod = 'month' | 'quarter' | 'year'

// ── Safety metrics: lower value = better ────────────────────
export interface SafetyMetricData {
  events: number   // raw event count for the period
  pct:    number   // (events / patientCount) × 100, 1 decimal
  prev:   number   // pct from the immediately preceding period (for trend arrow)
  target: number   // threshold — must stay strictly BELOW this value
}

// ── Quality metrics: higher value = better ──────────────────
export interface QualityMetricData {
  value:  number   // percentage, 1 decimal
  n:      number   // numerator  (patients meeting criterion)
  d:      number   // denominator (patients assessed)
  prev:   number   // value from previous period
  target: number   // minimum acceptable level
}

// ── Length-of-stay: lower value = better ────────────────────
export interface LosMetricData {
  value:  number   // days, 1 decimal
  prev:   number
  target: number   // maximum acceptable days
}

// ── ATS response metrics (direction varies per metric) ──────
export interface AtsMetricData {
  value:  number
  n?:     number   // present for rate metrics, absent for time metrics
  d?:     number
  prev:   number
  target: number
}

// ── Staff composition ────────────────────────────────────────
export interface StaffBreakdown {
  pharmacist: number
  physician:  number
  nurse:      number
  total:      number
}

// ── Per-period KPI data ──────────────────────────────────────
export interface KpiPeriodData {
  label:        string   // display label, e.g. "พ.ค. 2569"
  patientCount: number   // active patients during this period

  // Part 1: Patient Safety
  safety: {
    bleeding:          SafetyMetricData
    thrombosis:        SafetyMetricData
    aeHospitalization: SafetyMetricData
    death:             SafetyMetricData
    medError:          SafetyMetricData
  }

  // Part 2: Quality of Care
  quality: {
    wfAppropriateness:  QualityMetricData   // Warfarin dose appropriateness
    noacAppropriateness: QualityMetricData  // NOAC appropriate dosing
    wfTtrGoal:          QualityMetricData   // Warfarin patients with TTR ≥ 65%
    avgLOS:             LosMetricData       // Average inpatient stay (days)
  }

  // Part 3: ATS Response
  atsResponse: {
    resolutionRate: AtsMetricData   // % problems resolved (higher = better)
    acceptanceRate: AtsMetricData   // % recommendations accepted (higher = better)
    responseTimeHr: AtsMetricData   // referral response time in hours (lower = better)
  }

  // Part 4: System Efficiency
  efficiency: {
    staff:          StaffBreakdown
    patientsPerDay: number   // average patient visits per working day
    workloadRatio:  number   // active patients per pharmacist
  }
}

// ── Root shape (one record per selectable period) ────────────
export interface AtsKpiData {
  month:   KpiPeriodData
  quarter: KpiPeriodData
  year:    KpiPeriodData
}
