import { useState } from 'react'
import { Link } from 'react-router-dom'
import { playerName } from '../lib/LeagueContext'
import { advanceScheduleIfComplete, clearWinner, setWinner } from '../lib/db/matches'
import { setActualPlayer } from '../lib/db/substitutions'
import { pairLabel } from '../lib/format'
import { Badge, BusyOverlay, Button, Card, ConfirmSheet, Sheet, cx } from './ui'
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
  const [absencePair, setAbsencePair] = useState<Pair | null>(null)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
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
  const selectedPair = absencePair
  const selectedPairSlots =
    selectedPair?.id === pairA.id ? slotsA : selectedPair?.id === pairB.id ? slotsB : []
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
      setAbsencePair(null)
      await onChanged()
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
          'flex-1 rounded-2xl border-2 p-3 transition',
          isWinner ? 'border-brand bg-brand/5' : 'border-transparent bg-neutral-100',
        )}
      >
        <button
          disabled={readOnly || saving}
          onClick={() => (winner ? setCorrectOpen(true) : setPendingWinner(pair))}
          className="w-full text-center"
        >
          {slots.map((s) => (
            <p key={s.id} className="text-sm leading-6 font-semibold">
              {slotLabel(players, s)}
            </p>
          ))}
          {isWinner && <Badge className="mt-1 bg-brand text-white">Ganador</Badge>}
        </button>

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
      <div className="mb-3 flex items-center justify-between gap-3">
        {readOnly ? (
          <Badge className="bg-neutral-200 text-neutral-600">Solo lectura</Badge>
        ) : (
          <p className="text-sm font-semibold text-brand">Toca la pareja ganadora</p>
        )}
      </div>
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
        {winner && !readOnly && (
          <button
            className="min-h-8 rounded-lg px-2 font-semibold text-brand active:bg-neutral-100"
            onClick={() => setCorrectOpen(true)}
          >
            Corregir
          </button>
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
                    <Link
                      to="/jugadores"
                      onClick={() => {
                        setAbsencePair(null)
                        setSelectedSlotId(null)
                      }}
                    >
                      <Button variant="secondary" full>
                        Ir a Jugadores
                      </Button>
                    </Link>
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
