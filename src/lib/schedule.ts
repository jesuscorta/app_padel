export interface RoundPairing {
  round: number
  pairs: [string, string][]
}

export interface RoundMatch {
  round: number
  day: number
  position: number
  pairAIndex: number
  pairBIndex: number
}

/**
 * Genera 7 rondas de parejas para 8 jugadores.
 * Usa el método del círculo sobre los jugadores para que cada uno comparta
 * pareja exactamente una vez con cada uno de los otros 7.
 */
export function generateRoundPairings(playerIds: readonly string[]): RoundPairing[] {
  if (playerIds.length !== 8) throw new Error('Se necesitan 8 jugadores para generar las rondas')
  const rotation = [...playerIds]
  const rounds: RoundPairing[] = []

  for (let round = 1; round <= 7; round++) {
    rounds.push({
      round,
      pairs: [0, 1, 2, 3].map((index) => [rotation[index], rotation[7 - index]] as [string, string]),
    })

    // Fijamos el primer jugador y rotamos el resto.
    rotation.splice(1, 0, rotation.pop()!)
  }

  return rounds
}

/**
 * Dadas las 4 parejas temporales de una ronda, genera sus 6 enfrentamientos
 * todos contra todos, repartidos en 3 jornadas de 2 partidos.
 * `pairAIndex` y `pairBIndex` apuntan al array `pairs`.
 */
export function generateRoundMatches(round: number): RoundMatch[] {
  return [
    { round, day: 1, position: 1, pairAIndex: 0, pairBIndex: 1 },
    { round, day: 1, position: 2, pairAIndex: 2, pairBIndex: 3 },
    { round, day: 2, position: 1, pairAIndex: 0, pairBIndex: 2 },
    { round, day: 2, position: 2, pairAIndex: 1, pairBIndex: 3 },
    { round, day: 3, position: 1, pairAIndex: 0, pairBIndex: 3 },
    { round, day: 3, position: 2, pairAIndex: 1, pairBIndex: 2 },
  ]
}
