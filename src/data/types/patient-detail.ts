export type ComplicationType    = 'bleeding' | 'thromboembolism'
export type Severity            = 'mild' | 'moderate' | 'severe'
export type AllergySeverity     = 'mild' | 'moderate' | 'severe'
export type InteractionSeverity = 'contraindicated' | 'warning' | 'monitor'

/** Which anticoagulant therapy the patient is currently enrolled in */
export type CurrentTherapy = 'warfarin' | 'noacs' | 'none'

export interface Allergy {
  substance: string
  reaction:  string
  severity:  AllergySeverity
}

export interface ConcurrentMedication {
  name:             string
  dose:             string
  category:         string
  /** null = no clinically significant NOAC interaction */
  interactionLevel: InteractionSeverity | null
  interactionNote?: string
}



export interface ComplicationEvent {
  id:        string
  date:      string
  /** month 1–12, used for chart x-axis positioning */
  month:     number
  /** ISO date string e.g. "2026-05-12" — used for multi-year date-range filtering */
  dateISO?:  string
  type:      ComplicationType
  detail:    string
  severity:  Severity
  treatment: string
  status:    string
}

export interface ComplicationSummary {
  type:     ComplicationType
  count:    number
  lastDate: string
}

// ── Patient outcome / safety events kept SEPARATE from clinical complications ──
// Death is an outcome (not an "อาการผิดปกติ"); medication errors are process
// events. Both are tracked apart from the complications list shown in the
// complications tab, but still feed the dashboard safety KPIs.
export type VitalStatus = 'alive' | 'deceased'

export interface Mortality {
  dateISO: string   // ISO/CE date of death
  date:    string   // Thai display date
  reason:  string
}

export interface MedErrorEvent {
  id:       string
  dateISO:  string
  date:     string
  detail:   string
  severity: Severity
  status:   string
}

export interface PatientDetail {
  id:                     string
  name:                   string
  hn:                     string
  age:                    number
  dob:                    string
  sex:                    string
  bloodGroup:             string
  phone:                  string
  insuranceType:          string
  allergies:              Allergy[]
  totalComplications:     number
  complicationSummary:    ComplicationSummary[]
  complications:          ComplicationEvent[]
  /** Which anticoagulant module this patient is enrolled in */
  currentTherapy:          CurrentTherapy
  /** Current concurrent medications (shared across Warfarin + NOACs) */
  concurrentMedications?:  ConcurrentMedication[]
  /** Patient outcome — defaults to 'alive'. Kept separate from complications. */
  vitalStatus?:            VitalStatus
  /** Death record (present when vitalStatus === 'deceased') */
  mortality?:              Mortality
  /** Medication dispensing/dosing errors — separate from clinical complications */
  medErrors?:              MedErrorEvent[]
}
