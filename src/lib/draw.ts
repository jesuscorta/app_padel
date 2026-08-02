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

/** Reparte 8 elementos en 4 parejas aleatorias. */
export function drawPairs<T>(items: readonly T[], rng: () => number = Math.random): [T, T][] {
  if (items.length !== 8) throw new Error('Se necesitan exactamente 8 jugadores para el sorteo')
  const s = shuffle(items, rng)
  return [
    [s[0], s[1]],
    [s[2], s[3]],
    [s[4], s[5]],
    [s[6], s[7]],
  ]
}
