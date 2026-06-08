// ─── G7: KPI files ───────────────────────────────────────────────────────────
// patchKpiOperational → bump mock patientsPerDay (~45) / workloadRatio, keep rest.
// buildKpiSummary    → pre-aggregate data-derived KPIs per period (§3.5) for the
//                      dashboard's future light path (Tier-1 wiring deferred).
// ─────────────────────────────────────────────────────────────────────────────

import type { WarfarinPageData } from '../../src/data/types/warfarin'
import type { NoacPatientData } from '../../src/data/types/noac-dispensing'
import type { KpiSummary, KpiPeriodSummary } from '../../src/data/repository/types'
import type { SafetyData } from './complications'
import { DEFAULT_TARGET_RANGE, DEFAULT_TTR_GOAL_PCT } from '../../src/data/types/warfarin'
import { DATA_WINDOW } from '../../src/data/config/data-window'
import { randInt } from './rng'

/* eslint-disable @typescript-eslint/no-explicit-any */
export function patchKpiOperational(existing: any): any {
  const k = structuredCloneSafe(existing)
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

function structuredCloneSafe<T>(o: T): T { return JSON.parse(JSON.stringify(o)) }

const PERIODS: Record<'month' | 'quarter' | 'year', [string, string]> = {
  month: ['2026-05-01', DATA_WINDOW.end],
  quarter: [DATA_WINDOW.start, DATA_WINDOW.end],
  year: [DATA_WINDOW.start, DATA_WINDOW.end],
}

export function buildKpiSummary(
  warfarin: Record<string, WarfarinPageData>,
  noac: Record<string, NoacPatientData>,
  safety: SafetyData,
  kpiOps: any,
): KpiSummary {
  const wfArr = Object.values(warfarin)
  const noArr = Object.values(noac)
  const allComps = [...safety.complications.values()].flat()
  const allDeaths = [...safety.mortality.values()]
  const allMedErrors = [...safety.medErrors.values()].flat()

  const periods = {} as Record<'month' | 'quarter' | 'year', KpiPeriodSummary>
  for (const key of ['month', 'quarter', 'year'] as const) {
    const [from, to] = PERIODS[key]
    const inWin = (iso?: string) => !!iso && iso >= from && iso <= to

    const ttrVals = wfArr.map(w => w.ttr.value)
    const wf = {
      total: wfArr.length,
      ttrGoalMet: wfArr.filter(w => w.ttr.value >= DEFAULT_TTR_GOAL_PCT).length,
      ttrAvg: Math.round((ttrVals.reduce((a, b) => a + b, 0) / wfArr.length) * 10) / 10,
      inrInRange: wfArr.filter(w => {
        const r = w.profile.targetRange ?? DEFAULT_TARGET_RANGE
        const v = w.latestInr.inrValue
        return v >= r.min && v <= r.max
      }).length,
    }
    const noacSum = {
      total: noArr.length,
      appropriate: noArr.filter(n => n.profile.status === 'appropriate').length,
    }
    const comps = allComps.filter(c => inWin(c.dateISO))
    const safetySum = {
      bleeding: comps.filter(c => c.type === 'bleeding').length,
      thrombosis: comps.filter(c => c.type === 'thromboembolism').length,
      aeHosp: comps.filter(c => c.severity === 'severe').length,
      death: allDeaths.filter(d => inWin(d.dateISO)).length,
      medError: allMedErrors.filter(e => inWin(e.dateISO)).length,
      denom: wfArr.length + noArr.length,
    }
    const ops = kpiOps[key] ?? {}
    const ats = {
      resolutionRate: ops.atsResolution?.value ?? 85,
      acceptanceRate: ops.atsAcceptancePrev?.value ?? 82,
      responseTimeHr: ops.atsResponseTime?.value ?? 1.6,
      resolutionTimeHr: ops.atsResolutionTime?.value ?? 18.5,
    }
    periods[key] = { wf, noac: noacSum, safety: safetySum, ats }
  }

  return { generatedAt: new Date().toISOString(), mockNow: DATA_WINDOW.mockNow, periods }
}
