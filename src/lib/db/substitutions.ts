import { supabase } from '../supabase'

/** Sustituye temporalmente al titular en un slot concreto del partido sin tocar la pareja de la ronda. */
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
