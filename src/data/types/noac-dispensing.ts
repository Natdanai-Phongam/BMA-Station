import type { NoacDrug, NoacIndication, NoacOverrideCode, ChildPughClass } from './noac'

// ── Lab snapshot captured at each dispensing visit ───────────────────────────
export interface NoacLabData {
  /** Body weight (kg) at time of dispensing */
  weightKg:   number
  /** Serum creatinine (mg/dL) */
  scrMgDl:    number
  /** Creatinine clearance by Cockcroft-Gault (mL/min) — stored, not recomputed */
  crClMlMin:  number
  /** ISO date string of the lab draw, e.g. "2568-01-30" */
  measuredAt: string
}

// ── Clinical status — derived from dispensed drug vs engine output ────────────
export type NoacClinicalStatus =
  | 'appropriate'   // drug & dose match engine top recommendation
  | 'underdose'     // dose lower than guideline recommendation
  | 'overdose'      // dose higher than guideline recommendation
  | 'contra'        // drug contraindicated for current patient state
  | 'interaction'   // significant drug-drug interaction detected

// ── Stable per-patient NOACs profile ─────────────────────────────────────────
export interface NoacProfile {
  patientId:        string
  indication:       NoacIndication
  currentDrug:      NoacDrug
  /** Human-readable dose string, e.g. "5 mg BID" */
  currentDose:      string
  /** ISO date when NOACs therapy began */
  therapyStartDate: string
  /** Follow-up interval in months (CrCl-driven, typically 1–6) */
  followUpMonths:   number
  /** Clinical status — snapshot at last dispensing, re-evaluated on new lab */
  status:           NoacClinicalStatus
  /** Set to true when a lab update since last dispensing warrants re-evaluation */
  needsReview?:     boolean

  // ── Patient risk factors — drive absolute contraindications in engine ─────
  // All default to false when absent (not contraindicated unless confirmed)
  dialysis?:        boolean       // ESRD on dialysis
  mechanicalValve?: boolean       // Mechanical heart valve prosthesis
  pregnancy?:       boolean       // Active pregnancy
  activeBleeding?:  boolean       // Active major bleeding episode
  childPughClass?:  ChildPughClass // Hepatic function (A/B/C)

  // ── Scores stored for future use (not yet engine logic) ──────────────────
  cha2ds2vasc?:     number        // Stroke risk for AF (for display/analytics)
}

// ── Per-dispensing record — full audit trail with decision context ─────────────
export interface NoacDispensingRecord {
  // Identity
  id:                    string
  patientId:             string

  // Visit context
  dispensedAt:           string       // ISO datetime
  dispensedBy?:          string       // pharmacist ID (API-ready, optional for mock)

  // Lab snapshot at this visit
  labData:               NoacLabData

  // What was dispensed (omitted when withheld)
  drugDispensed?:        NoacDrug
  dose:                  string       // human-readable, e.g. "5 mg BID"; "—" when withheld
  daysSupply?:           30 | 60 | 90 | 180  // dispensing cycle length

  // Withhold — dispensed=false means NOAC therapy was withheld this visit (absolute CI).
  // Recorded for audit trail even though no drug left the pharmacy.
  dispensed?:            boolean      // default true; false = withheld
  withholdReason?:       string       // joined absolute-CI reasons when withheld

  // Engine decision context
  systemRank:            number              // 1 = top recommendation, 4 = last
  wasTopRecommendation:  boolean
  clinicalStatus?:       NoacClinicalStatus  // status at time of this visit (added in schema v1)
  /** @deprecated use overrideCode + overrideNote. Kept for backward compat with existing mock data */
  overrideReason?:       string

  // Override (if wasTopRecommendation = false)
  overrideCode?:         NoacOverrideCode   // structured reason
  overrideNote?:         string             // free-text addendum

  // Notes & follow-up
  pharmacistNote?:       string | null
  nextFollowUpDate:      string

  // API versioning (future migration support)
  schemaVersion?:        number       // default 1
}

// ── Top-level keyed structure (mirrors warfarin-patients.json pattern) ────────
export interface NoacPatientData {
  profile:           NoacProfile
  dispensingHistory: NoacDispensingRecord[]
}
