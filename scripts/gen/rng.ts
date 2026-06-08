// ─── Deterministic, key-addressable RNG ──────────────────────────────────────
// Every random value is derived from a STRING KEY (e.g. `${patientId}:weight`),
// not a running sequence. So generating a longer window — or adding patients —
// leaves every existing value byte-stable (clean diffs, reproducible output).
// See PLAN-DATA-SCALING.md §4.2 #3.
// ─────────────────────────────────────────────────────────────────────────────

const GLOBAL_SEED = 'bma-dd-ats-v1'

/** xmur3 string hasher → seed generator */
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return (h ^= h >>> 16) >>> 0
  }
}

/** mulberry32 PRNG */
function mulberry32(a: number): () => number {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A float in [0,1) deterministic for the given key. */
export function rand(key: string): number {
  return mulberry32(xmur3(`${GLOBAL_SEED}:${key}`)())()
}

/** Integer in [min, max] inclusive. */
export function randInt(key: string, min: number, max: number): number {
  return min + Math.floor(rand(key) * (max - min + 1))
}

/** Float in [min, max), rounded to `decimals`. */
export function randFloat(key: string, min: number, max: number, decimals = 1): number {
  const v = min + rand(key) * (max - min)
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

/** true with probability p. */
export function chance(key: string, p: number): boolean {
  return rand(key) < p
}

/** Uniform pick from an array. */
export function pick<T>(key: string, arr: readonly T[]): T {
  return arr[Math.floor(rand(key) * arr.length)]
}

/** Weighted pick: items with relative weights. */
export function weighted<T>(key: string, items: readonly (readonly [T, number])[]): T {
  const total = items.reduce((s, [, w]) => s + w, 0)
  let r = rand(key) * total
  for (const [val, w] of items) {
    if ((r -= w) < 0) return val
  }
  return items[items.length - 1][0]
}

/** Deterministic Fisher-Yates shuffle (does not mutate input). */
export function shuffle<T>(key: string, arr: readonly T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand(`${key}:${i}`) * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Normal-ish value via averaging (central limit), clamped to [min,max]. */
export function randNormal(key: string, mean: number, sd: number, min: number, max: number, decimals = 1): number {
  let s = 0
  for (let i = 0; i < 4; i++) s += rand(`${key}:n${i}`)
  // mean of 4 uniforms has sd = sqrt((1/12)/4) = 0.14434 → ×6.9282 gives unit variance
  const z = (s / 4 - 0.5) * 6.9282
  const v = Math.min(max, Math.max(min, mean + z * sd))
  const f = 10 ** decimals
  return Math.round(v * f) / f
}
