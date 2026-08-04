import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useLeague, playerName } from '../lib/LeagueContext'
import { updateBallDuty } from '../lib/db/balls'
import { pairLabel } from '../lib/format'
import { Badge, Card, EmptyState, Notice, Sheet, Spinner, cx } from '../components/ui'
import { IconBall } from '../components/icons'
import type { Match } from '../types'

export default function Balls() {
  const { isAdmin } = useAuth()
  const { players, active, loading, refresh } = useLeague()
  const [editing, setEditing] = useState<Match | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roundNumber, setRoundNumber] = useState<number | 'all'>('all')

  const dutyByMatch = useMemo(
    () => new Map(active?.ballDuties.map((d) => [d.match_id, d.player_id]) ?? []),
    [active],
  )
  const pairById = useMemo(() => new Map(active?.pairs.map((p) => [p.id, p]) ?? []), [active])

  const counts = useMemo(() => {
    const c = new Map<string, number>()
    for (const d of active?.ballDuties ?? []) c.set(d.player_id, (c.get(d.player_id) ?? 0) + 1)
    return c
  }, [active])

  if (loading) return <Spinner />
  if (!isAdmin) return <EmptyState title="Sin acceso">Solo el admin puede gestionar pelotas.</EmptyState>
  if (!active) return <EmptyState title="Sin liga activa">Crea una liga desde el sorteo.</EmptyState>

  const activePlayers = players.filter((p) => p.active)

  async function onSelect(playerId: string) {
    if (!editing || saving) return
    setSaving(true)
    setError(null)
    try {
      await updateBallDuty(editing.id, playerId)
      setEditing(null)
      await refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo asignar las pelotas')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <Link to="/ajustes" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand">← Volver a Más</Link>
      <section className="space-y-2">
        <h1 className="text-lg font-bold">Reparto de pelotas</h1>
        <div className="flex flex-wrap gap-2">
          {[...counts.entries()]
            .sort((a, b) => playerName(players, a[0]).localeCompare(playerName(players, b[0])))
            .map(([playerId, count]) => (
              <Badge key={playerId} className="bg-brand/10 text-brand">
                {playerName(players, playerId)} · {count}
              </Badge>
            ))}
          </div>
          {counts.size === 0 && <p className="text-sm text-neutral-600">Aún no hay pelotas asignadas.</p>}
      </section>

      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar por ronda">
        <button aria-pressed={roundNumber === 'all'} onClick={() => setRoundNumber('all')} className={cx('min-h-11 rounded-full px-4 text-sm font-semibold', roundNumber === 'all' ? 'bg-brand text-white' : 'bg-neutral-200 text-neutral-700')}>Todas</button>
        {active.rounds.map((round) => <button key={round.id} aria-pressed={roundNumber === round.number} onClick={() => setRoundNumber(round.number)} className={cx('min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold', roundNumber === round.number ? 'bg-brand text-white' : 'bg-neutral-200 text-neutral-700')}>Ronda {round.number}</button>)}
      </div>

      {active.rounds.filter((round) => roundNumber === 'all' || round.number === roundNumber).map((round) => (
        <section key={round.id} className="space-y-2">
          <h3 className="font-semibold text-neutral-600">Ronda {round.number}</h3>
          {active.matches
            .filter((m) => m.round_id === round.id)
            .map((m) => {
              const dutyPlayerId = dutyByMatch.get(m.id)
              return (
                <Card key={m.id} className="flex items-center gap-3">
                  <IconBall className="h-6 w-6 shrink-0 text-brand" />
                   <div className="min-w-0 flex-1">
                    <p className="font-semibold">{playerName(players, dutyPlayerId ?? '')}</p>
                     <p className="truncate text-xs text-neutral-600">
                      {pairLabel(players, pairById.get(m.pair_a_id))} vs{' '}
                      {pairLabel(players, pairById.get(m.pair_b_id))}
                    </p>
                  </div>
                  <button
                     className="min-h-11 rounded-lg bg-neutral-100 px-3 text-sm font-semibold text-brand active:bg-neutral-200"
                    onClick={() => setEditing(m)}
                  >
                    Cambiar
                  </button>
                </Card>
              )
            })}
        </section>
      ))}

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title="¿Quién lleva las pelotas?">
        <div className="max-h-80 space-y-1 overflow-y-auto">
          {activePlayers.map((p) => {
            const selected = editing ? dutyByMatch.get(editing.id) === p.id : false
            return (
              <button
                key={p.id}
                disabled={saving}
                onClick={() => onSelect(p.id)}
                className={cx(
                  'flex min-h-11 w-full items-center justify-between rounded-xl px-4 text-left font-medium transition',
                  selected ? 'bg-brand text-white' : 'bg-neutral-100 active:bg-neutral-200',
                )}
              >
                {p.name}
                <span className="text-xs opacity-70">{p.role === 'titular' ? 'Titular' : 'Sustituto'}</span>
              </button>
            )
          })}
        </div>
      </Sheet>
    </div>
  )
}
