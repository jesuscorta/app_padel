import { Link } from 'react-router-dom'
import { useLeague } from '../lib/LeagueContext'
import MatchCard from '../components/MatchCard'
import { Button, Card, EmptyState, Spinner } from '../components/ui'

export default function Home() {
  const { players, active, loading, refresh } = useLeague()

  if (loading) return <Spinner />

  if (!active) {
    return (
      <EmptyState title="No hay liga activa">
        <p className="mb-4">Sortea las 4 parejas para empezar una nueva liga.</p>
        <Link to="/sorteo">
          <Button>Ir al sorteo</Button>
        </Link>
      </EmptyState>
    )
  }

  const currentRound = active.rounds.find((r) => r.status === 'current')

  if (!currentRound) {
    return (
      <Card className="space-y-2 text-center">
        <p className="text-lg font-bold">¡Liga completada!</p>
        <p className="text-sm text-neutral-500">
          Se han jugado las 3 jornadas. Consulta la clasificación o cierra la liga desde Ajustes.
        </p>
        <Link to="/clasificacion">
          <Button full className="mt-2">
            Ver clasificación final
          </Button>
        </Link>
      </Card>
    )
  }

  const matches = active.matches.filter((m) => m.round_id === currentRound.id)
  const done = matches.filter((m) => m.winner_pair_id !== null).length
  const pairById = new Map(active.pairs.map((p) => [p.id, p]))

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold">Jornada {currentRound.number} de 3</h2>
        <span className="text-sm text-neutral-500">{done}/2 partidos</span>
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
        Toca una pareja para registrarla como ganadora
      </p>
    </div>
  )
}
