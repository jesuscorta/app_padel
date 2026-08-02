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
 * Si los 2 partidos de la jornada tienen ganador, la marca como finalizada
 * y pone en curso la siguiente (si existe).
 */
export async function advanceRoundIfComplete(roundId: string): Promise<void> {
  const { data: matches, error } = await supabase
    .from('matches')
    .select('winner_pair_id')
    .eq('round_id', roundId)
  if (error) throw error
  const complete = matches.length > 0 && matches.every((m) => m.winner_pair_id !== null)
  if (!complete) return

  const { error: closeError } = await supabase
    .from('rounds')
    .update({ status: 'finished' })
    .eq('id', roundId)
  if (closeError) throw closeError

  const { data: round, error: roundError } = await supabase
    .from('rounds')
    .select('league_id, number')
    .eq('id', roundId)
    .single()
  if (roundError) throw roundError

  const { error: nextError } = await supabase
    .from('rounds')
    .update({ status: 'current' })
    .eq('league_id', round.league_id)
    .eq('number', round.number + 1)
  if (nextError) throw nextError
}
