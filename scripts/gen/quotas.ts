// ─── KPI quota assignment ────────────────────────────────────────────────────
// Stamps each patient with deterministic appropriateness flags so the headline
// quality KPIs land on EXACT targets (no Bernoulli variance):
//   • Warfarin "latest INR in range"  → 53%   (wfLastApp)
//   • Warfarin TTR ≥ goal             → 33%   (wfGood, padded — see below)
//   • NOAC appropriate dose           → 62%   (noacAppropriate)
// The two warfarin flags are INDEPENDENT quotas so the latest-INR KPI (53%) and
// the time-in-range TTR KPI (33%) diverge realistically. Runs after identities,
// before record generation. See PLAN-DATA-SCALING.md §-quality.
// ─────────────────────────────────────────────────────────────────────────────

import { shuffle } from './rng'
import type { GenPatient } from './identity'

// Targets the displayed KPI percentages are tuned to.
const WF_LAST_IN_RANGE = 0.53   // latest INR within 2.0–3.0
const WF_TTR_GOAL       = 0.36  // padded above 0.33: a few "good" patients dip
                                //   below 70% TTR when their independent last INR
                                //   lands out of range → nets ~32% goal-met
const NOAC_APPROPRIATE  = 0.62  // a few quota'd patients are engine-withheld
                                //   (contra) → nets ~61% appropriate

// NOAC edge cases the engine withholds (→ always counts as not-appropriate).
const NOAC_WITHHOLD_EDGES = new Set(['crcl-lt-15', 'mechanical-valve'])

export function assignKpiQuotas(patients: GenPatient[]): void {
  // ── Warfarin — two independent deterministic quotas ──────────────────────
  const wf = patients.filter(p => p.therapy === 'warfarin')
  const wfIds = wf.map(p => p.id)
  const goodSet = new Set(shuffle('q:wf-good', wfIds).slice(0, Math.round(wf.length * WF_TTR_GOAL)))
  const lastSet = new Set(shuffle('q:wf-last', wfIds).slice(0, Math.round(wf.length * WF_LAST_IN_RANGE)))
  for (const p of wf) {
    p.wfGood = goodSet.has(p.id)
    p.wfLastApp = lastSet.has(p.id)
  }

  // ── NOAC — 62% appropriate overall (per-patient → period-stable) ─────────
  const noac = patients.filter(p => p.therapy === 'noacs')
  const targetApp = Math.round(noac.length * NOAC_APPROPRIATE)

  // Non-NVAF (phased indications) are always dispensed concordantly.
  const nonNvaf = noac.filter(p => p.indication !== 'NVAF')
  for (const p of nonNvaf) p.noacAppropriate = true

  // Curated NVAF edges: withhold edges → not appropriate; the rest → appropriate.
  const edges = noac.filter(p => p.indication === 'NVAF' && p.edgeTag)
  for (const p of edges) p.noacAppropriate = !NOAC_WITHHOLD_EDGES.has(p.edgeTag!)

  // Regular NVAF patients fill the remaining appropriate budget by exact quota.
  const guaranteed = nonNvaf.length + edges.filter(p => p.noacAppropriate).length
  const regular = noac.filter(p => p.indication === 'NVAF' && !p.edgeTag)
  const need = Math.max(0, targetApp - guaranteed)
  const appSet = new Set(shuffle('q:noac-app', regular.map(p => p.id)).slice(0, need))
  for (const p of regular) p.noacAppropriate = appSet.has(p.id)
}
