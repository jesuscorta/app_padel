import { describe, expect, it } from 'vitest'
import { generateRoundMatches, generateRoundPairings } from './schedule'

const PLAYERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

describe('generateRoundPairings', () => {
  it('genera 7 rondas de 4 parejas', () => {
    const rounds = generateRoundPairings(PLAYERS)
    expect(rounds).toHaveLength(7)
    for (const round of rounds) expect(round.pairs).toHaveLength(4)
  })

  it('cada jugador aparece exactamente una vez por ronda', () => {
    const rounds = generateRoundPairings(PLAYERS)
    for (const round of rounds) {
      const playersInRound = round.pairs.flat()
      expect(playersInRound).toHaveLength(8)
      expect(new Set(playersInRound).size).toBe(8)
    }
  })

  it('ninguna pareja se repite en toda la liga', () => {
    const rounds = generateRoundPairings(PLAYERS)
    const pairKeys = rounds.flatMap((round) =>
      round.pairs.map((pair) => [...pair].sort().join('-')),
    )
    expect(new Set(pairKeys).size).toBe(28)
  })

  it('cada jugador comparte pareja una sola vez con cada uno de los otros 7', () => {
    const rounds = generateRoundPairings(PLAYERS)
    const partners = new Map<string, Set<string>>()
    for (const player of PLAYERS) partners.set(player, new Set())

    for (const round of rounds) {
      for (const [a, b] of round.pairs) {
        partners.get(a)!.add(b)
        partners.get(b)!.add(a)
      }
    }

    for (const player of PLAYERS) expect(partners.get(player)!.size).toBe(7)
  })

  it('rechaza listas que no sean de 8 jugadores', () => {
    expect(() => generateRoundPairings(['A', 'B'])).toThrow()
  })
})

describe('generateRoundMatches', () => {
  it('genera 6 partidos por ronda', () => {
    const matches = generateRoundMatches(3)
    expect(matches).toHaveLength(6)
    expect(matches.map((match) => `${match.day}.${match.position}`)).toEqual([
      '1.1',
      '1.2',
      '2.1',
      '2.2',
      '3.1',
      '3.2',
    ])
  })

  it('reparte la ronda en 3 jornadas de 2 partidos', () => {
    const matches = generateRoundMatches(2)
    expect(matches.filter((match) => match.day === 1)).toHaveLength(2)
    expect(matches.filter((match) => match.day === 2)).toHaveLength(2)
    expect(matches.filter((match) => match.day === 3)).toHaveLength(2)
  })

  it('hace que las 4 parejas jueguen todos contra todos', () => {
    const matches = generateRoundMatches(1)
    const pairings = new Set(
      matches.map((match) => [match.pairAIndex, match.pairBIndex].sort().join('-')),
    )
    expect(pairings.size).toBe(6)
  })

  it('cada pareja juega exactamente 3 partidos dentro de la ronda', () => {
    const matches = generateRoundMatches(5)
    const counts = new Map<number, number>([
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ])

    for (const match of matches) {
      counts.set(match.pairAIndex, (counts.get(match.pairAIndex) ?? 0) + 1)
      counts.set(match.pairBIndex, (counts.get(match.pairBIndex) ?? 0) + 1)
    }

    for (const count of counts.values()) expect(count).toBe(3)
  })
})
