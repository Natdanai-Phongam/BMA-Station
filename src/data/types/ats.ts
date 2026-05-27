// Types for DD-ATS (Digital Dashboard Anticoagulant Stewardship) data
// Designed to mirror REST API response shape — swap mock imports for fetch() when backend is ready

// ── Display config (loaded from JSON, no computed numbers) ────────────────────
export interface AtsDashboardStatConfig {
  /** UI label e.g. "Under Range" */
  label:     string
  /** Smaller annotation e.g. "INR < 2.0" — empty string if none */
  sublabel:  string
  /** CSS color hex for dot + progress bar fill */
  color:     string
  /** Patient status key used to count matching patients from the list */
  statusKey: string
}

export interface AtsDashboardCardConfig {
  id:                'warfarin' | 'noacs'
  title:             string
  subtitle:          string
  iconName:          string
  iconColor:         string
  iconBg:            string
  /** Status key that counts as "in-range" — e.g. "in-range" or "appropriate" */
  inRangeStatusKey:  string
  inRangeLabel:      string
  /** Range annotation e.g. "INR 2.0–3.0" — empty if not applicable */
  inRangeRange:      string
  /** Thai label for the out-of-range row in the summary card */
  outOfRangeLabel:   string
  stats:             AtsDashboardStatConfig[]
}

export interface AtsDashboardConfigData {
  warfarin: AtsDashboardCardConfig
  noacs:    AtsDashboardCardConfig
}

// ── Computed card shape (what the template renders) ───────────────────────────
// Extends config with numbers derived at runtime from the patient list.
export interface AtsStatRow extends AtsDashboardStatConfig {
  count:      number
  pctDisplay: string
}

export interface AtsMonitoringCard extends Omit<AtsDashboardCardConfig, 'stats'> {
  totalPatients:   number
  inRangeCount:    number
  inRangePct:      string
  outOfRangeCount: number
  outOfRangePct:   string
  /** Patients with at least one lab value flagged as alert */
  alertCount:      number
  /** Patients whose status triggered a specialist referral flag */
  referralCount:   number
  stats:           AtsStatRow[]
}
