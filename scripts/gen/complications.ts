// ─── G5: Complications + outcomes + med errors ───────────────────────────────
// Clinical complications (bleeding / thromboembolism) go in the complications
// list. Death (outcome) and medication errors (process) are tracked SEPARATELY
// so they don't mix with "อาการผิดปกติ". All distributed across Apr–May so every
// safety KPI stays BELOW target (bleeding<2%, thrombosis<2%, death<1%,
// medError<1%, severe→aeHosp<5% of ~597 patients).
// ─────────────────────────────────────────────────────────────────────────────

import type { ComplicationEvent, ComplicationSummary, Severity, Mortality } from '../../src/data/types/patient-detail'
import { DATA_WINDOW } from '../../src/data/config/data-window'
import { randInt, pick, weighted, shuffle } from './rng'
import { addDays, parseISO, thaiDate, isoDate } from './pools'
import type { GenPatient } from './identity'

const WINDOW_START = parseISO(DATA_WINDOW.start)
const WINDOW_DAYS = Math.round((+parseISO(DATA_WINDOW.end) - +WINDOW_START) / 86400000)

type ClinType = 'bleeding' | 'thromboembolism'

interface Spec {
  type: ClinType
  count: number
  details: string[]
  treatments: string[]
  statuses: string[]
  severities: (readonly [Severity, number])[]
}

const SPECS: Spec[] = [
  {
    type: 'bleeding', count: 10,
    details: ['เลือดออกทางเดินอาหารส่วนบน', 'เลือดกำเดาไหลรุนแรง', 'จ้ำเลือดตามตัว', 'ปัสสาวะมีเลือดปน', 'เลือดออกเหงือก'],
    treatments: ['หยุดยาชั่วคราว + ติดตาม', 'ให้ vitamin K + นอนสังเกตอาการ', 'ส่องกล้องห้ามเลือด', 'ปรับลดขนาดยา'],
    statuses: ['หายเป็นปกติ', 'อยู่ระหว่างติดตาม', 'ควบคุมได้'],
    severities: [['mild', 50], ['moderate', 38], ['severe', 12]],
  },
  {
    type: 'thromboembolism', count: 9,
    details: ['ลิ่มเลือดอุดตันหลอดเลือดดำขา (DVT)', 'ลิ่มเลือดอุดตันปอด (PE)', 'สมองขาดเลือดชั่วคราว (TIA)', 'ลิ่มเลือดอุดตันหลอดเลือดสมอง'],
    treatments: ['ปรับเพิ่มขนาดยา + ติดตามใกล้ชิด', 'admit ให้ยาละลายลิ่มเลือด', 'ประเมินซ้ำและปรับแผนการรักษา'],
    statuses: ['อาการดีขึ้น', 'อยู่ระหว่างรักษา', 'ฟื้นตัว'],
    severities: [['moderate', 55], ['severe', 45]],
  },
]

const DEATH_REASONS = ['เลือดออกในสมองรุนแรง', 'ภาวะแทรกซ้อนหลอดเลือดสมอง', 'ภาวะหัวใจล้มเหลวเฉียบพลัน', 'ติดเชื้อในกระแสเลือด']

const DEATH_COUNT = 4

export interface SafetyData {
  complications: Map<string, ComplicationEvent[]>
  mortality: Map<string, Mortality>
}

export function generateSafety(patients: GenPatient[]): SafetyData {
  const complications = new Map<string, ComplicationEvent[]>()
  const mortality = new Map<string, Mortality>()

  const pool = shuffle('comp:pool', patients.map(p => p.id))
  let cursor = 0
  const next = () => pool[cursor++ % pool.length]
  const dateAt = (key: string) => addDays(WINDOW_START, randInt(`${key}:day`, 0, WINDOW_DAYS))

  // Clinical complications
  for (const spec of SPECS) {
    for (let k = 0; k < spec.count; k++) {
      const pid = next()
      const key = `${spec.type}:${k}`
      const date = dateAt(`comp:${key}`)
      const ev: ComplicationEvent = {
        id: `comp-${pid}-${spec.type}-${k + 1}`,
        type: spec.type,
        severity: weighted<Severity>(`comp:${key}:sev`, spec.severities),
        date: thaiDate(date), dateISO: isoDate(date), month: date.getUTCMonth() + 1,
        detail: pick(`comp:${key}:detail`, spec.details),
        treatment: pick(`comp:${key}:tx`, spec.treatments),
        status: pick(`comp:${key}:st`, spec.statuses),
      }
      const arr = complications.get(pid) ?? []; arr.push(ev); complications.set(pid, arr)
    }
  }

  // Death (outcome flag)
  for (let k = 0; k < DEATH_COUNT; k++) {
    const pid = next()
    const date = dateAt(`death:${k}`)
    mortality.set(pid, { dateISO: isoDate(date), date: thaiDate(date), reason: pick(`death:${k}:r`, DEATH_REASONS) })
  }

  return { complications, mortality }
}

/** Per-patient complicationSummary from clinical complications. */
export function complicationSummary(events: ComplicationEvent[]): ComplicationSummary[] {
  const m = new Map<string, ComplicationEvent[]>()
  for (const e of events) { const arr = m.get(e.type) ?? []; arr.push(e); m.set(e.type, arr) }
  return [...m.entries()].map(([type, evs]) => ({
    type: type as ComplicationSummary['type'],
    count: evs.length,
    lastDate: evs.map(e => e.date).sort().at(-1) ?? evs[0].date,
  }))
}
