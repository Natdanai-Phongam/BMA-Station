import type { StatusLevel } from '@/data/types/kpi-operational'

/** Safety KPIs: lower is better — adverse events should stay below target */
export function safetyStatus(pct: number, target: number): StatusLevel {
  if (pct >= target)        return 'fail'
  if (pct >= target * 0.7)  return 'warn'
  return 'pass'
}

/** Quality KPIs: higher is better — achievement metrics should reach target */
export function qualityStatus(value: number, target: number): StatusLevel {
  if (value >= target)        return 'pass'
  if (value >= target * 0.85) return 'warn'
  return 'fail'
}

export const safetyStatusLabel: Record<StatusLevel, string> = {
  pass: 'ผ่าน',
  warn: 'ใกล้เกณฑ์',
  fail: 'เกินเกณฑ์',
}

export const qualityStatusLabel: Record<StatusLevel, string> = {
  pass: 'ผ่าน',
  warn: 'ใกล้เป้า',
  fail: 'ต่ำกว่าเป้า',
}
