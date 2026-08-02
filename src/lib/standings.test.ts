import { describe, expect, it } from 'vitest'
import { computeStandings } from './standings'
import type { Match, MatchPlayer, Pair, Player } from '../types'

const players: Player[] = [
  { id: 't1', name: 'Ana', role: 'titular', active: true, created_at: '' },
  { id: 't2', name: 'Luis', role: 'titular', active: true, created_at: '' },
  { id: 't3', name: 'Cris', role: 'titular', active: true, created_at: '' },
  { id: 't4', name: 'Marta', role: 'titular', active: true, created_at: '' },
  { id: 't5', name: 'Pablo', role: 'titular', active: true, created_at: '' },
  { id: 't6', name: 'Nora', role: 'titular', active: true, created_at: '' },
  { id: 't7', name: 'Irene', role: 'titular', active: true, created_at: '' },
  { id: 't8', name: 'Diego', role: 'titular', active: true, created_at: '' },
  { id: 's1', name: 'Raúl', role: 'sustituto', active: true, created_at: '' },
]

const pairs: Pair[] = [
  { id: 'p1', league_id: 'l1', player1_id: 't1', player2_id: 't2', position: 1 },
  { id: 'p2', league_id: 'l1', player1_id: 't3', player2_id: 't4', position: 2 },
  { id: 'p3', league_id: 'l1', player1_id: 't5', player2_id: 't6', position: 3 },
  { id: 'p4', league_id: 'l1', player1_id: 't7', player2_id: 't8', position: 4 },
]

const matches: Match[] = [
  {
    id: 'm1',
    round_id: 'r1',
    position: 1,
    pair_a_id: 'p1',
    pair_b_id: 'p2',
    winner_pair_id: 'p1',
    created_at: '',
  },
  {
    id: 'm2',
    round_id: 'r1',
    position: 2,
    pair_a_id: 'p3',
    pair_b_id: 'p4',
    winner_pair_id: 'p3',
    created_at: '',
  },
]

const matchPlayers: MatchPlayer[] = [
  { id: '1', match_id: 'm1', pair_id: 'p1', titular_id: 't1', actual_player_id: 't1' },
  { id: '2', match_id: 'm1', pair_id: 'p1', titular_id: 't2', actual_player_id: 't2' },
  { id: '3', match_id: 'm1', pair_id: 'p2', titular_id: 't3', actual_player_id: 't3' },
  { id: '4', match_id: 'm1', pair_id: 'p2', titular_id: 't4', actual_player_id: 't4' },
  { id: '5', match_id: 'm2', pair_id: 'p3', titular_id: 't5', actual_player_id: 's1' },
  { id: '6', match_id: 'm2', pair_id: 'p3', titular_id: 't6', actual_player_id: 't6' },
  { id: '7', match_id: 'm2', pair_id: 'p4', titular_id: 't7', actual_player_id: 't7' },
  { id: '8', match_id: 'm2', pair_id: 'p4', titular_id: 't8', actual_player_id: 't8' },
]

describe('computeStandings', () => {
  it('muestra solo los titulares en la vista reducida', () => {
    const standings = computeStandings({ players, pairs, matches, matchPlayers, mode: 'titulares' })
    expect(standings).toHaveLength(8)
    expect(standings.find((row) => row.playerId === 's1')).toBeUndefined()
  })

  it('añade sustitutos que sí jugaron en la vista completa', () => {
    const standings = computeStandings({ players, pairs, matches, matchPlayers, mode: 'todos' })
    expect(standings.find((row) => row.playerId === 's1')?.points).toBe(3)
  })

  it('atribuye los puntos al jugador real, no al titular ausente', () => {
    const standings = computeStandings({ players, pairs, matches, matchPlayers, mode: 'todos' })
    expect(standings.find((row) => row.playerId === 't5')?.points).toBe(0)
    expect(standings.find((row) => row.playerId === 's1')?.wins).toBe(1)
  })

  it('ordena por puntos, luego porcentaje, luego menos partidos', () => {
    const standings = computeStandings({ players, pairs, matches, matchPlayers, mode: 'todos' })
    expect(standings[0].playerId).toBe('t1')
    expect(standings[1].playerId).toBe('t2')
  })
})
