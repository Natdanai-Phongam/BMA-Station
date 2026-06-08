// Patient list types for DD-ATS Warfarin and NOACs tabs
// Mirrors REST API response shape — swap JSON import for fetch() when backend is ready

export interface LabValue {
  value: number
  /** true = value is outside safe range; shows warning icon in UI */
  alert: boolean
}

export type WarfarinStatus = 'in-range' | 'under-range' | 'over-range'
// Authoritative definition lives in noac-dispensing.ts as NoacClinicalStatus
import type { NoacClinicalStatus } from './noac-dispensing'
export type NoacsStatus = NoacClinicalStatus

interface AtsPatientBase {
  id:       string
  name:     string
  /** Hospital Number */
  hn:       string
  hospital: string
  weight:   number
  /** true = patient has been referred for specialist consultation this period */
  referred: boolean
}

export interface AtsWarfarinPatient extends AtsPatientBase {
  /** Absent from JSON — derived live from warfarin-patients.json latestInr */
  status?: WarfarinStatus
  crcl:    LabValue
  inr:     LabValue
}

export interface AtsNoacsPatient extends AtsPatientBase {
  /** Absent from JSON — derived live from noac-patients.json profile.status */
  status?: NoacsStatus
  /** Absent from JSON — derived live from latest dispensing labData.crClMlMin */
  crcl?:   LabValue
  egfr:    LabValue
}

export interface AtsPatientsData {
  /** ISO-like Thai datetime string for the last data sync */
  lastSyncedAt: string
  warfarin:     AtsWarfarinPatient[]
  noacs:        AtsNoacsPatient[]
}

// NOTE: dashboard tables now consume the Tier-1 projection (WfListEntry /
// NoacListEntry in src/data/repository/types.ts) instead of enriched raw shapes.

/** Minimal patient entry used in the summary hover-tooltip lists */
export interface SummaryPatientEntry {
  id:          string
  name:        string
  hn:          string
  status:      string
  statusLabel: string
}
