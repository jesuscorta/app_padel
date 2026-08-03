import { useState } from 'react'
import { playerName } from '../lib/LeagueContext'
import { advanceScheduleIfComplete, clearWinner, setWinner } from '../lib/db/matches'
import { createSubstitute, setActualPlayer } from '../lib/db/substitutions'
import { pairLabel } from '../lib/format'
import { Badge, Button, Card, ConfirmSheet, Sheet, cx } from './ui'
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

/** "Ana" o "Lucía (por Ana)" cuando juega un sustituto. */
function slotLabel(players: Player[], slot: MatchPlayer): string {
  const actual = playerName(players, slot.actual_player_id)
  if (slot.actual_player_id === slot.titular_id) return actual
  return `${actual} (por ${playerName(players, slot.titular_id)})`
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
  const [pendingWinner, setPendingWinner] = useState<Pair | null>(null)
  const [correctOpen, setCorrectOpen] = useState(false)
  const [absenceOpen, setAbsenceOpen] = useState(false)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [newSubstituteName, setNewSubstituteName] = useState('')
  const [lineupError, setLineupError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const winner = match.winner_pair_id
  const slotsA = [pairA.player1_id, pairA.player2_id]
    .map((titularId) => lineup.find((l) => l.pair_id === pairA.id && l.titular_id === titularId))
    .filter(Boolean) as MatchPlayer[]
  const slotsB = [pairB.player1_id, pairB.player2_id]
    .map((titularId) => lineup.find((l) => l.pair_id === pairB.id && l.titular_id === titularId))
    .filter(Boolean) as MatchPlayer[]
  const loser = winner === pairA.id ? pairB : winner === pairB.id ? pairA : null
  const selectedSlot = lineup.find((slot) => slot.id === selectedSlotId) ?? null
  const substitutes = players.filter((p) => p.role === 'sustituto' && p.active)

  async function chooseWinner(pair: Pair) {
    setSaving(true)
    try {
      await setWinner(match.id, pair.id)
      await advanceScheduleIfComplete(match.day_id, match.round_id)
      setPendingWinner(null)
      setCorrectOpen(false)
      await onChanged()
    } finally {
      setSaving(false)
    }
  }

  async function onClear() {
    setSaving(true)
    try {
      await clearWinner(match.id)
      setCorrectOpen(false)
      await onChanged()
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
      setNewSubstituteName('')
      await onChanged()
    } finally {
      setSaving(false)
    }
  }

  async function createAndAssign(slot: MatchPlayer) {
    if (!newSubstituteName.trim()) return
    setSaving(true)
    try {
      const substituteId = await createSubstitute(newSubstituteName)
      await setActualPlayer(match.id, slot.pair_id, slot.titular_id, substituteId)
      setLineupError(null)
      setSelectedSlotId(null)
      setNewSubstituteName('')
      await onChanged()
    } finally {
      setSaving(false)
    }
  }

  function renderPair(pair: Pair, slots: MatchPlayer[]) {
    const isWinner = winner === pair.id
    return (
      <button
        disabled={readOnly || saving}
        onClick={() => (winner ? setCorrectOpen(true) : setPendingWinner(pair))}
        className={cx(
          'flex-1 rounded-2xl border-2 p-3 text-center transition',
          isWinner
            ? 'border-brand bg-brand/5'
            : 'border-transparent bg-neutral-100 active:bg-neutral-200',
        )}
      >
        {slots.map((s) => (
          <p key={s.id} className="text-sm leading-6 font-semibold">
            {slotLabel(players, s)}
          </p>
        ))}
        {isWinner && <Badge className="mt-1 bg-brand text-white">Ganador</Badge>}
      </button>
    )
  }

  return (
    <Card>
      <div className="flex items-stretch gap-2">
        {renderPair(pairA, slotsA)}
        <span className="self-center text-xs font-bold text-neutral-400">VS</span>
        {renderPair(pairB, slotsB)}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
        <span className="flex items-center gap-1.5">
          <IconBall className="h-4 w-4 text-brand" />
          Pelotas:{' '}
          <span className="font-semibold text-neutral-700">
            {ballDuty ? playerName(players, ballDuty.player_id) : '—'}
          </span>
        </span>
        {!readOnly && (
          <div className="flex items-center gap-1">
            <button
              className="min-h-8 rounded-lg px-2 font-semibold text-brand active:bg-neutral-100"
              onClick={() => {
                setLineupError(null)
                setAbsenceOpen(true)
              }}
            >
              Ausencias
            </button>
            {winner && (
              <button
                className="min-h-8 rounded-lg px-2 font-semibold text-brand active:bg-neutral-100"
                onClick={() => setCorrectOpen(true)}
              >
                Corregir
              </button>
            )}
          </div>
        )}
      </div>

      <ConfirmSheet
        open={pendingWinner !== null}
        title="Registrar ganador"
        message={
          pendingWinner ? `¿Ganaron ${pairLabel(players, pendingWinner)}?` : undefined
        }
        confirmLabel="Sí, ganaron"
        onConfirm={() => pendingWinner && chooseWinner(pendingWinner)}
        onCancel={() => setPendingWinner(null)}
      />

      <Sheet open={correctOpen} onClose={() => setCorrectOpen(false)} title="Corregir resultado">
        <div className="space-y-2">
          {loser && (
            <Button full disabled={saving} onClick={() => chooseWinner(loser)}>
              Ganaron {pairLabel(players, loser)}
            </Button>
          )}
          <Button variant="danger" full disabled={saving} onClick={onClear}>
            Quitar resultado
          </Button>
          <Button variant="secondary" full onClick={() => setCorrectOpen(false)}>
            Cancelar
          </Button>
        </div>
      </Sheet>

      <Sheet open={absenceOpen} onClose={() => setAbsenceOpen(false)} title="Gestionar ausencias">
        <div className="space-y-4">
          <p className="text-sm text-neutral-500">
            El sustituto juega este partido, pero la pareja temporal de la ronda no cambia.
          </p>
          <div className="space-y-2">
            {[pairA, pairB].map((pair) => {
              const slots = pair.id === pairA.id ? slotsA : slotsB
              return (
                <div key={pair.id} className="space-y-2">
                  <p className="text-sm font-semibold text-neutral-500">{pairLabel(players, pair)}</p>
                  {slots.map((slot) => {
                    const selected = slot.id === selectedSlotId
                    return (
                      <button
                        key={slot.id}
                        onClick={() => {
                          setSelectedSlotId(slot.id)
                          setLineupError(null)
                        }}
                        className={cx(
                          'w-full rounded-xl border px-4 py-3 text-left transition',
                          selected
                            ? 'border-brand bg-brand/5'
                            : 'border-neutral-200 bg-neutral-50 active:bg-neutral-100',
                        )}
                      >
                        <p className="text-sm text-neutral-500">Titular</p>
                        <p className="font-semibold">{playerName(players, slot.titular_id)}</p>
                        <p className="mt-1 text-sm text-neutral-500">Juega</p>
                        <p className="font-medium">{slotLabel(players, slot)}</p>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {selectedSlot && (
            <div className="space-y-3 border-t border-neutral-200 pt-4">
              <div>
                <p className="text-sm font-semibold text-neutral-600">Asignar sustituto</p>
                <p className="text-sm text-neutral-500">
                  Slot de {playerName(players, selectedSlot.titular_id)}
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
                  <p className="text-sm text-neutral-500">
                    No hay sustitutos activos. Crea uno abajo y se asignará al momento.
                  </p>
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
                    <span className="text-xs opacity-70">Sustituto</span>
                  </button>
                ))}
              </div>

              <form
                className="space-y-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  createAndAssign(selectedSlot)
                }}
              >
                <input
                  value={newSubstituteName}
                  onChange={(event) => setNewSubstituteName(event.target.value)}
                  placeholder="Crear sustituto rápido…"
                  className="min-h-11 w-full rounded-xl border border-neutral-300 px-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
                />
                <Button type="submit" full disabled={saving || !newSubstituteName.trim()}>
                  Crear y asignar
                </Button>
              </form>
            </div>
          )}
        </div>
      </Sheet>
    </Card>
  )
}
