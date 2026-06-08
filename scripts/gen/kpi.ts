// ─── G7: KPI files ───────────────────────────────────────────────────────────
// patchKpiOperational → bump mock patientsPerDay (~45) / workloadRatio, keep rest.
// buildKpiSummary    → PRE-COMPUTE PeriodMetrics for every period range the
//                      dashboard can request (months + ranges + quarter + year),
//                      using the shared computePeriodMetrics. The dashboard then
//                      reads these instead of scanning the raw dataset (§3.11).
// ─────────────────────────────────────────────────────────────────────────────

import type { WarfarinPageData } from '../../src/data/types/warfarin'
import type { NoacPatientData } from '../../src/data/types/noac-dispensing'
import type { PatientDetail } from '../../src/data/types/patient-detail'
import type { KpiSummary } from '../../src/data/repository/types'
import { computePeriodMetrics } from '../../src/utils/kpi-metrics'
import { DATA_WINDOW } from '../../src/data/config/data-window'
import { randInt } from './rng'

/* eslint-disable @typescript-eslint/no-explicit-any */
export function patchKpiOperational(existing: any): any {
  const k = JSON.parse(JSON.stringify(existing))
  const perDay: Record<string, number> = { month: 45, quarter: 44, year: 43 }
  for (const period of ['month', 'quarter', 'year']) {
    if (!k[period]?.efficiency) continue
    const ppd = perDay[period] + randInt(`ppd:${period}`, -2, 2)
    const staff = k[period].efficiency.staff?.total ?? 12
    k[period].efficiency.patientsPerDay = ppd
    k[period].efficiency.workloadRatio = Math.round((ppd / staff) * 10) / 10
  }
  return k
}

function pad(n: number): string { return String(n).padStart(2, '0') }
function lastDay(y: number, m: number): number { return new Date(Date.UTC(y, m, 0)).getUTCDate() }

/** Every [from,to] range the dashboard's period selector can produce for this
 *  window: each month, each from→to month pair, the quarter, and the year
 *  (Jan→current, capped at mockNow). Keyed "from|to". */
function periodRanges(): string[] {
  const start = DATA_WINDOW.start, end = DATA_WINDOW.end
  const [sy, sm] = start.split('-').map(Number)
  const [ey, em] = end.split('-').map(Number)
  const months: { y: number; m: number }[] = []
  for (let y = sy, m = sm; y < ey || (y === ey && m <= em); m === 12 ? (y++, m = 1) : m++) months.push({ y, m })

  const keys = new Set<string>()
  // month + month-pair ranges
  for (let i = 0; i < months.length; i++) {
    for (let j = i; j < months.length; j++) {
      const a = months[i], b = months[j]
      keys.add(`${a.y}-${pad(a.m)}-01|${b.y}-${pad(b.m)}-${pad(lastDay(b.y, b.m))}`)
    }
  }
  // year (Jan 1 of mockNow year → end)
  keys.add(`${ey}-01-01|${end}`)
  return [...keys]
}

export function buildKpiSummary(
  warfarin: Record<string, WarfarinPageData>,
  noac: Record<string, NoacPatientData>,
  details: Record<string, PatientDetail>,
): KpiSummary {
  const input = { warfarin, noac, details }
  const ranges: Record<string, ReturnType<typeof computePeriodMetrics>> = {}
  for (const key of periodRanges()) {
    const [from, to] = key.split('|')
    ranges[key] = computePeriodMetrics(input, from, to)
  }
  return {
    meta: {
      generatedAt: `${DATA_WINDOW.mockNow}T08:00:00`,
      mockNow: DATA_WINDOW.mockNow,
      dataMinDate: DATA_WINDOW.start,
    },
    ranges,
  }
}
