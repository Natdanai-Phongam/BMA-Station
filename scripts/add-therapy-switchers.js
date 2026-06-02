/**
 * add-therapy-switchers.js
 * Converts 2 existing patients to therapy-switching case studies:
 *
 *   w034 (นาง มาลี รักษ์สุขภาพ) — WF → NOAC
 *     Reason: Poor TTR (45%), repeated under-range INR despite dose adjustments.
 *     Switched to apixaban for predictable anticoagulation.
 *     WF period  : 2025-06-01 → 2026-05-08 (last INR check before switch)
 *     NOAC period: 2026-05-15 → present
 *
 *   n006 (นาย ธนกร วิชัยรัตน์) — NOAC → WF
 *     Reason: Major drug interaction with current NOAC (P-gp inhibitor).
 *     Switched to warfarin for closer INR-based monitoring.
 *     NOAC period: existing records (add activeTo)
 *     WF period  : 2026-04-01 → present
 *
 * Run: node scripts/add-therapy-switchers.js
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const MOCK  = resolve(__dir, '..', 'src', 'data', 'mock')
const load  = f => JSON.parse(readFileSync(resolve(MOCK, f), 'utf8'))
const save  = (f, d) => writeFileSync(resolve(MOCK, f), JSON.stringify(d, null, 2) + '\n')

const ats    = load('ats-patients.json')
const wfData = load('warfarin-patients.json')
const nData  = load('noac-patients.json')
const detail = load('patient-detail.json')

// ── helpers ────────────────────────────────────────────────────
const wfList = id => ats.warfarin.some(p => p.id === id)
const nList  = id => ats.noacs.some(p => p.id === id)

// ══════════════════════════════════════════════════════════════
//  CASE 1 — w034: WF → NOAC
// ══════════════════════════════════════════════════════════════
console.log('\n════ CASE 1: w034 (นาง มาลี รักษ์สุขภาพ) — WF → NOAC ════')

// 1a. Stamp WF active period
wfData['w034'].activeFrom = '2025-06-01'
wfData['w034'].activeTo   = '2026-05-08'   // last INR measurement date
console.log('  WF record  : activeFrom=2025-06-01 activeTo=2026-05-08')

// 1b. Create NOAC record for w034
// apixaban chosen — renally dosed, good for patients who had WF difficulties
nData['w034'] = {
  activeFrom: '2026-05-15',
  activeTo:   null,
  profile: {
    patientId:        'w034',
    indication:       'NVAF',
    hasBleedScore:    2,
    currentDrug:      'apixaban',
    currentDose:      '5 mg BID',
    therapyStartDate: '2569-05-15',
    followUpMonths:   3,
    status:           'appropriate',
  },
  dispensingHistory: [
    {
      id:                   'd-w034-noac-001',
      patientId:            'w034',
      dispensedAt:          '2026-05-15T09:00:00',
      labData: {
        weightKg:  55,
        scrMgDl:   1.0,
        crClMlMin: 62,
        measuredAt: '2026-05-14',
      },
      drugDispensed:         'apixaban',
      dose:                  '5 mg BID',
      systemRank:            1,
      wasTopRecommendation:  true,
      clinicallyAppropriate: true,
      pharmacistNote:        'เปลี่ยนจาก Warfarin เนื่องจาก TTR ต่ำ (45%) และ INR ควบคุมยาก — เริ่ม Apixaban 5 mg BID',
      nextFollowUpDate:      '2026-08-15',
    },
  ],
}
console.log('  NOAC record : created (apixaban, activeFrom=2026-05-15)')

// 1c. Move w034 in ats-patients: remove from warfarin, add to noacs
const w034AtsPt = ats.warfarin.find(p => p.id === 'w034')
ats.warfarin = ats.warfarin.filter(p => p.id !== 'w034')
ats.noacs.push({
  id:       'w034',
  name:     w034AtsPt.name,
  hn:       w034AtsPt.hn,
  hospital: w034AtsPt.hospital,
  weight:   w034AtsPt.weight,
  referred: false,
  egfr:     { value: 62, alert: false },
})
console.log('  ats-patients: moved w034 warfarin → noacs')

// 1d. Update patient-detail currentTherapy
detail['w034'].currentTherapy = 'noacs'
console.log('  patient-detail: currentTherapy updated → noacs')

// ══════════════════════════════════════════════════════════════
//  CASE 2 — n006: NOAC → WF
// ══════════════════════════════════════════════════════════════
console.log('\n════ CASE 2: n006 (นาย ธนกร วิชัยรัตน์) — NOAC → WF ════')

// 2a. Check n006 dispensing history to find last dispensing date
const n006Disps = (nData['n006']?.dispensingHistory ?? [])
  .map(r => r.dispensedAt.slice(0, 10))
  .sort()
const n006LastDisp = n006Disps.at(-1) ?? '2026-03-31'
const n006FirstDisp = n006Disps[0] ?? '2026-01-01'
console.log(`  NOAC dispensing: ${n006FirstDisp} → ${n006LastDisp}`)

// 2b. Stamp NOAC active period (already existed, now add dates)
if (!nData['n006'].activeFrom) {
  nData['n006'].activeFrom = '2025-07-01'
}
nData['n006'].activeTo = '2026-03-31'
console.log(`  NOAC record : activeFrom=${nData['n006'].activeFrom} activeTo=2026-03-31`)

// 2c. Create WF record for n006
// Switch date: 2026-04-01 — after NOAC period ends
// Drug interaction note: P-gp inhibitor requiring switch to monitored therapy
wfData['n006'] = {
  activeFrom: '2026-04-01',
  activeTo:   null,
  patientId: 'n006',
  latestInr: {
    id:        'n006-inr-latest',
    patientId: 'n006',
    inrValue:  2.3,
    measuredAt: '2026-05-10T09:00:00',
    source:    'manual',
  },
  ttr: {
    value:          52.0,
    status:         'borderline',
    fromDate:       '2026-04-01',
    toDate:         '2026-05-10',
    daysInRange:    21,
    daysCalculable: 39,
  },
  profile: {
    patientId:        'n006',
    pillStrengthMg:   5,
    activePillsMg:    [5],
    currentDoseMgWk:  25,
    therapyStartDate: '2026-04-01',
    targetRange:      { min: 2.0, max: 3.0, label: 'Standard (2.0–3.0)' },
    concurrentMeds: [
      {
        name:     'Amiodarone',
        dose:     '200 mg OD',
        severity: 'major',
        effect:   'increase',
        note:     'ยับยั้ง CYP2C9 — เพิ่มระดับ Warfarin อย่างมีนัยสำคัญ ต้องลดขนาดยา 30-50% และติดตาม INR ใกล้ชิด',
      },
    ],
  },
  inrHistory: [
    {
      id: 'n006-inr-001', patientId: 'n006',
      inrValue: 1.8, measuredAt: '2026-04-07T09:00:00', source: 'manual',
    },
    {
      id: 'n006-inr-002', patientId: 'n006',
      inrValue: 2.1, measuredAt: '2026-04-21T09:00:00', source: 'manual',
    },
    {
      id: 'n006-inr-003', patientId: 'n006',
      inrValue: 2.3, measuredAt: '2026-05-10T09:00:00', source: 'manual',
    },
  ],
  doseAdjustments: [
    {
      date:           '2026-04-07',
      previousDose:   30,
      newDose:        25,
      systemSuggested: true,
      overrideReason: null,
      pharmacistNote: 'ปรับลดขนาดยา Warfarin เนื่องจาก Amiodarone interaction — INR เริ่มต้น 1.8',
    },
  ],
}
console.log('  WF record   : created (activeFrom=2026-04-01), INR 1.8→2.1→2.3')

// 2d. Move n006 in ats-patients: remove from noacs, add to warfarin
const n006AtsPt = ats.noacs.find(p => p.id === 'n006')
ats.noacs = ats.noacs.filter(p => p.id !== 'n006')
const n006Lab = nData['n006'].dispensingHistory?.at(-1)?.labData
ats.warfarin.push({
  id:       'n006',
  name:     n006AtsPt.name,
  hn:       n006AtsPt.hn,
  hospital: n006AtsPt.hospital,
  weight:   n006Lab?.weightKg ?? n006AtsPt.weight ?? 70,
  referred: false,
  crcl:     { value: Math.round(n006Lab?.crClMlMin ?? 51), alert: false },
  inr:      { value: 2.3, alert: false },
})
console.log('  ats-patients: moved n006 noacs → warfarin')

// 2e. Update patient-detail
detail['n006'].currentTherapy    = 'warfarin'
detail['n006'].concurrentMedications = wfData['n006'].profile.concurrentMeds
console.log('  patient-detail: currentTherapy updated → warfarin')

// ── Save all ────────────────────────────────────────────────
save('ats-patients.json',      ats)
save('warfarin-patients.json', wfData)
save('noac-patients.json',     nData)
save('patient-detail.json',    detail)
console.log('\n✅ All files saved')

// ── Final counts ────────────────────────────────────────────
console.log(`\nFinal: WF ${ats.warfarin.length} patients | NOAC ${ats.noacs.length} patients`)
