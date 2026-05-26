// INR status classification — shared display utilities
// Used by WfDoseDrawer, WarfarinDoseTool, and AtsPatientDetail.
//
// Note: these thresholds are for UI display only.
// The dosing-action thresholds (e.g. hold at INR > 4.5) live in warfarinDosing.ts.

import type { InrTargetRange } from '@/data/types/warfarin'

export type InrStatus =
  | 'low'
  | 'therapeutic'
  | 'supra'
  | 'very-high'
  | 'critical'
  | 'emergency'

// Display thresholds:
//   ≥ 10.0  → emergency
//   ≥  5.0  → critical
//   ≥  4.0  → very-high
//   > max   → supra
//   ≥ min   → therapeutic
//   < min   → low
export function getInrStatus(val: number, targetRange: InrTargetRange): InrStatus {
  const { min, max } = targetRange
  if (val >= 10.0) return 'emergency'
  if (val >= 5.0)  return 'critical'
  if (val >= 4.0)  return 'very-high'
  if (val > max)   return 'supra'
  if (val >= min)  return 'therapeutic'
  return 'low'
}

export function inrStatusLabel(s: InrStatus): string {
  const labels: Record<InrStatus, string> = {
    low:         'LOW',
    therapeutic: 'IN RANGE',
    supra:       'HIGH',
    'very-high': 'VERY HIGH',
    critical:    'CRITICAL',
    emergency:   'EMERGENCY',
  }
  return labels[s]
}
