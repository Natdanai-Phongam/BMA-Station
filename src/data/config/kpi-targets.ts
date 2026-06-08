// DD-ATS Programme KPI Targets — system-wide constants.
// These thresholds are uniform across all patients and all periods.
// They are referenced directly in business logic (DdAtsDashboard.vue) so that
// a single source-of-truth update propagates everywhere automatically.
//
// Clinical rationale (BMA DD-ATS specification):
//   • Safety targets are upper bounds — programme must stay BELOW them
//   • Quality / ATS targets are lower bounds — programme must stay ABOVE them

// ── Part 1: Patient Safety ────────────────────────────────────────────────────
// Units: % of patients per period
export const KPI_SAFETY_TARGETS = {
  bleeding:          2,   // Severe or clinically significant bleeding events
  thrombosis:        2,   // Thromboembolism (DVT / PE / stroke)
  aeHospitalization: 5,   // Hospitalisation due to anticoagulant adverse events
  death:             1,   // Death attributable to anticoagulant therapy
  medError:          1,   // Medication dispensing or dosing errors
} as const

// ── Part 2: Quality of Care ───────────────────────────────────────────────────
// Units: % of patients/readings assessed
export const KPI_QUALITY_TARGETS = {
  wfAppropriateness:   70,  // Warfarin patients with INR in therapeutic range
  noacAppropriateness: 80,  // NOAC patients receiving clinically appropriate dose
  wfTtrGoal:           70,  // Per-patient Rosendaal TTR threshold — patient meets goal if TTR ≥ this
  avgLOS:               5,  // Average inpatient stay ≤ 5 days (max threshold)
} as const

// ── Part 3: ATS Response ──────────────────────────────────────────────────────
export const KPI_ATS_TARGETS = {
  resolutionRate:  80,   // % referred problems resolved by ATS (min)
  acceptanceRate:  75,   // % ATS recommendations followed by pharmacist (min)
  responseTimeHr:   2,   // Response time to referral ≤ 2 hours (max threshold)
  resolutionTimeHr: 24,  // Time to resolve problem after alert ≤ 24 hours (max threshold)
} as const

// Convenience union for type-safe access
export type SafetyTargetKey  = keyof typeof KPI_SAFETY_TARGETS
export type QualityTargetKey = keyof typeof KPI_QUALITY_TARGETS
export type AtsTargetKey     = keyof typeof KPI_ATS_TARGETS
