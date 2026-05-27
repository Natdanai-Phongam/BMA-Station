import { computed } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'

export type CrClStatus = 'normal' | 'caution' | 'severe' | 'critical'

/**
 * Reactive CrCl-based classification composable.
 *
 * Accepts any ref, computed, or plain getter for the CrCl value (mL/min).
 * Returns reactive status, Thai label, and scoped CSS class names for the
 * UI patterns used across AtsPatientDetail and NoacAlgorithm.
 *
 * Thresholds (Cockcroft-Gault):
 *   ≥60  → normal   (standard dosing)
 *   30–59 → caution  (dose-adjusted)
 *   15–29 → severe   (dose-adjusted / restricted)
 *   <15   → critical (most NOACs contraindicated)
 */
export function useCrCl(crClMlMin: MaybeRefOrGetter<number | null | undefined>) {
  const status = computed<CrClStatus>(() => {
    const v = toValue(crClMlMin)
    if (v == null || v >= 60) return 'normal'
    if (v >= 30)              return 'caution'
    if (v >= 15)              return 'severe'
    return 'critical'
  })

  /** Thai clinical label for the CrCl range */
  const label = computed<string>(() => {
    const map: Record<CrClStatus, string> = {
      normal:   'การทำงานปกติ / Good',
      caution:  'ลดลงระดับปานกลาง',
      severe:   'ลดลงระดับรุนแรง',
      critical: 'ไตวายขั้นสูงสุด',
    }
    return map[status.value]
  })

  // Resolve 'critical' → 'severe' for CSS (both use the red emergency color)
  const _cssKey = computed(() => status.value === 'critical' ? 'severe' : status.value)

  /** Large numeric display color — NoacAlgorithm kidney card (.crcl-num--*) */
  const numClass   = computed(() => `crcl-num--${_cssKey.value}`)

  /** Badge chip color — NoacAlgorithm kidney card (.crcl-badge--*) */
  const badgeClass = computed(() => `crcl-badge--${_cssKey.value}`)

  /** Inline value color — AtsPatientDetail module panel (.crcl--*) */
  const valueClass = computed(() => `crcl--${_cssKey.value}`)

  /** Module dot indicator — AtsPatientDetail module header (.module-dot--*) */
  const dotClass   = computed(() => `module-dot--${_cssKey.value}`)

  // ── Threshold band active flags — NoacAlgorithm threshold band rows ───────
  const _v        = computed(() => toValue(crClMlMin) ?? 0)
  const bandGte60  = computed(() => _v.value >= 60)
  const band30to59 = computed(() => _v.value >= 30 && _v.value < 60)
  const band15to29 = computed(() => _v.value >= 15 && _v.value < 30)
  const bandLt15   = computed(() => _v.value < 15)

  return {
    status,
    label,
    numClass,
    badgeClass,
    valueClass,
    dotClass,
    bandGte60,
    band30to59,
    band15to29,
    bandLt15,
  }
}
