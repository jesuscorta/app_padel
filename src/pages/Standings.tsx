import { useState } from 'react'
import { useLeague } from '../lib/LeagueContext'
import { computeStandings, type StandingsMode } from '../lib/standings'
import { Badge, Card, EmptyState, SegmentedControl, Spinner, cx } from '../components/ui'

export default function Standings() {
  const { players, active, loading } = useLeague()
  const [mode, setMode] = useState<StandingsMode>('titulares')
  const [scope, setScope] = useState<'global' | number>('global')

  if (loading) return <Spinner />
  if (!active) {
    return (
      <EmptyState title="Sin liga activa">
        La clasificación aparecerá cuando exista una liga en curso o recién terminada.
      </EmptyState>
    )
  }

  const standings = computeStandings({
    players,
    pairs: active.pairs,
    matches: active.matches,
    matchPlayers: active.matchPlayers,
    mode,
    roundId: scope === 'global' ? undefined : active.rounds.find((round) => round.number === scope)?.id,
  })
  const topPair = standings.length >= 2 ? [standings[0], standings[1]] : null

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-lg font-bold">Clasificación individual</h2>
        <SegmentedControl
          value={mode}
          onChange={setMode}
          options={[
            { value: 'titulares', label: 'Solo titulares' },
            { value: 'todos', label: 'Con sustitutos' },
          ]}
        />
        <div className="flex gap-1 overflow-x-auto pb-1">
          <button
            onClick={() => setScope('global')}
            className={cx(
              'min-h-10 rounded-full px-3 text-sm font-semibold whitespace-nowrap transition',
              scope === 'global'
                ? 'bg-brand text-white'
                : 'bg-neutral-200 text-neutral-600 active:bg-neutral-300',
            )}
          >
            Global
          </button>
          {active.rounds.map((round) => (
            <button
              key={round.id}
              onClick={() => setScope(round.number)}
              className={cx(
                'min-h-10 rounded-full px-3 text-sm font-semibold whitespace-nowrap transition',
                scope === round.number
                  ? 'bg-brand text-white'
                  : 'bg-neutral-200 text-neutral-600 active:bg-neutral-300',
              )}
            >
              Ronda {round.number}
            </button>
          ))}
        </div>
      </div>

      {topPair && (
        <Card className="overflow-hidden border border-brand/10 bg-linear-to-br from-brand/8 via-white to-accent/10 p-0">
          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Pareja TOP</p>
                <h3 className="mt-1 text-xl font-black text-neutral-900">
                  {topPair[0].name} <span className="text-neutral-400">&</span> {topPair[1].name}
                </h3>
              </div>
              <Badge className="bg-brand text-white">TOP</Badge>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {standings.map((row, index) => (
          <Card key={row.playerId} className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold">{row.name}</p>
                {row.role === 'sustituto' && <Badge className="bg-amber-100 text-amber-800">Sustituto</Badge>}
              </div>
              <p className="text-xs text-neutral-500">
                PJ {row.played} · PG {row.wins} · % {(row.winRate * 100).toFixed(0)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-brand">{row.points}</p>
              <p className="text-xs text-neutral-500">pts</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
