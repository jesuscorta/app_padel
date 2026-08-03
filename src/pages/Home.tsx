import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLeague } from '../lib/LeagueContext'
import MatchCard from '../components/MatchCard'
import { Badge, Button, Card, EmptyState, Spinner, cx } from '../components/ui'
import { IconChevronLeft, IconChevronRight } from '../components/icons'

export default function Home() {
  const { players, active, loading, refresh } = useLeague()
  const [selectedRoundNumber, setSelectedRoundNumber] = useState<number | null>(null)
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(null)
  const [transitionMessage, setTransitionMessage] = useState<string | null>(null)
  const previousCurrentRef = useRef<{ round: number | null; day: number | null }>({ round: null, day: null })

  const currentRound = active?.rounds.find((r) => r.status === 'current') ?? null
  const currentRoundDays = currentRound
    ? (active?.roundDays.filter((day) => day.round_id === currentRound.id) ?? [])
    : []
  const currentDay = currentRoundDays.find((day) => day.status === 'current') ?? null
  const viewedRound =
    active?.rounds.find((round) => round.number === selectedRoundNumber) ?? currentRound
  const viewedRoundDays = viewedRound
    ? (active?.roundDays
        .filter((day) => day.round_id === viewedRound.id)
        .sort((a, b) => a.number - b.number) ?? [])
    : []
  const viewedDay =
    viewedRoundDays.find((day) => day.number === selectedDayNumber) ??
    (viewedRound?.id === currentRound?.id ? currentDay : viewedRoundDays[0]) ??
    viewedRoundDays[0] ??
    null

  useEffect(() => {
    if (currentRound) setSelectedRoundNumber((prev) => prev ?? currentRound.number)
  }, [currentRound])

  useEffect(() => {
    if (!currentRound || !currentDay) return
    setSelectedRoundNumber(currentRound.number)
    setSelectedDayNumber(currentDay.number)
  }, [currentRound, currentDay])

  useEffect(() => {
    if (!active || !currentRound || selectedRoundNumber === null) return
    const selectedRound = active.rounds.find((round) => round.number === selectedRoundNumber)
    if (selectedRound && selectedRound.status === 'finished' && selectedRound.number < currentRound.number) {
      setSelectedRoundNumber(currentRound.number)
    }
  }, [active, currentRound, selectedRoundNumber])

  useEffect(() => {
    if (!currentRound || !viewedRound || !viewedRoundDays.length) return
    setSelectedDayNumber((prev) => {
      if (prev && viewedRoundDays.some((day) => day.number === prev)) return prev
      return viewedRound.id === currentRound.id
        ? (currentDay?.number ?? viewedRoundDays[0].number)
        : viewedRoundDays[0].number
    })
  }, [viewedRound, viewedRoundDays, currentRound, currentDay])

  useEffect(() => {
    if (!currentRound || !currentDay) return
    const previous = previousCurrentRef.current
    if (previous.round === null && previous.day === null) {
      previousCurrentRef.current = { round: currentRound.number, day: currentDay.number }
      return
    }

    if (previous.round !== currentRound.number) {
      setTransitionMessage(`Ronda ${previous.round} completada. Ahora: ronda ${currentRound.number}, jornada ${currentDay.number}.`)
    } else if (previous.day !== currentDay.number) {
      setTransitionMessage(`Jornada ${previous.day} completada. Ahora: jornada ${currentDay.number}.`)
    }

    previousCurrentRef.current = { round: currentRound.number, day: currentDay.number }
  }, [currentRound, currentDay])

  useEffect(() => {
    if (!transitionMessage) return
    const timeoutId = window.setTimeout(() => setTransitionMessage(null), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [transitionMessage])

  if (loading) return <Spinner />

  if (!active) {
    return (
      <EmptyState title="No hay liga activa">
        <p className="mb-4">Sortea las 7 rondas para empezar una nueva liga.</p>
        <Link to="/sorteo">
          <Button>Ir al sorteo</Button>
        </Link>
      </EmptyState>
    )
  }

  if (!currentRound) {
    return (
      <Card className="space-y-2 text-center">
        <p className="text-lg font-bold">¡Liga completada!</p>
        <p className="text-sm text-neutral-500">
          Se han jugado las 7 rondas. Consulta la clasificación o cierra la liga desde Más.
        </p>
        <Link to="/clasificacion">
          <Button full className="mt-2">
            Ver clasificación final
          </Button>
        </Link>
      </Card>
    )
  }

  const safeViewedRound = viewedRound ?? currentRound
  const safeViewedDay = viewedDay
  const matches = viewedDay ? active.matches.filter((m) => m.day_id === viewedDay.id) : []
  const done = matches.filter((m) => m.winner_pair_id !== null).length
  const pairById = new Map(active.pairs.map((p) => [p.id, p]))
  const currentRoundNumber = currentRound.number
  const isViewingCurrent = safeViewedRound.id === currentRound.id && safeViewedDay?.id === currentDay?.id

  return (
    <div className="space-y-4">
      {transitionMessage && (
        <Card className="border border-brand/20 bg-brand/5 py-3 text-sm font-medium text-brand">
          {transitionMessage}
        </Card>
      )}

      <Card className="space-y-4">
        <div className="flex items-baseline justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">Ronda {safeViewedRound.number} de 7</h2>
            {safeViewedRound.number === currentRoundNumber && (
              <Badge className="bg-brand/10 text-brand">Actual</Badge>
            )}
          </div>
          <span className="text-sm text-neutral-500">{done}/2 partidos</span>
        </div>

        {!isViewingCurrent && (
          <Button
            variant="secondary"
            full
            onClick={() => {
              setSelectedRoundNumber(currentRound.number)
              setSelectedDayNumber(currentDay?.number ?? 1)
            }}
          >
            Ir a la jornada actual
          </Button>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Rondas</p>
          <div className="flex items-center gap-2">
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white disabled:opacity-30"
              disabled={safeViewedRound.number === 1}
              onClick={() => setSelectedRoundNumber(safeViewedRound.number - 1)}
              aria-label="Ronda anterior"
            >
              <IconChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex flex-1 gap-2 overflow-x-auto pb-1">
              {active.rounds.map((round) => (
                <button
                  key={round.id}
                  onClick={() => setSelectedRoundNumber(round.number)}
                  className={cx(
                    'min-h-11 rounded-full px-4 text-sm font-bold whitespace-nowrap transition',
                    round.number === safeViewedRound.number
                      ? 'bg-brand text-white shadow-sm'
                      : 'bg-neutral-100 text-neutral-600 active:bg-neutral-200',
                  )}
                >
                  Ronda {round.number}
                </button>
              ))}
            </div>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white disabled:opacity-30"
              disabled={safeViewedRound.number === 7}
              onClick={() => setSelectedRoundNumber(safeViewedRound.number + 1)}
              aria-label="Ronda siguiente"
            >
              <IconChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {safeViewedDay && (
          <div className="mx-auto w-full max-w-sm space-y-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Jornadas</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <h3 className="font-semibold text-neutral-800">Jornada {safeViewedDay.number} de 3</h3>
                {safeViewedRound.id === currentRound.id && safeViewedDay.number === currentDay?.number && (
                  <Badge className="bg-brand/10 text-brand">Actual</Badge>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-neutral-700 ring-1 ring-neutral-200 disabled:opacity-30"
                disabled={safeViewedDay.number === 1}
                onClick={() => setSelectedDayNumber(safeViewedDay.number - 1)}
                aria-label="Jornada anterior"
              >
                <IconChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex flex-wrap items-center justify-center gap-1 px-1 py-1">
                {viewedRoundDays.map((day) => (
                  <button
                    key={day.id}
                    onClick={() => setSelectedDayNumber(day.number)}
                    className={cx(
                      'min-h-9 rounded-full px-3 text-sm font-semibold whitespace-nowrap transition',
                      day.number === safeViewedDay.number
                        ? 'bg-white text-brand ring-2 ring-brand/20'
                        : 'bg-neutral-200 text-neutral-600 active:bg-neutral-300',
                    )}
                  >
                    J{day.number}
                  </button>
                ))}
              </div>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-neutral-700 ring-1 ring-neutral-200 disabled:opacity-30"
                disabled={safeViewedDay.number === 3}
                onClick={() => setSelectedDayNumber(safeViewedDay.number + 1)}
                aria-label="Jornada siguiente"
              >
                <IconChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {matches.map((m) => (
        <MatchCard
          key={m.id}
          match={m}
          pairA={pairById.get(m.pair_a_id)!}
          pairB={pairById.get(m.pair_b_id)!}
          players={players}
          lineup={active.matchPlayers.filter((mp) => mp.match_id === m.id)}
          ballDuty={active.ballDuties.find((d) => d.match_id === m.id)}
          readOnly={!isViewingCurrent}
          onChanged={refresh}
        />
      ))}

      {isViewingCurrent ? (
        <p className="text-center text-xs text-neutral-400">Toca una pareja para registrar el ganador del partido</p>
      ) : (
        <p className="text-center text-xs font-medium text-neutral-400">Estás viendo una jornada en solo lectura</p>
      )}
    </div>
  )
}
