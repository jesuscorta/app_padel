import type { IncomingMessage, ServerResponse } from 'node:http'
import { assignBallDuties } from '../balls'
import { generateRoundMatches, generateRoundPairings } from '../schedule'
import { readJson, json, methodNotAllowed } from './http'
import { adminClient } from './supabase-admin'
import { clearSessionCookie, createSessionCookie, getRoleFromCookie, type SessionRole } from './session'
import { computeMatchScore, type MatchScoreInput } from '../scoring'

function unwrap<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data
}

const accessAttempts = new Map<string, { count: number; resetAt: number }>()

function clientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) return forwarded.split(',')[0].trim()
  return req.socket.remoteAddress ?? 'unknown'
}

function hitRateLimit(req: IncomingMessage): boolean {
  const ip = clientIp(req)
  const now = Date.now()
  const current = accessAttempts.get(ip)
  if (!current || current.resetAt < now) {
    accessAttempts.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 })
    return false
  }
  current.count += 1
  accessAttempts.set(ip, current)
  return current.count > 10
}

function clearRateLimit(req: IncomingMessage) {
  accessAttempts.delete(clientIp(req))
}

function requireAdmin(req: IncomingMessage) {
  const role = getRoleFromCookie(req.headers.cookie)
  if (role !== 'admin') throw new Error('No autorizado')
}

async function createLeagueMutation(name: string, playerIds: string[]) {
  const supabase = adminClient()
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .insert({ name: name.trim(), status: 'active' })
    .select()
    .single()
  if (leagueError) throw leagueError
  const leagueId = league.id as string

  try {
    const rounds = unwrap(
      await supabase
        .from('rounds')
        .insert(
          Array.from({ length: 7 }, (_, index) => ({
            league_id: leagueId,
            number: index + 1,
            status: index === 0 ? 'current' : 'pending',
          })),
        )
        .select(),
    ) as Array<{ id: string; number: number }>

    const roundIdByNumber = new Map(rounds.map((round) => [round.number, round.id]))

    const roundDaysData = unwrap(
      await supabase
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
        .select(),
    ) as Array<{ id: string; round_id: string; number: number }>
    const roundDayByRoundAndNumber = new Map(
      roundDaysData.map((day) => [`${day.round_id}:${day.number}`, day.id] as const),
    )

    const pairings = generateRoundPairings(playerIds)
    const pairs = unwrap(
      await supabase
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
        .select(),
    ) as Array<{ id: string; round_id: string; position: number; player1_id: string; player2_id: string }>
    const pairByRoundAndPosition = new Map(pairs.map((pair) => [`${pair.round_id}:${pair.position}`, pair] as const))

    const matches = unwrap(
      await supabase
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
        .select(),
    ) as Array<{ id: string; pair_a_id: string; pair_b_id: string }>

    const pairById = new Map(pairs.map((pair) => [pair.id, pair]))
    const lineup = matches.flatMap((match) => {
      const a = pairById.get(match.pair_a_id)!
      const b = pairById.get(match.pair_b_id)!
      return [a, b].flatMap((pair) => [
        { match_id: match.id, pair_id: pair.id, titular_id: pair.player1_id, actual_player_id: pair.player1_id },
        { match_id: match.id, pair_id: pair.id, titular_id: pair.player2_id, actual_player_id: pair.player2_id },
      ])
    })
    const { error: lineupError } = await supabase.from('match_players').insert(lineup)
    if (lineupError) throw lineupError

    const duties = assignBallDuties(matches.map((match) => match.id), playerIds)
    const { error: dutiesError } = await supabase
      .from('ball_duties')
      .insert([...duties].map(([match_id, player_id]) => ({ match_id, player_id })))
    if (dutiesError) throw dutiesError

    return leagueId
  } catch (error) {
    await adminClient().from('leagues').delete().eq('id', leagueId)
    throw error
  }
}

