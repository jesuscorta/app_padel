import type { Match } from '../types.ts'

export interface MatchScoreInput {
  set1A: number | null
  set1B: number | null
  set1TbA: number | null
  set1TbB: number | null
  set2A: number | null
  set2B: number | null
  set2TbA: number | null
  set2TbB: number | null
  set3A: number | null
  set3B: number | null
  set3TbA: number | null
  set3TbB: number | null
  set3Incomplete: boolean
}

export interface MatchScoreSummary {
  winnerSide: 'a' | 'b'
  setsA: number
  setsB: number
  gamesA: number
  gamesB: number
  setDiff: number
  gameDiff: number
  scoreLine: string
}

function isEmpty(a: number | null, b: number | null): boolean {
  return a === null && b === null
}

function isFilled(a: number | null, b: number | null): boolean {
  return a !== null && b !== null
}

function isValidNumber(value: number | null): boolean {
  return value === null || (Number.isInteger(value) && value >= 0)
}

function winnerOfSet(a: number, b: number): 'a' | 'b' {
  return a > b ? 'a' : 'b'
}

function isValidTieBreak(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return false
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) return false
  if (a === b) return false
  const max = Math.max(a, b)
  const min = Math.min(a, b)
  return max >= 7 && max - min >= 2
}

function validateCompleteSet(
  a: number,
  b: number,
  tbA: number | null,
  tbB: number | null,
  label: string,
): string | null {
  if (a === b) return `${label}: no puede haber empate en juegos`
  const max = Math.max(a, b)
  const min = Math.min(a, b)

  const hasTieBreak = tbA !== null || tbB !== null

  const plainValid = (max === 6 && min <= 4) || (max === 7 && min === 5)
  const tieBreakValid = max === 7 && min === 6

  if (!plainValid && !tieBreakValid) return `${label}: resultado no válido según reglas oficiales`

  if (plainValid && hasTieBreak) return `${label}: solo debe haber tie-break si el set termina 7-6`
  if (tieBreakValid) {
    if (!isValidTieBreak(tbA, tbB)) return `${label}: falta un tie-break válido`
    if (winnerOfSet(a, b) !== winnerOfSet(tbA!, tbB!)) {
      return `${label}: el ganador del tie-break debe coincidir con el ganador del set`
    }
  }
  if (!tieBreakValid && (tbA !== null || tbB !== null)) return `${label}: tie-break no permitido`
  return null
}

export function matchToScoreInput(match: Match): MatchScoreInput {
  return {
    set1A: match.set1_a,
    set1B: match.set1_b,
    set1TbA: match.set1_tb_a,
    set1TbB: match.set1_tb_b,
    set2A: match.set2_a,
    set2B: match.set2_b,
    set2TbA: match.set2_tb_a,
    set2TbB: match.set2_tb_b,
    set3A: match.set3_a,
    set3B: match.set3_b,
    set3TbA: match.set3_tb_a,
    set3TbB: match.set3_tb_b,
    set3Incomplete: match.set3_incomplete,
  }
}

export function computeMatchScoreFromMatch(match: Match): MatchScoreSummary | null {
  return computeMatchScore(matchToScoreInput(match))
}

export function validateMatchScore(input: MatchScoreInput): string | null {
  const values = [
    input.set1A,
    input.set1B,
    input.set1TbA,
    input.set1TbB,
    input.set2A,
    input.set2B,
    input.set2TbA,
    input.set2TbB,
    input.set3A,
    input.set3B,
    input.set3TbA,
    input.set3TbB,
  ]
  if (values.some((value) => !isValidNumber(value))) return 'Los juegos deben ser enteros positivos'

  if (!isFilled(input.set1A, input.set1B) || !isFilled(input.set2A, input.set2B)) {
    return 'Los dos primeros sets son obligatorios'
  }

  const set1Error = validateCompleteSet(input.set1A!, input.set1B!, input.set1TbA, input.set1TbB, 'Set 1')
  if (set1Error) return set1Error
  const set2Error = validateCompleteSet(input.set2A!, input.set2B!, input.set2TbA, input.set2TbB, 'Set 2')
  if (set2Error) return set2Error

  const set1Winner = winnerOfSet(input.set1A!, input.set1B!)
  const set2Winner = winnerOfSet(input.set2A!, input.set2B!)
  const needsThird = set1Winner !== set2Winner
  const thirdEmpty = isEmpty(input.set3A, input.set3B)
  const thirdFilled = isFilled(input.set3A, input.set3B)

  if (needsThird && !thirdFilled) return 'Si hay 1-1 en sets, el tercero es obligatorio'
  if (!needsThird && !thirdEmpty) return 'Si un partido termina 2-0, el tercer set debe quedar vacío'
  if (thirdFilled && input.set3A === input.set3B) {
    return input.set3Incomplete ? 'En un tercer set incompleto no puede haber empate' : 'Set 3: no puede haber empate en juegos'
  }
  if (!thirdFilled && input.set3Incomplete) return 'Marca juegos del tercer set antes de indicarlo como incompleto'
  if (thirdEmpty && (input.set3TbA !== null || input.set3TbB !== null)) return 'No puede haber tie-break en un set vacío'

  if (thirdFilled) {
    if (input.set3Incomplete) {
      if (input.set3TbA !== null || input.set3TbB !== null) return 'No puede haber tie-break en un set incompleto'
    } else {
      const set3Error = validateCompleteSet(input.set3A!, input.set3B!, input.set3TbA, input.set3TbB, 'Set 3')
      if (set3Error) return set3Error
    }
  }

  return null
}

export function computeMatchScore(input: MatchScoreInput): MatchScoreSummary | null {
  if (validateMatchScore(input)) return null

  const sets: Array<{ a: number; b: number; tbA: number | null; tbB: number | null; incomplete: boolean }> = [
    { a: input.set1A!, b: input.set1B!, tbA: input.set1TbA, tbB: input.set1TbB, incomplete: false },
    { a: input.set2A!, b: input.set2B!, tbA: input.set2TbA, tbB: input.set2TbB, incomplete: false },
  ]

  if (isFilled(input.set3A, input.set3B)) {
    sets.push({
      a: input.set3A!,
      b: input.set3B!,
      tbA: input.set3TbA,
      tbB: input.set3TbB,
      incomplete: input.set3Incomplete,
    })
  }

  let setsA = 0
  let setsB = 0
  let gamesA = 0
  let gamesB = 0

  for (const { a, b } of sets) {
    gamesA += a
    gamesB += b
    if (a > b) setsA += 1
    if (b > a) setsB += 1
  }

  const winnerSide = setsA > setsB ? 'a' : 'b'
  const scoreLine = sets
    .map(({ a, b, tbA, tbB, incomplete }) => {
      const tieBreak = tbA !== null && tbB !== null ? ` (${tbA}-${tbB})` : ''
      return `${a}-${b}${tieBreak}${incomplete ? '*' : ''}`
    })
    .join(' · ')

  return {
    winnerSide,
    setsA,
    setsB,
    gamesA,
    gamesB,
    setDiff: setsA - setsB,
    gameDiff: gamesA - gamesB,
    scoreLine,
  }
}
