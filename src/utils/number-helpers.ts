export function parsePct(pctStr: string): number {
  return parseInt(pctStr) || 0
}

/** Page number list: up to ±2 around current, clamped to [1, total]. */
export function visiblePages(current: number, total: number): number[] {
  const lo = Math.max(1, current - 2)
  const hi = Math.min(total, current + 2)
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
}
