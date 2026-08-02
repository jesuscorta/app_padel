import { supabase } from '../supabase'

/** Crea un sustituto y devuelve su id para asignarlo al vuelo. */
export async function createSubstitute(name: string): Promise<string> {
  const { data, error } = await supabase
    .from('players')
    .insert({ name: name.trim(), role: 'sustituto' })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

/** Sustituye temporalmente al titular en un slot concreto del partido. */
export async function setActualPlayer(
  matchId: string,
  pairId: string,
  titularId: string,
  actualPlayerId: string,
): Promise<void> {
  const { error } = await supabase
    .from('match_players')
    .update({ actual_player_id: actualPlayerId })
    .eq('match_id', matchId)
    .eq('pair_id', pairId)
    .eq('titular_id', titularId)
  if (error) throw error
}
