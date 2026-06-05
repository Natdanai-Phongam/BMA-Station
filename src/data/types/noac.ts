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

// ── Child-Pugh hepatic function class ────────────────────────────────────────
export type ChildPughClass = 'A' | 'B' | 'C'

// ── Override reason codes (structured for analytics) ─────────────────────────
export type NoacOverrideCode =
  | 'patient-preference'       // ผู้ป่วยต้องการยาเฉพาะ
  | 'cost-accessibility'       // ค่าใช้จ่าย / ยาไม่พร้อมจ่าย
  | 'drug-interaction'         // หลีกเลี่ยง interaction เฉพาะ
  | 'renal-function-change'    // ค่าไตเปลี่ยนแปลง
  | 'physician-directive'      // แพทย์สั่งเฉพาะ
  | 'formulary-restriction'    // formulary โรงพยาบาล
  | 'prior-adverse-event'      // ประวัติ adverse event กับยาที่แนะนำ
  | 'other'

export interface NoacEngineInput {
  age:            number
  sex:            string
  weightKg:       number
  scrMgDl:        number
  crClMlMin:      number
  concurrentMeds: ConcurrentMedication[]

  // ── Absolute contraindication flags ──────────────────────────────────────
  // These must be checked BEFORE dose computation. Missing = assumed false.
  dialysis?:        boolean      // ESRD on dialysis — all NOACs CI except Apixaban (caution)
  mechanicalValve?: boolean      // Mechanical heart valve — all NOACs CI, use Warfarin
  pregnancy?:       boolean      // All NOACs CI in pregnancy
  activeBleeding?:  boolean      // All NOACs CI during active bleeding episode
  childPughClass?:  ChildPughClass // C = hepatic CI; B = caution for some drugs

  // ── Future scores (stored for context, not yet used in engine logic) ─────
  // CHA2DS2-VASc: stroke risk for AF; determines need for anticoagulation.
  // Currently out of scope — store for analytics / future phase.
  cha2ds2vasc?: number
}

export interface NoacRecommendationResult {
  drugs:              DrugResult[]
  /** Precautions that apply to ALL NOACs (NSAIDs, antiplatelets) */
  generalPrecautions: string[]
  /** Absolute contraindications detected — all drugs blocked if any are present */
  absoluteContraindications: string[]
}
