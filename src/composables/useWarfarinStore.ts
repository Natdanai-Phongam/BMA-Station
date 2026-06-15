// ─── Warfarin workspace store — single source of truth per patient ───────────
// One reactive copy of each patient's warfarin data, shared by every consumer
// (the embedded WarfarinDoseTool tab + the AtsPatientDetail consult tab). Before
// this, both loaded their own copy via repo.getWarfarinPatients() and mutated
// independently → a dose saved in one tab was invisible in the other (divergent).
// Now both read + write the same object, so a save propagates everywhere.
//
// `reactive` (not shallowRef) is deliberate: deep reactivity lets a nested
// mutation (profile.currentDoseMgWk, latestInr) trigger every dependent computed
// automatically — which is what makes the old `consultDataVersion` reactivity
// hack in AtsPatientDetail unnecessary.
//
// Session-scoped: in-memory, reset on full reload (matching prior behaviour —
// only the consult thread persists, see useConsultStore).
// ─────────────────────────────────────────────────────────────────────────────

import { reactive } from 'vue'
import { repo } from '@/data/repository'
import type { WarfarinPageData, InrRecord, DoseAdjustment } from '@/data/types/warfarin'

export interface WfDoseAdjPayload {
  newDoseMgWk: number
  newAdj:      DoseAdjustment
  newInr?:     InrRecord
  postToConsult: boolean
}

const cache = reactive<Record<string, WarfarinPageData>>({})
let loading: Promise<void> | null = null

function ensureLoaded(): Promise<void> {
  if (!loading) loading = repo.getWarfarinPatients().then(all => { Object.assign(cache, all) })
  return loading
}

export function useWarfarinStore() {
  return {
    ensureLoaded,
    /** Shared reactive record for a patient (null until loaded / not found). */
    get(id: string): WarfarinPageData | null {
      return cache[id] ?? null
    },
    /** Append a dose adjustment + advance current state. Append-only on the
     *  history arrays (a decision log — past entries are never edited). */
    applyDoseAdjustment(id: string, p: WfDoseAdjPayload) {
      const d = cache[id]
      if (!d) return
      if (p.newInr) {
        d.inrHistory.push(p.newInr)
        d.latestInr = p.newInr
      }
      d.doseAdjustments.push(p.newAdj)
      d.profile.currentDoseMgWk = p.newDoseMgWk
      d.profile.activePillsMg   = [...p.newAdj.activePillsMg]
      d.profile.pillStrengthMg  = p.newAdj.activePillsMg[0]   // primary = largest
    },
  }
}
