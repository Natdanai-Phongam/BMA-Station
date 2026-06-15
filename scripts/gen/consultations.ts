// ─── Consultation threads (regen for new patient ids) ────────────────────────
// Short role-based threads (pharmacist ↔ doctor ↔ nurse) for a subset of
// patients, so the consultation room isn't empty. Keyed by patient id.
// ─────────────────────────────────────────────────────────────────────────────

import { randInt, pick, shuffle, chance } from './rng'
import { isoDate, addDays, parseISO } from './pools'
import { DATA_WINDOW } from '../../src/data/config/data-window'
import type { GenPatient } from './identity'

export interface GenConsultMsg {
  id: string
  role: 'doctor' | 'pharmacist' | 'nurse'
  sender: string
  text: string
  time: string
  dateISO: string
}

const WINDOW_START = parseISO(DATA_WINDOW.start)
const WINDOW_DAYS = Math.round((+parseISO(DATA_WINDOW.end) - +WINDOW_START) / 86400000)

const PHARMACISTS = ['ภก. สมศักดิ์ วิชาญ', 'ภญ. ศิริพร วงศ์ทอง', 'ภก. ธนกร ใจเย็น', 'ภญ. กมลชนก สุขใส']
const NURSES = ['พว. มาลี ดวงดี', 'พว. สุนีย์ แจ่มใส']

const THREAD_COUNT = 15

type Tmpl = (p: GenPatient) => { role: GenConsultMsg['role']; text: string }[]

const WF_THREAD: Tmpl = (p) => [
  { role: 'pharmacist', text: `สวัสดีครับ ขอเรียนปรึกษาผู้ป่วย ${p.name} HN ${p.hn} ครับ` },
  { role: 'pharmacist', text: `INR ล่าสุดอยู่นอกช่วงเป้าหมายเล็กน้อย ระบบแนะนำปรับขนาด Warfarin ขอความเห็นแพทย์ครับ` },
  { role: 'doctor', text: `รับทราบครับ เห็นด้วยกับการปรับตามระบบ ติดตาม INR ซ้ำใน 1 สัปดาห์` },
  { role: 'nurse', text: `บันทึกนัดติดตาม INR และแจ้งผู้ป่วยเรียบร้อยค่ะ` },
]

const NOAC_THREAD: Tmpl = (p) => [
  { role: 'pharmacist', text: `ขอปรึกษาเรื่องการจ่าย NOAC ผู้ป่วย ${p.name} HN ${p.hn} ครับ` },
  { role: 'pharmacist', text: `ค่าการทำงานของไตเปลี่ยนแปลง ระบบแนะนำทบทวนขนาดยา ขอความเห็นครับ` },
  { role: 'doctor', text: `ให้ปรับตามคำแนะนำของระบบได้เลยครับ และนัดติดตามค่าไตอีก 1 เดือน` },
]

// Curated threads — richer, clinically-grounded, always included (keyed by patient id).
// Numbers reflect that patient's generated record; update if the record changes.
const CURATED: Record<string, { date: string; msgs: { role: GenConsultMsg['role']; text: string }[] }> = {
  w001: {
    date: '2026-05-28',
    msgs: [
      { role: 'pharmacist', text: 'สวัสดีครับ ขอเรียนปรึกษาผู้ป่วย นาย ถาวร มีสุข HN 692087811 (Warfarin) ครับ' },
      { role: 'pharmacist', text: 'INR ล่าสุด 4.2 สูงกว่าช่วงเป้าหมาย 2.0–3.0 · TTR 3 เดือนล่าสุด 27% คุมได้ไม่ดี ระบบแนะนำงด/ลดขนาด ขอความเห็นแพทย์ครับ' },
      { role: 'pharmacist', text: 'สอบถามผู้ป่วยแล้วยังไม่มีอาการเลือดออก ไม่มีจ้ำเขียว ปัสสาวะ/อุจจาระสีปกติครับ' },
      { role: 'doctor', text: 'รับทราบครับ INR 4.2 ยังไม่ถึง 4.5 และไม่มีเลือดออก ให้งดยา 1 มื้อ แล้วลดขนาดลงราว 10% นัดเจาะ INR ซ้ำใน 1 สัปดาห์' },
      { role: 'doctor', text: 'รบกวนซักเรื่องการกินยาสม่ำเสมอ อาหารกลุ่มผักใบเขียว และยา/สมุนไพรที่เพิ่งเริ่มใหม่ด้วยครับ น่าจะเป็นเหตุที่ TTR ต่ำ' },
      { role: 'pharmacist', text: 'รับทราบครับ จะ counsel เรื่อง adherence + อาหาร ตั้งงดยา 1 มื้อ และปรับขนาดจาก 30 เป็น 27 mg/สัปดาห์ครับ' },
      { role: 'nurse', text: 'ลงนัดติดตาม INR สัปดาห์หน้า และโทรแจ้งผู้ป่วยเรื่องงดยา 1 มื้อเรียบร้อยค่ะ' },
    ],
  },
}

export function generateConsultations(patients: GenPatient[], physicians: Record<string, { name: string }>): Record<string, GenConsultMsg[]> {
  const out: Record<string, GenConsultMsg[]> = {}
  // prefer referred-ish patients; just take a seeded subset
  const pool = shuffle('consult:pool', patients.filter(p => chance(`${p.id}:referred`, 0.12)).map(p => p.id))
  // curated patients always included (richer threads), then fill with the random pool
  const curatedIds = Object.keys(CURATED).filter(id => patients.some(p => p.id === id))
  const chosen = [...curatedIds, ...pool.filter(id => !CURATED[id]).slice(0, THREAD_COUNT)]

  for (const id of chosen) {
    const p = patients.find(x => x.id === id)!
    const curated = CURATED[id]
    const msgs = curated ? curated.msgs : (p.therapy === 'warfarin' ? WF_THREAD : NOAC_THREAD)(p)
    const date = curated ? curated.date : isoDate(addDays(WINDOW_START, randInt(`consult:${id}:day`, WINDOW_DAYS - 20, WINDOW_DAYS)))
    const drName = physicians[p.attendingPhysicianId]?.name ?? 'นพ. แพทย์เวร'
    const rph = pick(`consult:${id}:rph`, PHARMACISTS)
    const nurse = pick(`consult:${id}:nurse`, NURSES)
    const baseMin = randInt(`consult:${id}:min`, 0, 40)

    out[id] = msgs.map((m, i) => ({
      id: `msg-${id}-${String(i + 1).padStart(3, '0')}`,
      role: m.role,
      sender: m.role === 'doctor' ? drName : m.role === 'pharmacist' ? rph : nurse,
      text: m.text,
      time: `${String(9 + Math.floor((baseMin + i * 3) / 60)).padStart(2, '0')}:${String((baseMin + i * 3) % 60).padStart(2, '0')}`,
      dateISO: date,
    }))
  }
  return out
}
