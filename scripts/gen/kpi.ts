// ─── G7: KPI summary — per hospital ──────────────────────────────────────────
// For every period range × every hospital, pre-compute PeriodMetrics (derived
// counts) using the shared computePeriodMetrics. Also synthesise per-hospital
// operational mock (staff / LOS / ATS times / patients-per-day) per period mode.
// The dashboard aggregates the SELECTED hospitals: counts sum, rates are
// patient-weighted. See §3.11.
// ─────────────────────────────────────────────────────────────────────────────

import type { WarfarinPageData } from '../../src/data/types/warfarin'
import type { NoacPatientData } from '../../src/data/types/noac-dispensing'
import type { PatientDetail } from '../../src/data/types/patient-detail'
import type { KpiSummary, HospitalOps } from '../../src/data/repository/types'
import type { PeriodMetrics } from '../../src/data/types/kpi-operational'
import { computePeriodMetrics } from '../../src/utils/kpi-metrics'
import { DATA_WINDOW } from '../../src/data/config/data-window'
import { HOSPITALS } from './pools'
import { randFloat, randInt } from './rng'
import type { GenPatient } from './identity'

function pad(n: number): string { return String(n).padStart(2, '0') }
function lastDay(y: number, m: number): number { return new Date(Date.UTC(y, m, 0)).getUTCDate() }

/** Every [from,to] range the dashboard can request (each month, month-pairs,
 *  quarter, year — capped at mockNow). Keyed "from|to". */
function periodRanges(): string[] {
  const { start, end } = DATA_WINDOW
  const [sy, sm] = start.split('-').map(Number)
  const [ey, em] = end.split('-').map(Number)
  const months: { y: number; m: number }[] = []
  for (let y = sy, m = sm; y < ey || (y === ey && m <= em); m === 12 ? (y++, m = 1) : m++) months.push({ y, m })
  const keys = new Set<string>()
  for (let i = 0; i < months.length; i++) {
    for (let j = i; j < months.length; j++) {
      const a = months[i], b = months[j]
      keys.add(`${a.y}-${pad(a.m)}-01|${b.y}-${pad(b.m)}-${pad(lastDay(b.y, b.m))}`)
    }
  }
  keys.add(`${ey}-01-01|${end}`)
  return [...keys]
}

/** Synthesise per-hospital operational mock for one mode. Seeded, scaled by the
 *  hospital's patient count so a bigger hospital gets more staff / throughput. */
function hospitalOps(hid: string, mode: string, patientCount: number): HospitalOps {
  const k = `ops:${hid}:${mode}`
  const modeShift = mode === 'month' ? 0 : mode === 'quarter' ? 0.3 : 0.6
  return {
    avgLOS: randFloat(`${k}:los`, 3.2, 4.8, 1),
    resolutionRate: randFloat(`${k}:res`, 82, 92, 1),
    responseTimeHr: randFloat(`${k}:rt`, 1.2 + modeShift * 0.1, 2.0, 1),
    resolutionTimeHr: randFloat(`${k}:rest`, 15, 22, 1),
    staff: {
      pharmacist: Math.max(1, Math.round(patientCount / 120) + randInt(`${k}:rph`, 0, 1)),
      physician: Math.max(1, Math.round(patientCount / 85) + randInt(`${k}:dr`, 0, 1)),
      nurse: Math.max(1, Math.round(patientCount / 170)),
    },
    patientsPerDay: Math.max(4, Math.round(45 * (patientCount / 600)) + randInt(`${k}:ppd`, -1, 2)),
  }
}

export function buildKpiSummary(
  warfarin: Record<string, WarfarinPageData>,
  noac: Record<string, NoacPatientData>,
  details: Record<string, PatientDetail>,
  patients: GenPatient[],
): KpiSummary {
  // patient → hospitalId; and per-hospital id sets
  const hidOf = new Map<string, string>()
  const hidPatients = new Map<string, Set<string>>()
  for (const h of HOSPITALS) hidPatients.set(h.id, new Set())
  for (const p of patients) {
    hidOf.set(p.id, p.hospitalId)
    hidPatients.get(p.hospitalId)!.add(p.id)
  }

  const subset = <T>(map: Record<string, T>, ids: Set<string>): Record<string, T> => {
    const out: Record<string, T> = {}
    for (const id of ids) if (map[id]) out[id] = map[id]
    return out
  }

  // ranges[range][hid] = PeriodMetrics
  const ranges: Record<string, Record<string, PeriodMetrics>> = {}
  for (const key of periodRanges()) {
    const [from, to] = key.split('|')
    ranges[key] = {}
    for (const h of HOSPITALS) {
      const ids = hidPatients.get(h.id)!
      ranges[key][h.id] = computePeriodMetrics(
        { warfarin: subset(warfarin, ids), noac: subset(noac, ids), details: subset(details, ids) },
        from, to,
      )
    }
  }

  // ops[hid][mode] = HospitalOps
  const ops: KpiSummary['ops'] = {}
  for (const h of HOSPITALS) {
    const count = hidPatients.get(h.id)!.size
    ops[h.id] = {
      month: hospitalOps(h.id, 'month', count),
      quarter: hospitalOps(h.id, 'quarter', count),
      year: hospitalOps(h.id, 'year', count),
    }
  }

  return {
    meta: {
      generatedAt: `${DATA_WINDOW.mockNow}T08:00:00`,
      mockNow: DATA_WINDOW.mockNow,
      dataMinDate: DATA_WINDOW.start,
      hospitals: HOSPITALS.map(h => ({ id: h.id, name: h.name })),
    },
    ranges,
    ops,
  }
}
