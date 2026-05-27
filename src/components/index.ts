// ─── BMA Doctor Component Exports ─────────────────────────────────────────────
// Import from '@/components' in any page or feature module.
//
// Usage example:
//   import { BmaStatusBadge, BmaPatientCard, BmaKpiCard } from '@/components'

export { default as BmaStatusBadge } from './BmaStatusBadge.vue'
export type { BmaStatus, BmaBadgeVariant } from './BmaStatusBadge.vue'

export { default as BmaPatientCard } from './BmaPatientCard.vue'
export type { BmaDetailItem } from './BmaPatientCard.vue'

export { default as BmaKpiCard } from './BmaKpiCard.vue'
export type { BmaKpiVariant, BmaDeltaType } from './BmaKpiCard.vue'

export { default as AtsPatientHeader } from './AtsPatientHeader.vue'
