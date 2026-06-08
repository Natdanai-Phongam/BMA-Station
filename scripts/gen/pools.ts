// ─── Generation pools & helpers — Thai identities, value sets, date/lab math ──

export const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

export const FIRST_NAMES_MALE = [
  'สมชาย', 'วิชัย', 'ประสิทธิ์', 'สุรชัย', 'อนันต์', 'ธีรพงษ์', 'ณรงค์', 'พิชัย', 'สมศักดิ์', 'วีระ',
  'ชัยวัฒน์', 'ทองดี', 'บุญมี', 'สุทธิพงษ์', 'อภิชาติ', 'กิตติศักดิ์', 'มานพ', 'ปรีชา', 'สมพงษ์', 'เกรียงไกร',
  'จำนงค์', 'ถาวร', 'นิคม', 'ประยุทธ', 'วิรัตน์', 'สมบัติ', 'อุดม', 'เสน่ห์', 'ไพโรจน์', 'ภาณุพงศ์',
]

export const FIRST_NAMES_FEMALE = [
  'สมหญิง', 'มาลี', 'วันเพ็ญ', 'สุภาพร', 'พัชรินทร์', 'อรุณี', 'จันทร์เพ็ญ', 'นงลักษณ์', 'รัตนา', 'ปราณี',
  'สมจิตร', 'บุญเรือน', 'กัลยา', 'วิไลวรรณ', 'สุนีย์', 'อำพร', 'ทองใบ', 'ศิริพร', 'นภาพร', 'จุฑามาศ',
  'พรทิพย์', 'ละมัย', 'เพ็ญศรี', 'มะลิ', 'สุดารัตน์', 'อรพิน', 'กนกวรรณ', 'วาสนา', 'ดวงใจ', 'ชุติมา',
]

export const LAST_NAMES = [
  'มั่นคง', 'ใจดี', 'สุวรรณโกมล', 'ศรีสุข', 'ทองคำ', 'แสงทอง', 'พงษ์ไพบูลย์', 'รักไทย', 'บุญมาก', 'วงศ์สว่าง',
  'จันทร์เพ็ง', 'เกษมสุข', 'พูนผล', 'สมบูรณ์', 'ตั้งใจ', 'ชูเกียรติ', 'อ่อนน้อม', 'ภักดี', 'ประเสริฐ', 'มีสุข',
  'แก้วมณี', 'ทรัพย์สิน', 'นิลกำแหง', 'เจริญพร', 'สายทอง', 'ดอกไม้', 'พุ่มพวง', 'ขำสุข', 'ไกรทอง', 'รุ่งเรือง',
  'บัวงาม', 'คงทน', 'สุขสันต์', 'เพชรน้อย', 'ทวีสิน', 'มงคล', 'อินทรา', 'โพธิ์ทอง', 'ศรีนวล', 'จิตรกร',
]

export const HOSPITALS = [
  'โรงพยาบาลกลาง', 'โรงพยาบาลตากสิน', 'โรงพยาบาลเจริญกรุงประชารักษ์', 'โรงพยาบาลสิรินธร',
  'โรงพยาบาลราษฎร์บูรณะ', 'โรงพยาบาลหัวเฉียว', 'โรงพยาบาลบางขุนเทียน',
  'ศูนย์บริการสาธารณสุข 1', 'ศูนย์บริการสาธารณสุข 2', 'ศูนย์บริการสาธารณสุข 3',
  'ศูนย์บริการสาธารณสุข 4', 'ศูนย์บริการสาธารณสุข 5',
] as const

export const INSURANCE_TYPES = [
  ['บัตรทอง (UC)', 60],
  ['ประกันสังคม', 25],
  ['ข้าราชการ', 15],
] as const

export const BLOOD_GROUPS = [
  ['O+', 35], ['B+', 27], ['A+', 22], ['AB+', 8],
  ['O-', 3], ['B-', 2], ['A-', 2], ['AB-', 1],
] as const

export const PHYSICIAN_IDS = ['dr001', 'dr002', 'dr003', 'dr004', 'dr005', 'dr006', 'dr007', 'dr008'] as const

export function titleFor(sex: 'ชาย' | 'หญิง', age: number): string {
  if (sex === 'ชาย') return 'นาย'
  return age >= 35 ? 'นาง' : 'นางสาว'
}

// ── Dates ────────────────────────────────────────────────────────────────────
/** ISO date (CE) "YYYY-MM-DD" */
export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}
/** Thai display date "15 ม.ค. 2569" (Buddhist year) */
export function thaiDate(d: Date): string {
  return `${d.getUTCDate()} ${THAI_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear() + 543}`
}
/** Buddhist ISO-ish "2567-06-15" used by therapyStartDate */
export function buddhistIso(d: Date): string {
  return `${d.getUTCFullYear() + 543}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}
export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setUTCDate(r.getUTCDate() + n)
  return r
}
export function parseISO(s: string): Date {
  return new Date(`${s}T00:00:00Z`)
}

// ── Labs ─────────────────────────────────────────────────────────────────────
/** Cockcroft-Gault CrCl (mL/min), rounded. */
export function crCl(age: number, weightKg: number, scrMgDl: number, sex: 'ชาย' | 'หญิง'): number {
  const factor = sex === 'หญิง' ? 0.85 : 1
  return Math.round(((140 - age) * weightKg * factor) / (72 * scrMgDl))
}
