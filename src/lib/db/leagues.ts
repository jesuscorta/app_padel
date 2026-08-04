import { apiPost } from '../api'
import { supabase } from '../supabase'
import type { BallDuty, League, LeagueData, Match, MatchPlayer, Pair, Round, RoundDay } from '../../types'

function unwrap<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data
}

export async function getActiveLeagueData(): Promise<LeagueData | null> {
  const { data: league, error } = await supabase
    .from('leagues')
    .select('*')
    .eq('status', 'active')
    .maybeSingle()
  if (error) throw error
  if (!league) return null
  return getLeagueData(league as League)
}

/** Carga toda la liga con consultas planas y ensamblado en cliente (volumen mínimo). */
export async function getLeagueData(league: League): Promise<LeagueData> {
  const rounds = unwrap(
    await supabase.from('rounds').select('*').eq('league_id', league.id).order('number'),
  ) as Round[]
  const roundNumberById = new Map(rounds.map((round) => [round.id, round.number]))
  const roundIds = rounds.map((r) => r.id)
  const roundDays = roundIds.length
    ? (unwrap(await supabase.from('round_days').select('*').in('round_id', roundIds)) as RoundDay[]).sort(
        (a, b) =>
          (roundNumberById.get(a.round_id) ?? 0) - (roundNumberById.get(b.round_id) ?? 0) ||
          a.number - b.number,
      )
    : []
  const pairs = (unwrap(await supabase.from('pairs').select('*').eq('league_id', league.id)) as Pair[]).sort(
    (a, b) =>
      (roundNumberById.get(a.round_id) ?? 0) - (roundNumberById.get(b.round_id) ?? 0) ||
      a.position - b.position,
  )
  const matches = roundIds.length
    ? (unwrap(await supabase.from('matches').select('*').in('round_id', roundIds)) as Match[]).sort(
        (a, b) =>
          (roundNumberById.get(a.round_id) ?? 0) - (roundNumberById.get(b.round_id) ?? 0) ||
          a.position - b.position,
      )
    : []
  const matchIds = matches.map((m) => m.id)
  const matchPlayers = matchIds.length
    ? (unwrap(await supabase.from('match_players').select('*').in('match_id', matchIds)) as MatchPlayer[])
    : []
  const ballDuties = matchIds.length
    ? (unwrap(await supabase.from('ball_duties').select('*').in('match_id', matchIds)) as BallDuty[])
    : []
  return { league, pairs, rounds, roundDays, matches, matchPlayers, ballDuties }
}

export async function listFinishedLeagues(): Promise<League[]> {
  return unwrap(
    await supabase
      .from('leagues')
      .select('*')
      .eq('status', 'finished')
      .order('finished_at', { ascending: false }),
  ) as League[]
}

export async function finishLeague(leagueId: string): Promise<void> {
  await apiPost('/api/admin/leagues', { action: 'finish', leagueId })
}

export async function deleteLeague(leagueId: string): Promise<void> {
  await apiPost('/api/admin/leagues', { action: 'delete', leagueId })
}

/**
 * Crea una liga activa completa: 7 rondas, 3 jornadas por ronda,
 * 4 parejas temporales por ronda, 42 partidos y alineación inicial.
 * Si algo falla a mitad, borra la liga en cascada para no dejar datos a medias.
 */
export async function createLeague(name: string, playerIds: string[]): Promise<string> {
  const payload = await apiPost<{ leagueId: string }>('/api/admin/leagues', {
    action: 'create',
    name,
    playerIds,
  })
  return payload.leagueId
}
