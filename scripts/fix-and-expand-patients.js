/**
 * fix-and-expand-patients.js
 * 1. Finds the phantom patient (in warfarin-patients.json but not ats-patients.json)
 *    and registers them in ats-patients + patient-detail.
 * 2. Adds bulk patients (WF + NOAC) keeping status distribution consistent.
 *
 * Target distributions (maintained):
 *   WF  : ~68-72% in-range, ~20-25% over-range, ~8-12% under-range
 *   NOAC: ~58-63% appropriate, ~20-24% underdose, ~8-12% overdose, rest contra/interaction
 *
 * Run: node scripts/fix-and-expand-patients.js
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const root  = resolve(__dir, '..')
const MOCK  = resolve(root, 'src/data/mock')

function loadJSON(file) { return JSON.parse(readFileSync(resolve(MOCK, file), 'utf8')) }
function saveJSON(file, data) { writeFileSync(resolve(MOCK, file), JSON.stringify(data, null, 2) + '\n') }

const atsPts = loadJSON('ats-patients.json')
const wfData = loadJSON('warfarin-patients.json')
const nData  = loadJSON('noac-patients.json')
const detail = loadJSON('patient-detail.json')

const wfIds = new Set(atsPts.warfarin.map(p => p.id))
const nIds  = new Set(atsPts.noacs.map(p => p.id))

// ── 1. Find and register phantom WF patient ────────────────────────────────
const phantomIds = Object.keys(wfData).filter(id => !wfIds.has(id))
console.log(`\nPhantom WF patients: ${phantomIds.length ? phantomIds.join(', ') : 'none'}`)

for (const pid of phantomIds) {
  const pd  = wfData[pid]
  const inr = pd.latestInr?.inrValue ?? 2.5
  const alert = inr < 1.5 || inr > 4.0

  atsPts.warfarin.push({
    id:       pid,
    name:     detail[pid]?.name ?? `ผู้ป่วย ${pid}`,
    hn:       detail[pid]?.hn  ?? `6900000${pid.slice(1)}`,
    hospital: 'ศูนย์บริการสาธารณสุข 1',
    weight:   detail[pid]?.weight ?? 65,
    referred: false,
    crcl:     { value: 75, alert: false },
    inr:      { value: inr, alert },
  })

  if (!detail[pid]) {
    detail[pid] = {
      id: pid, name: `ผู้ป่วย ${pid}`,
      hn: `6900000${pid.slice(1)}`, age: 60, dob: '1966-01-01',
      sex: 'หญิง', bloodGroup: 'O+', phone: '081-000-0000',
      insuranceType: 'บัตรทอง (UC)',
      allergies: [], totalComplications: 0,
      complicationSummary: [], complications: [],
      currentTherapy: 'warfarin',
    }
  }
  console.log(`✅ Registered phantom patient ${pid} → ats-patients + patient-detail`)
}

// ── 2. Bulk patient definitions ────────────────────────────────────────────
// WF additions: keep ~70% in-range
const NEW_WF = [
  {
    id: 'w032', name: 'นางสาว สุภาพร เจริญสุข', hn: '6910001001',
    hospital: 'ศูนย์บริการสาธารณสุข 2', weight: 58, referred: false,
    crcl: { value: 80, alert: false },
    inr: { value: 2.4, alert: false },
    ttr: { value: 71.0, status: 'goal-met' },
    indication: 'NVAF', doseMgWk: 28,
    latestInr: { inrValue: 2.4, measuredAt: '2026-05-10T09:00:00', inrStatus: 'therapeutic' },
    inrHistory: [
      { inrValue: 2.1, measuredAt: '2026-01-12T09:00:00', inrStatus: 'therapeutic' },
      { inrValue: 2.6, measuredAt: '2026-02-09T09:00:00', inrStatus: 'therapeutic' },
      { inrValue: 2.3, measuredAt: '2026-03-08T09:00:00', inrStatus: 'therapeutic' },
      { inrValue: 2.4, measuredAt: '2026-05-10T09:00:00', inrStatus: 'therapeutic' },
    ],
  },
  {
    id: 'w033', name: 'นาย วิชัย ประสิทธิ์ดี', hn: '6910001002',
    hospital: 'ศูนย์บริการสาธารณสุข 3', weight: 72, referred: false,
    crcl: { value: 68, alert: false },
    inr: { value: 2.8, alert: false },
    ttr: { value: 69.0, status: 'goal-met' },
    indication: 'DVT', doseMgWk: 35,
    latestInr: { inrValue: 2.8, measuredAt: '2026-05-14T09:00:00', inrStatus: 'therapeutic' },
    inrHistory: [
      { inrValue: 2.5, measuredAt: '2026-01-20T09:00:00', inrStatus: 'therapeutic' },
      { inrValue: 2.9, measuredAt: '2026-02-17T09:00:00', inrStatus: 'therapeutic' },
      { inrValue: 3.1, measuredAt: '2026-03-16T09:00:00', inrStatus: 'supra' },
      { inrValue: 2.8, measuredAt: '2026-05-14T09:00:00', inrStatus: 'therapeutic' },
    ],
  },
  {
    id: 'w034', name: 'นาง มาลี รักษ์สุขภาพ', hn: '6910001003',
    hospital: 'ศูนย์บริการสาธารณสุข 1', weight: 55, referred: false,
    crcl: { value: 62, alert: false },
    inr: { value: 1.8, alert: false },
    ttr: { value: 45.0, status: 'below-goal' },
    indication: 'NVAF', doseMgWk: 21,
    latestInr: { inrValue: 1.8, measuredAt: '2026-05-08T09:00:00', inrStatus: 'low' },
    inrHistory: [
      { inrValue: 2.2, measuredAt: '2026-01-18T09:00:00', inrStatus: 'therapeutic' },
      { inrValue: 1.9, measuredAt: '2026-02-15T09:00:00', inrStatus: 'low' },
      { inrValue: 2.1, measuredAt: '2026-03-14T09:00:00', inrStatus: 'therapeutic' },
      { inrValue: 1.8, measuredAt: '2026-05-08T09:00:00', inrStatus: 'low' },
    ],
  },
  {
    id: 'w035', name: 'นาย ประสงค์ มีสุข', hn: '6910001004',
    hospital: 'ศูนย์บริการสาธารณสุข 4', weight: 78, referred: false,
    crcl: { value: 71, alert: false },
    inr: { value: 2.6, alert: false },
    ttr: { value: 74.0, status: 'goal-met' },
    indication: 'PE', doseMgWk: 32,
    latestInr: { inrValue: 2.6, measuredAt: '2026-05-12T09:00:00', inrStatus: 'therapeutic' },
    inrHistory: [
      { inrValue: 2.4, measuredAt: '2026-01-10T09:00:00', inrStatus: 'therapeutic' },
      { inrValue: 2.7, measuredAt: '2026-02-07T09:00:00', inrStatus: 'therapeutic' },
      { inrValue: 2.5, measuredAt: '2026-03-07T09:00:00', inrStatus: 'therapeutic' },
      { inrValue: 2.6, measuredAt: '2026-05-12T09:00:00', inrStatus: 'therapeutic' },
    ],
  },
  {
    id: 'w036', name: 'นาง อรทัย ดีใจมาก', hn: '6910001005',
    hospital: 'ศูนย์บริการสาธารณสุข 2', weight: 63, referred: false,
    crcl: { value: 55, alert: false },
    inr: { value: 3.5, alert: false },
    ttr: { value: 52.0, status: 'below-goal' },
    indication: 'NVAF', doseMgWk: 24,
    latestInr: { inrValue: 3.5, measuredAt: '2026-05-07T09:00:00', inrStatus: 'supra' },
    inrHistory: [
      { inrValue: 2.8, measuredAt: '2026-01-14T09:00:00', inrStatus: 'therapeutic' },
      { inrValue: 3.2, measuredAt: '2026-02-11T09:00:00', inrStatus: 'supra' },
      { inrValue: 2.9, measuredAt: '2026-03-10T09:00:00', inrStatus: 'therapeutic' },
      { inrValue: 3.5, measuredAt: '2026-05-07T09:00:00', inrStatus: 'supra' },
    ],
  },
]

// NOAC additions: keep ~60% appropriate
const NEW_NOAC = [
  {
    id: 'n023', name: 'นาย ธนกร พึ่งพระ', hn: '6910002001',
    hospital: 'ศูนย์บริการสาธารณสุข 1', weight: 70, referred: false,
    egfr: { value: 68, alert: false },
    profile: { indication: 'NVAF', hasBleedScore: 1, currentDrug: 'apixaban',
      currentDose: '5 mg BID', therapyStartDate: '2568-07-01',
      followUpMonths: 6, status: 'appropriate', patientId: 'n023' },
    dispensingHistory: [{
      id: 'd-n023-001', patientId: 'n023', dispensedAt: '2026-05-05T09:00:00',
      labData: { weightKg: 70, scrMgDl: 1.0, crClMlMin: 68, measuredAt: '2026-05-04' },
      drugDispensed: 'apixaban', dose: '5 mg BID', systemRank: 1,
      wasTopRecommendation: true, clinicallyAppropriate: true,
      nextFollowUpDate: '2026-11-05',
    }],
  },
  {
    id: 'n024', name: 'นาง สมหญิง ใจดี', hn: '6910002002',
    hospital: 'ศูนย์บริการสาธารณสุข 3', weight: 52, referred: false,
    egfr: { value: 55, alert: false },
    profile: { indication: 'DVT', hasBleedScore: 2, currentDrug: 'rivaroxaban',
      currentDose: '20 mg OD', therapyStartDate: '2568-10-01',
      followUpMonths: 3, status: 'appropriate', patientId: 'n024' },
    dispensingHistory: [{
      id: 'd-n024-001', patientId: 'n024', dispensedAt: '2026-05-06T09:00:00',
      labData: { weightKg: 52, scrMgDl: 1.1, crClMlMin: 55, measuredAt: '2026-05-05' },
      drugDispensed: 'rivaroxaban', dose: '20 mg OD', systemRank: 1,
      wasTopRecommendation: true, clinicallyAppropriate: true,
      nextFollowUpDate: '2026-08-06',
    }],
  },
  {
    id: 'n025', name: 'นาย อานนท์ สมหวัง', hn: '6910002003',
    hospital: 'ศูนย์บริการสาธารณสุข 2', weight: 82, referred: false,
    egfr: { value: 42, alert: false },
    profile: { indication: 'NVAF', hasBleedScore: 3, currentDrug: 'apixaban',
      currentDose: '2.5 mg BID', therapyStartDate: '2568-04-01',
      followUpMonths: 3, status: 'underdose', patientId: 'n025' },
    dispensingHistory: [{
      id: 'd-n025-001', patientId: 'n025', dispensedAt: '2026-05-08T09:00:00',
      labData: { weightKg: 82, scrMgDl: 1.6, crClMlMin: 42, measuredAt: '2026-05-07' },
      drugDispensed: 'apixaban', dose: '2.5 mg BID', systemRank: 2,
      wasTopRecommendation: false, clinicallyAppropriate: false,
      nextFollowUpDate: '2026-08-08',
    }],
  },
]

// ── 3. Apply WF additions ──────────────────────────────────────────────────
const existingIds = new Set([...atsPts.warfarin.map(p => p.id), ...atsPts.noacs.map(p => p.id)])

for (const p of NEW_WF) {
  if (existingIds.has(p.id)) { console.log(`⏭  ${p.id} already exists, skipping`); continue }

  atsPts.warfarin.push({
    id: p.id, name: p.name, hn: p.hn, hospital: p.hospital,
    weight: p.weight, referred: p.referred, crcl: p.crcl, inr: p.inr,
  })

  wfData[p.id] = {
    patientId: p.id,
    latestInr: p.latestInr,
    ttr: p.ttr,
    profile: { patientId: p.id, indication: p.indication,
      targetRange: { min: 2.0, max: 3.0 }, currentDoseMgWk: p.doseMgWk,
      pillStrengthMg: 5, concurrentMeds: [] },
    inrHistory: p.inrHistory,
    doseAdjustments: [],
  }

  detail[p.id] = {
    id: p.id, name: p.name, hn: p.hn, age: 62, dob: '1964-01-01',
    sex: p.name.startsWith('นาง') && !p.name.startsWith('นางสาว') ? 'หญิง'
       : p.name.startsWith('นางสาว') ? 'หญิง' : 'ชาย',
    bloodGroup: 'A+', phone: '081-000-0000',
    insuranceType: 'บัตรทอง (UC)',
    allergies: [], totalComplications: 0,
    complicationSummary: [], complications: [],
    currentTherapy: 'warfarin',
  }
  console.log(`✅ Added WF patient ${p.id} (${p.name}) — INR ${p.latestInr.inrValue}`)
}

// ── 4. Apply NOAC additions ────────────────────────────────────────────────
for (const p of NEW_NOAC) {
  if (existingIds.has(p.id)) { console.log(`⏭  ${p.id} already exists, skipping`); continue }

  atsPts.noacs.push({
    id: p.id, name: p.name, hn: p.hn, hospital: p.hospital,
    weight: p.weight, referred: p.referred, egfr: p.egfr,
  })

  nData[p.id] = {
    profile:          p.profile,
    dispensingHistory: p.dispensingHistory,
  }

  detail[p.id] = {
    id: p.id, name: p.name, hn: p.hn, age: 58, dob: '1968-01-01',
    sex: p.name.startsWith('นาง') && !p.name.startsWith('นางสาว') ? 'หญิง'
       : p.name.startsWith('นางสาว') ? 'หญิง' : 'ชาย',
    bloodGroup: 'B+', phone: '081-000-0000',
    insuranceType: 'ประกันสังคม',
    allergies: [], totalComplications: 0,
    complicationSummary: [], complications: [],
    currentTherapy: 'noacs',
  }
  console.log(`✅ Added NOAC patient ${p.id} (${p.name}) — status: ${p.profile.status}`)
}

// ── 5. Save all files ──────────────────────────────────────────────────────
saveJSON('ats-patients.json',      atsPts)
saveJSON('warfarin-patients.json', wfData)
saveJSON('noac-patients.json',     nData)
saveJSON('patient-detail.json',    detail)

// ── 6. Summary stats ───────────────────────────────────────────────────────
const wfFinal = atsPts.warfarin
const nFinal  = atsPts.noacs

const wfInRange = wfFinal.filter(p => {
  const inr = wfData[p.id]?.latestInr?.inrValue
  return inr != null && inr >= 2.0 && inr <= 3.0
}).length

const nAppr = nFinal.filter(p => nData[p.id]?.profile?.status === 'appropriate').length
const ttrMet = Object.values(wfData).filter(p => p.ttr?.status === 'goal-met').length
const ttrTotal = Object.values(wfData).filter(p => p.ttr != null).length

console.log('\n── Final distribution ─────────────────────────────────')
console.log(`WF  : ${wfFinal.length} patients | in-range ${wfInRange}/${wfFinal.length} = ${(wfInRange/wfFinal.length*100).toFixed(1)}%`)
console.log(`NOAC: ${nFinal.length} patients | appropriate ${nAppr}/${nFinal.length} = ${(nAppr/nFinal.length*100).toFixed(1)}%`)
console.log(`TTR ≥65%: ${ttrMet}/${ttrTotal} = ${(ttrMet/ttrTotal*100).toFixed(1)}%`)
console.log('\nAll files saved. Run: npx vue-tsc --noEmit to verify types.')
