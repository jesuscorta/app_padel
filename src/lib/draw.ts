function defaultRng(): number {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const values = new Uint32Array(1)
    crypto.getRandomValues(values)
    return values[0] / 4294967296
  }
  return Math.random()
}

/**
 * Baraja una copia del array con Fisher-Yates.
 * `rng` inyectable para tests deterministas.
 */
export function shuffle<T>(input: readonly T[], rng: () => number = defaultRng): T[] {
  const a = [...input]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
