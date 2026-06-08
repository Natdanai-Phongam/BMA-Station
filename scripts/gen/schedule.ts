// ─── G2: Visit scheduling ────────────────────────────────────────────────────
// Produces visit dates within the window for a patient. Visits start at a random
// phase after max(therapyStart, windowStart) and recur on a therapy-appropriate
// interval up to windowEnd. WF (INR checks) recur every 1–4 weeks; NOAC
// (dispensing) ~monthly. The window is ~60 days → WF ~2–5 visits, NOAC ~1–2.
// ─────────────────────────────────────────────────────────────────────────────

import { DATA_WINDOW } from '../../src/data/config/data-window'
import { randInt } from './rng'
import { addDays, parseISO } from './pools'
import type { GenPatient } from './identity'

const WINDOW_START = parseISO(DATA_WINDOW.start)
const WINDOW_END = parseISO(DATA_WINDOW.end)

function laterOf(a: Date, b: Date): Date {
  return +a >= +b ? a : b
}

/** Visit dates in [start, windowEnd] for a patient on the given interval band.
 *  Backfills earlier visits if fewer than `minCount` land in-window. */
function visitDates(id: string, key: string, intervalMin: number, intervalMax: number, minCount = 1): Date[] {
  const base = laterOf(WINDOW_START, p_start(id))
  // keep first visit early enough to leave room for ≥ minCount
  const phaseCap = Math.min(intervalMax, Math.max(0, daysLeft(base) - intervalMin * (minCount - 1)))
  let d = addDays(base, randInt(`${id}:${key}:phase`, 0, phaseCap))
  const dates: Date[] = []
  let i = 0
  while (+d <= +WINDOW_END) {
    dates.push(d)
    d = addDays(d, randInt(`${id}:${key}:gap${i}`, intervalMin, intervalMax))
    i++
  }
  if (dates.length === 0) dates.push(base)
  // backfill earlier visits (toward windowStart) to reach minCount
  let g = 0
  while (dates.length < minCount) {
    const prev = addDays(dates[0], -randInt(`${id}:${key}:back${g}`, intervalMin, intervalMax))
    if (+prev < +WINDOW_START) break
    dates.unshift(prev)
    g++
  }
  return dates
}

function daysLeft(from: Date): number {
  return Math.max(0, Math.round((+WINDOW_END - +from) / 86400000))
}

// therapyStart cache via closure-free helper
const startCache = new Map<string, Date>()
let _patients: GenPatient[] = []
export function indexPatients(patients: GenPatient[]) {
  _patients = patients
  for (const p of patients) startCache.set(p.id, p.therapyStart)
}
function p_start(id: string): Date {
  return startCache.get(id) ?? WINDOW_START
}

/** WF INR-check dates — interval by control quality (stable wider, unstable tighter). */
export function warfarinVisits(p: GenPatient, stable: boolean): Date[] {
  return stable
    ? visitDates(p.id, 'wf', 18, 30, 2)   // ~3–4 weekly, ≥2 in-window
    : visitDates(p.id, 'wf', 9, 17, 2)    // ~1–2 weekly, ≥2 in-window
}

/** NOAC dispensing dates — ~monthly (CrCl-driven cadence handled in G4). */
export function noacVisits(p: GenPatient): Date[] {
  return visitDates(p.id, 'noac', 27, 35)
}

export { WINDOW_START, WINDOW_END }
