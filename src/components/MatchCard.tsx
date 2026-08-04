import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { playerName } from '../lib/LeagueContext'
import { advanceScheduleIfComplete, clearMatchScore, saveMatchScore } from '../lib/db/matches'
import { computeMatchScore, matchToScoreInput, validateMatchScore, type MatchScoreInput } from '../lib/scoring'
import { setActualPlayer } from '../lib/db/substitutions'
import { pairLabel } from '../lib/format'
import { Badge, BusyOverlay, Button, Card, Notice, Sheet, cx } from './ui'
import { IconBall } from './icons'
import type { BallDuty, Match, MatchPlayer, Pair, Player } from '../types'

interface MatchCardProps {
  match: Match
  pairA: Pair
  pairB: Pair
  players: Player[]
  /** Slots reales de este partido (4 filas de match_players). */
  lineup: MatchPlayer[]
  ballDuty?: BallDuty
  readOnly?: boolean
  onChanged: () => Promise<void> | void
}

interface ScoreFormState {
  set1A: string
  set1B: string
  set1TbA: string
  set1TbB: string
  set2A: string
  set2B: string
  set2TbA: string
  set2TbB: string
  set3A: string
  set3B: string
  set3TbA: string
  set3TbB: string
  set3Incomplete: boolean
}

/** "Ana" o "Lucía (por Ana)" cuando juega un sustituto. */
function slotLabel(players: Player[], slot: MatchPlayer): string {
  const actual = playerName(players, slot.actual_player_id)
  if (slot.actual_player_id === slot.titular_id) return actual
  return `${actual} (por ${playerName(players, slot.titular_id)})`
}

function scoreInputToForm(score: MatchScoreInput): ScoreFormState {
  return {
    set1A: score.set1A?.toString() ?? '',
    set1B: score.set1B?.toString() ?? '',
    set1TbA: score.set1TbA?.toString() ?? '',
    set1TbB: score.set1TbB?.toString() ?? '',
    set2A: score.set2A?.toString() ?? '',
    set2B: score.set2B?.toString() ?? '',
    set2TbA: score.set2TbA?.toString() ?? '',
    set2TbB: score.set2TbB?.toString() ?? '',
    set3A: score.set3A?.toString() ?? '',
    set3B: score.set3B?.toString() ?? '',
    set3TbA: score.set3TbA?.toString() ?? '',
    set3TbB: score.set3TbB?.toString() ?? '',
    set3Incomplete: score.set3Incomplete,
  }
}

function formValueToNumber(value: string): number | null {
  return value.trim() === '' ? null : Number(value)
}

function scoreFormToInput(form: ScoreFormState): MatchScoreInput {
  return {
    set1A: formValueToNumber(form.set1A),
    set1B: formValueToNumber(form.set1B),
    set1TbA: formValueToNumber(form.set1TbA),
    set1TbB: formValueToNumber(form.set1TbB),
    set2A: formValueToNumber(form.set2A),
    set2B: formValueToNumber(form.set2B),
    set2TbA: formValueToNumber(form.set2TbA),
    set2TbB: formValueToNumber(form.set2TbB),
    set3A: formValueToNumber(form.set3A),
    set3B: formValueToNumber(form.set3B),
    set3TbA: formValueToNumber(form.set3TbA),
    set3TbB: formValueToNumber(form.set3TbB),
    set3Incomplete: form.set3Incomplete,
  }
}

function winnerLabel(pairA: Pair, pairB: Pair, players: Player[], winnerPairId: string | null): string {
  if (winnerPairId === pairA.id) return pairLabel(players, pairA)
  if (winnerPairId === pairB.id) return pairLabel(players, pairB)
  return '—'
}

