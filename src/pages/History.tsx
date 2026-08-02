import { useLeague } from '../lib/LeagueContext'
import MatchCard from '../components/MatchCard'
import { Badge, EmptyState, Spinner } from '../components/ui'

export default function History() {
  const { players, active, loading, refresh } = useLeague()

  if (loading) return <Spinner />
  if (!active) {
    return (
      <EmptyState title="Sin liga activa">
        El histórico de ligas cerradas quedará en Ajustes cuando finalices una liga.
      </EmptyState>
    )
  }

  const pairById = new Map(active.pairs.map((pair) => [pair.id, pair]))

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold">Historial de jornadas</h2>

      {active.rounds.map((round) => {
        const matches = active.matches.filter((match) => match.round_id === round.id)
        return (
          <section key={round.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Jornada {round.number}</h3>
              <Badge
                className={
                  round.status === 'finished'
                    ? 'bg-green-100 text-green-800'
                    : round.status === 'current'
                      ? 'bg-brand/10 text-brand'
                      : 'bg-neutral-200 text-neutral-600'
                }
              >
                {round.status === 'finished'
                  ? 'Finalizada'
                  : round.status === 'current'
                    ? 'En curso'
                    : 'Pendiente'}
              </Badge>
            </div>

            {matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                pairA={pairById.get(match.pair_a_id)!}
                pairB={pairById.get(match.pair_b_id)!}
                players={players}
                lineup={active.matchPlayers.filter((slot) => slot.match_id === match.id)}
                ballDuty={active.ballDuties.find((duty) => duty.match_id === match.id)}
                onChanged={refresh}
              />
            ))}
          </section>
        )
      })}
    </div>
  )
}
