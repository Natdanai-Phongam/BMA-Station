// ─── Period KPI metrics — single source of the aggregation logic ─────────────
// Pure function used by the generator to PRE-COMPUTE PeriodMetrics per period
// range (emitted as kpi-summary.json). The dashboard then reads the precomputed
// result instead of scanning the full raw dataset on every period change.
// (Standard patients only — the generator produces no therapy-switching records.)
// ─────────────────────────────────────────────────────────────────────────────

import type { WarfarinPageData } from '@/data/types/warfarin'
import type { NoacPatientData, NoacDispensingRecord } from '@/data/types/noac-dispensing'
import type { PatientDetail } from '@/data/types/patient-detail'
import type { PeriodMetrics } from '@/data/types/kpi-operational'
import { KPI_QUALITY_TARGETS } from '@/data/config/kpi-targets'

export interface KpiMetricsInput {
  warfarin: Record<string, WarfarinPageData>
  noac: Record<string, NoacPatientData>
  details: Record<string, PatientDetail>
}

export function emptyPeriodMetrics(): PeriodMetrics {
  return {
    comps: { bleeding: 0, thrombosis: 0, aeHospitalization: 0, death: 0, medError: 0 },
    wf: { active: 0, appropriate: 0, ttrGoalMet: 0, ttrTotal: 0, adjTotal: 0, adjAccepted: 0 },
    noac: { active: 0, appropriate: 0, dispTotal: 0, dispAccepted: 0 },
  }
}

export function computePeriodMetrics(input: KpiMetricsInput, from: string, to: string): PeriodMetrics {
  const m = emptyPeriodMetrics()

  // Safety — clinical complications + mortality (outcome).
  // medError is derived per-dispensing below (WF: dose given while INR out of
  // target range · NOAC: dose dispensed at an inappropriate level) — i.e. the
  // complement of dispensing appropriateness, counted per record.
  for (const pd of Object.values(input.details)) {
    for (const c of pd.complications ?? []) {
      if (!c.dateISO || c.dateISO < from || c.dateISO > to) continue
      if (c.type === 'bleeding') m.comps.bleeding++
      else if (c.type === 'thromboembolism') m.comps.thrombosis++
      if (c.severity === 'severe') m.comps.aeHospitalization++
    }
    if (pd.mortality && pd.mortality.dateISO >= from && pd.mortality.dateISO <= to) m.comps.death++
  }

  // Warfarin — patients with an INR in range; last INR therapeutic; TTR goal; concordance
  for (const pd of Object.values(input.warfarin)) {
    const inrs = (pd.inrHistory ?? []).filter(r => {
      const d = r.measuredAt.substring(0, 10)
      return d >= from && d <= to
    })
    if (!inrs.length) continue
    m.wf.active++
    const last = [...inrs].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt)).at(-1)!
    if (last.inrValue >= 2.0 && last.inrValue <= 3.0) m.wf.appropriate++
    // medError: each visit where the dose was given while INR was out of target
    for (const r of inrs) if (r.inrValue < 2.0 || r.inrValue > 3.0) m.comps.medError++
    if (pd.ttr != null) {
      m.wf.ttrTotal++
      if (pd.ttr.value >= KPI_QUALITY_TARGETS.wfTtrGoal) m.wf.ttrGoalMet++
    }
    for (const adj of pd.doseAdjustments ?? []) {
      const d = adj.adjustedAt.substring(0, 10)
      if (d < from || d > to) continue
      m.wf.adjTotal++
      if (adj.systemSuggested) m.wf.adjAccepted++
    }
  }

  // NOAC — patients with a dispensing in range; appropriateness; concordance
  for (const pd of Object.values(input.noac)) {
    const disps = (pd.dispensingHistory as NoacDispensingRecord[]).filter(r => {
      const d = r.dispensedAt.substring(0, 10)
      return d >= from && d <= to
    })
    if (!disps.length) continue
    m.noac.active++
    if (disps.some(d => d.clinicalStatus === 'appropriate')) m.noac.appropriate++
    m.noac.dispTotal += disps.length
    m.noac.dispAccepted += disps.filter(d => d.wasTopRecommendation).length
    // medError: a drug was dispensed at an inappropriate dose (under/overdose/
    // interaction) — exclude withheld records (contra), where NOT dispensing is correct
    for (const d of disps) {
      if (d.dispensed !== false && d.clinicalStatus && d.clinicalStatus !== 'appropriate' && d.clinicalStatus !== 'contra') m.comps.medError++
    }
  }

  return m
}
