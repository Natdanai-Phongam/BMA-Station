import type { ConcurrentMedication, InteractionSeverity } from './patient-detail'

export type { InteractionSeverity }

export type NoacDrug      = 'apixaban' | 'rivaroxaban' | 'dabigatran' | 'edoxaban'
export type NoacIndication = 'NVAF' | 'DVT' | 'PE' | 'CAT'
export type RecommendationLevel = 'recommended' | 'dose-adjusted' | 'caution' | 'contraindicated'

export interface DrugInteractionResult {
  medicationName: string
  severity:       InteractionSeverity
  note:           string
}

export interface DrugResult {
  drug:                    NoacDrug
  nameThai:                string
  nameEn:                  string
  brandName:               string
  level:                   RecommendationLevel
  /** Numeric dose string, e.g. "5", "2.5" — or "—" if contraindicated */
  doseAmount:              string
  doseUnit:                string
  frequency:               string        // "BID" | "OD"
  frequencyThai:           string        // "2 ครั้ง/วัน" | "1 ครั้ง/วัน"
  /** Additional dosing instruction, e.g. food requirement */
  doseNote?:               string
  adjustmentReason?:       string
  contraindicationReason?: string
  interactions:            DrugInteractionResult[]
}

export interface NoacEngineInput {
  age:            number
  sex:            string
  weightKg:       number
  scrMgDl:        number
  crClMlMin:      number
  hasBleedScore:  number
  concurrentMeds: ConcurrentMedication[]
}

export interface NoacRecommendationResult {
  drugs:              DrugResult[]
  /** Precautions that apply to ALL NOACs (HAS-BLED, NSAIDs, antiplatelets) */
  generalPrecautions: string[]
}
