import type { NoacPatientData, NoacDispensingRecord } from '@/data/types/noac-dispensing'
import type { NoacDrug, NoacIndication } from '@/data/types/noac'
import type { NoacsStatus } from '@/data/types/ats-patients'

export function lastDispensing(noacData: NoacPatientData | null): NoacDispensingRecord | undefined {
  const h = noacData?.dispensingHistory
  return h?.length ? (h[h.length - 1] as NoacDispensingRecord) : undefined
}

export function concordanceBadgeClass(disp: NoacDispensingRecord | undefined): string {
  if (!disp) return 'concordance--none'
  if (disp.wasTopRecommendation) return 'concordance--yes'
  // Support both new overrideCode and legacy overrideReason field
  return (disp.overrideCode ?? disp.overrideReason) ? 'concordance--adjusted' : 'concordance--no'
}

export function concordanceLabel(disp: NoacDispensingRecord | undefined): string {
  if (!disp) return '—'
  if (disp.wasTopRecommendation) return 'ตามแนวทาง'
  return (disp.overrideCode ?? disp.overrideReason) ? 'ปรับโดยมีเหตุผล' : 'ไม่ระบุเหตุผล'
}

export const noacsStatusLabel: Record<NoacsStatus, string> = {
  appropriate: 'Appropriate',
  underdose:   'Underdose',
  overdose:    'Overdose',
  contra:      'Contra',
  interaction: 'Interaction',
}

export const drugDisplayLabel: Record<NoacDrug, string> = {
  apixaban:    'Apixaban',
  rivaroxaban: 'Rivaroxaban',
  dabigatran:  'Dabigatran',
  edoxaban:    'Edoxaban',
}

export const indicationChipLabel: Record<NoacIndication, string> = {
  NVAF: 'NVAF', DVT: 'DVT', PE: 'PE', CAT: 'CAT',
}
