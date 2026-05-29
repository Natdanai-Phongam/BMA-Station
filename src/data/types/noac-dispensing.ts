import type { NoacDrug, NoacIndication } from './noac'

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

// ── Stable per-patient NOACs profile ─────────────────────────────────────────
export type NoacClinicalStatus = 'appropriate' | 'underdose' | 'overdose' | 'contra' | 'interaction'

export interface NoacProfile {
  patientId:        string
  indication:       NoacIndication
  /** HAS-BLED bleeding risk score (0–9); updated at each dispensing visit */
  hasBleedScore:    number
  /** Drug currently being dispensed under this profile */
  currentDrug:      NoacDrug
  /** Human-readable dose string, e.g. "5 mg BID" */
  currentDose:      string
  /** ISO date when NOACs therapy began */
  therapyStartDate: string
  /** Calculated next follow-up interval in months (CrCl-driven) */
  followUpMonths:   number
  /** Clinical status derived from latest dispensing evaluation — single source of truth */
  status:           NoacClinicalStatus
}

// ── Per-dispensing record (audit trail + clinical decision log) ────────────────
export interface NoacDispensingRecord {
  id:                   string
  patientId:            string
  /** ISO datetime of dispensing visit */
  dispensedAt:          string
  /** Lab values used for engine computation at this visit */
  labData:              NoacLabData
  /** Drug actually dispensed (may differ from top recommendation if overridden) */
  drugDispensed:        NoacDrug
  /** Human-readable dose, e.g. "5 mg BID" */
  dose:                 string
  /** Engine rank assigned to the dispensed drug (1 = top, 4 = last) */
  systemRank:           number
  /** True when dispensed drug matched the engine's #1 recommendation */
  wasTopRecommendation: boolean
  /** True when the dispensed drug and dose are clinically appropriate given patient labs/comorbidities */
  clinicallyAppropriate?: boolean
  /** Reason for overriding top recommendation (if wasTopRecommendation is false) */
  overrideReason?:      string
  /** Free-text pharmacist note for this visit (null = no note recorded) */
  pharmacistNote?:      string | null
  /** ISO date of next scheduled follow-up */
  nextFollowUpDate:     string
}

// ── Top-level keyed structure (mirrors warfarin-patients.json pattern) ────────
export interface NoacPatientData {
  profile:           NoacProfile
  dispensingHistory: NoacDispensingRecord[]
}
