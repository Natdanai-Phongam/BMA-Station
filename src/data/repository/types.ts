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
// The generator pre-computes PeriodMetrics for every period range the dashboard
// can request (keyed "from|to"), so the dashboard reads the result instead of
// scanning the full raw patient set on every period change. See §3.11 / §3.5.
import type { PeriodMetrics } from '@/data/types/kpi-operational'

export interface KpiSummaryMeta {
  generatedAt: string
  mockNow: string
  /** Earliest date present in the data → month-picker lower bound */
  dataMinDate: string
}

export interface KpiSummary {
  meta: KpiSummaryMeta
  /** PeriodMetrics keyed by "YYYY-MM-DD|YYYY-MM-DD" (period from|to) */
  ranges: Record<string, PeriodMetrics>
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
  inrDate: string                     // latestInr.measuredAt (date filter)
  ttrValue: number; ttrStatus: TtrStatus
  currentDoseMgWk: number
  majorInteractions: { name: string; note: string; effect: string }[]
  concordanceLabel: string            // precomputed from last dose adjustment
  concordanceClass: string            // badge class (concordance--yes/adjusted/no/none)
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
  concordanceClass: string            // badge class (concordance--yes/adjusted/no/none)
  lastDispensedAt: string | null      // for sorting by recency
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

  // ── Tier-1 light projections (generator-produced) ──────────────────────────
  getPatientList(): Promise<PatientListData>   // light list for dashboard tables
  getKpiSummary(): Promise<KpiSummary>         // pre-aggregated KPIs per period range

  // ── Future (Scope B — real server-side windowing) ──────────────────────────
  // getWarfarinPatientsWindowed(range: { from: string; to: string }): Promise<Record<string, WarfarinPageData>>
}
