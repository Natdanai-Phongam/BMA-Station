export type ComplicationType    = 'bleeding' | 'thromboembolism' | 'side-effects'
export type Severity            = 'mild' | 'moderate' | 'severe'
export type RiskLevel           = 'low' | 'medium' | 'high'
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
  riskLevel:              RiskLevel
  complicationSummary:    ComplicationSummary[]
  complications:          ComplicationEvent[]
  /** Which anticoagulant module this patient is enrolled in */
  currentTherapy:          CurrentTherapy
  /** Current concurrent medications (shared across Warfarin + NOACs) */
  concurrentMedications?:  ConcurrentMedication[]
}
