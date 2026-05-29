/**
 * Application clock — single source of "now" for the entire app.
 *
 * Production:   uses real browser clock (new Date())
 * Demo / mock:  set VITE_MOCK_DATE=YYYY-MM-DD in .env.local or GitHub Actions
 *               to pin the date so mock patient data stays meaningful.
 *
 * All date-dependent KPI computations (period boundaries, quarter start,
 * live-month detection) must call getAppDate() instead of new Date()
 * so the whole system shifts consistently when the override is active.
 */
export function getAppDate(): Date {
  const override = import.meta.env.VITE_MOCK_DATE as string | undefined
  return override ? new Date(override) : new Date()
}

export function getAppYear(): number {
  return getAppDate().getFullYear()
}

export function getAppMonth(): number {
  return getAppDate().getMonth() + 1
}

/** Current year-month as "YYYY-MM" string */
export function getAppYearMonth(): string {
  const d = getAppDate()
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  return `${y}-${String(m).padStart(2, '0')}`
}

/** First month (1–12) of the quarter that contains the given month */
export function quarterStartMonth(month: number): number {
  return Math.floor((month - 1) / 3) * 3 + 1
}

/** Quarter number (1–4) for a given month */
export function monthToQuarter(month: number): 1 | 2 | 3 | 4 {
  return (Math.floor((month - 1) / 3) + 1) as 1 | 2 | 3 | 4
}

/** ISO date string for the first day of a month: "YYYY-MM-01" */
export function monthStart(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

/** ISO date string for the last day of a month: "YYYY-MM-DD" */
export function monthEnd(year: number, month: number): string {
  const last = new Date(year, month, 0).getDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`
}
