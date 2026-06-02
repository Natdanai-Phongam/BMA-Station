/**
 * audit-mock-data.js
 * Inspect mock data structure, date ranges, patient statuses, and complication types.
 * Run: node scripts/audit-mock-data.js
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const root  = resolve(__dir, '..')

function load(rel) {
  return JSON.parse(readFileSync(resolve(root, rel), 'utf8'))
}

const wf     = load('src/data/mock/warfarin-patients.json')
const noac   = load('src/data/mock/noac-patients.json')
const detail = load('src/data/mock/patient-detail.json')

console.log('══════════════════════════════════════════')
console.log('  WARFARIN PATIENTS')
console.log('══════════════════════════════════════════')

const wfDates = []
for (const [pid, pd] of Object.entries(wf)) {
  for (const r of pd.inrHistory ?? []) wfDates.push(r.measuredAt.slice(0, 10))
}
wfDates.sort()
console.log(`Count       : ${Object.keys(wf).length}`)
console.log(`INR dates   : ${wfDates[0]} → ${wfDates.at(-1)}`)

const wfStatuses = {}
for (const pd of Object.values(wf)) {
  const inr = pd.latestInr?.inrValue
  const s = inr == null ? 'no-inr' : inr < 2.0 ? 'under-range' : inr > 3.0 ? 'over-range' : 'in-range'
  wfStatuses[s] = (wfStatuses[s] ?? 0) + 1
}
console.log('Statuses    :', wfStatuses)

console.log('\n══════════════════════════════════════════')
console.log('  NOAC PATIENTS')
console.log('══════════════════════════════════════════')

const nDates = []
for (const pd of Object.values(noac)) {
  for (const r of pd.dispensingHistory ?? []) nDates.push(r.dispensedAt.slice(0, 10))
}
nDates.sort()
console.log(`Count       : ${Object.keys(noac).length}`)
console.log(`Disp dates  : ${nDates[0]} → ${nDates.at(-1)}`)

const nStatuses = {}
for (const pd of Object.values(noac)) {
  const s = pd.profile?.status ?? 'unknown'
  nStatuses[s] = (nStatuses[s] ?? 0) + 1
}
console.log('Statuses    :', nStatuses)

console.log('\n══════════════════════════════════════════')
console.log('  COMPLICATIONS (patient-detail)')
console.log('══════════════════════════════════════════')

const types = {}, sevs = {}
const severeByPid = {}
const allCompDates = []

for (const [pid, pd] of Object.entries(detail)) {
  for (const c of pd.complications ?? []) {
    types[c.type]     = (types[c.type]     ?? 0) + 1
    sevs[c.severity]  = (sevs[c.severity]  ?? 0) + 1
    if (c.dateISO) allCompDates.push(c.dateISO)
    if (c.severity === 'severe') {
      if (!severeByPid[pid]) severeByPid[pid] = []
      severeByPid[pid].push(`${c.type} @ ${c.dateISO ?? `month${c.month}`}`)
    }
  }
}
allCompDates.sort()
console.log(`Patient IDs : ${Object.keys(detail).join(', ')}`)
console.log(`Comp dates  : ${allCompDates[0]} → ${allCompDates.at(-1)}`)
console.log('Types       :', types)
console.log('Severities  :', sevs)
console.log('Severe events by patient:')
for (const [pid, evts] of Object.entries(severeByPid)) {
  console.log(`  ${pid}: ${evts.join(', ')}`)
}
