import { useState } from 'react'
import { useLeague } from '../lib/LeagueContext'
import { computeStandings, type StandingsMode } from '../lib/standings'
import { Badge, Card, EmptyState, SegmentedControl, Spinner } from '../components/ui'

export default function Standings() {
  const { players, active, loading } = useLeague()
  const [mode, setMode] = useState<StandingsMode>('titulares')

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
  })

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
      </div>

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
