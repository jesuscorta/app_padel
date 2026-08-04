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
        <Card className="border border-brand/10 bg-brand/5 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Pareja TOP</p>
              <p className="text-base font-bold text-neutral-900">
                {topPair[0].name} <span className="text-neutral-400">&</span> {topPair[1].name}
              </p>
            </div>
            <Badge className="bg-brand text-white">TOP</Badge>
          </div>
        </Card>
      )}

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        {standings.map((row, index) => (
          <div key={row.playerId} className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3 last:border-0">
            <span className="w-6 text-center text-sm font-bold text-neutral-500">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold text-neutral-900">{row.name}</p>
                {row.role === 'sustituto' && <Badge className="bg-amber-100 text-amber-800">S</Badge>}
              </div>
              <p className="text-xs text-neutral-500">PJ {row.played} · PG {row.wins}</p>
            </div>
            <p className="text-lg font-black text-brand">{row.points}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
