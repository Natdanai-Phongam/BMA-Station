/**
 * assign-physicians.js
 * Assigns attendingPhysicianId to every patient in patient-detail.json,
 * distributing 8 doctors roughly evenly across the patient list.
 * Run: node scripts/assign-physicians.js
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const MOCK  = resolve(__dir, '..', 'src', 'data', 'mock')

const detail    = JSON.parse(readFileSync(resolve(MOCK, 'patient-detail.json'), 'utf8'))
const physicians = JSON.parse(readFileSync(resolve(MOCK, 'physicians.json'), 'utf8'))

const ids     = Object.keys(detail)
const drIds   = Object.keys(physicians)

// Deterministic round-robin assignment based on patient index
ids.forEach((pid, i) => {
  detail[pid].attendingPhysicianId = drIds[i % drIds.length]
})

writeFileSync(resolve(MOCK, 'patient-detail.json'), JSON.stringify(detail, null, 2) + '\n')

// Summary
const dist = {}
Object.values(detail).forEach(p => {
  dist[p.attendingPhysicianId] = (dist[p.attendingPhysicianId] ?? 0) + 1
})
console.log(`\nAssigned ${ids.length} patients to ${drIds.length} physicians:`)
Object.entries(dist).forEach(([id, n]) => {
  console.log(`  ${id} (${physicians[id].name}): ${n} patients`)
})
