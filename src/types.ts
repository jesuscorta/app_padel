export type PlayerRole = 'titular' | 'sustituto'
export type LeagueStatus = 'active' | 'finished'
export type RoundStatus = 'pending' | 'current' | 'finished'
export type RoundDayStatus = 'pending' | 'current' | 'finished'

export interface Player {
  id: string
  name: string
  role: PlayerRole
  active: boolean
  created_at: string
}

export interface League {
  id: string
  name: string
  status: LeagueStatus
  created_at: string
  finished_at: string | null
}

/** Pareja temporal creada dentro de una ronda concreta. */
export interface Pair {
  id: string
  league_id: string
  round_id: string
  player1_id: string
  player2_id: string
  position: number
}

export interface Round {
  id: string
  league_id: string
  number: number
  status: RoundStatus
}

export interface RoundDay {
  id: string
  round_id: string
  number: number
  status: RoundDayStatus
}

export interface Match {
  id: string
  round_id: string
  day_id: string
  position: number
  pair_a_id: string
  pair_b_id: string
  winner_pair_id: string | null
  created_at: string
}

export interface MatchPlayer {
  id: string
  match_id: string
  pair_id: string
  titular_id: string
  actual_player_id: string
}

export interface BallDuty {
  id: string
  match_id: string
  player_id: string
}

/** Datos de una liga ensamblados en cliente (el volumen es mínimo). */
export interface LeagueData {
  league: League
  pairs: Pair[]
  rounds: Round[]
  roundDays: RoundDay[]
  matches: Match[]
  matchPlayers: MatchPlayer[]
  ballDuties: BallDuty[]
}
