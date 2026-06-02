/**
 * generate-wf-histories.js
 * Generates realistic INR visit histories + DoseAdjustment records for all WF patients.
 *
 * Strategy:
 *   - Keep all EXISTING inrHistory records (they have realistic INR values)
 *   - For patients with < 8 records: generate gap-filling visits
 *   - For every out-of-range INR visit: probabilistically generate a DoseAdjustment
 *   - Mix: ~78% systemSuggested=true, ~17% override w/reason, ~5% no-adjustment (monitor)
 *   - HOLD states (INR > 4.5): record as adjustment with 0% change + hold remarks
 *
 * Run: node scripts/generate-wf-histories.js
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const MOCK  = resolve(__dir, '..', 'src', 'data', 'mock')
const load  = f => JSON.parse(readFileSync(resolve(MOCK, f), 'utf8'))
const save  = (f, d) => writeFileSync(resolve(MOCK, f), JSON.stringify(d, null, 2) + '\n')

const wfData = load('warfarin-patients.json')

// ── Constants ──────────────────────────────────────────────────
const PHARMACISTS = [
  'ภก. สมศักดิ์ วิชาญ',
  'ภก. วรรณา ศรีสมบูรณ์',
  'ภกญ. สุภาพร ทวีทรัพย์',
  'ภก. ประเสริฐ บุญมา',
]

const OVERRIDE_REASONS = [
  'ผู้ป่วยรับประทานอาหารที่มีผักใบเขียวมาก — ชะลอการปรับขนาดยา',
  'ผู้ป่วยมีแผลผ่าตัดในช่วง 1 สัปดาห์ที่ผ่านมา — ประเมินความเสี่ยงเลือดออกก่อนปรับยา',
  'ผู้ป่วยมีการเปลี่ยนแปลงยาอื่นในช่วงนี้ — ติดตาม INR ซ้ำก่อนปรับขนาด',
  'ผู้ป่วยมีอาการไม่สบาย ลดการรับประทานอาหาร — คาดว่า INR จะปรับตัวเอง',
  'INR เพิ่งลดลงจากระดับสูง — รอดูแนวโน้มอีก 1-2 สัปดาห์',
  'ผู้ป่วยรายงานปฏิบัติตามแผนการกินยาไม่สม่ำเสมอ — เน้นการให้ความรู้แทนการปรับยา',
]

const MAINTAIN_REMARKS = [
  'INR อยู่ในช่วงเป้าหมาย — คงขนาดยาเดิม นัดติดตาม 6 สัปดาห์',
  'INR อยู่ในช่วงเป้าหมาย — ไม่จำเป็นต้องปรับขนาดยา',
  'ค่า INR เหมาะสม — คงแผนการรักษาเดิม',
]

// ── Helper: round dose to nearest achievable step (0.5 × pillMg) ──
function roundDose(dose, pillMg) {
  const step = pillMg * 0.5
  return Math.round(dose / step) * step
}

// ── Helper: build simplified WeeklySchedule ─────────────────────
function buildSchedule(totalMgWk, pillMg) {
  const step  = 0.5
  const total = totalMgWk / pillMg          // total tablets/week
  const base  = Math.floor(total / 7 / step) * step
  let   extra = parseFloat((total - base * 7).toFixed(2))
  const keys  = ['mon','tue','wed','thu','fri','sat','sun']
  const days  = {}
  for (const k of keys) {
    let t = base
    if (extra >= step) { t += step; extra = parseFloat((extra - step).toFixed(2)) }
    days[k] = { tablets: t, mg: parseFloat((t * pillMg).toFixed(1)), pillMg }
  }
  const actualTotal = parseFloat(
    Object.values(days).reduce((s, d) => s + d.mg, 0).toFixed(1)
  )
  return {
    totalMgWk:      actualTotal,
    pillStrengthMg: pillMg,
    activePillsMg:  [pillMg],
    days,
  }
}

// ── Helper: compute new dose from INR ────────────────────────────
function computeNewDose(currentDose, inrValue, tMin, tMax, pillMg) {
  if (inrValue > 4.5)  return currentDose          // HOLD
  if (inrValue < tMin) return roundDose(currentDose * 1.125, pillMg)  // +10-15% avg
  if (inrValue > tMax) return roundDose(currentDose * 0.875, pillMg)  // -10-15% avg
  return currentDose
}

// ── Helper: INR status string ────────────────────────────────────
function inrStatus(v, tMin, tMax) {
  if (v >= 10.0) return 'emergency'
  if (v >= 5.0)  return 'critical'
  if (v > 4.5)   return 'very-high'
  if (v > tMax)  return 'supra'
  if (v < tMin)  return 'low'
  return 'therapeutic'
}

// ── Helper: is INR out of range? ─────────────────────────────────
function outOfRange(v, tMin, tMax) { return v < tMin || v > tMax }

// ── Helper: add days to ISO date string ─────────────────────────
function addDays(isoDate, n) {
  const d = new Date(isoDate)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

// ── Helper: random pick ──────────────────────────────────────────
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function rand(min, max) { return min + Math.random() * (max - min) }

// ── Helper: generate gap-filling INR value ───────────────────────
function syntheticInr(ttrStatus, tMin, tMax) {
  const inRange = Math.random()
  if (ttrStatus === 'goal-met') {
    // 72% in-range, 28% slightly out
    if (inRange < 0.72) return parseFloat((tMin + rand(0.1, tMax - tMin - 0.1)).toFixed(1))
    return Math.random() < 0.5
      ? parseFloat((tMin - rand(0.1, 0.6)).toFixed(1))   // slightly low
      : parseFloat((tMax + rand(0.1, 0.8)).toFixed(1))   // slightly high
  }
  if (ttrStatus === 'borderline') {
    if (inRange < 0.55) return parseFloat((tMin + rand(0.1, tMax - tMin - 0.1)).toFixed(1))
    return Math.random() < 0.5
      ? parseFloat((tMin - rand(0.1, 0.9)).toFixed(1))
      : parseFloat((tMax + rand(0.1, 1.2)).toFixed(1))
  }
  // below-goal: 35% in-range, 65% out
  if (inRange < 0.35) return parseFloat((tMin + rand(0.1, tMax - tMin - 0.1)).toFixed(1))
  return Math.random() < 0.5
    ? parseFloat((tMin - rand(0.1, 1.2)).toFixed(1))
    : parseFloat((tMax + rand(0.1, 2.0)).toFixed(1))
}

// ── Main: process each patient ───────────────────────────────────
let totalGenerated = 0
let totalAdj       = 0

for (const [pid, pd] of Object.entries(wfData)) {
  const { min: tMin, max: tMax } = pd.profile.targetRange ?? { min: 2.0, max: 3.0 }
  const pillMg   = pd.profile.pillStrengthMg ?? 5
  const ttrStatus = pd.ttr?.status ?? 'below-goal'

  // ── Step 1: Sort existing INR records ─────────────────────────
  const existingInrs = [...(pd.inrHistory ?? [])].sort(
    (a, b) => a.measuredAt.localeCompare(b.measuredAt)
  )

  // ── Step 2: Generate gap-filling records if < 8 ───────────────
  const targetCount = ttrStatus === 'goal-met' ? 9 : ttrStatus === 'borderline' ? 10 : 12
  let allInrs = [...existingInrs]

  if (existingInrs.length < targetCount && existingInrs.length >= 2) {
    const first = existingInrs[0].measuredAt.slice(0, 10)
    const last  = existingInrs.at(-1).measuredAt.slice(0, 10)
    const spanDays = Math.round((new Date(last) - new Date(first)) / 86400000)
    const needed = targetCount - existingInrs.length
    const interval = Math.floor(spanDays / (needed + 1))

    for (let i = 1; i <= needed; i++) {
      const dateISO = addDays(first, interval * i)
      // Skip if date too close to existing record
      const tooClose = allInrs.some(r =>
        Math.abs(new Date(r.measuredAt.slice(0,10)) - new Date(dateISO)) < 14 * 86400000
      )
      if (tooClose) continue

      const syntheticVal = syntheticInr(ttrStatus, tMin, tMax)
      const newId = `${pid}-inr-${String(allInrs.length + 1).padStart(3, '0')}`
      allInrs.push({
        id:         newId,
        patientId:  pid,
        inrValue:   syntheticVal,
        measuredAt: `${dateISO}T09:00:00`,
        source:     'manual',
      })
      totalGenerated++
    }
    allInrs.sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))
  }

  // ── Step 3: Generate DoseAdjustments ──────────────────────────
  const newAdjs  = [...(pd.doseAdjustments ?? [])]
  const adjDates = new Set(newAdjs.map(a => a.adjustedAt.slice(0, 10)))
  let   runDose  = pd.profile.currentDoseMgWk

  // Walk backwards through INR records to reconstruct dose history
  // Most recent INR = current dose; earlier records = earlier doses
  const sortedDesc = [...allInrs].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))

  for (const inr of sortedDesc) {
    const dateStr = inr.measuredAt.slice(0, 10)
    if (adjDates.has(dateStr)) continue          // already has an adjustment
    if (!outOfRange(inr.inrValue, tMin, tMax)) continue   // in range → skip

    const status = inrStatus(inr.inrValue, tMin, tMax)

    // 5% chance: doctor decides to just monitor — no record generated
    if (Math.random() < 0.05) continue

    const isHold = ['very-high', 'critical', 'emergency'].includes(status)

    // HOLD states always follow protocol — systemSuggested must be true
    // Override reasoning only applies to active dose adjustments (low/supra)
    const roll = Math.random()
    const isSysSuggested = isHold ? true : roll < 0.78
    const overrideReason = (!isSysSuggested && !isHold) ? pick(OVERRIDE_REASONS) : undefined
    const newDose   = isHold
      ? runDose
      : computeNewDose(runDose, inr.inrValue, tMin, tMax, pillMg)
    const oldDose   = parseFloat((newDose + (runDose - newDose) * -1 || runDose).toFixed(1))
    const actualOld = isHold ? runDose : parseFloat((runDose * (inr.inrValue < tMin ? 0.875 : 1.125)).toFixed(1)) || runDose
    const pct       = runDose > 0 ? parseFloat(((newDose - runDose) / runDose * 100).toFixed(1)) : 0
    const schedule  = buildSchedule(newDose, pillMg)

    let remarks
    if (isHold && status === 'emergency')
      remarks = 'INR อันตรายมาก — หยุดยา Warfarin ทันที ให้ Vitamin K1 IV ช้า > 20 นาที รายงานแพทย์ด่วน'
    else if (isHold && status === 'critical')
      remarks = 'INR วิกฤต — หยุดยา Warfarin พิจารณาให้ Vitamin K1 oral 1-2.5 mg ตรวจ INR ซ้ำ 24-48 ชม.'
    else if (isHold)
      remarks = 'INR สูงมาก — งด Warfarin 1 dose ตรวจ INR ซ้ำ 3-5 วัน'
    else if (inr.inrValue < tMin)
      remarks = `INR ต่ำกว่าเป้า (${inr.inrValue}) — เพิ่มขนาดยา ${pct >= 0 ? '+' : ''}${pct}% (${newDose.toFixed(1)} mg/wk)`
    else
      remarks = `INR สูงกว่าเป้า (${inr.inrValue}) — ลดขนาดยา ${pct.toFixed(1)}% (${newDose.toFixed(1)} mg/wk)`

    if (overrideReason) remarks = overrideReason

    const adj = {
      id:               `adj-${pid}-${dateStr.replace(/-/g, '')}`,
      patientId:        pid,
      adjustedAt:       `${dateStr}T09:30:00+07:00`,
      adjustedBy:       pick(PHARMACISTS),
      inrAtAdjustment:  inr.inrValue,
      inrSource:        'manual',
      oldDoseMgWk:      runDose,
      newDoseMgWk:      newDose,
      percentChange:    pct,
      pillStrengthMg:   pillMg,
      activePillsMg:    [pillMg],
      weeklySchedule:   schedule,
      remarks,
      systemSuggested:  isSysSuggested,
      ...(overrideReason ? { overrideReason } : {}),
    }

    newAdjs.push(adj)
    adjDates.add(dateStr)
    if (!isHold) runDose = newDose
    totalAdj++
  }

  // Also add "maintain" adjustment records for some in-range INR visits
  // (pharmacist confirms dose OK — needed for comprehensive concordance tracking)
  const inRangeInrs = allInrs.filter(r =>
    !outOfRange(r.inrValue, tMin, tMax) && !adjDates.has(r.measuredAt.slice(0, 10))
  )
  // Add maintain record for ~60% of in-range visits
  for (const inr of inRangeInrs) {
    if (Math.random() > 0.60) continue
    const dateStr = inr.measuredAt.slice(0, 10)
    const schedule = buildSchedule(runDose, pillMg)
    newAdjs.push({
      id:               `adj-${pid}-${dateStr.replace(/-/g, '')}-maint`,
      patientId:        pid,
      adjustedAt:       `${dateStr}T09:30:00+07:00`,
      adjustedBy:       pick(PHARMACISTS),
      inrAtAdjustment:  inr.inrValue,
      inrSource:        'manual',
      oldDoseMgWk:      runDose,
      newDoseMgWk:      runDose,
      percentChange:    0,
      pillStrengthMg:   pillMg,
      activePillsMg:    [pillMg],
      weeklySchedule:   schedule,
      remarks:          pick(MAINTAIN_REMARKS),
      systemSuggested:  true,
    })
    adjDates.add(dateStr)
    totalAdj++
  }

  // ── Step 4: Write back ─────────────────────────────────────────
  pd.inrHistory     = allInrs
  pd.doseAdjustments = newAdjs.sort(
    (a, b) => a.adjustedAt.localeCompare(b.adjustedAt)
  )
}

save('warfarin-patients.json', wfData)

// ── Summary ────────────────────────────────────────────────────
const total       = Object.keys(wfData).length
const withAdjs    = Object.values(wfData).filter(p => p.doseAdjustments.length > 0).length
const sysSug      = Object.values(wfData).flatMap(p => p.doseAdjustments).filter(a => a.systemSuggested).length
const override    = Object.values(wfData).flatMap(p => p.doseAdjustments).filter(a => !a.systemSuggested && a.overrideReason).length
const adjTotal    = Object.values(wfData).flatMap(p => p.doseAdjustments).length
const inrTotal    = Object.values(wfData).flatMap(p => p.inrHistory).length

console.log(`\n── Summary ────────────────────────────────────────────`)
console.log(`WF patients       : ${total}`)
console.log(`INR records total : ${inrTotal} (+${totalGenerated} generated)`)
console.log(`Adjustments total : ${adjTotal} (+${totalAdj} generated)`)
console.log(`  systemSuggested : ${sysSug} (${(sysSug/adjTotal*100).toFixed(1)}%)`)
console.log(`  override w/reason: ${override} (${(override/adjTotal*100).toFixed(1)}%)`)
console.log(`  maintain (in-range): ${adjTotal - sysSug - override + (adjTotal - Object.values(wfData).flatMap(p => p.doseAdjustments).filter(a => a.newDoseMgWk !== a.oldDoseMgWk).length)}`)
console.log(`Patients w/ adjustments: ${withAdjs}/${total}`)
