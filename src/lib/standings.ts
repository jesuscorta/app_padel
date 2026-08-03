import type { Match, MatchPlayer, Pair, Player, PlayerRole } from '../types'

export type StandingsMode = 'titulares' | 'todos'

export interface StandingRow {
  playerId: string
  name: string
  role: PlayerRole
  played: number
  wins: number
  points: number
  winRate: number
}

interface ComputeStandingsInput {
  players: Player[]
  pairs: Pair[]
  matches: Match[]
  matchPlayers: MatchPlayer[]
  mode: StandingsMode
  roundId?: string
}

/**
 * La clasificación se calcula sobre quién jugó realmente el partido.
 * Vista "solo titulares": muestra únicamente a los 8 titulares de la liga.
 * Vista "incluyendo sustitutos": añade a los sustitutos que sí llegaron a jugar.
 */
export function computeStandings({
  players,
  pairs,
  matches,
  matchPlayers,
  mode,
  roundId,
}: ComputeStandingsInput): StandingRow[] {
  const relevantMatches = roundId ? matches.filter((match) => match.round_id === roundId) : matches
  const relevantMatchIds = new Set(relevantMatches.map((match) => match.id))
  const relevantMatchPlayers = roundId
    ? matchPlayers.filter((slot) => relevantMatchIds.has(slot.match_id))
    : matchPlayers
  const playerById = new Map(players.map((player) => [player.id, player]))
  const titularIds = [...new Set(pairs.flatMap((pair) => [pair.player1_id, pair.player2_id]))]
  const substituteIdsWhoPlayed = [
    ...new Set(relevantMatchPlayers.map((slot) => slot.actual_player_id)),
  ].filter((playerId) => playerById.get(playerId)?.role === 'sustituto')

  const relevantIds =
    mode === 'titulares' ? titularIds : [...new Set([...titularIds, ...substituteIdsWhoPlayed])]

  const rows = new Map<string, StandingRow>()
  for (const playerId of relevantIds) {
    const player = playerById.get(playerId)
    if (!player) continue
    rows.set(playerId, {
      playerId,
      name: player.name,
      role: player.role,
      played: 0,
      wins: 0,
      points: 0,
      winRate: 0,
    })
  }

  for (const match of relevantMatches) {
    if (!match.winner_pair_id) continue
    const slots = relevantMatchPlayers.filter((slot) => slot.match_id === match.id)
    const playedIds = [...new Set(slots.map((slot) => slot.actual_player_id))]
    for (const playerId of playedIds) {
      const row = rows.get(playerId)
      if (row) row.played += 1
    }

    const winnerIds = [
      ...new Set(
        slots
          .filter((slot) => slot.pair_id === match.winner_pair_id)
          .map((slot) => slot.actual_player_id),
      ),
    ]
    for (const playerId of winnerIds) {
      const row = rows.get(playerId)
      if (!row) continue
      row.wins += 1
      row.points += 3
    }
  }

  return [...rows.values()]
    .map((row) => ({
      ...row,
      winRate: row.played === 0 ? 0 : row.wins / row.played,
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      if (b.winRate !== a.winRate) return b.winRate - a.winRate
      if (a.played !== b.played) return a.played - b.played
      return a.name.localeCompare(b.name)
    })
}
