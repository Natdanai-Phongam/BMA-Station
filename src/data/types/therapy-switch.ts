import type { CurrentTherapy } from './patient-detail'

// ── Clinical evidence captured at time of switch request ──────────────────────
export interface SwitchClinicalBasis {
  /** TTR percentage at time of switch (Warfarin → NOACs) */
  ttrPct?:          number
  /** Last recorded INR at time of switch */
  inrAtSwitch?:     number
  /** Whether patient had documented bleeding events */
  bleedingHistory?: boolean
  /** Clinician or pharmacist free-text justification */
  clinicianNote:    string
}

// ── Single therapy-switch record ──────────────────────────────────────────────
export interface TherapySwitchRecord {
  id:            string
  patientId:     string
  fromTherapy:   CurrentTherapy
  toTherapy:     CurrentTherapy
  /** ISO date when the switch was approved and took effect */
  switchDate:    string
  /** Short reason shown in the UI timeline */
  reason:        string
  clinicalBasis: SwitchClinicalBasis
  /** Role of the person who initiated the switch request */
  requestedBy:   string
}
