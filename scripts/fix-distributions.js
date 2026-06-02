/**
 * fix-distributions.js
 * 1. Removes w002 from ats-patients.warfarin (they are a NOAC patient now — historical WF data stays)
 * 2. Adds NOAC patients to hit target distribution:
 *      appropriate 60-70%, underdose 20-30%, overdose 10-20%, contra 5-10%, interaction 1-5%
 * 3. Adds 1 WF patient to push WF appropriateness and TTR above prev values
 * 4. Reverts kpi-operational.json prev values to original
 *
 * Run: node scripts/fix-distributions.js
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const root  = resolve(__dir, '..')
const MOCK  = resolve(root, 'src/data/mock')

function loadJSON(f) { return JSON.parse(readFileSync(resolve(MOCK, f), 'utf8')) }
function saveJSON(f, d) { writeFileSync(resolve(MOCK, f), JSON.stringify(d, null, 2) + '\n') }

const ats    = loadJSON('ats-patients.json')
const wfData = loadJSON('warfarin-patients.json')
const nData  = loadJSON('noac-patients.json')
const detail = loadJSON('patient-detail.json')
const kpiOps = loadJSON('kpi-operational.json')

// ── 1. Remove w002 from ats-patients.warfarin ──────────────────────────────
const beforeWf = ats.warfarin.length
ats.warfarin = ats.warfarin.filter(p => p.id !== 'w002')
console.log(`\n[WF] Removed w002 from warfarin list: ${beforeWf} → ${ats.warfarin.length} patients`)

// ── 2. Check current NOAC distribution ────────────────────────────────────
function noacStats() {
  const counts = { appropriate: 0, underdose: 0, overdose: 0, contra: 0, interaction: 0 }
  for (const p of ats.noacs) {
    const s = nData[p.id]?.profile?.status ?? 'appropriate'
    counts[s] = (counts[s] ?? 0) + 1
  }
  const total = ats.noacs.length
  console.log(`\n[NOAC] ${total} patients:`)
  for (const [s, n] of Object.entries(counts))
    console.log(`  ${s.padEnd(14)}: ${n} (${(n/total*100).toFixed(1)}%)`)
  return { counts, total }
}

console.log('\nBefore NOAC additions:')
noacStats()

// ── 3. Add NOAC patients to hit target distribution ────────────────────────
// Target with ~30 patients: appr 62%, under 23%, over 10%, contra 7%, interaction 3%
// Currently: 26 patients → need 4 more: +2 overdose, +1 contra, +1 appropriate

const NEW_NOAC = [
  {
    id: 'n026', name: 'นาย เอกชัย วงศ์สุวรรณ', hn: '6910003001',
    hospital: 'ศูนย์บริการสาธารณสุข 4', weight: 76, referred: false,
    egfr: { value: 38, alert: false },
    status: 'overdose',
    profile: {
      indication: 'NVAF', hasBleedScore: 2, currentDrug: 'rivaroxaban',
      currentDose: '20 mg OD', therapyStartDate: '2568-08-01',
      followUpMonths: 3, status: 'overdose', patientId: 'n026'
    },
    dispensingHistory: [{
      id: 'd-n026-001', patientId: 'n026', dispensedAt: '2026-05-10T09:00:00',
      labData: { weightKg: 76, scrMgDl: 1.8, crClMlMin: 38, measuredAt: '2026-05-09' },
      drugDispensed: 'rivaroxaban', dose: '20 mg OD', systemRank: 2,
      wasTopRecommendation: false, clinicallyAppropriate: false,
      nextFollowUpDate: '2026-08-10',
    }],
  },
  {
    id: 'n027', name: 'นาง สุนิสา ทองเจริญ', hn: '6910003002',
    hospital: 'ศูนย์บริการสาธารณสุข 1', weight: 48, referred: false,
    egfr: { value: 44, alert: false },
    status: 'overdose',
    profile: {
      indication: 'DVT', hasBleedScore: 3, currentDrug: 'apixaban',
      currentDose: '5 mg BID', therapyStartDate: '2568-11-01',
      followUpMonths: 3, status: 'overdose', patientId: 'n027'
    },
    dispensingHistory: [{
      id: 'd-n027-001', patientId: 'n027', dispensedAt: '2026-05-09T09:00:00',
      labData: { weightKg: 48, scrMgDl: 1.5, crClMlMin: 44, measuredAt: '2026-05-08' },
      drugDispensed: 'apixaban', dose: '5 mg BID', systemRank: 2,
      wasTopRecommendation: false, clinicallyAppropriate: false,
      nextFollowUpDate: '2026-08-09',
    }],
  },
  {
    id: 'n028', name: 'นาย ศิวกร ภิรมย์รักษ์', hn: '6910003003',
    hospital: 'ศูนย์บริการสาธารณสุข 3', weight: 65, referred: true,
    egfr: { value: 22, alert: true },
    status: 'contra',
    profile: {
      indication: 'NVAF', hasBleedScore: 4, currentDrug: 'dabigatran',
      currentDose: '150 mg BID', therapyStartDate: '2568-05-01',
      followUpMonths: 1, status: 'contra', patientId: 'n028'
    },
    dispensingHistory: [{
      id: 'd-n028-001', patientId: 'n028', dispensedAt: '2026-05-11T09:00:00',
      labData: { weightKg: 65, scrMgDl: 2.8, crClMlMin: 22, measuredAt: '2026-05-10' },
      drugDispensed: 'dabigatran', dose: '150 mg BID', systemRank: 3,
      wasTopRecommendation: false, clinicallyAppropriate: false,
      nextFollowUpDate: '2026-06-11',
    }],
  },
  {
    id: 'n029', name: 'นางสาว ปาณิสรา จิตสุข', hn: '6910003004',
    hospital: 'ศูนย์บริการสาธารณสุข 2', weight: 58, referred: false,
    egfr: { value: 72, alert: false },
    status: 'appropriate',
    profile: {
      indication: 'PE', hasBleedScore: 1, currentDrug: 'apixaban',
      currentDose: '5 mg BID', therapyStartDate: '2569-02-01',
      followUpMonths: 6, status: 'appropriate', patientId: 'n029'
    },
    dispensingHistory: [{
      id: 'd-n029-001', patientId: 'n029', dispensedAt: '2026-05-13T09:00:00',
      labData: { weightKg: 58, scrMgDl: 0.9, crClMlMin: 72, measuredAt: '2026-05-12' },
      drugDispensed: 'apixaban', dose: '5 mg BID', systemRank: 1,
      wasTopRecommendation: true, clinicallyAppropriate: true,
      nextFollowUpDate: '2026-11-13',
    }],
  },
]

const existingIds = new Set([...ats.warfarin.map(p => p.id), ...ats.noacs.map(p => p.id)])

for (const p of NEW_NOAC) {
  if (existingIds.has(p.id)) { console.log(`⏭  ${p.id} already exists`); continue }
  ats.noacs.push({
    id: p.id, name: p.name, hn: p.hn, hospital: p.hospital,
    weight: p.weight, referred: p.referred, egfr: p.egfr,
  })
  nData[p.id] = { profile: p.profile, dispensingHistory: p.dispensingHistory }
  detail[p.id] = {
    id: p.id, name: p.name, hn: p.hn, age: 55, dob: '1971-01-01',
    sex: p.name.startsWith('นาง') && !p.name.startsWith('นางสาว') ? 'หญิง'
       : p.name.startsWith('นางสาว') ? 'หญิง' : 'ชาย',
    bloodGroup: 'O+', phone: '081-000-0000', insuranceType: 'บัตรทอง (UC)',
    allergies: [], totalComplications: 0,
    complicationSummary: [], complications: [], currentTherapy: 'noacs',
  }
  console.log(`✅ Added NOAC ${p.id} (${p.name}) — ${p.status}`)
}

// ── 4. Add 1 WF patient to push WF appr and TTR above prev ────────────────
const NEW_WF = {
  id: 'w037', name: 'นาย ณรงค์ศักดิ์ พิพัฒน์กุล', hn: '6910004001',
  hospital: 'ศูนย์บริการสาธารณสุข 5', weight: 70, referred: false,
  crcl: { value: 82, alert: false },
  inr: { value: 2.7, alert: false },
}

if (!existingIds.has('w037')) {
  ats.warfarin.push({
    id: NEW_WF.id, name: NEW_WF.name, hn: NEW_WF.hn,
    hospital: NEW_WF.hospital, weight: NEW_WF.weight,
    referred: NEW_WF.referred, crcl: NEW_WF.crcl, inr: NEW_WF.inr,
  })
  wfData['w037'] = {
    patientId: 'w037',
    latestInr: { inrValue: 2.7, measuredAt: '2026-05-13T09:00:00', inrStatus: 'therapeutic' },
    ttr: { value: 72.0, status: 'goal-met' },
    profile: { patientId: 'w037', indication: 'NVAF',
      targetRange: { min: 2.0, max: 3.0 }, currentDoseMgWk: 30,
      pillStrengthMg: 5, concurrentMeds: [] },
    inrHistory: [
      { inrValue: 2.5, measuredAt: '2026-01-15T09:00:00', inrStatus: 'therapeutic' },
      { inrValue: 2.8, measuredAt: '2026-02-12T09:00:00', inrStatus: 'therapeutic' },
      { inrValue: 2.6, measuredAt: '2026-03-11T09:00:00', inrStatus: 'therapeutic' },
      { inrValue: 2.7, measuredAt: '2026-05-13T09:00:00', inrStatus: 'therapeutic' },
    ],
    doseAdjustments: [],
  }
  detail['w037'] = {
    id: 'w037', name: NEW_WF.name, hn: NEW_WF.hn, age: 64, dob: '1962-03-10',
    sex: 'ชาย', bloodGroup: 'A+', phone: '082-000-0000',
    insuranceType: 'ข้าราชการ', allergies: [], totalComplications: 0,
    complicationSummary: [], complications: [], currentTherapy: 'warfarin',
  }
  console.log(`\n✅ Added WF patient w037 (TTR 72%, INR 2.7)`)
}

// ── 5. Revert kpi-operational.json prev values to original ─────────────────
kpiOps._note = 'KPI operational mock — previous-period comparison values (prev), non-derivable display metrics (LOS, ATS resolution/response time, efficiency). Targets are programme constants defined in src/data/config/kpi-targets.ts and applied at runtime.'
kpiOps._wfTtrMonthly_note = 'Pre-computed monthly WF TTR goal-met % (Jan–May 2569). Values = patients with TTR ≥65% / total WF patients that month.'
kpiOps.wfTtrMonthly = [26.7, 33.3, 40.0, 53.3, 66.7]
kpiOps.month.safetyPrev  = { bleeding: 0.0, thrombosis: 2.2, aeHospitalization: 0.0, death: 0.0, medError: 0.0 }
kpiOps.month.qualityPrev = { wfAppropriateness: 64.9, noacAppropriateness: 59.3, wfTtrGoal: 63.9 }
console.log('\n✅ Reverted kpi-operational.json prev values (set below current computed values)')

// ── 6. Save all files ──────────────────────────────────────────────────────
saveJSON('ats-patients.json',      ats)
saveJSON('warfarin-patients.json', wfData)
saveJSON('noac-patients.json',     nData)
saveJSON('patient-detail.json',    detail)
saveJSON('kpi-operational.json',   kpiOps)

// ── 7. Final distribution report ───────────────────────────────────────────
const wfTotal = ats.warfarin.length
const wfIn    = ats.warfarin.filter(p => {
  const inr = wfData[p.id]?.latestInr?.inrValue
  return inr != null && inr >= 2.0 && inr <= 3.0
}).length
const ttrMet   = Object.values(wfData).filter(p => ats.warfarin.some(a => a.id === p.patientId) && p.ttr?.status === 'goal-met').length
const ttrTotal = Object.values(wfData).filter(p => ats.warfarin.some(a => a.id === p.patientId) && p.ttr != null).length

console.log('\n── Final WF distribution ──────────────────────────────')
console.log(`  Total    : ${wfTotal}`)
console.log(`  In-range : ${wfIn}/${wfTotal} = ${(wfIn/wfTotal*100).toFixed(1)}%  (prev: 64.9%)`)
console.log(`  TTR ≥65% : ${ttrMet}/${ttrTotal} = ${(ttrMet/ttrTotal*100).toFixed(1)}%  (prev: 63.9%)`)

console.log('\nFinal NOAC distribution:')
noacStats()
console.log('  (prev appropriateness: 59.3%)')
