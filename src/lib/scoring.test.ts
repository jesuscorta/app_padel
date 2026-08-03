import { describe, expect, it } from 'vitest'
import { computeMatchScore, validateMatchScore } from './scoring'

describe('validateMatchScore', () => {
  it('acepta un 2-0 simple', () => {
    expect(
      validateMatchScore({
        set1A: 6,
        set1B: 4,
        set1TbA: null,
        set1TbB: null,
        set2A: 6,
        set2B: 2,
        set2TbA: null,
        set2TbB: null,
        set3A: null,
        set3B: null,
        set3TbA: null,
        set3TbB: null,
        set3Incomplete: false,
      }),
    ).toBeNull()
  })

  it('acepta 1-1 y tercer set incompleto con líder', () => {
    expect(
      validateMatchScore({
        set1A: 6,
        set1B: 4,
        set1TbA: null,
        set1TbB: null,
        set2A: 3,
        set2B: 6,
        set2TbA: null,
        set2TbB: null,
        set3A: 4,
        set3B: 2,
        set3TbA: null,
        set3TbB: null,
        set3Incomplete: true,
      }),
    ).toBeNull()
  })

  it('rechaza empate en tercer set incompleto', () => {
    expect(
      validateMatchScore({
        set1A: 6,
        set1B: 4,
        set1TbA: null,
        set1TbB: null,
        set2A: 3,
        set2B: 6,
        set2TbA: null,
        set2TbB: null,
        set3A: 2,
        set3B: 2,
        set3TbA: null,
        set3TbB: null,
        set3Incomplete: true,
      }),
    ).toBeTruthy()
  })

  it('rechaza tercer set vacío si hay 1-1', () => {
    expect(
      validateMatchScore({
        set1A: 6,
        set1B: 4,
        set1TbA: null,
        set1TbB: null,
        set2A: 4,
        set2B: 6,
        set2TbA: null,
        set2TbB: null,
        set3A: null,
        set3B: null,
        set3TbA: null,
        set3TbB: null,
        set3Incomplete: false,
      }),
    ).toBeTruthy()
  })

  it('acepta 7-6 con tie-break', () => {
    expect(
      validateMatchScore({
        set1A: 7,
        set1B: 6,
        set1TbA: 7,
        set1TbB: 4,
        set2A: 6,
        set2B: 4,
        set2TbA: null,
        set2TbB: null,
        set3A: null,
        set3B: null,
        set3TbA: null,
        set3TbB: null,
        set3Incomplete: false,
      }),
    ).toBeNull()
  })

  it('rechaza 6-6 sin tie-break', () => {
    expect(
      validateMatchScore({
        set1A: 6,
        set1B: 6,
        set1TbA: null,
        set1TbB: null,
        set2A: 6,
        set2B: 4,
        set2TbA: null,
        set2TbB: null,
        set3A: null,
        set3B: null,
        set3TbA: null,
        set3TbB: null,
        set3Incomplete: false,
      }),
    ).toBeTruthy()
  })

  it('rechaza 7-6 sin tie-break', () => {
    expect(
      validateMatchScore({
        set1A: 7,
        set1B: 6,
        set1TbA: null,
        set1TbB: null,
        set2A: 6,
        set2B: 4,
        set2TbA: null,
        set2TbB: null,
        set3A: null,
        set3B: null,
        set3TbA: null,
        set3TbB: null,
        set3Incomplete: false,
      }),
    ).toBeTruthy()
  })

  it('rechaza 6-2 con tie-break', () => {
    expect(
      validateMatchScore({
        set1A: 6,
        set1B: 2,
        set1TbA: 7,
        set1TbB: 0,
        set2A: 6,
        set2B: 4,
        set2TbA: null,
        set2TbB: null,
        set3A: null,
        set3B: null,
        set3TbA: null,
        set3TbB: null,
        set3Incomplete: false,
      }),
    ).toBeTruthy()
  })

  it('rechaza 8-6', () => {
    expect(
      validateMatchScore({
        set1A: 8,
        set1B: 6,
        set1TbA: null,
        set1TbB: null,
        set2A: 6,
        set2B: 4,
        set2TbA: null,
        set2TbB: null,
        set3A: null,
        set3B: null,
        set3TbA: null,
        set3TbB: null,
        set3Incomplete: false,
      }),
    ).toBeTruthy()
  })
})

describe('computeMatchScore', () => {
  it('calcula ganador, sets y juegos en un 2-0', () => {
    const score = computeMatchScore({
      set1A: 6,
      set1B: 4,
      set1TbA: null,
      set1TbB: null,
      set2A: 6,
      set2B: 2,
      set2TbA: null,
      set2TbB: null,
      set3A: null,
      set3B: null,
      set3TbA: null,
      set3TbB: null,
      set3Incomplete: false,
    })
    expect(score).toEqual(
      expect.objectContaining({
        winnerSide: 'a',
        setsA: 2,
        setsB: 0,
        gamesA: 12,
        gamesB: 6,
      }),
    )
  })

  it('calcula ganador con tercer set incompleto', () => {
    const score = computeMatchScore({
      set1A: 6,
      set1B: 4,
      set1TbA: null,
      set1TbB: null,
      set2A: 3,
      set2B: 6,
      set2TbA: null,
      set2TbB: null,
      set3A: 4,
      set3B: 2,
      set3TbA: null,
      set3TbB: null,
      set3Incomplete: true,
    })
    expect(score?.winnerSide).toBe('a')
    expect(score?.scoreLine).toBe('6-4 · 3-6 · 4-2*')
  })

  it('muestra tie-break con formato 7-6 (7-4)', () => {
    const score = computeMatchScore({
      set1A: 7,
      set1B: 6,
      set1TbA: 7,
      set1TbB: 4,
      set2A: 6,
      set2B: 3,
      set2TbA: null,
      set2TbB: null,
      set3A: null,
      set3B: null,
      set3TbA: null,
      set3TbB: null,
      set3Incomplete: false,
    })
    expect(score?.scoreLine).toBe('7-6 (7-4) · 6-3')
  })
})
