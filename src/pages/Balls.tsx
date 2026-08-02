import { useMemo, useState } from 'react'
import { useLeague, playerName } from '../lib/LeagueContext'
import { updateBallDuty } from '../lib/db/balls'
import { pairLabel } from '../lib/format'
import { Badge, Card, EmptyState, Sheet, Spinner, cx } from '../components/ui'
import { IconBall } from '../components/icons'
import type { Match } from '../types'

export default function Balls() {
  const { players, active, loading, refresh } = useLeague()
  const [editing, setEditing] = useState<Match | null>(null)
  const [saving, setSaving] = useState(false)

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
  if (!active) return <EmptyState title="Sin liga activa">Crea una liga desde el sorteo.</EmptyState>

  const activePlayers = players.filter((p) => p.active)

  async function onSelect(playerId: string) {
    if (!editing || saving) return
    setSaving(true)
    try {
      await updateBallDuty(editing.id, playerId)
      setEditing(null)
      await refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Reparto de pelotas</h2>
        <div className="flex flex-wrap gap-2">
          {[...counts.entries()]
            .sort((a, b) => playerName(players, a[0]).localeCompare(playerName(players, b[0])))
            .map(([playerId, count]) => (
              <Badge key={playerId} className="bg-brand/10 text-brand">
                {playerName(players, playerId)} · {count}
              </Badge>
            ))}
        </div>
      </section>

      {active.rounds.map((round) => (
        <section key={round.id} className="space-y-2">
          <h3 className="font-semibold text-neutral-600">Jornada {round.number}</h3>
          {active.matches
            .filter((m) => m.round_id === round.id)
            .map((m) => {
              const dutyPlayerId = dutyByMatch.get(m.id)
              return (
                <Card key={m.id} className="flex items-center gap-3">
                  <IconBall className="h-6 w-6 shrink-0 text-brand" />
                  <div className="flex-1">
                    <p className="font-semibold">{playerName(players, dutyPlayerId ?? '')}</p>
                    <p className="text-xs text-neutral-500">
                      {pairLabel(players, pairById.get(m.pair_a_id))} vs{' '}
                      {pairLabel(players, pairById.get(m.pair_b_id))}
                    </p>
                  </div>
                  <button
                    className="min-h-9 rounded-lg bg-neutral-100 px-3 text-sm font-semibold text-brand active:bg-neutral-200"
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
