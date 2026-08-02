import { describe, expect, it } from 'vitest'
import { assignBallDuties } from './balls'

function seededRng(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const MATCHES = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6']
const TITULARES = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']

describe('assignBallDuties', () => {
  it('asigna un responsable a cada partido', () => {
    const duties = assignBallDuties(MATCHES, TITULARES, seededRng(5))
    expect(duties.size).toBe(6)
    for (const m of MATCHES) expect(duties.get(m)).toBeTruthy()
  })

  it('es equilibrado: con 6 partidos y 8 titulares nadie repite turno', () => {
    const duties = assignBallDuties(MATCHES, TITULARES, seededRng(5))
    const counts = new Map<string, number>()
    for (const player of duties.values()) counts.set(player, (counts.get(player) ?? 0) + 1)
    for (const c of counts.values()) expect(c).toBe(1)
  })

  it('con más partidos que titulares la diferencia máxima es 1', () => {
    const many = Array.from({ length: 17 }, (_, i) => `m${i}`)
    const duties = assignBallDuties(many, TITULARES, seededRng(3))
    const counts = new Map<string, number>(TITULARES.map((t) => [t, 0]))
    for (const player of duties.values()) counts.set(player, (counts.get(player) ?? 0) + 1)
    const values = [...counts.values()]
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1)
  })

  it('falla si no hay titulares', () => {
    expect(() => assignBallDuties(MATCHES, [])).toThrow()
  })
})
