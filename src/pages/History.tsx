import { useEffect, useMemo, useState } from 'react'
import HistoryMatchRow from '../components/HistoryMatchRow'
import { Card, EmptyState, ErrorState, Sheet, Spinner } from '../components/ui'
import { useLeague } from '../lib/LeagueContext'
import { getLeagueData, listFinishedLeagues } from '../lib/db/leagues'
import type { League, LeagueData } from '../types'

export default function History() {
  const { players, active, loading, failed, error, refresh } = useLeague()
  const [archive, setArchive] = useState<League[]>([])
  const [archiveLoading, setArchiveLoading] = useState(true)
  const [archiveError, setArchiveError] = useState<string | null>(null)
  const [selected, setSelected] = useState<LeagueData | null>(null)
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null)

  useEffect(() => {
    async function loadArchive() {
      setArchiveLoading(true)
      try {
        setArchive(await listFinishedLeagues())
      } catch (error) {
        setArchiveError(error instanceof Error ? error.message : 'No se pudo cargar el histórico de ligas')
      } finally {
        setArchiveLoading(false)
      }
    }
    void loadArchive()
  }, [])

  const finishedDays = useMemo(() => {
    if (!active) return []
    return active.roundDays.filter((day) => day.status === 'finished').sort((a, b) => a.round_id.localeCompare(b.round_id) || a.number - b.number)
  }, [active])

  async function openArchive(league: League) {
    setSelectedTitle(league.name)
    try {
      setSelected(await getLeagueData(league))
    } catch (error) {
      setArchiveError(error instanceof Error ? error.message : 'No se pudo abrir la liga')
      setSelectedTitle(null)
    }
  }

  if (loading) return <Spinner />
  if (failed) return <ErrorState onRetry={() => void refresh()}>{error}</ErrorState>
  const pairById = new Map(active?.pairs.map((pair) => [pair.id, pair]) ?? [])

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold">Historial</h1>
      {active && (
        <section className="space-y-2">
          <h2 className="font-semibold text-neutral-700">Liga actual</h2>
          {finishedDays.length === 0 ? <EmptyState title="Aún no hay jornadas terminadas">Los resultados cerrados aparecerán aquí.</EmptyState> : finishedDays.map((day) => {
            const round = active.rounds.find((item) => item.id === day.round_id)
            return <Card key={day.id} className="space-y-2"><p className="text-sm font-semibold text-neutral-700">Ronda {round?.number} · Jornada {day.number}</p>{active.matches.filter((match) => match.day_id === day.id && match.winner_pair_id).map((match) => <HistoryMatchRow key={match.id} match={match} pairA={pairById.get(match.pair_a_id)!} pairB={pairById.get(match.pair_b_id)!} players={players} lineup={active.matchPlayers.filter((slot) => slot.match_id === match.id)} ballDuty={active.ballDuties.find((duty) => duty.match_id === match.id)} showBallDuty />)}</Card>
          })}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold text-neutral-700">Ligas cerradas</h2>
        {archiveLoading ? <Spinner /> : archiveError ? <ErrorState title="No se pudo cargar el histórico">{archiveError}</ErrorState> : archive.length === 0 ? <EmptyState title="Aún no hay ligas cerradas">Al finalizar una, podrás consultarla aquí.</EmptyState> : archive.map((league) => <Card key={league.id} className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold">{league.name}</p><p className="text-xs text-neutral-600">Cerrada {league.finished_at ? new Date(league.finished_at).toLocaleDateString('es-ES') : '—'}</p></div><button className="min-h-11 shrink-0 rounded-xl bg-neutral-200 px-3 text-sm font-semibold text-brand" onClick={() => void openArchive(league)}>Ver liga</button></Card>)}
      </section>

      <Sheet open={selectedTitle !== null} onClose={() => { setSelected(null); setSelectedTitle(null) }} title={selectedTitle ?? 'Liga cerrada'}>
        {!selected ? <Spinner /> : selected.rounds.map((round) => {
          const pairs = new Map(selected.pairs.map((pair) => [pair.id, pair]))
          return <details key={round.id} className="mb-3 rounded-2xl bg-neutral-50 p-3" open={round.number === 1}><summary className="cursor-pointer font-semibold">Ronda {round.number}</summary>{selected.roundDays.filter((day) => day.round_id === round.id).map((day) => <div key={day.id} className="mt-3 space-y-2"><p className="text-sm font-medium">Jornada {day.number}</p>{selected.matches.filter((match) => match.day_id === day.id).map((match) => <HistoryMatchRow key={match.id} match={match} pairA={pairs.get(match.pair_a_id)!} pairB={pairs.get(match.pair_b_id)!} players={players} lineup={selected.matchPlayers.filter((slot) => slot.match_id === match.id)} ballDuty={selected.ballDuties.find((duty) => duty.match_id === match.id)} showBallDuty />)}</div>)}</details>
        })}
      </Sheet>
    </div>
  )
}
