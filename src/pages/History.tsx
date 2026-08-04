import { useLeague } from '../lib/LeagueContext'
import HistoryMatchRow from '../components/HistoryMatchRow'
import { EmptyState, Spinner } from '../components/ui'

export default function History() {
  const { players, active, loading } = useLeague()

  if (loading) return <Spinner />
  if (!active) {
    return (
      <EmptyState title="Sin liga activa">
        El histórico de ligas cerradas quedará en Más cuando finalices una liga.
      </EmptyState>
    )
  }

  const pairById = new Map(active.pairs.map((pair) => [pair.id, pair]))
  const finishedRounds = active.rounds.filter((round) => round.status === 'finished')
  const roundDaysByRound = new Map(
    finishedRounds.map((round) => [
      round.id,
      active.roundDays
        .filter((day) => day.round_id === round.id && day.status === 'finished')
        .sort((a, b) => a.number - b.number),
    ]),
  )

  if (finishedRounds.length === 0) {
    return (
      <EmptyState title="Aún no hay historial">
        El historial mostrará solo las jornadas ya terminadas.
      </EmptyState>
    )
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold">Historial de rondas</h2>

      {finishedRounds.map((round) => {
        const roundDays = roundDaysByRound.get(round.id) ?? []
        return (
          <section key={round.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Ronda {round.number}</h3>
            </div>

            {roundDays.map((day) => (
              <div key={day.id} className="space-y-2 rounded-2xl bg-neutral-50 p-3">
                <p className="text-sm font-medium text-neutral-700">Jornada {day.number}</p>

                {active.matches
                  .filter((match) => match.day_id === day.id && match.winner_pair_id !== null)
                  .map((match) => (
                    <HistoryMatchRow
                      key={match.id}
                      match={match}
                      pairA={pairById.get(match.pair_a_id)!}
                      pairB={pairById.get(match.pair_b_id)!}
                      players={players}
                      lineup={active.matchPlayers.filter((slot) => slot.match_id === match.id)}
                      ballDuty={active.ballDuties.find((duty) => duty.match_id === match.id)}
                      showBallDuty
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
