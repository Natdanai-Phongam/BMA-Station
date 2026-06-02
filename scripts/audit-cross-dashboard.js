/**
 * audit-cross-dashboard.js
 * Cross-checks data consistency across all 4 dashboard tabs:
 *   1. Dashboard  — monitoring card counts (warfarin + noac totals, in-range %)
 *   2. Warfarin   — patient list statuses, INR, TTR
 *   3. NOACs      — patient list statuses, CrCl, appropriateness
 *   4. KPIs       — safety events, quality metrics, ATS response
 *
 * Run: node scripts/audit-cross-dashboard.js
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const root  = resolve(__dir, '..')

function load(rel) {
  return JSON.parse(readFileSync(resolve(root, rel), 'utf8'))
}

const atsPts  = load('src/data/mock/ats-patients.json')
const wfData  = load('src/data/mock/warfarin-patients.json')
const nData   = load('src/data/mock/noac-patients.json')
const detail  = load('src/data/mock/patient-detail.json')
const kpiOps  = load('src/data/mock/kpi-operational.json')
const config  = load('src/data/mock/ats-dashboard.json')

let issues = 0
function ok(msg)   { console.log(`  ✅ ${msg}`) }
function warn(msg) { console.log(`  ⚠️  ${msg}`); issues++ }
function fail(msg) { console.log(`  ❌ ${msg}`); issues++ }
function section(title) { console.log(`\n${'═'.repeat(52)}\n  ${title}\n${'═'.repeat(52)}`) }

// ── 1. Patient list integrity ──────────────────────────────────
section('1. PATIENT LIST INTEGRITY')

const wfIds    = new Set(atsPts.warfarin.map(p => p.id))
const nIds     = new Set(atsPts.noacs.map(p => p.id))
const detailIds = new Set(Object.keys(detail))
const wfDataIds = new Set(Object.keys(wfData))
const nDataIds  = new Set(Object.keys(nData))

// Every ats-patient warfarin should have a warfarin-patients record
const wfMissingData = [...wfIds].filter(id => !wfDataIds.has(id))
if (wfMissingData.length)
  fail(`Warfarin patients in ats-patients with no warfarin-patients record: ${wfMissingData.join(', ')}`)
else
  ok(`All ${wfIds.size} warfarin patients have a warfarin-patients record`)

// Every ats-patient noac should have a noac-patients record
const nMissingData = [...nIds].filter(id => !nDataIds.has(id))
if (nMissingData.length)
  fail(`NOAC patients in ats-patients with no noac-patients record: ${nMissingData.join(', ')}`)
else
  ok(`All ${nIds.size} NOAC patients have a noac-patients record`)

// Every patient in patient-detail should exist in ats-patients
const detailOrphans = [...detailIds].filter(id => !wfIds.has(id) && !nIds.has(id))
if (detailOrphans.length)
  warn(`patient-detail has entries not in ats-patients: ${detailOrphans.join(', ')}`)
else
  ok(`All ${detailIds.size} patient-detail entries match ats-patients`)

// ── 2. Dashboard tab — monitoring card counts ──────────────────
section('2. DASHBOARD TAB — MONITORING CARDS')

// Warfarin
const wfList = atsPts.warfarin.map(p => {
  const pd  = wfData[p.id]
  const inr = pd?.latestInr?.inrValue
  const status = inr == null ? (p.status ?? 'under-range')
    : inr < 2.0 ? 'under-range' : inr > 3.0 ? 'over-range' : 'in-range'
  return { ...p, status }
})

const wfTotal  = wfList.length
const wfIn     = wfList.filter(p => p.status === config.warfarin.inRangeStatusKey).length
const wfOut    = wfTotal - wfIn
const wfInPct  = Math.round(wfIn / wfTotal * 100)

console.log(`  Warfarin: ${wfTotal} total | ${wfIn} in-range (${wfInPct}%) | ${wfOut} out`)

// NOACs
const nList = atsPts.noacs.map(p => {
  const pd     = nData[p.id]
  const status = pd?.profile?.status ?? 'appropriate'
  const disps  = pd?.dispensingHistory ?? []
  const latest = disps.at(-1)
  const crcl   = latest?.labData ? { value: Math.round(latest.labData.crClMlMin), alert: latest.labData.crClMlMin < 30 }
                                  : (p.crcl ?? { value: 0, alert: false })
  return { ...p, status, crcl }
})

const nTotal   = nList.length
const nIn      = nList.filter(p => p.status === config.noacs.inRangeStatusKey).length
const nAlerts  = nList.filter(p => p.crcl.alert).length
const nInPct   = Math.round(nIn / nTotal * 100)

console.log(`  NOACs:    ${nTotal} total | ${nIn} appropriate (${nInPct}%) | ${nAlerts} CrCl alerts`)

// ── 3. Warfarin tab ────────────────────────────────────────────
section('3. WARFARIN TAB — PATIENT TABLE')

// Check: status derived from latestInr should match INR history last entry
let inrMismatch = 0
for (const p of atsPts.warfarin) {
  const pd      = wfData[p.id]
  if (!pd) continue
  const latest  = pd.latestInr?.inrValue
  const lastHist = [...(pd.inrHistory ?? [])].sort((a,b) => a.measuredAt.localeCompare(b.measuredAt)).at(-1)
  if (latest == null || lastHist == null) continue
  if (Math.abs(latest - lastHist.inrValue) > 0.01) {
    warn(`${p.id}: latestInr (${latest}) ≠ last inrHistory (${lastHist.inrValue}) on ${lastHist.measuredAt.slice(0,10)}`)
    inrMismatch++
  }
}
if (!inrMismatch) ok('latestInr matches last inrHistory entry for all patients')

// Check: TTR status is consistent (goal-met = ttr.value ≥ 65)
let ttrMismatch = 0
for (const [pid, pd] of Object.entries(wfData)) {
  if (!pd.ttr) continue
  const expected = pd.ttr.value >= 65 ? 'goal-met' : (pd.ttr.value >= 50 ? 'borderline' : 'below-goal')
  if (pd.ttr.status !== expected) {
    warn(`${pid}: ttr.value=${pd.ttr.value}% but status='${pd.ttr.status}' (expected '${expected}')`)
    ttrMismatch++
  }
}
if (!ttrMismatch) ok('TTR status labels match ttr.value for all warfarin patients')

// Check: doseAdjustments reference valid INR dates
let doseOrphans = 0
for (const [pid, pd] of Object.entries(wfData)) {
  const inrDates = new Set((pd.inrHistory ?? []).map(r => r.measuredAt.slice(0, 10)))
  for (const adj of pd.doseAdjustments ?? []) {
    const adjDate = adj.date?.slice(0, 10) ?? adj.visitDate?.slice(0, 10)
    if (adjDate && !inrDates.has(adjDate)) {
      warn(`${pid}: doseAdjustment on ${adjDate} has no matching INR measurement`)
      doseOrphans++
    }
  }
}
if (!doseOrphans) ok('All doseAdjustment dates have a matching INR measurement')

// ── 4. NOACs tab ───────────────────────────────────────────────
section('4. NOACs TAB — PATIENT TABLE')

// Check: status in noac-patients matches ats-patients
let nStatusMismatch = 0
for (const p of atsPts.noacs) {
  const nd = nData[p.id]
  if (!nd) continue
  const nStatus = nd.profile?.status
  if (p.status && nStatus && p.status !== nStatus) {
    warn(`${p.id}: ats-patients.status='${p.status}' ≠ noac-patients.profile.status='${nStatus}'`)
    nStatusMismatch++
  }
}
if (!nStatusMismatch) ok('NOAC status consistent between ats-patients and noac-patients')

// Check: CrCl values in latest dispensing vs ats-patients baseline
let crclMismatch = 0
for (const p of atsPts.noacs) {
  const nd    = nData[p.id]
  const disps = nd?.dispensingHistory ?? []
  const latest = [...disps].sort((a, b) => a.dispensedAt.localeCompare(b.dispensedAt)).at(-1)
  if (!latest?.labData) continue
  const computed = Math.round(latest.labData.crClMlMin)
  const baseline = p.crcl?.value
  if (baseline != null && Math.abs(computed - baseline) > 5) {
    warn(`${p.id}: ats-patients CrCl=${baseline} differs >5 from latest lab CrCl=${computed}`)
    crclMismatch++
  }
}
if (!crclMismatch) ok('CrCl values consistent between ats-patients and latest dispensing lab')

// ── 5. KPI tab — safety ────────────────────────────────────────
section('5. KPI TAB — SAFETY METRICS')

// Count complications across all patients in the full data range
const safetyCount = { bleeding: 0, thromboembolism: 0, death: 0, severe: 0 }
for (const pd of Object.values(detail)) {
  for (const c of pd.complications ?? []) {
    if (c.type === 'bleeding')         safetyCount.bleeding++
    if (c.type === 'thromboembolism')  safetyCount.thromboembolism++
    if (c.type === 'death')            safetyCount.death++
    if (c.severity === 'severe')       safetyCount.severe++
  }
}
console.log(`  bleeding: ${safetyCount.bleeding} | thrombosis: ${safetyCount.thromboembolism} | death: ${safetyCount.death} | severe (hospitalization): ${safetyCount.severe}`)

// Check: every complication belongs to a known patient
let compOrphans = 0
for (const [pid] of Object.entries(detail)) {
  if (!wfIds.has(pid) && !nIds.has(pid)) {
    warn(`patient-detail key '${pid}' is not in warfarin or NOAC patient lists`)
    compOrphans++
  }
}
if (!compOrphans) ok('All complication patient IDs exist in patient lists')

// ── 6. KPI tab — quality ───────────────────────────────────────
section('6. KPI TAB — QUALITY METRICS')

// Recompute wfAppropriateness for full year range and compare
// (all warfarin patients, last known INR regardless of date)
let wfAppr = 0, wfTotal2 = 0
for (const [, pd] of Object.entries(wfData)) {
  const inr = pd.latestInr?.inrValue
  if (inr == null) continue
  wfTotal2++
  if (inr >= 2.0 && inr <= 3.0) wfAppr++
}
const wfApprPct = parseFloat((wfAppr / wfTotal2 * 100).toFixed(1))
console.log(`  WF appropriateness (full cohort, latest INR): ${wfAppr}/${wfTotal2} = ${wfApprPct}%`)

let nAppr = 0, nTotal2 = 0
for (const pd of Object.values(nData)) {
  nTotal2++
  if (pd.profile?.status === 'appropriate') nAppr++
}
const nApprPct = parseFloat((nAppr / nTotal2 * 100).toFixed(1))
console.log(`  NOAC appropriateness (full cohort): ${nAppr}/${nTotal2} = ${nApprPct}%`)

// TTR goal-met
let ttrGoal = 0, ttrTotal = 0
for (const pd of Object.values(wfData)) {
  if (!pd.ttr) continue
  ttrTotal++
  if (pd.ttr.status === 'goal-met') ttrGoal++
}
const ttrPct = parseFloat((ttrGoal / ttrTotal * 100).toFixed(1))
console.log(`  WF TTR ≥65% (full cohort): ${ttrGoal}/${ttrTotal} = ${ttrPct}%`)

// medError count
const wfMedErr  = wfTotal2 - wfAppr
const nMedErr   = nTotal2 - nAppr
console.log(`  Med errors (out-of-range): WF ${wfMedErr} + NOAC ${nMedErr} = ${wfMedErr + nMedErr}`)

// ── 7. KPI operational mock vs computed ───────────────────────
section('7. KPI OPERATIONAL MOCK CROSS-CHECK')

const ops = kpiOps.month
const compWfApprPrev = ops.qualityPrev.wfAppropriateness
const compNApprPrev  = ops.qualityPrev.noacAppropriateness
const compTtrPrev    = ops.qualityPrev.wfTtrGoal

console.log(`  kpi-operational.month prev values (previous period baseline):`)
console.log(`    wfAppropriateness prev: ${compWfApprPrev}% (current computed: ${wfApprPct}%)`)
console.log(`    noacAppropriateness prev: ${compNApprPrev}% (current computed: ${nApprPct}%)`)
console.log(`    wfTtrGoal prev: ${compTtrPrev}% (current computed: ${ttrPct}%)`)

if (compWfApprPrev >= wfApprPct)
  warn(`WF appropriateness prev (${compWfApprPrev}%) ≥ current (${wfApprPct}%) — trend would show improvement, check if intentional`)
else
  ok(`WF appropriateness trend direction makes sense (prev ${compWfApprPrev}% → current ${wfApprPct}%)`)

if (compTtrPrev >= ttrPct)
  warn(`TTR prev (${compTtrPrev}%) ≥ current (${ttrPct}%) — trend shows regression, check if intentional`)
else
  ok(`TTR trend direction makes sense (prev ${compTtrPrev}% → current ${ttrPct}%)`)

// ── Summary ────────────────────────────────────────────────────
section('SUMMARY')
if (issues === 0) {
  console.log('  ✅ No issues found — all data is consistent across dashboards')
} else {
  console.log(`  Found ${issues} issue(s) — review warnings/errors above`)
}
console.log()
