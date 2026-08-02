import { describe, expect, it } from 'vitest'
import { generateCalendar } from './schedule'

const PAIRS = ['A', 'B', 'C', 'D']

describe('generateCalendar', () => {
  it('genera 3 jornadas con 2 partidos cada una', () => {
    const cal = generateCalendar(PAIRS)
    expect(cal).toHaveLength(6)
    for (const n of [1, 2, 3]) {
      expect(cal.filter((m) => m.round === n)).toHaveLength(2)
    }
  })

  it('cada pareja juega exactamente una vez contra cada rival (todos contra todos)', () => {
    const cal = generateCalendar(PAIRS)
    const combos = new Set(cal.map((m) => [m.pairA, m.pairB].sort().join('-')))
    expect(combos.size).toBe(6) // C(4,2) = 6 enfrentamientos únicos
  })

  it('ninguna pareja juega dos veces en la misma jornada', () => {
    const cal = generateCalendar(PAIRS)
    for (const n of [1, 2, 3]) {
      const playing = cal.filter((m) => m.round === n).flatMap((m) => [m.pairA, m.pairB])
      expect(new Set(playing).size).toBe(4)
    }
  })

  it('cada pareja juega 3 partidos en total', () => {
    const cal = generateCalendar(PAIRS)
    for (const p of PAIRS) {
      expect(cal.filter((m) => m.pairA === p || m.pairB === p)).toHaveLength(3)
    }
  })

  it('rechaza listas que no sean de 4 parejas', () => {
    expect(() => generateCalendar(['A', 'B'])).toThrow()
  })
})