export default function MatchCard({
  match,
  pairA,
  pairB,
  players,
  lineup,
  ballDuty,
  readOnly,
  onChanged,
}: MatchCardProps) {
  const [scoreOpen, setScoreOpen] = useState(false)
  const [absencePair, setAbsencePair] = useState<Pair | null>(null)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [lineupError, setLineupError] = useState<string | null>(null)
  const [scoreError, setScoreError] = useState<string | null>(null)
  const [scoreForm, setScoreForm] = useState<ScoreFormState>(() => scoreInputToForm(matchToScoreInput(match)))
  const [saving, setSaving] = useState(false)

  const winner = match.winner_pair_id
  const slotsA = [pairA.player1_id, pairA.player2_id]
    .map((titularId) => lineup.find((l) => l.pair_id === pairA.id && l.titular_id === titularId))
    .filter(Boolean) as MatchPlayer[]
  const slotsB = [pairB.player1_id, pairB.player2_id]
    .map((titularId) => lineup.find((l) => l.pair_id === pairB.id && l.titular_id === titularId))
    .filter(Boolean) as MatchPlayer[]
  const selectedSlot = lineup.find((slot) => slot.id === selectedSlotId) ?? null
  const selectedPair = absencePair
  const selectedPairSlots =
    selectedPair?.id === pairA.id ? slotsA : selectedPair?.id === pairB.id ? slotsB : []
  const substitutes = players.filter((p) => p.role === 'sustituto' && p.active)
  const scoreInput = useMemo(() => scoreFormToInput(scoreForm), [scoreForm])
  const scoreValidation = useMemo(() => validateMatchScore(scoreInput), [scoreInput])
  const scoreSummary = useMemo(() => computeMatchScore(scoreInput), [scoreInput])

  function openScoreEditor() {
    setScoreForm(scoreInputToForm(matchToScoreInput(match)))
    setScoreError(null)
    setScoreOpen(true)
  }

  async function onSaveScore() {
    const validationError = validateMatchScore(scoreInput)
    if (validationError) {
      setScoreError(validationError)
      return
    }
    setSaving(true)
    try {
      await saveMatchScore(match, scoreInput)
      await advanceScheduleIfComplete(match.day_id, match.round_id)
      setScoreError(null)
      setScoreOpen(false)
      await onChanged()
    } catch (error) {
      setScoreError(error instanceof Error ? error.message : 'No se pudo guardar el resultado')
    } finally {
      setSaving(false)
    }
  }

  async function onClearScore() {
    setSaving(true)
    try {
      await clearMatchScore(match.id)
      setScoreOpen(false)
      await onChanged()
    } catch (error) {
      setScoreError(error instanceof Error ? error.message : 'No se pudo quitar el resultado')
    } finally {
      setSaving(false)
    }
  }

  function canUsePlayer(playerId: string, slot: MatchPlayer): boolean {
    return !lineup.some(
      (current) => current.id !== slot.id && current.actual_player_id === playerId,
    )
  }

  async function assignToSlot(slot: MatchPlayer, actualPlayerId: string) {
    if (!canUsePlayer(actualPlayerId, slot)) {
      setLineupError('Ese jugador ya está asignado en este partido')
      return
    }
    setSaving(true)
    try {
      await setActualPlayer(match.id, slot.pair_id, slot.titular_id, actualPlayerId)
      setLineupError(null)
      setSelectedSlotId(null)
      setAbsencePair(null)
      await onChanged()
    } catch (error) {
      setLineupError(error instanceof Error ? error.message : 'No se pudo guardar el sustituto')
    } finally {
      setSaving(false)
    }
  }

  function openAbsence(pair: Pair) {
    setLineupError(null)
    setSelectedSlotId(null)
    setAbsencePair(pair)
  }

  function renderPair(pair: Pair, slots: MatchPlayer[]) {
    const isWinner = winner === pair.id
    return (
      <div
        className={cx(
          'flex-1 rounded-2xl border p-3 transition',
          isWinner ? 'border-brand/30 bg-brand/5' : 'border-neutral-200 bg-neutral-50',
        )}
      >
        <div className="w-full text-center">
          {slots.map((s) => (
            <p key={s.id} className="text-sm leading-6 font-semibold">
              {slotLabel(players, s)}
            </p>
          ))}
          {isWinner && <Badge className="mt-1 bg-brand text-white">Ganador</Badge>}
        </div>

        {!readOnly && (
          <div className="mt-3 flex justify-center">
            <Button
              variant="ghost"
              className="min-h-8 px-2 py-1 text-xs"
              disabled={saving}
              onClick={() => openAbsence(pair)}
            >
              Ausencia
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card>
      <BusyOverlay open={saving} label="Guardando partido…" />
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="space-y-0.5">
           <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Partido</p>
          {readOnly ? (
            <p className="text-sm font-medium text-neutral-500">Solo lectura</p>
          ) : (
            <p className="text-sm font-semibold text-brand">{winner ? 'Resultado registrado' : 'Pendiente de resultado'}</p>
          )}
        </div>
        {winner && <Badge className="bg-brand text-white">Cerrado</Badge>}
      </div>
      <div className="flex items-stretch gap-2">
        {renderPair(pairA, slotsA)}
          <span className="self-center text-xs font-bold text-neutral-600">VS</span>
        {renderPair(pairB, slotsB)}
      </div>

      {!readOnly && (
        <Button full className="mt-3" onClick={openScoreEditor}>
          {winner ? 'Editar resultado' : 'Añadir resultado'}
        </Button>
      )}

      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-neutral-500">
        <div className="min-w-0">
           <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-600">Marcador</p>
          <p className="truncate font-semibold text-neutral-700">{scoreSummary?.scoreLine ?? 'Sin marcador'}</p>
        </div>
        <span className="flex items-center gap-1.5">
          <IconBall className="h-4 w-4 text-brand" />
          Pelotas:{' '}
          <span className="font-semibold text-neutral-700">
            {ballDuty ? playerName(players, ballDuty.player_id) : '—'}
          </span>
        </span>
      </div>

      <Sheet open={scoreOpen} onClose={() => setScoreOpen(false)} title="Resultado del partido">
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-700">
              <p>{pairLabel(players, pairA)}</p>
              <p className="text-right">{pairLabel(players, pairB)}</p>
            </div>

            {[
              ['Set 1', 'set1A', 'set1B', 'set1TbA', 'set1TbB'],
              ['Set 2', 'set2A', 'set2B', 'set2TbA', 'set2TbB'],
              ['Set 3', 'set3A', 'set3B', 'set3TbA', 'set3TbB'],
            ].map(([label, aKey, bKey, tbAKey, tbBKey]) => (
              <fieldset key={label} className="space-y-2">
                <legend className="text-sm font-semibold text-neutral-700">{label}</legend>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    aria-label={`${label}, juegos de ${pairLabel(players, pairA)}`}
                    value={String(scoreForm[aKey as keyof ScoreFormState] ?? '')}
                    onChange={(event) =>
                      setScoreForm((current) => ({
                        ...current,
                        [aKey]: event.target.value,
                      }))
                    }
                    className="min-h-11 w-full min-w-0 rounded-xl border border-neutral-300 px-2 text-center outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
                  />
                  <span className="text-sm font-bold text-neutral-400">-</span>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    aria-label={`${label}, juegos de ${pairLabel(players, pairB)}`}
                    value={String(scoreForm[bKey as keyof ScoreFormState] ?? '')}
                    onChange={(event) =>
                      setScoreForm((current) => ({
                        ...current,
                        [bKey]: event.target.value,
                      }))
                    }
                    className="min-h-11 w-full min-w-0 rounded-xl border border-neutral-300 px-2 text-center outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
                  />
                </div>

                {Number(scoreForm[aKey as keyof ScoreFormState]) === 7 && Number(scoreForm[bKey as keyof ScoreFormState]) === 6 && (
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      aria-label={`${label}, tie-break de ${pairLabel(players, pairA)}`}
                      value={String(scoreForm[tbAKey as keyof ScoreFormState] ?? '')}
                      onChange={(event) =>
                        setScoreForm((current) => ({
                          ...current,
                          [tbAKey]: event.target.value,
                        }))
                      }
                      className="min-h-10 w-full min-w-0 rounded-xl border border-neutral-300 px-2 text-center outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
                    />
                    <span className="text-xs font-bold text-neutral-400">TB</span>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      aria-label={`${label}, tie-break de ${pairLabel(players, pairB)}`}
                      value={String(scoreForm[tbBKey as keyof ScoreFormState] ?? '')}
                      onChange={(event) =>
                        setScoreForm((current) => ({
                          ...current,
                          [tbBKey]: event.target.value,
                        }))
                      }
                      className="min-h-10 w-full min-w-0 rounded-xl border border-neutral-300 px-2 text-center outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
                    />
                  </div>
                )}

                {Number(scoreForm[aKey as keyof ScoreFormState]) === 6 && Number(scoreForm[bKey as keyof ScoreFormState]) === 7 && (
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      aria-label={`${label}, tie-break de ${pairLabel(players, pairA)}`}
                      value={String(scoreForm[tbAKey as keyof ScoreFormState] ?? '')}
                      onChange={(event) =>
                        setScoreForm((current) => ({
                          ...current,
                          [tbAKey]: event.target.value,
                        }))
                      }
                      className="min-h-10 rounded-xl border border-neutral-300 px-3 text-center outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
                    />
                    <span className="text-xs font-bold text-neutral-400">TB</span>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      aria-label={`${label}, tie-break de ${pairLabel(players, pairB)}`}
                      value={String(scoreForm[tbBKey as keyof ScoreFormState] ?? '')}
                      onChange={(event) =>
                        setScoreForm((current) => ({
                          ...current,
                          [tbBKey]: event.target.value,
                        }))
                      }
                      className="min-h-10 rounded-xl border border-neutral-300 px-3 text-center outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
                    />
                  </div>
                )}
              </fieldset>
            ))}
          </div>

          <label className="flex items-center gap-3 rounded-xl bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-700">
            <input
              type="checkbox"
              checked={scoreForm.set3Incomplete}
              onChange={(event) =>
                setScoreForm((current) => ({ ...current, set3Incomplete: event.target.checked }))
              }
            />
            Tercer set incompleto
          </label>

          {(scoreError || scoreValidation) && <Notice tone="error">{scoreError ?? scoreValidation}</Notice>}

          {scoreSummary && (
            <div className="rounded-xl bg-brand/5 px-4 py-3 text-sm text-brand">
              <p className="font-semibold">
                Ganador automático: {winnerLabel(pairA, pairB, players, scoreSummary.winnerSide === 'a' ? pairA.id : pairB.id)}
              </p>
              <p className="mt-1 text-xs text-brand/80">Marcador: {scoreSummary.scoreLine}</p>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            {winner && (
              <Button variant="danger" full disabled={saving} onClick={onClearScore}>
                Quitar resultado
              </Button>
            )}
            <Button variant="secondary" full onClick={() => setScoreOpen(false)}>
              Cancelar
            </Button>
            <Button full disabled={saving || Boolean(scoreValidation)} onClick={onSaveScore}>
              Guardar
            </Button>
          </div>
        </div>
      </Sheet>

      <Sheet
        open={absencePair !== null}
        onClose={() => {
          setAbsencePair(null)
          setSelectedSlotId(null)
          setLineupError(null)
        }}
        title={selectedPair ? `Ausencia en ${pairLabel(players, selectedPair)}` : 'Gestionar ausencia'}
      >
        <div className="space-y-4">
          {selectedPair && !selectedSlot && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-neutral-600">¿Quién falta?</p>
              {selectedPairSlots.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => {
                    setSelectedSlotId(slot.id)
                    setLineupError(null)
                  }}
                  className={cx(
                    'w-full rounded-xl border px-4 py-3 text-left transition active:bg-neutral-100',
                    slot.actual_player_id !== slot.titular_id
                      ? 'border-brand bg-brand/5'
                      : 'border-neutral-200 bg-neutral-50',
                  )}
                >
                  <p className="font-semibold">{playerName(players, slot.titular_id)}</p>
                  {slot.actual_player_id !== slot.titular_id && (
                    <p className="mt-1 text-xs text-brand">
                      Ahora: {playerName(players, slot.actual_player_id)}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}

          {selectedSlot && (
            <div className="space-y-3 border-t border-neutral-200 pt-4">
              <div>
                <p className="text-sm font-semibold text-neutral-600">
                  Elige sustituto para {playerName(players, selectedSlot.titular_id)}
                </p>
              </div>

              {lineupError && <p className="text-sm font-medium text-red-600">{lineupError}</p>}

              <Button
                variant="secondary"
                full
                disabled={saving || selectedSlot.actual_player_id === selectedSlot.titular_id}
                onClick={() => assignToSlot(selectedSlot, selectedSlot.titular_id)}
              >
                Restaurar titular
              </Button>

              <div className="space-y-2">
                {substitutes.length === 0 && (
              <div className="space-y-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                    <p>No hay sustitutos activos creados todavía.</p>
                    <Link to="/jugadores" className="flex min-h-11 items-center justify-center rounded-xl bg-neutral-200 px-4 py-2.5 font-semibold text-neutral-900" onClick={() => { setAbsencePair(null); setSelectedSlotId(null) }}>Ir a Jugadores</Link>
                  </div>
                )}
                {substitutes.map((substitute) => (
                  <button
                    key={substitute.id}
                    disabled={saving}
                    onClick={() => assignToSlot(selectedSlot, substitute.id)}
                    className={cx(
                      'flex min-h-11 w-full items-center justify-between rounded-xl px-4 text-left font-medium transition',
                      selectedSlot.actual_player_id === substitute.id
                        ? 'bg-brand text-white'
                        : 'bg-neutral-100 active:bg-neutral-200',
                    )}
                  >
                    {substitute.name}
                  </button>
                ))}
              </div>

              <Button
                variant="ghost"
                full
                disabled={saving}
                onClick={() => setSelectedSlotId(null)}
              >
                Cambiar jugador ausente
              </Button>
            </div>
          )}
        </div>
      </Sheet>
    </Card>
  )
}
