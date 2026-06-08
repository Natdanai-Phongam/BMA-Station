// ─── Static Driver ───────────────────────────────────────────────────────────
// DataRepository implementation backed by the bundled mock JSON, loaded via
// dynamic import() so Vite code-splits each file into its own chunk fetched
// on demand (not in the entry bundle). Each file is parsed + cast once and
// cached in-memory for the session.
//
// All type casts that were previously scattered across the 4 pages live here,
// making this the single source of truth for "raw JSON → typed shape".
// ─────────────────────────────────────────────────────────────────────────────

import type { AtsDashboardConfigData } from '@/data/types/ats'
import type { AtsPatientsData } from '@/data/types/ats-patients'
import type { WarfarinPageData } from '@/data/types/warfarin'
import type { NoacPatientData } from '@/data/types/noac-dispensing'
import type { PatientDetail } from '@/data/types/patient-detail'
import type { KpiOperationalData } from '@/data/types/kpi-operational'
import type { Physician } from '@/data/types/physician'
import type { DataRepository, ConsultationsData, PatientListData, KpiSummary } from './types'

// In-memory cache — each key resolves to a single shared promise so concurrent
// callers never trigger duplicate imports.
const cache = new Map<string, Promise<unknown>>()

function load<T>(
  key: string,
  loader: () => Promise<{ default: unknown }>,
  cast: (raw: unknown) => T,
): Promise<T> {
  let entry = cache.get(key)
  if (!entry) {
    entry = loader().then((m) => cast(m.default))
    cache.set(key, entry)
  }
  return entry as Promise<T>
}

export const staticDriver: DataRepository = {
  getDashboardConfig: () =>
    load('config',
      () => import('@/data/mock/ats-dashboard.json'),
      (r) => r as AtsDashboardConfigData),

  getKpiOperational: () =>
    load('kpiOps',
      () => import('@/data/mock/kpi-operational.json'),
      (r) => r as KpiOperationalData),

  getPhysicians: () =>
    load('physicians',
      () => import('@/data/mock/physicians.json'),
      (r) => r as Record<string, Physician>),

  getAtsPatients: () =>
    load('atsPatients',
      () => import('@/data/mock/ats-patients.json'),
      (r) => r as AtsPatientsData),

  getWarfarinPatients: () =>
    load('warfarin',
      () => import('@/data/mock/warfarin-patients.json'),
      (r) => r as Record<string, WarfarinPageData>),

  async getWarfarinPatient(id) {
    return (await this.getWarfarinPatients())[id] ?? null
  },

  getNoacPatients: () =>
    load('noac',
      () => import('@/data/mock/noac-patients.json'),
      (r) => r as Record<string, NoacPatientData>),

  async getNoacPatient(id) {
    return (await this.getNoacPatients())[id] ?? null
  },

  getPatientDetails: () =>
    load('detail',
      () => import('@/data/mock/patient-detail.json'),
      (r) => r as Record<string, PatientDetail>),

  async getPatientDetail(id) {
    return (await this.getPatientDetails())[id] ?? null
  },

  getConsultations: () =>
    load('consultations',
      () => import('@/data/mock/consultations.json'),
      (r) => r as ConsultationsData),

  getPatientList: () =>
    load('patientList',
      () => import('@/data/mock/patient-list.json'),
      (r) => r as PatientListData),

  getKpiSummary: () =>
    load('kpiSummary',
      () => import('@/data/mock/kpi-summary.json'),
      (r) => r as KpiSummary),
}
