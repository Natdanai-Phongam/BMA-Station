/**
 * audit-therapy-switching.js
 * Checks whether therapy-switching patients have:
 *   1. Records in both warfarin-patients.json AND noac-patients.json
 *   2. Non-overlapping date ranges (WF ends before NOAC starts, or vice versa)
 *   3. Correct currentTherapy in patient-detail.json
 *   4. Correct list membership in ats-patients.json (only in current therapy list)
 *   5. KPI period attribution: if you query Jan, WF records exist; if Feb+, NOAC records exist
 *
 * Run: node scripts/audit-therapy-switching.js
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const MOCK  = resolve(__dir, '..', 'src', 'data', 'mock')
const load  = f => JSON.parse(readFileSync(resolve(MOCK, f), 'utf8'))

const ats    = load('ats-patients.json')
const wfData = load('warfarin-patients.json')
const nData  = load('noac-patients.json')
const detail = load('patient-detail.json')

let issues = 0
const ok   = m => console.log(`  ✅ ${m}`)
const warn = m => { console.log(`  ⚠️  ${m}`); issues++ }
const fail = m => { console.log(`  ❌ ${m}`); issues++ }
const sep  = t => console.log(`\n${'═'.repeat(54)}\n  ${t}\n${'═'.repeat(54)}`)

// ── Find switching patients ────────────────────────────────────
// A switching patient has records in BOTH warfarin-patients AND noac-patients
const wfIds  = new Set(Object.keys(wfData))
const nIds   = new Set(Object.keys(nData))
const atsWfIds = new Set(ats.warfarin.map(p => p.id))
const atsNIds  = new Set(ats.noacs.map(p => p.id))

const switchers = [...wfIds].filter(id => nIds.has(id))

sep('1. SWITCHING PATIENTS DETECTED')
if (switchers.length === 0) {
  warn('No patients found with records in BOTH warfarin-patients AND noac-patients')
  warn('→ therapy switching data does not exist in the system yet')
} else {
  console.log(`  Found ${switchers.length} switching patient(s): ${switchers.join(', ')}`)
}

// ── Per-patient checks ─────────────────────────────────────────
for (const pid of switchers) {
  sep(`2. PATIENT ${pid} — SWITCHING AUDIT`)

  const wf  = wfData[pid]
  const n   = nData[pid]
  const det = detail[pid]

  // 2a. currentTherapy in patient-detail
  const curTherapy = det?.currentTherapy
  console.log(`  currentTherapy: ${curTherapy ?? 'MISSING'}`)
  if (!curTherapy)
    fail(`patient-detail missing currentTherapy for ${pid}`)

  // 2b. ats-patients list membership
  const inWfList = atsWfIds.has(pid)
  const inNList  = atsNIds.has(pid)
  console.log(`  In ats-patients.warfarin: ${inWfList}`)
  console.log(`  In ats-patients.noacs:    ${inNList}`)

  if (inWfList && inNList)
    fail(`${pid} is in BOTH therapy lists — should be in current therapy list only`)
  else if (!inWfList && !inNList)
    fail(`${pid} is in NEITHER therapy list`)
  else if (curTherapy === 'warfarin' && !inWfList)
    fail(`${pid} currentTherapy='warfarin' but not in ats-patients.warfarin`)
  else if (curTherapy === 'noacs' && !inNList)
    fail(`${pid} currentTherapy='noacs' but not in ats-patients.noacs`)
  else
    ok(`${pid} is correctly in the ${curTherapy} list only`)

  // 2c. WF records — date range
  const inrDates = (wf.inrHistory ?? [])
    .map(r => r.measuredAt.slice(0, 10))
    .sort()
  console.log(`\n  WF inrHistory: ${inrDates.length} records`)
  if (inrDates.length === 0)
    warn(`${pid} has warfarin-patients record but NO inrHistory — no WF period data to count`)
  else
    console.log(`    Date range: ${inrDates[0]} → ${inrDates.at(-1)}`)

  // 2d. NOAC records — date range
  const dispDates = (n.dispensingHistory ?? [])
    .map(r => r.dispensedAt.slice(0, 10))
    .sort()
  console.log(`\n  NOAC dispensingHistory: ${dispDates.length} records`)
  if (dispDates.length === 0)
    warn(`${pid} has noac-patients record but NO dispensingHistory — no NOAC period data to count`)
  else
    console.log(`    Date range: ${dispDates[0]} → ${dispDates.at(-1)}`)

  // 2e. Active period overlap check — supports both WF→NOAC and NOAC→WF
  const wfAF = wf.activeFrom ?? null;  const wfAT = wf.activeTo ?? null
  const nAF  = n.activeFrom  ?? null;  const nAT  = n.activeTo  ?? null

  if (wfAF && nAF) {
    // Both records have active periods defined — check they don't overlap
    const wfEnd  = wfAT ?? '9999-12-31'
    const nEnd   = nAT  ?? '9999-12-31'
    const wfOverlapsN = wfAF <= nEnd && wfEnd >= nAF
    if (wfOverlapsN)
      warn(`Active periods overlap: WF [${wfAF}–${wfAT ?? '∞'}] and NOAC [${nAF}–${nAT ?? '∞'}] — KPI may double-count`)
    else {
      const earlier = wfAF < nAF
        ? `WF [${wfAF}–${wfAT}] → NOAC [${nAF}–${nAT ?? '∞'}]`
        : `NOAC [${nAF}–${nAT}] → WF [${wfAF}–${wfAT ?? '∞'}]`
      ok(`Active periods clean: ${earlier} (gap = transition)`)
    }
  } else if (inrDates.length > 0 && dispDates.length > 0) {
    const wfEnd  = inrDates.at(-1)
    const nStart = dispDates[0]
    if (wfEnd > nStart)
      warn(`Raw date overlap: WF last record (${wfEnd}) > NOAC first record (${nStart}) — add activeFrom/activeTo to resolve`)
    else
      ok(`No raw date overlap: WF ended ${wfEnd}, NOAC started ${nStart}`)
  }

  // 2f. KPI period simulation — does data exist for each period?
  console.log('\n  KPI period simulation:')
  const PERIODS = [
    ['2026-01-01', '2026-01-31', 'ม.ค. 2569'],
    ['2026-02-01', '2026-02-28', 'ก.พ. 2569'],
    ['2026-03-01', '2026-03-31', 'มี.ค. 2569'],
    ['2026-04-01', '2026-04-30', 'เม.ย. 2569'],
    ['2026-05-01', '2026-05-31', 'พ.ค. 2569'],
  ]

  for (const [from, to, label] of PERIODS) {
    const wfInPeriod = inrDates.filter(d => d >= from && d <= to)
    const nInPeriod  = dispDates.filter(d => d >= from && d <= to)
    const parts = []
    if (wfInPeriod.length) parts.push(`WF: ${wfInPeriod.length} INR record(s)`)
    if (nInPeriod.length)  parts.push(`NOAC: ${nInPeriod.length} dispensing record(s)`)
    if (!parts.length)     parts.push('— no records')
    const status = wfInPeriod.length && nInPeriod.length ? '⚠️  BOTH' : parts.length ? '✅' : '—'
    console.log(`    ${label.padEnd(12)} ${status} ${parts.join(' + ')}`)
  }

  // 2g. activeFrom/activeTo check (future schema)
  const hasWfActive  = 'activeFrom' in wf
  const hasNActive   = 'activeFrom' in n
  if (!hasWfActive || !hasNActive) {
    warn(`${pid} missing activeFrom/activeTo fields — period-based KPI counting not yet supported`)
    console.log(`    → WF record has activeFrom: ${hasWfActive}`)
    console.log(`    → NOAC record has activeFrom: ${hasNActive}`)
  } else {
    ok(`activeFrom/activeTo present on both records`)
  }
}

// ── 3. Non-switching patients: any with data in both files? ───
sep('3. CROSS-FILE DATA CHECK (should not exist)')
const unexpected = [...wfIds].filter(id => nIds.has(id) && !switchers.includes(id))
if (unexpected.length)
  fail(`Unexpected patients with data in both files: ${unexpected.join(', ')}`)
else
  ok('No unexpected cross-file patients')

// ── 4. Summary and recommendations ────────────────────────────
sep('SUMMARY & RECOMMENDATIONS')
if (switchers.length === 0) {
  console.log(`  Current state:`)
  console.log(`    • No therapy-switching records exist`)
  console.log(`    • KPI computation uses ats-patients static lists`)
  console.log(`    • Period-based therapy attribution is NOT possible yet`)
  console.log(`\n  To enable period-based KPI counting:`)
  console.log(`    1. Add activeFrom/activeTo to all warfarin-patients and noac-patients records`)
  console.log(`    2. For switching patients: add their historical records in the opposite therapy file`)
  console.log(`    3. Update KPI computation to filter by activeFrom/activeTo instead of static list`)
} else {
  console.log(`  Found ${switchers.length} switching patient(s)`)
  if (issues > 0) console.log(`  ${issues} issue(s) need fixing before period-based KPI is reliable`)
  else console.log(`  All switching patients are correctly configured`)
}
console.log()
