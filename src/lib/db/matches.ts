import { supabase } from '../supabase'

/** Registra (o corrige) el ganador de un partido. */
export async function setWinner(matchId: string, pairId: string): Promise<void> {
  const { error } = await supabase.from('matches').update({ winner_pair_id: pairId }).eq('id', matchId)
  if (error) throw error
}

/** Quita el resultado de un partido (corrección). */
export async function clearWinner(matchId: string): Promise<void> {
  const { error } = await supabase.from('matches').update({ winner_pair_id: null }).eq('id', matchId)
  if (error) throw error
}

/**
 * Si los 2 partidos de la jornada tienen ganador, cierra la jornada actual.
 * Si era la 3ª jornada de la ronda, cierra también la ronda y activa la siguiente.
 */
export async function advanceScheduleIfComplete(dayId: string, roundId: string): Promise<void> {
  const { data: day, error: dayError } = await supabase
    .from('round_days')
    .select('id, round_id, number, status')
    .eq('id', dayId)
    .single()
  if (dayError) throw dayError
  if (day.status !== 'current') return

  const { data: matches, error } = await supabase
    .from('matches')
    .select('winner_pair_id')
    .eq('day_id', dayId)
  if (error) throw error
  const complete = matches.length > 0 && matches.every((m) => m.winner_pair_id !== null)
  if (!complete) return

  const { error: closeDayError } = await supabase
    .from('round_days')
    .update({ status: 'finished' })
    .eq('id', dayId)
  if (closeDayError) throw closeDayError

  const { data: nextDay, error: nextDayError } = await supabase
    .from('round_days')
    .select('id')
    .eq('round_id', roundId)
    .eq('number', day.number + 1)
    .maybeSingle()
  if (nextDayError) throw nextDayError

  if (nextDay) {
    const { error: openNextDayError } = await supabase
      .from('round_days')
      .update({ status: 'current' })
      .eq('id', nextDay.id)
    if (openNextDayError) throw openNextDayError
    return
  }

  const { error: closeRoundError } = await supabase
    .from('rounds')
    .update({ status: 'finished' })
    .eq('id', roundId)
  if (closeRoundError) throw closeRoundError

  const { data: round, error: roundError } = await supabase
    .from('rounds')
    .select('league_id, number')
    .eq('id', roundId)
    .single()
  if (roundError) throw roundError

  const { data: nextRound, error: nextRoundError } = await supabase
    .from('rounds')
    .select('id')
    .eq('league_id', round.league_id)
    .eq('number', round.number + 1)
    .maybeSingle()
  if (nextRoundError) throw nextRoundError
  if (!nextRound) return

  const { error: nextError } = await supabase
    .from('rounds')
    .update({ status: 'current' })
    .eq('id', nextRound.id)
  if (nextError) throw nextError

  const { error: firstDayError } = await supabase
    .from('round_days')
    .update({ status: 'current' })
    .eq('round_id', nextRound.id)
    .eq('number', 1)
  if (firstDayError) throw firstDayError
}
