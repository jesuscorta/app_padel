import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ShareDayCard from '../components/ShareDayCard'
import { useAuth } from '../lib/AuthContext'
import { useLeague } from '../lib/LeagueContext'
import MatchCard from '../components/MatchCard'
import { Badge, BusyOverlay, Button, Card, EmptyState, ErrorState, Notice, Spinner, cx } from '../components/ui'
import { IconChevronLeft, IconChevronRight, IconShare } from '../components/icons'
import { pairLabel } from '../lib/format'
import { computeMatchScoreFromMatch } from '../lib/scoring'
import { shareNodeAsImage } from '../lib/share'

export default function Home() {
  const { isAdmin } = useAuth()
  const { players, active, loading, failed, error, refresh } = useLeague()
  const [selectedRoundNumber, setSelectedRoundNumber] = useState<number | null>(null)
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(null)
  const [transitionMessage, setTransitionMessage] = useState<string | null>(null)
  const [shareMessage, setShareMessage] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const previousCurrentRef = useRef<{ round: number | null; day: number | null }>({ round: null, day: null })
  const shareCardRef = useRef<HTMLDivElement | null>(null)

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

  useEffect(() => {
    if (!shareMessage) return
    const timeoutId = window.setTimeout(() => setShareMessage(null), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [shareMessage])

  const safeViewedRound = viewedRound ?? currentRound
  const safeViewedDay = viewedDay
  const matches = viewedDay && active ? active.matches.filter((m) => m.day_id === viewedDay.id) : []
  const done = matches.filter((m) => m.winner_pair_id !== null).length
  const pairById = new Map(active?.pairs.map((p) => [p.id, p]) ?? [])
  const currentRoundNumber = currentRound?.number ?? 0
  const isViewingCurrent = Boolean(currentRound && currentDay && safeViewedRound?.id === currentRound.id && safeViewedDay?.id === currentDay.id)
  const currentDayMatches = currentDay && active ? active.matches.filter((m) => m.day_id === currentDay.id) : []
  const shareMatches = useMemo(
    () =>
      currentDayMatches.map((match) => {
        const ballDutyPlayerId = active?.ballDuties.find((duty) => duty.match_id === match.id)?.player_id
        return {
          pairA: pairLabel(players, pairById.get(match.pair_a_id)),
          pairB: pairLabel(players, pairById.get(match.pair_b_id)),
          ballDuty: ballDutyPlayerId
            ? players.find((player) => player.id === ballDutyPlayerId)?.name ?? '—'
            : '—',
          scoreLine: computeMatchScoreFromMatch(match)?.scoreLine,
        }
      }),
    [active?.ballDuties, currentDayMatches, pairById, players],
  )

  if (loading) return <Spinner />
  if (failed) return <ErrorState onRetry={() => void refresh()}>{error}</ErrorState>

  if (!active) {
    return (
      <EmptyState title="No hay liga activa">
        <p className="mb-4">{isAdmin ? 'Sortea las 7 rondas para empezar una nueva liga.' : 'El administrador creará la próxima liga cuando esté lista.'}</p>
        {isAdmin && <Link to="/sorteo" className="inline-flex min-h-11 items-center rounded-xl bg-brand px-4 py-2.5 font-semibold text-white">Ir al sorteo</Link>}
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
        <Link to="/clasificacion" className="mt-2 flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 py-2.5 font-semibold text-white">Ver clasificación final</Link>
      </Card>
    )
  }

  const displayedRound = safeViewedRound ?? currentRound
  const displayedDay = safeViewedDay

  async function onShareCurrentDay() {
    if (!currentRound || !currentDay || !shareCardRef.current) return
    setSharing(true)
    setShareMessage(null)
    try {
      const fileName = `jornada-r${currentRound.number}-j${currentDay.number}.png`
      const result = await shareNodeAsImage(
        shareCardRef.current,
        fileName,
        `Ronda ${currentRound.number} · Jornada ${currentDay.number}`,
      )
      setShareMessage(
        result === 'shared'
          ? 'Imagen lista para enviar por WhatsApp.'
          : 'Imagen descargada. Ya puedes enviarla por WhatsApp.',
      )
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        setShareMessage(error instanceof Error ? error.message : 'No se pudo compartir la jornada')
      }
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="space-y-3">
      <BusyOverlay open={sharing} label="Generando imagen…" />
      {transitionMessage && (
        <Notice tone="success">{transitionMessage}</Notice>
      )}

      {shareMessage && (
        <Notice tone={shareMessage.startsWith('No se pudo') ? 'error' : 'success'}>{shareMessage}</Notice>
      )}

      <Card className="space-y-3 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-black">Ronda {displayedRound.number} de 7</h1>
            {displayedRound.number === currentRoundNumber && (
              <Badge className="bg-brand/10 text-brand">Actual</Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-neutral-500">{done}/2</span>
            {isViewingCurrent && currentDay && (
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 transition active:bg-neutral-200 disabled:opacity-40"
                disabled={sharing}
                onClick={onShareCurrentDay}
                aria-label="Compartir jornada"
                title="Compartir jornada"
              >
                <IconShare className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {!isViewingCurrent && (
          <Button
            variant="secondary"
            full
            className="min-h-10 text-sm"
            onClick={() => {
              setSelectedRoundNumber(currentRound.number)
              setSelectedDayNumber(currentDay?.number ?? 1)
            }}
          >
            Ir a la jornada actual
          </Button>
        )}

        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Rondas</p>
          <div className="flex items-center gap-2">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white disabled:opacity-30"
              disabled={displayedRound.number === 1}
              onClick={() => setSelectedRoundNumber(displayedRound.number - 1)}
              aria-label="Ronda anterior"
            >
              <IconChevronLeft className="h-5 w-5" />
            </button>
              <div className="flex flex-1 gap-2 overflow-x-auto pb-1">
                {active.rounds.map((round) => (
                  <button
                     key={round.id}
                     onClick={() => setSelectedRoundNumber(round.number)}
                     aria-pressed={round.number === displayedRound.number}
                    className={cx(
                      'min-h-10 rounded-full px-3.5 text-sm font-bold whitespace-nowrap transition',
                      round.number === displayedRound.number
                        ? 'bg-brand text-white shadow-sm'
                        : 'bg-neutral-100 text-neutral-600 active:bg-neutral-200',
                  )}
                >
                  Ronda {round.number}
                </button>
              ))}
            </div>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white disabled:opacity-30"
              disabled={displayedRound.number === 7}
              onClick={() => setSelectedRoundNumber(displayedRound.number + 1)}
              aria-label="Ronda siguiente"
            >
              <IconChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {displayedDay && (
          <div className="mx-auto w-full max-w-sm space-y-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="flex flex-col items-center gap-2 text-center">
               <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Jornadas</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <h3 className="font-semibold text-neutral-800">Jornada {displayedDay.number} de 3</h3>
                {displayedRound.id === currentRound.id && displayedDay.number === currentDay?.number && (
                  <Badge className="bg-brand/10 text-brand">Actual</Badge>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-neutral-700 ring-1 ring-neutral-200 disabled:opacity-30"
                disabled={displayedDay.number === 1}
                onClick={() => setSelectedDayNumber(displayedDay.number - 1)}
                aria-label="Jornada anterior"
              >
                <IconChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex flex-wrap items-center justify-center gap-1 px-1 py-1">
                {viewedRoundDays.map((day) => (
                  <button
                    key={day.id}
                    onClick={() => setSelectedDayNumber(day.number)}
                    aria-pressed={day.number === displayedDay.number}
                    className={cx(
                      'min-h-8 rounded-full px-3 text-sm font-semibold whitespace-nowrap transition',
                      day.number === displayedDay.number
                        ? 'bg-white text-brand ring-2 ring-brand/20'
                        : 'bg-neutral-200 text-neutral-600 active:bg-neutral-300',
                    )}
                  >
                    J{day.number}
                  </button>
                ))}
              </div>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-neutral-700 ring-1 ring-neutral-200 disabled:opacity-30"
                disabled={displayedDay.number === 3}
                onClick={() => setSelectedDayNumber(displayedDay.number + 1)}
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
          readOnly={!isAdmin || !isViewingCurrent}
          onChanged={refresh}
        />
      ))}

      {isAdmin && isViewingCurrent ? (
        <p className="text-center text-xs text-neutral-600">Añade el marcador para calcular automáticamente el ganador</p>
      ) : (
        <p className="text-center text-xs font-medium text-neutral-600">Estás viendo una jornada en solo lectura</p>
      )}

      {currentRound && currentDay && (
        <div className="pointer-events-none fixed left-[-9999px] top-0" aria-hidden="true">
          <div ref={shareCardRef}>
            <ShareDayCard
              leagueName={active.league.name}
              roundNumber={currentRound.number}
              dayNumber={currentDay.number}
              matches={shareMatches}
            />
          </div>
        </div>
      )}
    </div>
  )
}
