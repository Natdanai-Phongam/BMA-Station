// ─── Data Repository — Contract ──────────────────────────────────────────────
// Central async interface between pages and the underlying data source.
// Pages depend ONLY on this interface (never import raw JSON directly), so the
// data source can be swapped without touching any component:
//
//   pages → DataRepository → driver
//                            ├─ staticDriver : dynamic import() of bundled JSON  (current)
//                            └─ apiDriver    : fetch() + MSW / real backend       (future, Scope B)
//
// Swap point lives in ./index.ts (a single `export const repo = ...` line).
// See PLAN-DATA-SCALING.md §3 for the full architecture.
// ─────────────────────────────────────────────────────────────────────────────

import type { AtsDashboardConfigData } from '@/data/types/ats'
import type { AtsPatientsData } from '@/data/types/ats-patients'
import type { WarfarinPageData } from '@/data/types/warfarin'
import type { NoacPatientData } from '@/data/types/noac-dispensing'
import type { PatientDetail } from '@/data/types/patient-detail'
import type { KpiOperationalData } from '@/data/types/kpi-operational'
import type { Physician } from '@/data/types/physician'

// Consultations are keyed by patient id → message list. The message shape is
// page-local (AtsPatientDetail), so the repository stays loosely typed here and
// the page casts to its own ConsultMsg[].
export type ConsultationsData = Record<string, unknown>

// ─── KPI Summary contract (pre-aggregated) ───────────────────────────────────
// Produced by the generator (PART B) so the dashboard reads a tiny summary
// instead of computing KPIs from the full raw patient set. Defined here now so
// the contract is stable before the generator fills it.
// NOTE: getKpiSummary() lands in #5 P4 (staticDriver computes it transiently
//       from raw until the generator emits kpi-summary.json).
export interface KpiPeriodSummary {
  wf:   { total: number; ttrGoalMet: number; ttrAvg: number; inrInRange: number }
  noac: { total: number; appropriate: number }
  safety: {
    bleeding: number; thrombosis: number; aeHosp: number
    death: number; medError: number; denom: number
  }
  ats: {
    resolutionRate: number; acceptanceRate: number
    responseTimeHr: number; resolutionTimeHr: number
  }
}

export interface KpiSummary {
  generatedAt: string
  mockNow: string
  periods: Record<'month' | 'quarter' | 'year', KpiPeriodSummary>
}

// ─── Patient-list projection (Tier-1, light) ─────────────────────────────────
// Pre-projected by the generator so the dashboard tables load only the few
// fields a row needs — NOT the full clinical record (inrHistory / dispensingHistory
// arrays are ~90% of the raw weight and unused by the list). status & concordance,
// currently derived at runtime from heavy data, are precomputed here.
// Heavy per-patient records load on demand via getWarfarinPatient(id) / getNoacPatient(id).
// See PLAN-DATA-SCALING.md §3.11 (two-tier data model).
import type { WarfarinStatus } from '@/data/types/ats-patients'
import type { TtrStatus } from '@/data/types/warfarin'
import type { NoacClinicalStatus, NoacLabData } from '@/data/types/noac-dispensing'
import type { NoacDrug, NoacIndication } from '@/data/types/noac'

export interface WfListEntry {
  id: string; name: string; hn: string; hospital: string
  weight: number; referred: boolean
  status: WarfarinStatus              // precomputed (was derived from latestInr)
  inr: { value: number; alert: boolean }
  crcl: { value: number; alert: boolean }
  ttrValue: number; ttrStatus: TtrStatus
  currentDoseMgWk: number
  majorInteractions: { name: string; note: string }[]
  concordanceLabel: string            // precomputed from last dose adjustment
}

export interface NoacListEntry {
  id: string; name: string; hn: string; hospital: string
  weight: number; referred: boolean
  indication: NoacIndication
  status: NoacClinicalStatus
  drug: NoacDrug | null               // null when withheld
  dose: string
  crcl: { value: number; alert: boolean }
  egfr: { value: number; alert: boolean }
  concordanceLabel: string
  lab: NoacLabData | null
}

export interface PatientListData {
  generatedAt: string
  warfarin: WfListEntry[]
  noacs: NoacListEntry[]
}

// ─── Repository interface ────────────────────────────────────────────────────
export interface DataRepository {
  // config / light singletons
  getDashboardConfig(): Promise<AtsDashboardConfigData>
  getKpiOperational(): Promise<KpiOperationalData>
  getPhysicians(): Promise<Record<string, Physician>>

  // patient lists (dashboard tables / list pages)
  getAtsPatients(): Promise<AtsPatientsData>

  // per-therapy records — whole map + by-id convenience
  getWarfarinPatients(): Promise<Record<string, WarfarinPageData>>
  getWarfarinPatient(id: string): Promise<WarfarinPageData | null>
  getNoacPatients(): Promise<Record<string, NoacPatientData>>
  getNoacPatient(id: string): Promise<NoacPatientData | null>

  // patient demographics
  getPatientDetails(): Promise<Record<string, PatientDetail>>
  getPatientDetail(id: string): Promise<PatientDetail | null>

  // consultation threads
  getConsultations(): Promise<ConsultationsData>

  // ── Filled by the generator (added when the generator emits the files) ─────
  // getPatientList(): Promise<PatientListData>   // Tier-1 light list for dashboard tables
  // getKpiSummary(): Promise<KpiSummary>         // pre-aggregated KPIs for dashboard

  // ── Future (Scope B — real server-side windowing) ──────────────────────────
  // getWarfarinPatientsWindowed(range: { from: string; to: string }): Promise<Record<string, WarfarinPageData>>
}
