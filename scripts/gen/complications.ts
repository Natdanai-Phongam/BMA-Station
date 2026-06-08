// ─── G5: Complications ───────────────────────────────────────────────────────
// Distributes safety events across Apr–May so every safety KPI stays BELOW target
// (bleeding<2%, thrombosis<2%, death<1%, severe→aeHosp<5% of ~597 patients).
// Dashboard counts by type + dateISO, and severity==='severe' → aeHospitalization.
// ─────────────────────────────────────────────────────────────────────────────

import type { ComplicationEvent, ComplicationSummary, Severity } from '../../src/data/types/patient-detail'
import { DATA_WINDOW } from '../../src/data/config/data-window'
import { randInt, pick, weighted, shuffle } from './rng'
import { addDays, parseISO, thaiDate, isoDate, THAI_MONTHS } from './pools'
import type { GenPatient } from './identity'

const WINDOW_START = parseISO(DATA_WINDOW.start)
const WINDOW_DAYS = Math.round((+parseISO(DATA_WINDOW.end) - +WINDOW_START) / 86400000)

// Broaden the persisted type (data carries 'death' beyond the TS union, as existing mock does)
type CompType = 'bleeding' | 'thromboembolism' | 'death'

interface Spec {
  type: CompType
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
  {
    type: 'death', count: 4,
    details: ['เลือดออกในสมองรุนแรง', 'ภาวะแทรกซ้อนหลอดเลือดสมอง', 'ภาวะหัวใจล้มเหลวเฉียบพลัน'],
    treatments: ['ส่ง ER — ไม่สามารถช่วยชีวิตได้', 'admit ICU — เสียชีวิต'],
    statuses: ['เสียชีวิต'],
    severities: [['severe', 100]],
  },
]

export function generateComplications(patients: GenPatient[]): Map<string, ComplicationEvent[]> {
  const byPatient = new Map<string, ComplicationEvent[]>()
  // candidates: patients enrolled (exclude none) — shuffle for assignment
  const pool = shuffle('comp:pool', patients.map(p => p.id))
  let cursor = 0

  for (const spec of SPECS) {
    for (let k = 0; k < spec.count; k++) {
      const pid = pool[cursor++ % pool.length]
      const key = `${spec.type}:${k}`
      const day = randInt(`comp:${key}:day`, 0, WINDOW_DAYS)
      const date = addDays(WINDOW_START, day)
      const severity = weighted<Severity>(`comp:${key}:sev`, spec.severities)
      const ev: ComplicationEvent = {
        id: `comp-${pid}-${spec.type}-${k + 1}`,
        type: spec.type as ComplicationEvent['type'],
        severity,
        date: thaiDate(date),
        dateISO: isoDate(date),
        month: date.getUTCMonth() + 1,
        detail: pick(`comp:${key}:detail`, spec.details),
        treatment: pick(`comp:${key}:tx`, spec.treatments),
        status: pick(`comp:${key}:st`, spec.statuses),
      }
      const arr = byPatient.get(pid) ?? []
      arr.push(ev)
      byPatient.set(pid, arr)
    }
  }
  return byPatient
}

/** Build the per-patient complicationSummary from events. */
export function complicationSummary(events: ComplicationEvent[]): ComplicationSummary[] {
  const m = new Map<string, ComplicationEvent[]>()
  for (const e of events) {
    const arr = m.get(e.type) ?? []; arr.push(e); m.set(e.type, arr)
  }
  return [...m.entries()].map(([type, evs]) => ({
    type: type as ComplicationSummary['type'],
    count: evs.length,
    lastDate: evs.map(e => e.date).sort().at(-1) ?? evs[0].date,
  }))
}

export { THAI_MONTHS }