async function saveMatchScoreMutation(matchId: string, score: MatchScoreInput) {
  const supabase = adminClient()
  const { data: match, error: matchError } = await supabase.from('matches').select('*').eq('id', matchId).single()
  if (matchError) throw matchError
  const summary = computeMatchScore(score)
  if (!summary) throw new Error('Marcador inválido')

  const winnerPairId = summary.winnerSide === 'a' ? match.pair_a_id : match.pair_b_id
  const { error: saveError } = await supabase
    .from('matches')
    .update({
      set1_a: score.set1A,
      set1_b: score.set1B,
      set1_tb_a: score.set1TbA,
      set1_tb_b: score.set1TbB,
      set2_a: score.set2A,
      set2_b: score.set2B,
      set2_tb_a: score.set2TbA,
      set2_tb_b: score.set2TbB,
      set3_a: score.set3A,
      set3_b: score.set3B,
      set3_tb_a: score.set3TbA,
      set3_tb_b: score.set3TbB,
      set3_incomplete: score.set3Incomplete,
      winner_pair_id: winnerPairId,
    })
    .eq('id', matchId)
  if (saveError) throw saveError

  await advanceScheduleIfCompleteMutation(match.day_id as string, match.round_id as string)
}

async function clearMatchScoreMutation(matchId: string) {
  const supabase = adminClient()
  const { error } = await supabase
    .from('matches')
    .update({
      set1_a: null,
      set1_b: null,
      set1_tb_a: null,
      set1_tb_b: null,
      set2_a: null,
      set2_b: null,
      set2_tb_a: null,
      set2_tb_b: null,
      set3_a: null,
      set3_b: null,
      set3_tb_a: null,
      set3_tb_b: null,
      set3_incomplete: false,
      winner_pair_id: null,
    })
    .eq('id', matchId)
  if (error) throw error
}

async function advanceScheduleIfCompleteMutation(dayId: string, roundId: string) {
  const supabase = adminClient()
  const day = unwrap(
    await supabase.from('round_days').select('id, round_id, number, status').eq('id', dayId).single(),
  ) as { id: string; round_id: string; number: number; status: 'pending' | 'current' | 'finished' }
  if (day.status !== 'current') return
  const matches = unwrap(
    await supabase.from('matches').select('winner_pair_id').eq('day_id', dayId),
  ) as Array<{ winner_pair_id: string | null }>
  const complete = matches.length > 0 && matches.every((m) => m.winner_pair_id !== null)
  if (!complete) return

  let error = (await supabase.from('round_days').update({ status: 'finished' }).eq('id', dayId)).error
  if (error) throw error

  const nextDay = unwrap(
    await supabase.from('round_days').select('id').eq('round_id', roundId).eq('number', day.number + 1).maybeSingle(),
  ) as { id: string } | null
  if (nextDay) {
    error = (await supabase.from('round_days').update({ status: 'current' }).eq('id', nextDay.id)).error
    if (error) throw error
    return
  }

  error = (await supabase.from('rounds').update({ status: 'finished' }).eq('id', roundId)).error
  if (error) throw error
  const round = unwrap(
    await supabase.from('rounds').select('league_id, number').eq('id', roundId).single(),
  ) as { league_id: string; number: number }
  const nextRound = unwrap(
    await supabase.from('rounds').select('id').eq('league_id', round.league_id).eq('number', round.number + 1).maybeSingle(),
  ) as { id: string } | null
  if (!nextRound) return
  error = (await supabase.from('rounds').update({ status: 'current' }).eq('id', nextRound.id)).error
  if (error) throw error
  error = (await supabase.from('round_days').update({ status: 'current' }).eq('round_id', nextRound.id).eq('number', 1)).error
  if (error) throw error
}

export async function handleAccess(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res)
  if (hitRateLimit(req)) return json(res, 429, { error: 'Demasiados intentos. Espera unos minutos.' })
  const body = (await readJson(req)) as { role?: SessionRole; code?: string }
  const role = body.role
  const code = body.code?.trim()
  const participantCode = process.env.PARTICIPANT_CODE
  const adminPin = process.env.ADMIN_PIN
  const valid =
    (role === 'participant' && participantCode && code === participantCode) ||
    (role === 'admin' && adminPin && code === adminPin)
  if (!valid || !role) return json(res, 401, { error: 'Código incorrecto' })
  clearRateLimit(req)
  return json(res, 200, { role }, { 'Set-Cookie': createSessionCookie(role) })
}

