export interface CalendarMatch {
  round: number
  pairA: string
  pairB: string
}

/**
 * Round-robin para 4 parejas (método del círculo):
 * 3 jornadas × 2 partidos; cada pareja se enfrenta a las demás exactamente una vez.
 */
export function generateCalendar(pairIds: readonly string[]): CalendarMatch[] {
  if (pairIds.length !== 4) throw new Error('Se necesitan 4 parejas para generar el calendario')
  const [a, b, c, d] = pairIds
  return [
    { round: 1, pairA: a, pairB: d },
    { round: 1, pairA: b, pairB: c },
    { round: 2, pairA: a, pairB: c },
    { round: 2, pairA: d, pairB: b },
    { round: 3, pairA: a, pairB: b },
    { round: 3, pairA: c, pairB: d },
  ]
}
