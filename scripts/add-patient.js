#!/usr/bin/env node
/**
 * add-patient.js — Mock patient generator for BMA Station
 *
 * Usage:
 *   node scripts/add-patient.js
 *
 * Edit the PATIENT_INPUT object below, then run.
 * The script writes to all 3 required mock files automatically.
 *
 * Rules enforced automatically:
 *   - WF status derived from latestInr.inrValue (NOT stored in ats-patients)
 *   - NOAC crcl/weight derived from latest dispensing labData (NOT in ats-patients)
 *   - NOAC status must be set in profile.status (NOT in ats-patients)
 *   - IDs must be unique across both files
 */

const fs   = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', 'src', 'data', 'mock')

// ─────────────────────────────────────────────────────────────────────────────
// EDIT THIS SECTION — fill in the new patient's data
// ─────────────────────────────────────────────────────────────────────────────

const PATIENT_INPUT = {

  // ── Shared identity ─────────────────────────────────────────────────────────
  id:           'w032',         // 'w###' for warfarin, 'n###' for noacs
  therapyType:  'warfarin',     // 'warfarin' | 'noacs'
  name:         'นาย ตัวอย่าง ทดสอบ',
  hn:           '699999999',
  hospital:     'ศูนย์บริการสาธารณสุข 1',
  weight:       68,
  referred:     false,

  // ── Demographics (patient-detail.json) ──────────────────────────────────────
  age:          60,
  dob:          '1966-01-01',   // ISO date YYYY-MM-DD (CE)
  sex:          'ชาย',          // 'ชาย' | 'หญิง'
  bloodGroup:   'A+',
  phone:        '081-000-0000',
  insuranceType:'บัตรทอง (UC)', // see existing patients for options

  allergies: [
    // { substance: 'Aspirin', reaction: 'Rash', severity: 'mild' }
    // severity: 'mild' | 'moderate' | 'severe'
  ],

  complications: [
    // {
    //   id: 'c-w032-001',
    //   date: '15 ม.ค. 2569',
    //   month: 1,
    //   dateISO: '2026-01-15',
    //   type: 'bleeding',       // 'bleeding' | 'thromboembolism'
    //   detail: 'เลือดออกจากเหงือก',
    //   severity: 'mild',       // 'mild' | 'moderate' | 'severe'
    //   treatment: 'หยุดยา 1 วัน',
    //   status: 'หายแล้ว'
    // }
  ],

  // ── WARFARIN-specific (fill if therapyType === 'warfarin') ──────────────────
  warfarin: {
    latestInr: {
      inrValue:   2.5,          // drives status: <2.0=under, 2.0-3.0=in, >3.0=over
      measuredAt: '2026-05-20T09:00:00',
      inrStatus:  'therapeutic' // 'low'|'therapeutic'|'supra'|'very-high'|'critical'|'emergency'
    },
    ttr: {
      value:  68.0,
      status: 'goal-met'        // 'goal-met' | 'below-goal' | 'insufficient-data'
    },
    profile: {
      indication:         'NVAF',  // e.g. 'NVAF', 'DVT', 'PE'
      targetRange:        { min: 2.0, max: 3.0 },
      currentDoseMgWk:    28,
      pillStrengthMg:     5,
      concurrentMeds:     []
      // { name:'Aspirin', dose:'100mg OD', severity:'minor', effect:'increase', note:'...' }
    },
    inrHistory: [
      // Add 2-5 records for realistic TTR calculation
      // { inrValue: 2.1, measuredAt: '2026-01-15T09:00:00', inrStatus: 'therapeutic' }
    ],
    doseAdjustments: []
    // { date:'2026-01-15', previousDose:25, newDose:28, systemSuggested:true, overrideReason:null }
  },

  // ── NOAC-specific (fill if therapyType === 'noacs') ─────────────────────────
  noacs: {
    profile: {
      indication:       'NVAF',     // 'NVAF'|'DVT'|'PE'|'CAT'
      hasBleedScore:    2,
      currentDrug:      'apixaban', // 'apixaban'|'rivaroxaban'|'dabigatran'|'edoxaban'
      currentDose:      '5 mg BID',
      therapyStartDate: '2569-01-01',
      followUpMonths:   6,
      status:           'appropriate' // 'appropriate'|'underdose'|'overdose'|'contra'|'interaction'
    },
    dispensingHistory: [
      // At least 1 dispensing — drives crcl/weight in the app
      // {
      //   id: 'd-n001-001',
      //   patientId: 'n001',
      //   dispensedAt: '2026-05-01T09:00:00',
      //   labData: { weightKg: 68, scrMgDl: 1.0, crClMlMin: 72, measuredAt: '2026-04-30' },
      //   drugDispensed: 'apixaban',
      //   dose: '5 mg BID',
      //   systemRank: 1,
      //   wasTopRecommendation: true,
      //   clinicallyAppropriate: true,
      //   nextFollowUpDate: '2026-11-01'
      // }
    ]
  },

  // ── WF roster extras ────────────────────────────────────────────────────────
  crcl: { value: 78, alert: false }, // for WF patients (not derived, stored in ats-patients)
  inr:  { value: 2.5, alert: false } // for WF patients — should match warfarin.latestInr
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATOR — do not edit below
// ─────────────────────────────────────────────────────────────────────────────

function deriveWfStatus(inrValue) {
  if (inrValue < 2.0) return 'under-range'
  if (inrValue > 3.0) return 'over-range'
  return 'in-range'
}

function run() {
  const p = PATIENT_INPUT

  // ── Validate ────────────────────────────────────────────────────────────────
  if (!p.id || !p.therapyType || !p.name || !p.hn) {
    console.error('❌ Missing required fields: id, therapyType, name, hn')
    process.exit(1)
  }

  // Check ID uniqueness
  const atsPts = JSON.parse(fs.readFileSync(path.join(ROOT, 'ats-patients.json'), 'utf8'))
  const allIds = [...atsPts.warfarin.map(x => x.id), ...atsPts.noacs.map(x => x.id)]
  if (allIds.includes(p.id)) {
    console.error(`❌ ID "${p.id}" already exists in ats-patients.json`)
    process.exit(1)
  }

  const ptDetail = JSON.parse(fs.readFileSync(path.join(ROOT, 'patient-detail.json'), 'utf8'))
  if (ptDetail[p.id]) {
    console.error(`❌ ID "${p.id}" already exists in patient-detail.json`)
    process.exit(1)
  }

  // ── 1. ats-patients.json ────────────────────────────────────────────────────
  if (p.therapyType === 'warfarin') {
    const wfEntry = {
      id:       p.id,
      name:     p.name,
      hn:       p.hn,
      hospital: p.hospital,
      weight:   p.weight,
      referred: p.referred,
      crcl:     p.crcl,
      inr:      p.inr,
      // status intentionally omitted — derived from warfarin-patients.latestInr
    }
    atsPts.warfarin.push(wfEntry)
  } else {
    const noEntry = {
      id:       p.id,
      name:     p.name,
      hn:       p.hn,
      hospital: p.hospital,
      weight:   p.weight, // fallback only — will be overridden by dispensing labData
      referred: p.referred,
      egfr:     { value: 65, alert: false }, // fill appropriately
      // status, crcl intentionally omitted — derived from noac-patients
    }
    atsPts.noacs.push(noEntry)
  }
  fs.writeFileSync(path.join(ROOT, 'ats-patients.json'), JSON.stringify(atsPts, null, 2) + '\n')
  console.log('✅ ats-patients.json updated')

  // ── 2. warfarin-patients.json or noac-patients.json ─────────────────────────
  if (p.therapyType === 'warfarin') {
    const wfData = JSON.parse(fs.readFileSync(path.join(ROOT, 'warfarin-patients.json'), 'utf8'))
    wfData[p.id] = {
      patientId:   p.id,
      latestInr:   p.warfarin.latestInr,
      ttr:         p.warfarin.ttr,
      profile:     { ...p.warfarin.profile, patientId: p.id },
      inrHistory:  p.warfarin.inrHistory,
      doseAdjustments: p.warfarin.doseAdjustments,
    }
    fs.writeFileSync(path.join(ROOT, 'warfarin-patients.json'), JSON.stringify(wfData, null, 2) + '\n')
    console.log('✅ warfarin-patients.json updated')
    console.log(`   → Status will be computed as: "${deriveWfStatus(p.warfarin.latestInr.inrValue)}"`)
  } else {
    const noacData = JSON.parse(fs.readFileSync(path.join(ROOT, 'noac-patients.json'), 'utf8'))
    noacData[p.id] = {
      profile:          { ...p.noacs.profile, patientId: p.id },
      dispensingHistory: p.noacs.dispensingHistory,
    }
    fs.writeFileSync(path.join(ROOT, 'noac-patients.json'), JSON.stringify(noacData, null, 2) + '\n')
    console.log('✅ noac-patients.json updated')
    console.log(`   → NOAC status set to: "${p.noacs.profile.status}"`)
    if (p.noacs.dispensingHistory.length > 0) {
      const lab = p.noacs.dispensingHistory[p.noacs.dispensingHistory.length - 1].labData
      console.log(`   → crcl will be derived as: ${lab.crClMlMin} mL/min (alert: ${lab.crClMlMin < 30})`)
    }
  }

  // ── 3. patient-detail.json ──────────────────────────────────────────────────
  const totalComplications = p.complications.length
  const summaryMap = {}
  for (const c of p.complications) {
    if (!summaryMap[c.type]) summaryMap[c.type] = { type: c.type, count: 0, lastDate: c.date }
    summaryMap[c.type].count++
    summaryMap[c.type].lastDate = c.date // assumes chronological order
  }

  ptDetail[p.id] = {
    id:                  p.id,
    name:                p.name,
    hn:                  p.hn,
    age:                 p.age,
    dob:                 p.dob,
    sex:                 p.sex,
    bloodGroup:          p.bloodGroup,
    phone:               p.phone,
    insuranceType:       p.insuranceType,
    allergies:           p.allergies,
    totalComplications,
    complicationSummary: Object.values(summaryMap),
    complications:       p.complications,
    currentTherapy:      p.therapyType,
    ...(p.warfarin?.profile?.concurrentMeds?.length
      ? { concurrentMedications: p.warfarin.profile.concurrentMeds }
      : {}),
  }
  fs.writeFileSync(path.join(ROOT, 'patient-detail.json'), JSON.stringify(ptDetail, null, 2) + '\n')
  console.log('✅ patient-detail.json updated')

  console.log(`\n🎉 Patient "${p.name}" (${p.id}) added successfully`)
  console.log('   Run vue-tsc to verify types are still valid')
}

run()
