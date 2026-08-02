/**
 * Reparte las pelotas de los partidos entre los titulares de forma equilibrada:
 * siempre se asigna a quien menos turnos lleva y los empates se rompen al azar.
 * Devuelve un mapa matchId → playerId.
 */
export function assignBallDuties(
  matchIds: readonly string[],
  titularIds: readonly string[],
  rng: () => number = Math.random,
): Map<string, string> {
  if (titularIds.length === 0) throw new Error('No hay titulares para repartir las pelotas')
  const counts = new Map<string, number>(titularIds.map((id) => [id, 0]))
  const result = new Map<string, string>()
  for (const matchId of matchIds) {
    const min = Math.min(...counts.values())
    const candidates = titularIds.filter((id) => counts.get(id) === min)
    const chosen = candidates[Math.floor(rng() * candidates.length)]
    result.set(matchId, chosen)
    counts.set(chosen, (counts.get(chosen) ?? 0) + 1)
  }
  return result
}
