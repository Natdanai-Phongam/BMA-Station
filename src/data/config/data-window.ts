// ─── Data window — single source of the dataset's time span + "now" ──────────
// Both the generator (scripts/) and the app read this so extending the timeline
// is a one-place change + re-run (see PLAN-DATA-SCALING.md §4.2 future-proofing).
//
// NOTE: the app's runtime clock is VITE_MOCK_DATE (src/utils/app-date.ts). Keep
// `mockNow` here equal to VITE_MOCK_DATE in .env.local / deploy.yml. When the
// timeline moves, bump both (later: have app-date read this constant directly).
// ─────────────────────────────────────────────────────────────────────────────

export const DATA_WINDOW = {
  /** First day records may appear (inclusive, ISO/CE) */
  start: '2026-04-01',
  /** Last day records may appear (inclusive, ISO/CE) — equals mockNow */
  end: '2026-05-31',
  /** Application "today" for the dataset (= VITE_MOCK_DATE) */
  mockNow: '2026-05-31',
} as const

export type DataWindow = typeof DATA_WINDOW
