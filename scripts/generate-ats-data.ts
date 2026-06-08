// ─── ATS mock-data generator ─────────────────────────────────────────────────
// Run:  npx tsx scripts/generate-ats-data.ts
// Reuses the app's real engines (warfarinDosing / noacEngine) so generated
// records are clinically consistent with runtime logic. Seeded → reproducible.
// See PLAN-DATA-SCALING.md §4.
//
// Writes BOTH previews (scripts/gen/preview/) and PRODUCTION (src/data/mock/).
// ─────────────────────────────────────────────────────────────────────────────

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import type { PatientDetail } from '../src/data/types/patient-detail'
import type { WarfarinPageData } from '../src/data/types/warfarin'
import type { NoacPatientData } from '../src/data/types/noac-dispensing'
import { DATA_WINDOW } from '../src/data/config/data-window'
import { generateIdentities, summarize, type GenPatient } from './gen/identity'
import { indexPatients } from './gen/schedule'
import { generateWarfarin } from './gen/warfarin'
import { generateNoac } from './gen/noac'
import { generateSafety, complicationSummary } from './gen/complications'
import { buildAtsPatients, buildPatientList } from './gen/lists'
import { patchKpiOperational, buildKpiSummary } from './gen/kpi'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PREVIEW_DIR = resolve(__dirname, 'gen/preview')
const MOCK_DIR = resolve(__dirname, '../src/data/mock')

type DetailRow = PatientDetail & { attendingPhysicianId: string }

function toPatientDetail(p: GenPatient): DetailRow {
  return {
    id: p.id, name: p.name, hn: p.hn, age: p.age, dob: p.dob, sex: p.sex,
    bloodGroup: p.bloodGroup, phone: p.phone, insuranceType: p.insuranceType,
    allergies: p.allergies,
    totalComplications: 0, complicationSummary: [], complications: [],
    currentTherapy: p.therapy, vitalStatus: 'alive',
    ...(p.concurrentMedications?.length ? { concurrentMedications: p.concurrentMedications } : {}),
    attendingPhysicianId: p.attendingPhysicianId,
  }
}

const J = (o: unknown) => JSON.stringify(o, null, 1)

function main() {
  console.log(`\n🏭 ATS data generator — window ${DATA_WINDOW.start} → ${DATA_WINDOW.end} (now ${DATA_WINDOW.mockNow})\n`)

  const patients = generateIdentities()
  indexPatients(patients)

  // G3/G4 — clinical records (engine-driven)
  const warfarin: Record<string, WarfarinPageData> = {}
  const noac: Record<string, NoacPatientData> = {}
  for (const p of patients) {
    if (p.therapy === 'warfarin') warfarin[p.id] = generateWarfarin(p)
    else noac[p.id] = generateNoac(p)
  }

  // G1 detail + G5 complications merge
  const detail: Record<string, DetailRow> = {}
  for (const p of patients) detail[p.id] = toPatientDetail(p)
  const safety = generateSafety(patients)
  for (const p of patients) {
    const evs = safety.complications.get(p.id) ?? []
    detail[p.id].complications = evs
    detail[p.id].totalComplications = evs.length
    detail[p.id].complicationSummary = complicationSummary(evs)
    const mort = safety.mortality.get(p.id)
    detail[p.id].vitalStatus = mort ? 'deceased' : 'alive'
    if (mort) detail[p.id].mortality = mort
    const me = safety.medErrors.get(p.id)
    if (me?.length) detail[p.id].medErrors = me
  }

  // G6 lists
  const atsPatients = buildAtsPatients(patients, warfarin, noac)
  const patientList = buildPatientList(patients, warfarin, noac)

  // G7 kpi
  const kpiOpsExisting = JSON.parse(readFileSync(resolve(MOCK_DIR, 'kpi-operational.json'), 'utf-8'))
  const kpiOps = patchKpiOperational(kpiOpsExisting)
  const kpiSummary = buildKpiSummary(warfarin, noac, safety, kpiOps)

  // ── Write production + preview ──────────────────────────────────────────────
  mkdirSync(PREVIEW_DIR, { recursive: true })
  const files: [string, unknown][] = [
    ['patient-detail.json', detail],
    ['warfarin-patients.json', warfarin],
    ['noac-patients.json', noac],
    ['ats-patients.json', atsPatients],
    ['kpi-operational.json', kpiOps],
    ['patient-list.json', patientList],
    ['kpi-summary.json', kpiSummary],
  ]
  for (const [name, data] of files) {
    writeFileSync(resolve(MOCK_DIR, name), J(data))
    writeFileSync(resolve(PREVIEW_DIR, name.replace('.json', '.preview.json')), J(data))
  }

  // ── Report ──────────────────────────────────────────────────────────────────
  const s = summarize(patients)
  const wfArr = Object.values(warfarin)
  const noArr = Object.values(noac)
  const goalMet = wfArr.filter(w => w.ttr.status === 'goal-met').length
  const inRange = wfArr.filter(w => { const r = w.profile.targetRange ?? { min: 2, max: 3 }; const v = w.latestInr.inrValue; return v >= r.min && v <= r.max }).length
  const apt = noArr.filter(n => n.profile.status === 'appropriate').length
  const allComps = [...safety.complications.values()].flat()
  const compBy = (t: string) => allComps.filter(c => (c.type as string) === t).length

  console.log('── Summary ─────────────────────────────────────────')
  console.log(`  patients ${s.total} (WF ${s.warfarin} / NOAC ${s.noacs}) · new ${s.newPct}%`)
  console.log(`  NOAC indication ${JSON.stringify(s.noacIndication)} · edges ${s.edgeCases.length}`)
  console.log(`  WF: ${wfArr.reduce((a, w) => a + w.inrHistory.length, 0)} INR · TTR goal-met ${Math.round(goalMet / wfArr.length * 100)}% · in-range ${Math.round(inRange / wfArr.length * 100)}%`)
  console.log(`  NOAC: ${noArr.reduce((a, n) => a + n.dispensingHistory.length, 0)} dispensing · appropriate ${Math.round(apt / noArr.length * 100)}%`)
  console.log(`  complications: bleeding ${compBy('bleeding')} · thrombosis ${compBy('thromboembolism')} · severe→aeHosp ${allComps.filter(c => c.severity === 'severe').length} (denom ${s.total})`)
  console.log(`  outcomes: deceased ${safety.mortality.size} · medErrors ${[...safety.medErrors.values()].flat().length}`)
  console.log(`  kpi: patientsPerDay ${kpiOps.month.efficiency.patientsPerDay}/วัน`)
  console.log('\n✅ wrote 7 files → src/data/mock/ (+ preview)\n')
}

main()
