/**
 * Baraja una copia del array con Fisher-Yates.
 * `rng` inyectable para tests deterministas.
 */
export function shuffle<T>(input: readonly T[], rng: () => number = Math.random): T[] {
  const a = [...input]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
