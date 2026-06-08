// ─── G6: ats-patients + patient-list projection ──────────────────────────────
// ats-patients.json  → dashboard's canonical program classification (table rows).
// patient-list.json  → Tier-1 light projection (§3.11): status/concordance
//                       precomputed so the dashboard never loads heavy records
//                       just to render rows.
// ─────────────────────────────────────────────────────────────────────────────

import type { AtsPatientsData, AtsWarfarinPatient, AtsNoacsPatient, WarfarinStatus } from '../../src/data/types/ats-patients'
import type { WarfarinPageData } from '../../src/data/types/warfarin'
import type { NoacPatientData } from '../../src/data/types/noac-dispensing'
import type { PatientListData, WfListEntry, NoacListEntry } from '../../src/data/repository/types'
import { DEFAULT_TARGET_RANGE } from '../../src/data/types/warfarin'
import { lastDoseAdjustment, wfConcordanceLabel, wfConcordanceBadgeClass } from '../../src/utils/warfarin-helpers'
import { lastDispensing, concordanceLabel, concordanceBadgeClass } from '../../src/utils/noac-helpers'
import { DATA_WINDOW } from '../../src/data/config/data-window'
import { chance } from './rng'
import { crCl as cg } from './pools'
import type { GenPatient } from './identity'

function referred(id: string): boolean {
  return chance(`${id}:referred`, 0.12)
}

function wfStatus(inr: number, min: number, max: number): WarfarinStatus {
  if (inr < min) return 'under-range'
  if (inr > max) return 'over-range'
  return 'in-range'
}

export function buildAtsPatients(patients: GenPatient[], warfarin: Record<string, WarfarinPageData>, noac: Record<string, NoacPatientData>): AtsPatientsData {
  const warfarinList: AtsWarfarinPatient[] = []
  const noacsList: AtsNoacsPatient[] = []

  for (const p of patients) {
    if (p.therapy === 'warfarin') {
      const wf = warfarin[p.id]
      const crcl = cg(p.age, p.baseWeightKg, p.baseScrMgDl, p.sex)
      const range = wf.profile.targetRange ?? DEFAULT_TARGET_RANGE
      const inr = wf.latestInr.inrValue
      warfarinList.push({
        id: p.id, name: p.name, hn: p.hn, hospital: p.hospital,
        weight: p.baseWeightKg, referred: referred(p.id),
        crcl: { value: crcl, alert: crcl < 30 },
        inr: { value: inr, alert: inr < range.min || inr > range.max },
      })
    } else {
      const nd = noac[p.id]
      const lab = lastDispensing(nd)?.labData ?? { weightKg: p.baseWeightKg, crClMlMin: cg(p.age, p.baseWeightKg, p.baseScrMgDl, p.sex), scrMgDl: p.baseScrMgDl, measuredAt: '' }
      noacsList.push({
        id: p.id, name: p.name, hn: p.hn, hospital: p.hospital,
        weight: lab.weightKg, referred: referred(p.id),
        egfr: { value: lab.crClMlMin, alert: lab.crClMlMin < 30 },
        crcl: { value: lab.crClMlMin, alert: lab.crClMlMin < 30 },
      })
    }
  }
  return { lastSyncedAt: `${DATA_WINDOW.mockNow}T08:00:00`, warfarin: warfarinList, noacs: noacsList }
}

export function buildPatientList(patients: GenPatient[], warfarin: Record<string, WarfarinPageData>, noac: Record<string, NoacPatientData>): PatientListData {
  const wfEntries: WfListEntry[] = []
  const noacEntries: NoacListEntry[] = []

  for (const p of patients) {
    if (p.therapy === 'warfarin') {
      const wf = warfarin[p.id]
      const range = wf.profile.targetRange ?? DEFAULT_TARGET_RANGE
      const inr = wf.latestInr.inrValue
      const crcl = cg(p.age, p.baseWeightKg, p.baseScrMgDl, p.sex)
      wfEntries.push({
        id: p.id, name: p.name, hn: p.hn, hospital: p.hospital,
        weight: p.baseWeightKg, referred: referred(p.id),
        status: wfStatus(inr, range.min, range.max),
        inr: { value: inr, alert: inr < range.min || inr > range.max },
        crcl: { value: crcl, alert: crcl < 30 },
        inrDate: wf.latestInr.measuredAt.substring(0, 10),
        ttrValue: wf.ttr.value, ttrStatus: wf.ttr.status,
        currentDoseMgWk: wf.profile.currentDoseMgWk,
        majorInteractions: (wf.profile.concurrentMeds ?? []).filter(m => m.severity === 'major').map(m => ({ name: m.name, note: m.note ?? '', effect: m.effect })),
        concordanceLabel: wfConcordanceLabel(lastDoseAdjustment(wf)),
        concordanceClass: wfConcordanceBadgeClass(lastDoseAdjustment(wf)),
      })
    } else {
      const nd = noac[p.id]
      const last = lastDispensing(nd)
      const lab = last?.labData ?? null
      noacEntries.push({
        id: p.id, name: p.name, hn: p.hn, hospital: p.hospital,
        weight: lab?.weightKg ?? p.baseWeightKg, referred: referred(p.id),
        indication: p.indication!,
        status: nd.profile.status,
        drug: last?.dispensed === false ? null : (nd.profile.currentDrug ?? null),
        dose: nd.profile.currentDose,
        crcl: { value: lab?.crClMlMin ?? 0, alert: (lab?.crClMlMin ?? 99) < 30 },
        egfr: { value: lab?.crClMlMin ?? 0, alert: (lab?.crClMlMin ?? 99) < 30 },
        concordanceLabel: concordanceLabel(last),
        concordanceClass: concordanceBadgeClass(last),
        lastDispensedAt: last?.dispensedAt ?? null,
        lab,
      })
    }
  }
  return { generatedAt: `${DATA_WINDOW.mockNow}T08:00:00`, warfarin: wfEntries, noacs: noacEntries }
}
