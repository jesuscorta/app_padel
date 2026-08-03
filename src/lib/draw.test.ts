import { describe, expect, it } from 'vitest'
import { shuffle } from './draw'

/** RNG determinista (mulberry32) para tests. */
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

describe('shuffle', () => {
  it('conserva todos los elementos sin duplicar', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8]
    const out = shuffle(input, seededRng(42))
    expect(out).toHaveLength(8)
    expect([...out].sort()).toEqual(input)
  })

  it('no muta el array original', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8]
    shuffle(input, seededRng(1))
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('es determinista con la misma semilla', () => {
    const input = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    expect(shuffle(input, seededRng(7))).toEqual(shuffle(input, seededRng(7)))
  })
})
