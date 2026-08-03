import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import MatchCard from '../components/MatchCard'
import { useLeague } from '../lib/LeagueContext'
import { deleteLeague, finishLeague, getLeagueData, listFinishedLeagues } from '../lib/db/leagues'
import { computeStandings } from '../lib/standings'
import {
  Badge,
  BusyOverlay,
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
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; active: boolean } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
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
    setActionError(null)
    try {
      await finishLeague(active.league.id)
      setFinishOpen(false)
      await refresh()
      await loadArchive()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No se pudo finalizar la liga')
    } finally {
      setSaving(false)
    }
  }

  async function onDeleteLeague() {
    if (!deleteTarget) return
    setSaving(true)
    setActionError(null)
    try {
      await deleteLeague(deleteTarget.id)
      if (deleteTarget.active) await refresh()
      await loadArchive()
      setDeleteTarget(null)
      if (selected?.league.id === deleteTarget.id) {
        setSelected(null)
        setSelectedTitle(null)
      }
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'code' in error && error.code === '23503'
          ? 'La liga no se puede borrar porque la base de datos todavía tiene relaciones antiguas sin borrado en cascada. Actualiza las constraints de Supabase y vuelve a intentarlo.'
          : error instanceof Error
            ? error.message
            : 'No se pudo eliminar la liga'
      setActionError(message)
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
      <BusyOverlay open={saving} label="Guardando cambios…" />
      {actionError && (
        <Card className="border border-red-200 bg-red-50 text-red-900">
          <p className="text-sm font-medium">{actionError}</p>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Liga actual</h2>

        {active ? (
          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{active.league.name}</p>
                <p className="text-sm text-neutral-500">
                  {active.rounds.filter((round) => round.status === 'finished').length}/7 rondas cerradas
                </p>
              </div>
              <Badge className={activeComplete ? 'bg-green-100 text-green-800' : 'bg-brand/10 text-brand'}>
                {activeComplete ? 'Lista para cerrar' : 'En juego'}
              </Badge>
            </div>

            {activeComplete ? (
              <div className="space-y-2">
                <Button full disabled={saving} onClick={() => setFinishOpen(true)}>
                  Finalizar liga y mover al histórico
                </Button>
                <Button
                  full
                  variant="danger"
                  disabled={saving}
                  onClick={() => {
                    setActionError(null)
                    setDeleteTarget({ id: active.league.id, name: active.league.name, active: true })
                  }}
                >
                  Eliminar liga actual
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link to="/">
                  <Button full variant="secondary">
                    Volver a la ronda actual
                  </Button>
                </Link>
                <Button
                  full
                  variant="danger"
                  disabled={saving}
                  onClick={() => {
                    setActionError(null)
                    setDeleteTarget({ id: active.league.id, name: active.league.name, active: true })
                  }}
                >
                  Eliminar liga actual
                </Button>
              </div>
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
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => openLeague(league)}>
                  Ver detalle
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    setActionError(null)
                    setDeleteTarget({ id: league.id, name: league.name, active: false })
                  }}
                >
                  Eliminar
                </Button>
              </div>
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

      <ConfirmSheet
        open={deleteTarget !== null}
        title="Eliminar liga"
        message={
          deleteTarget
            ? `Se borrará por completo "${deleteTarget.name}" con sus rondas, parejas, partidos y resultados.`
            : undefined
        }
        confirmLabel="Sí, eliminar"
        danger
        onConfirm={onDeleteLeague}
        onCancel={() => setDeleteTarget(null)}
      />

      <Sheet open={selectedTitle !== null} onClose={() => { setSelected(null); setSelectedTitle(null) }} title={selectedTitle ?? 'Detalle de liga'}>
        {detailLoading || !selected ? (
          <Spinner />
        ) : (
          <div className="space-y-5">
            <section className="space-y-2">
              <p className="text-sm font-semibold text-neutral-600">Clasificación global</p>
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

            <section className="space-y-4">
              <p className="text-sm font-semibold text-neutral-600">Clasificación por ronda</p>
              {selected.rounds.map((round) => {
                const roundStandings = computeStandings({
                  players,
                  pairs: selected.pairs.filter((pair) => pair.round_id === round.id),
                  matches: selected.matches,
                  matchPlayers: selected.matchPlayers,
                  mode: 'todos',
                  roundId: round.id,
                })

                return (
                  <div key={round.id} className="space-y-2">
                    <p className="font-semibold">Ronda {round.number}</p>
                    {roundStandings.map((row, index) => (
                      <div
                        key={`${round.id}-${row.playerId}`}
                        className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3"
                      >
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
                  </div>
                )
              })}
            </section>

            <section className="space-y-3">
              <p className="text-sm font-semibold text-neutral-600">Rondas</p>
              {selected.rounds.map((round) => {
                const pairById = new Map(selected.pairs.map((pair) => [pair.id, pair]))
                const roundDays = selected.roundDays
                  .filter((day) => day.round_id === round.id)
                  .sort((a, b) => a.number - b.number)
                return (
                  <div key={round.id} className="space-y-3">
                    <p className="font-semibold">Ronda {round.number}</p>
                    {roundDays.map((day) => (
                      <div key={day.id} className="space-y-3 rounded-2xl bg-neutral-50 p-3">
                        <p className="font-medium text-neutral-700">Jornada {day.number}</p>
                        {selected.matches
                          .filter((match) => match.day_id === day.id)
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
