// KPI operational data types — fields that cannot be computed from patient records.
// These are sourced from kpi-operational.json and merged with live-computed values
// in DdAtsDashboard.vue to produce the final KpiPeriodData shown to the user.
//
// Non-derivable fields:
//   • Efficiency: staff headcount, patients-per-day, workload ratio
//   • Quality: average length of stay (no patient LOS records yet)
//   • ATS Response: resolution rate, response time (no case-tracking records yet)
//   • All `prev` values: previous-period percentages (no historical data store)
//
// NOTE: KPI targets are programme-level constants defined in kpi-targets.ts,
// not mock data. They are not repeated here.

export interface KpiSafetyPrev {
  bleeding:          number
  thrombosis:        number
  aeHospitalization: number
  death:             number
  medError:          number
}

export interface KpiQualityPrev {
  wfAppropriateness:   number
  noacAppropriateness: number
  wfTtrGoal:           number
}

export interface KpiAtsResolutionOps {
  value: number
  n:     number
  d:     number
  prev:  number
  // target comes from KPI_ATS_TARGETS.resolutionRate in kpi-targets.ts
}

export interface KpiLosOps {
  value: number   // days, 1 decimal
  prev:  number
  // target comes from KPI_QUALITY_TARGETS.avgLOS in kpi-targets.ts
}

export interface KpiResponseTimeOps {
  value: number   // hours
  prev:  number
  // target comes from KPI_ATS_TARGETS.responseTimeHr in kpi-targets.ts
}

export interface KpiStaffOps {
  pharmacist: number
  physician:  number
  nurse:      number
  total:      number
}

export interface KpiEfficiencyOps {
  staff:          KpiStaffOps
  patientsPerDay: number
  workloadRatio:  number
}

// One record per selectable period
export interface KpiOperationalPeriod {
  label: string   // display label shown in the UI

  // Previous-period values — used to compute trend arrows
  safetyPrev:  KpiSafetyPrev
  qualityPrev: KpiQualityPrev

  // Non-derivable metric values (targets supplied at runtime from kpi-targets.ts)
  avgLOS:          KpiLosOps
  atsResolution:   KpiAtsResolutionOps
  atsResponseTime: KpiResponseTimeOps
  atsResolutionTime: KpiResponseTimeOps   // avg time to RESOLVE after alert (hours; lower = better)

  // ATS acceptance prev; live value and target computed at runtime
  atsAcceptancePrev: number

  // System efficiency
  efficiency: KpiEfficiencyOps
}

export interface KpiOperationalData {
  month:   KpiOperationalPeriod
  quarter: KpiOperationalPeriod
  year:    KpiOperationalPeriod

  /**
   * Pre-computed monthly WF TTR goal-met percentages, Jan–May (5 values).
   * Used for the WF TTR sparkline in the KPI Quality panel.
   * Stored here because Rosendaal TTR cannot be reliably derived from
   * monthly INR snapshots alone.
   */
  wfTtrMonthly: number[]
}

// ── Runtime-only types (computed display shapes, not stored in JSON) ──────────

export type StatusLevel = 'pass' | 'warn' | 'fail'

/** All period metrics computed in a single pass — cached by DdAtsDashboard */
export interface PeriodMetrics {
  comps: {
    bleeding:          number
    thrombosis:        number
    aeHospitalization: number
    death:             number
    medError:          number
  }
  wf: {
    active:      number
    appropriate: number
    ttrGoalMet:  number
    ttrTotal:    number
    adjTotal:    number   // dose adjustments in period
    adjAccepted: number   // adjustments where systemSuggested = true
  }
  noac: {
    active:       number
    appropriate:  number
    dispTotal:    number
    dispAccepted: number
  }
}

export interface SafetyRow {
  key:         string
  name:        string
  events:      number
  pct:         number
  target:      number
  status:      StatusLevel
  trendLabel:  string
  trendDir:    'up' | 'down' | 'flat'
  statusLabel: string
}

export interface QualityBarRow {
  key:         string
  name:        string
  value:       number
  n:           number
  d:           number
  target:      number
  status:      StatusLevel
  statusLabel: string
}

export interface AtsRow {
  key:          string
  name:         string
  displayValue: string
  targetLabel:  string
  status:       StatusLevel
  statusLabel:  string
}