export async function handleSession(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res)
  return json(res, 200, { role: getRoleFromCookie(req.headers.cookie) })
}

export async function handleLogout(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res)
  return json(res, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie() })
}

export async function handleAdminPlayers(req: IncomingMessage, res: ServerResponse) {
  try {
    requireAdmin(req)
    if (req.method !== 'POST') return methodNotAllowed(res)
    const body = (await readJson(req)) as { action: 'create' | 'update'; id?: string; name?: string; role?: 'titular' | 'sustituto'; active?: boolean }
    if (body.action === 'create') {
      const { error } = await adminClient().from('players').insert({ name: body.name?.trim(), role: body.role })
      if (error) throw error
      return json(res, 200, { ok: true })
    }
    const { error } = await adminClient().from('players').update({ name: body.name, active: body.active }).eq('id', body.id!)
    if (error) throw error
    return json(res, 200, { ok: true })
  } catch (error) {
    return json(res, 403, { error: error instanceof Error ? error.message : 'No autorizado' })
  }
}

export async function handleAdminLeagues(req: IncomingMessage, res: ServerResponse) {
  try {
    requireAdmin(req)
    if (req.method !== 'POST') return methodNotAllowed(res)
    const body = (await readJson(req)) as
      | { action: 'create'; name: string; playerIds: string[] }
      | { action: 'finish' | 'delete'; leagueId: string }
    if (body.action === 'create') {
      const leagueId = await createLeagueMutation(body.name, body.playerIds)
      return json(res, 200, { leagueId })
    }
    if (body.action === 'finish') {
      const { error } = await adminClient().from('leagues').update({ status: 'finished', finished_at: new Date().toISOString() }).eq('id', body.leagueId)
      if (error) throw error
      return json(res, 200, { ok: true })
    }
    const { error } = await adminClient().from('leagues').delete().eq('id', body.leagueId)
    if (error) throw error
    return json(res, 200, { ok: true })
  } catch (error) {
    return json(res, 403, { error: error instanceof Error ? error.message : 'No autorizado' })
  }
}

export async function handleAdminMatches(req: IncomingMessage, res: ServerResponse) {
  try {
    requireAdmin(req)
    if (req.method !== 'POST') return methodNotAllowed(res)
    const body = (await readJson(req)) as
      | { action: 'save'; matchId: string; score: MatchScoreInput }
      | { action: 'clear'; matchId: string }
    if (body.action === 'save') {
      await saveMatchScoreMutation(body.matchId, body.score)
      return json(res, 200, { ok: true })
    }
    await clearMatchScoreMutation(body.matchId)
    return json(res, 200, { ok: true })
  } catch (error) {
    return json(res, 403, { error: error instanceof Error ? error.message : 'No autorizado' })
  }
}

export async function handleAdminSubstitutions(req: IncomingMessage, res: ServerResponse) {
  try {
    requireAdmin(req)
    if (req.method !== 'POST') return methodNotAllowed(res)
    const body = (await readJson(req)) as { matchId: string; pairId: string; titularId: string; actualPlayerId: string }
    const { error } = await adminClient()
      .from('match_players')
      .update({ actual_player_id: body.actualPlayerId })
      .eq('match_id', body.matchId)
      .eq('pair_id', body.pairId)
      .eq('titular_id', body.titularId)
    if (error) throw error
    return json(res, 200, { ok: true })
  } catch (error) {
    return json(res, 403, { error: error instanceof Error ? error.message : 'No autorizado' })
  }
}

export async function handleAdminBalls(req: IncomingMessage, res: ServerResponse) {
  try {
    requireAdmin(req)
    if (req.method !== 'POST') return methodNotAllowed(res)
    const body = (await readJson(req)) as { matchId: string; playerId: string }
    const { error } = await adminClient()
      .from('ball_duties')
      .upsert({ match_id: body.matchId, player_id: body.playerId }, { onConflict: 'match_id' })
    if (error) throw error
    return json(res, 200, { ok: true })
  } catch (error) {
    return json(res, 403, { error: error instanceof Error ? error.message : 'No autorizado' })
  }
}
