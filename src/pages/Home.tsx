import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLeague } from '../lib/LeagueContext'
import MatchCard from '../components/MatchCard'
import { Badge, Button, Card, EmptyState, Spinner, cx } from '../components/ui'

export default function Home() {
  const { players, active, loading, refresh } = useLeague()
  const [selectedRoundNumber, setSelectedRoundNumber] = useState<number | null>(null)
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(null)

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
    if (currentDay) setSelectedDayNumber((prev) => prev ?? currentDay.number)
  }, [currentDay])

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

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">Ronda {safeViewedRound.number} de 7</h2>
            {safeViewedRound.number === currentRoundNumber && (
              <Badge className="bg-brand/10 text-brand">Actual</Badge>
            )}
          </div>
          <span className="text-sm text-neutral-500">{done}/2 partidos</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            disabled={safeViewedRound.number === 1}
            onClick={() => setSelectedRoundNumber(safeViewedRound.number - 1)}
          >
            Anterior
          </Button>
          <div className="flex flex-1 gap-1 overflow-x-auto pb-1">
            {active.rounds.map((round) => (
              <button
                key={round.id}
                onClick={() => setSelectedRoundNumber(round.number)}
                className={cx(
                  'min-h-10 rounded-full px-3 text-sm font-semibold whitespace-nowrap transition',
                  round.number === safeViewedRound.number
                    ? 'bg-brand text-white'
                    : 'bg-neutral-200 text-neutral-600 active:bg-neutral-300',
                )}
              >
                R{round.number}
              </button>
            ))}
          </div>
          <Button
            variant="secondary"
            disabled={safeViewedRound.number === 7}
            onClick={() => setSelectedRoundNumber(safeViewedRound.number + 1)}
          >
            Siguiente
          </Button>
        </div>

        {safeViewedDay && (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Jornada {safeViewedDay.number} de 3</h3>
                {safeViewedRound.id === currentRound.id && safeViewedDay.number === currentDay?.number && (
                  <Badge className="bg-brand/10 text-brand">Actual</Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                disabled={safeViewedDay.number === 1}
                onClick={() => setSelectedDayNumber(safeViewedDay.number - 1)}
              >
                Anterior
              </Button>
              <div className="flex flex-1 gap-1 overflow-x-auto pb-1">
                {viewedRoundDays.map((day) => (
                  <button
                    key={day.id}
                    onClick={() => setSelectedDayNumber(day.number)}
                    className={cx(
                      'min-h-10 rounded-full px-3 text-sm font-semibold whitespace-nowrap transition',
                      day.number === viewedDay.number
                        ? 'bg-brand text-white'
                        : 'bg-neutral-200 text-neutral-600 active:bg-neutral-300',
                    )}
                  >
                    J{day.number}
                  </button>
                ))}
              </div>
              <Button
                variant="secondary"
                disabled={safeViewedDay.number === 3}
                onClick={() => setSelectedDayNumber(safeViewedDay.number + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>

      {matches.map((m) => (
        <MatchCard
          key={m.id}
          match={m}
          pairA={pairById.get(m.pair_a_id)!}
          pairB={pairById.get(m.pair_b_id)!}
          players={players}
          lineup={active.matchPlayers.filter((mp) => mp.match_id === m.id)}
          ballDuty={active.ballDuties.find((d) => d.match_id === m.id)}
          onChanged={refresh}
        />
      ))}

      <p className="text-center text-xs text-neutral-400">
        Toca una pareja para registrar el ganador del partido
      </p>
    </div>
  )
}
