import { apiPost } from '../api'

/** Asigna (o corrige) el responsable de las pelotas de un partido. */
export async function updateBallDuty(matchId: string, playerId: string): Promise<void> {
  await apiPost('/api/admin/balls', { matchId, playerId })
}
