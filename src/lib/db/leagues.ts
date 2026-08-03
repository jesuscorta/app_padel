import { supabase } from '../supabase'
import { generateRoundMatches, generateRoundPairings } from '../schedule'
import { assignBallDuties } from '../balls'
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
  const { error } = await supabase
    .from('leagues')
    .update({ status: 'finished', finished_at: new Date().toISOString() })
    .eq('id', leagueId)
  if (error) throw error
}

export async function deleteLeague(leagueId: string): Promise<void> {
  const { error } = await supabase.from('leagues').delete().eq('id', leagueId)
  if (error) throw error
}

/**
 * Crea una liga activa completa: 7 rondas, 3 jornadas por ronda,
 * 4 parejas temporales por ronda, 42 partidos y alineación inicial.
 * Si algo falla a mitad, borra la liga en cascada para no dejar datos a medias.
 */
export async function createLeague(name: string, playerIds: string[]): Promise<string> {
  if (playerIds.length !== 8) throw new Error('Se necesitan exactamente 8 titulares activos')
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .insert({ name: name.trim(), status: 'active' })
    .select()
    .single()
  if (leagueError) throw leagueError
  const leagueId = (league as League).id

  try {
    // 2. Rondas: la primera queda en curso
    const { data: roundsData, error: roundsError } = await supabase
      .from('rounds')
      .insert(
        Array.from({ length: 7 }, (_, index) => ({
          league_id: leagueId,
          number: index + 1,
          status: index === 0 ? 'current' : 'pending',
        })),
      )
      .select()
    if (roundsError) throw roundsError
    const rounds = roundsData as Round[]
    const roundIdByNumber = new Map(rounds.map((round) => [round.number, round.id]))

    // 3. Jornadas: 3 por ronda; la primera de la primera ronda queda en curso
    const { data: roundDaysData, error: roundDaysError } = await supabase
      .from('round_days')
      .insert(
        rounds.flatMap((round) =>
          Array.from({ length: 3 }, (_, index) => ({
            round_id: round.id,
            number: index + 1,
            status: round.number === 1 && index === 0 ? 'current' : 'pending',
          })),
        ),
      )
      .select()
    if (roundDaysError) throw roundDaysError
    const roundDayByRoundAndNumber = new Map(
      roundDaysData.map((day) => [`${day.round_id}:${day.number}`, day.id] as const),
    )

    // 4. Parejas temporales: 4 por ronda, sin repetir pareja en toda la liga
    const pairings = generateRoundPairings(playerIds)
    const { data: pairsData, error: pairsError } = await supabase
      .from('pairs')
      .insert(
        pairings.flatMap((round) =>
          round.pairs.map(([player1Id, player2Id], index) => ({
            league_id: leagueId,
            round_id: roundIdByNumber.get(round.round)!,
            player1_id: player1Id,
            player2_id: player2Id,
            position: index + 1,
          })),
        ),
      )
      .select()
    if (pairsError) throw pairsError
    const pairs = pairsData as Pair[]
    const pairByRoundAndPosition = new Map(
      pairs.map((pair) => [`${pair.round_id}:${pair.position}`, pair] as const),
    )

    // 5. Partidos: 6 por ronda, repartidos en 3 jornadas de 2 partidos
    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .insert(
        pairings.flatMap((round) => {
          const roundId = roundIdByNumber.get(round.round)!
          return generateRoundMatches(round.round).map((match) => ({
            round_id: roundId,
            day_id: roundDayByRoundAndNumber.get(`${roundId}:${match.day}`)!,
            position: match.position,
            pair_a_id: pairByRoundAndPosition.get(`${roundId}:${match.pairAIndex + 1}`)!.id,
            pair_b_id: pairByRoundAndPosition.get(`${roundId}:${match.pairBIndex + 1}`)!.id,
          }))
        }),
      )
      .select()
    if (matchesError) throw matchesError
    const roundNumberById = new Map(rounds.map((round) => [round.id, round.number]))
    const matches = (matchesData as Match[]).sort(
      (a, b) =>
        (roundNumberById.get(a.round_id) ?? 0) - (roundNumberById.get(b.round_id) ?? 0) ||
        a.position - b.position,
    )

    // 6. Alineación real inicial: juegan los titulares
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

    // 7. Pelotas: reparto automático equilibrado entre los 8 titulares
    const duties = assignBallDuties(matches.map((m) => m.id), playerIds)
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
