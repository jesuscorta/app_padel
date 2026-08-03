import { useLeague } from '../lib/LeagueContext'
import MatchCard from '../components/MatchCard'
import { Badge, EmptyState, Spinner } from '../components/ui'

export default function History() {
  const { players, active, loading, refresh } = useLeague()

  if (loading) return <Spinner />
  if (!active) {
    return (
      <EmptyState title="Sin liga activa">
        El histórico de ligas cerradas quedará en Más cuando finalices una liga.
      </EmptyState>
    )
  }

  const pairById = new Map(active.pairs.map((pair) => [pair.id, pair]))
  const roundDaysByRound = new Map(
    active.rounds.map((round) => [
      round.id,
      active.roundDays.filter((day) => day.round_id === round.id).sort((a, b) => a.number - b.number),
    ]),
  )

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold">Historial de rondas</h2>

      {active.rounds.map((round) => {
        const roundDays = roundDaysByRound.get(round.id) ?? []
        return (
          <section key={round.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Ronda {round.number}</h3>
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

            {roundDays.map((day) => (
              <div key={day.id} className="space-y-3 rounded-2xl bg-neutral-50 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-neutral-700">Jornada {day.number}</p>
                  <Badge
                    className={
                      day.status === 'finished'
                        ? 'bg-green-100 text-green-800'
                        : day.status === 'current'
                          ? 'bg-brand/10 text-brand'
                          : 'bg-neutral-200 text-neutral-600'
                    }
                  >
                    {day.status === 'finished'
                      ? 'Finalizada'
                      : day.status === 'current'
                        ? 'En curso'
                        : 'Pendiente'}
                  </Badge>
                </div>

                {active.matches
                  .filter((match) => match.day_id === day.id)
                  .map((match) => (
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
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}
