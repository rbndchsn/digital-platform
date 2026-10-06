/** Deterministic ids, hashes and pseudo-random numbers so the seed is stable between boots. */

const counters = new Map<string, number>()

export function resetIds(): void {
  counters.clear()
}

export function seedId(prefix: string): string {
  const n = (counters.get(prefix) ?? 0) + 1
  counters.set(prefix, n)
  return `${prefix}_${String(n).padStart(3, '0')}`
}

/** Runtime ids (created by demo actions) are time-based so they never collide with seed ids. */
export function runtimeId(prefix: string): string {
  const t = Date.now().toString(36)
  const r = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${t}${r}`
}

/** FNV-1a 32-bit, stretched to a 64-hex "sha256-looking" digest. Demo only. */
export function fakeSha256(input: string): string {
  let h = 0x811c9dc5
  let out = ''
  for (let round = 0; round < 8; round++) {
    const s = `${input}:${round}`
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i)
      h = Math.imul(h, 0x01000193) >>> 0
    }
    out += h.toString(16).padStart(8, '0')
  }
  return out
}

/** Mulberry32 PRNG. */
export function prng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function publicCode(seed: string): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const h = fakeSha256(seed)
  let out = 'VX-'
  for (let i = 0; i < 8; i++) {
    out += alphabet[parseInt(h.slice(i * 2, i * 2 + 2), 16) % alphabet.length]
    if (i === 3) out += '-'
  }
  return out
}
