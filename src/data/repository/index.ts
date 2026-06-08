// ─── Data Repository — active driver ─────────────────────────────────────────
// Single swap point for the app's data source. Every page imports `repo` from
// here; switching to a mock-API / real backend later (Scope B) is a one-line
// change: `export const repo = apiDriver`.
//
// See PLAN-DATA-SCALING.md §3 / §5.
// ─────────────────────────────────────────────────────────────────────────────

import { staticDriver } from './staticDriver'
import type { DataRepository } from './types'

export const repo: DataRepository = staticDriver

export type {
  DataRepository, KpiSummary, KpiPeriodSummary, ConsultationsData,
  PatientListData, WfListEntry, NoacListEntry,
} from './types'
