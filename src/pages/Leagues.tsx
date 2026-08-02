import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import MatchCard from '../components/MatchCard'
import { useLeague } from '../lib/LeagueContext'
import { finishLeague, getLeagueData, listFinishedLeagues } from '../lib/db/leagues'
import { computeStandings } from '../lib/standings'
import {
  Badge,
  Button,
  Card,
  ConfirmSheet,
  EmptyState,
  Sheet,
  Spinner,
} from '../components/ui'
import type { League, LeagueData } from '../types'

export default function Leagues() {
  const { players, active, loading, refresh } = useLeague()
  const [archive, setArchive] = useState<League[]>([])
  const [archiveLoading, setArchiveLoading] = useState(true)
  const [selected, setSelected] = useState<LeagueData | null>(null)
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const activeComplete = Boolean(active && active.rounds.every((round) => round.status === 'finished'))

  useEffect(() => {
    void loadArchive()
  }, [])

  async function loadArchive() {
    setArchiveLoading(true)
    try {
      setArchive(await listFinishedLeagues())
    } finally {
      setArchiveLoading(false)
    }
  }

  async function openLeague(league: League) {
    setSelectedTitle(league.name)
    setDetailLoading(true)
    try {
      setSelected(await getLeagueData(league))
    } finally {
      setDetailLoading(false)
    }
  }

  async function onFinishLeague() {
    if (!active) return
    setSaving(true)
    try {
      await finishLeague(active.league.id)
      setFinishOpen(false)
      await refresh()
      await loadArchive()
    } finally {
      setSaving(false)
    }
  }

  const selectedStandings = useMemo(() => {
    if (!selected) return []
    return computeStandings({
      players,
      pairs: selected.pairs,
      matches: selected.matches,
      matchPlayers: selected.matchPlayers,
      mode: 'todos',
    })
  }, [players, selected])

  if (loading) return <Spinner />

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h2 className="text-lg font-bold">Liga actual</h2>

        {active ? (
          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{active.league.name}</p>
                <p className="text-sm text-neutral-500">
                  {active.rounds.filter((round) => round.status === 'finished').length}/3 jornadas cerradas
                </p>
              </div>
              <Badge className={activeComplete ? 'bg-green-100 text-green-800' : 'bg-brand/10 text-brand'}>
                {activeComplete ? 'Lista para cerrar' : 'En juego'}
              </Badge>
            </div>

            {activeComplete ? (
              <Button full disabled={saving} onClick={() => setFinishOpen(true)}>
                Finalizar liga y mover al histórico
              </Button>
            ) : (
              <Link to="/">
                <Button full variant="secondary">
                  Volver a la jornada actual
                </Button>
              </Link>
            )}
          </Card>
        ) : (
          <Card className="space-y-3 text-center">
            <p className="font-semibold">No hay una liga activa</p>
            <p className="text-sm text-neutral-500">
              Puedes iniciar una nueva sin perder el histórico de las anteriores.
            </p>
            <Link to="/sorteo">
              <Button full>Nueva liga</Button>
            </Link>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Histórico de ligas</h2>
        {archiveLoading ? (
          <Spinner />
        ) : archive.length === 0 ? (
          <EmptyState title="Aún no hay ligas cerradas">Cuando finalices una, aparecerá aquí.</EmptyState>
        ) : (
          archive.map((league) => (
            <Card key={league.id} className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{league.name}</p>
                <p className="text-xs text-neutral-500">
                  Cerrada {league.finished_at ? new Date(league.finished_at).toLocaleDateString('es-ES') : '—'}
                </p>
              </div>
              <Button variant="secondary" onClick={() => openLeague(league)}>
                Ver detalle
              </Button>
            </Card>
          ))
        )}
      </section>

      <ConfirmSheet
        open={finishOpen}
        title="Finalizar liga"
        message="La liga pasará al histórico en solo lectura y podrás iniciar una nueva."
        confirmLabel="Sí, finalizar"
        onConfirm={onFinishLeague}
        onCancel={() => setFinishOpen(false)}
      />

      <Sheet open={selectedTitle !== null} onClose={() => { setSelected(null); setSelectedTitle(null) }} title={selectedTitle ?? 'Detalle de liga'}>
        {detailLoading || !selected ? (
          <Spinner />
        ) : (
          <div className="space-y-5">
            <section className="space-y-2">
              <p className="text-sm font-semibold text-neutral-600">Clasificación final</p>
              {selectedStandings.map((row, index) => (
                <div key={row.playerId} className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-sm font-bold text-neutral-500">{index + 1}</span>
                    <div>
                      <p className="font-semibold">{row.name}</p>
                      <p className="text-xs text-neutral-500">PJ {row.played} · PG {row.wins}</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-brand">{row.points}</p>
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <p className="text-sm font-semibold text-neutral-600">Jornadas</p>
              {selected.rounds.map((round) => {
                const pairById = new Map(selected.pairs.map((pair) => [pair.id, pair]))
                return (
                  <div key={round.id} className="space-y-3">
                    <p className="font-semibold">Jornada {round.number}</p>
                    {selected.matches
                      .filter((match) => match.round_id === round.id)
                      .map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          pairA={pairById.get(match.pair_a_id)!}
                          pairB={pairById.get(match.pair_b_id)!}
                          players={players}
                          lineup={selected.matchPlayers.filter((slot) => slot.match_id === match.id)}
                          ballDuty={selected.ballDuties.find((duty) => duty.match_id === match.id)}
                          readOnly
                          onChanged={() => undefined}
                        />
                      ))}
                  </div>
                )
              })}
            </section>
          </div>
        )}
      </Sheet>
    </div>
  )
}
