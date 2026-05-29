const THAI_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

/** Convert ISO date string "YYYY-MM-DD" to Thai Buddhist Era display e.g. "15 พ.ค. 2545" */
export function formatThaiDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return `${d} ${THAI_MONTHS[m - 1]} ${y + 543}`
}

/** Convert "YYYY-MM" (CE) to Thai month label e.g. "2026-05" → "พ.ค. 2569" */
export function thaiMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number)
  if (!y || !m) return yearMonth
  return `${THAI_MONTHS[m - 1]} ${y + 543}`
}
