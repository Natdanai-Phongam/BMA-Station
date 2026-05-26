const THAI_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

/** Convert ISO date string "YYYY-MM-DD" to Thai Buddhist Era display e.g. "15 พ.ค. 2545" */
export function formatThaiDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return `${d} ${THAI_MONTHS[m - 1]} ${y + 543}`
}
