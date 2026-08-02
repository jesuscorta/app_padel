import { supabase } from '../supabase'

/** Asigna (o corrige) el responsable de las pelotas de un partido. */
export async function updateBallDuty(matchId: string, playerId: string): Promise<void> {
  const { error } = await supabase
    .from('ball_duties')
    .upsert({ match_id: matchId, player_id: playerId }, { onConflict: 'match_id' })
  if (error) throw error
}
