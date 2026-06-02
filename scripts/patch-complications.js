/**
 * patch-complications.js
 * Add mock death event and update complication types in patient-detail.json.
 * Run: node scripts/patch-complications.js
 *
 * Changes:
 *   1. Adds type='death' complication to the first patient in the dataset (earliest date range).
 *   2. Writes the updated file back.
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const root  = resolve(__dir, '..')
const path  = resolve(root, 'src/data/mock/patient-detail.json')

const detail = JSON.parse(readFileSync(path, 'utf8'))

// Pick the first patient ID (alphabetical) as the death case
const targetPid = Object.keys(detail).sort()[0]
const patient   = detail[targetPid]

// Check if death event already exists
const alreadyHasDeath = (patient.complications ?? []).some(c => c.type === 'death')
if (alreadyHasDeath) {
  console.log(`Patient ${targetPid} already has a death event — no change made.`)
  process.exit(0)
}

// Insert death event in Jan 2026 (earliest month in the dataset's main window)
const deathEvent = {
  id:        `comp-${targetPid}-death-01`,
  type:      'death',
  severity:  'severe',
  date:      '15 ม.ค. 2569',
  dateISO:   '2026-01-15',
  month:     1,
  detail:    'เสียชีวิตระหว่างการรักษา — เลือดออกรุนแรงในสมอง',
  treatment: 'ส่ง ER — ไม่สามารถช่วยชีวิตได้',
  status:    'เสียชีวิต'
}

patient.complications = [...(patient.complications ?? []), deathEvent]

writeFileSync(path, JSON.stringify(detail, null, 2), 'utf8')
console.log(`✓ Added death event to patient ${targetPid} on ${deathEvent.dateISO}`)
console.log(`  File updated: src/data/mock/patient-detail.json`)
