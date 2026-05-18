// Patient list types for DD-ATS Warfarin and NOACs tabs
// Mirrors REST API response shape — swap JSON import for fetch() when backend is ready

export interface LabValue {
  value: number
  /** true = value is out of safe range, shows warning icon in UI */
  alert: boolean
}

export type WarfarinStatus = 'in-range' | 'under-range' | 'over-range'
export type NoacsStatus   = 'appropriate' | 'underdose' | 'overdose' | 'contra' | 'interaction'

interface AtsPatientBase {
  id: string
  name: string
  /** Hospital Number */
  hn: string
  hospital: string
  weight: number
}

export interface AtsWarfarinPatient extends AtsPatientBase {
  status: WarfarinStatus
  crcl: LabValue
  inr: LabValue
}

export interface AtsNoacsPatient extends AtsPatientBase {
  status: NoacsStatus
  crcl: LabValue
  egfr: LabValue
}

export interface AtsPatientsData {
  lastSyncedAt: string
  warfarin: AtsWarfarinPatient[]
  noacs: AtsNoacsPatient[]
}
