// Types for DD-ATS (Digital Dashboard Anticoagulant Stewardship) data
// Designed to mirror REST API response shape — swap mockData import for fetch() when backend is ready

export interface AtsStatRow {
  /** Display label e.g. "Under Range", "Underdose" */
  label: string
  /** Sub-label shown in smaller text e.g. "INR < 2.0" — empty string if none */
  sublabel: string
  /** CSS color hex for dot + progress fill */
  color: string
  /** Raw patient count */
  count: number
  /** Pre-formatted percentage string relative to total e.g. "(13.3%)" */
  pctDisplay: string
}

export interface AtsMonitoringCard {
  id: 'warfarin' | 'noacs'
  title: string
  subtitle: string
  /** Phosphor icon name to render in card header */
  iconName: string
  iconColor: string
  iconBg: string
  totalPatients: number
  /** In-range (green zone) */
  inRangeCount: number
  inRangePct: string
  inRangeLabel: string
  /** Range annotation e.g. "INR 2.0–3.0" — empty if not applicable */
  inRangeRange: string
  /** Out-of-range total (sum of all stat rows) */
  outOfRangeCount: number
  outOfRangePct: string
  /** Ordered list of out-of-range categories (used for stat rows + donut segments) */
  stats: AtsStatRow[]

  // ── Summary section fields ──────────────────────────────
  /** Thai label for the out-of-range row in the summary card */
  outOfRangeLabel: string
  /** Active alert count shown in the summary badge (may differ from outOfRangeCount) */
  alertCount: number
  /** Patients referred for specialist consultation — new mock field */
  referralCount: number
}

export interface AtsDashboardData {
  warfarin: AtsMonitoringCard
  noacs: AtsMonitoringCard
}
