import type { Pair, Player } from '../types'
import { playerName } from './LeagueContext'

/** "Ana & Luis" */
export function pairLabel(players: Player[], pair: Pair | undefined): string {
  if (!pair) return '—'
  return `${playerName(players, pair.player1_id)} & ${playerName(players, pair.player2_id)}`
}
