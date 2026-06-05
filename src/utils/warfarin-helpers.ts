import type { WarfarinPageData, DoseAdjustment } from '@/data/types/warfarin'
import type { WarfarinStatus } from '@/data/types/ats-patients'

export function majorIxnCount(wf: WarfarinPageData | null): number {
  if (!wf?.profile.concurrentMeds) return 0
  return wf.profile.concurrentMeds.filter(m => m.severity === 'major').length
}

export function getMajorIxns(wf: WarfarinPageData | null) {
  return wf?.profile.concurrentMeds?.filter(m => m.severity === 'major') ?? []
}

export function lastDoseAdjustment(wf: WarfarinPageData | null): DoseAdjustment | undefined {
  const adj = wf?.doseAdjustments
  return adj?.length ? adj[adj.length - 1] : undefined
}

export function wfConcordanceBadgeClass(adj: DoseAdjustment | undefined): string {
  if (!adj) return 'concordance--none'
  if (adj.systemSuggested) return 'concordance--yes'
  return adj.overrideReason ? 'concordance--adjusted' : 'concordance--no'
}

export function wfConcordanceLabel(adj: DoseAdjustment | undefined): string {
  if (!adj) return '—'
  if (adj.systemSuggested) return 'ตามแนวทาง'
  return adj.overrideReason ? 'ปรับโดยมีเหตุผล' : 'ไม่ระบุเหตุผล'
}

export const warfarinStatusLabel: Record<WarfarinStatus, string> = {
  'in-range':    'In Range',
  'under-range': 'Under Range',
  'over-range':  'Over Range',
}

export const effectLabel: Record<string, string> = {
  increase: '↑ เพิ่ม INR',
  decrease: '↓ ลด INR',
  none:     'ไม่มีผล',
}

export const ttrStatusLabel: Record<string, string> = {
  'goal-met':          'ผ่านเกณฑ์',
  'below-goal':        'ต่ำกว่าเกณฑ์',
  'insufficient-data': 'ข้อมูลไม่พอ',
}
