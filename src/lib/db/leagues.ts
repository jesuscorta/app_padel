import { supabase } from '../supabase'
import { generateCalendar } from '../schedule'
import { assignBallDuties } from '../balls'
import type { BallDuty, League, LeagueData, Match, MatchPlayer, Pair, Round } from '../../types'

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
  const pairs = unwrap(
    await supabase.from('pairs').select('*').eq('league_id', league.id).order('position'),
  ) as Pair[]
  const rounds = unwrap(
    await supabase.from('rounds').select('*').eq('league_id', league.id).order('number'),
  ) as Round[]
  const roundIds = rounds.map((r) => r.id)
  const matches = roundIds.length
    ? (unwrap(
        await supabase.from('matches').select('*').in('round_id', roundIds).order('position'),
      ) as Match[])
    : []
  const matchIds = matches.map((m) => m.id)
  const matchPlayers = matchIds.length
    ? (unwrap(await supabase.from('match_players').select('*').in('match_id', matchIds)) as MatchPlayer[])
    : []
  const ballDuties = matchIds.length
    ? (unwrap(await supabase.from('ball_duties').select('*').in('match_id', matchIds)) as BallDuty[])
    : []
  return { league, pairs, rounds, matches, matchPlayers, ballDuties }
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
  const { error } = await supabase
    .from('leagues')
    .update({ status: 'finished', finished_at: new Date().toISOString() })
    .eq('id', leagueId)
  if (error) throw error
}

export interface DrawnPair {
  player1Id: string
  player2Id: string
}

/**
 * Crea una liga activa completa: 4 parejas fijas, 3 jornadas (la 1ª en curso),
 * 6 partidos de round-robin y la alineación real inicial (sin ausencias).
 * Si algo falla a mitad, borra la liga en cascada para no dejar datos a medias.
 */
export async function createLeague(name: string, drawnPairs: DrawnPair[]): Promise<string> {
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .insert({ name: name.trim(), status: 'active' })
    .select()
    .single()
  if (leagueError) throw leagueError
  const leagueId = (league as League).id

  try {
    // 2. Parejas fijas (orden = posición del sorteo)
    const { data: pairsData, error: pairsError } = await supabase
      .from('pairs')
      .insert(
        drawnPairs.map((p, i) => ({
          league_id: leagueId,
          player1_id: p.player1Id,
          player2_id: p.player2Id,
          position: i + 1,
        })),
      )
      .select()
      .order('position')
    if (pairsError) throw pairsError
    const pairs = pairsData as Pair[]
    const pairIds = pairs.map((p) => p.id)

    // 3. Jornadas: la primera queda en curso
    const { data: roundsData, error: roundsError } = await supabase
      .from('rounds')
      .insert([
        { league_id: leagueId, number: 1, status: 'current' },
        { league_id: leagueId, number: 2, status: 'pending' },
        { league_id: leagueId, number: 3, status: 'pending' },
      ])
      .select()
    if (roundsError) throw roundsError
    const roundIdByNumber = new Map((roundsData as Round[]).map((r) => [r.number, r.id]))

    // 4. Partidos: calendario automático todos contra todos
    const calendar = generateCalendar(pairIds)
    const positionInRound = new Map<number, number>()
    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .insert(
        calendar.map((m) => {
          const pos = (positionInRound.get(m.round) ?? 0) + 1
          positionInRound.set(m.round, pos)
          return {
            round_id: roundIdByNumber.get(m.round)!,
            position: pos,
            pair_a_id: m.pairA,
            pair_b_id: m.pairB,
          }
        }),
      )
      .select()
    if (matchesError) throw matchesError
    const matches = matchesData as Match[]

    // 5. Alineación real inicial: juegan los titulares
    const pairById = new Map(pairs.map((p) => [p.id, p]))
    const lineup = matches.flatMap((m) => {
      const a = pairById.get(m.pair_a_id)!
      const b = pairById.get(m.pair_b_id)!
      return [a, b].flatMap((pair) => [
        {
          match_id: m.id,
          pair_id: pair.id,
          titular_id: pair.player1_id,
          actual_player_id: pair.player1_id,
        },
        {
          match_id: m.id,
          pair_id: pair.id,
          titular_id: pair.player2_id,
          actual_player_id: pair.player2_id,
        },
      ])
    })
    const { error: lineupError } = await supabase.from('match_players').insert(lineup)
    if (lineupError) throw lineupError

    // 6. Pelotas: reparto automático equilibrado entre los 8 titulares
    const titularIds = drawnPairs.flatMap((p) => [p.player1Id, p.player2Id])
    const duties = assignBallDuties(
      matches.map((m) => m.id),
      titularIds,
    )
    const { error: dutiesError } = await supabase
      .from('ball_duties')
      .insert([...duties].map(([match_id, player_id]) => ({ match_id, player_id })))
    if (dutiesError) throw dutiesError

    return leagueId
  } catch (e) {
    await supabase.from('leagues').delete().eq('id', leagueId)
    throw e
  }
}
