import { apiPost } from '../api'
import { supabase } from '../supabase'
import type { Player, PlayerRole } from '../../types'

export async function listPlayers(): Promise<Player[]> {
  const { data, error } = await supabase.from('players').select('*').order('created_at')
  if (error) throw error
  return data as Player[]
}

export async function createPlayer(name: string, role: PlayerRole): Promise<void> {
  await apiPost('/api/admin/players', { action: 'create', name, role })
}

export async function updatePlayer(id: string, patch: Partial<Pick<Player, 'name' | 'active'>>): Promise<void> {
  await apiPost('/api/admin/players', { action: 'update', id, ...patch })
}
