import { apiPost } from '../api'

/** Sustituye temporalmente al titular en un slot concreto del partido sin tocar la pareja de la ronda. */
export async function setActualPlayer(
  matchId: string,
  pairId: string,
  titularId: string,
  actualPlayerId: string,
): Promise<void> {
  await apiPost('/api/admin/substitutions', { matchId, pairId, titularId, actualPlayerId })
}
