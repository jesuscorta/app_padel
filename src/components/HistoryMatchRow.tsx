import { playerName } from '../lib/LeagueContext'
import { pairLabel } from '../lib/format'
import { computeMatchScoreFromMatch } from '../lib/scoring'
import { Badge, cx } from './ui'
import type { BallDuty, Match, MatchPlayer, Pair, Player } from '../types'

interface HistoryMatchRowProps {
  match: Match
  pairA: Pair
  pairB: Pair
  players: Player[]
  lineup: MatchPlayer[]
  ballDuty?: BallDuty
  showBallDuty?: boolean
}

function substitutionLabels(players: Player[], lineup: MatchPlayer[]): string[] {
  return lineup
    .filter((slot) => slot.actual_player_id !== slot.titular_id)
    .map((slot) => `${playerName(players, slot.actual_player_id)} por ${playerName(players, slot.titular_id)}`)
}

export default function HistoryMatchRow({
  match,
  pairA,
  pairB,
  players,
  lineup,
  ballDuty,
  showBallDuty,
}: HistoryMatchRowProps) {
  const winnerPair = match.winner_pair_id === pairA.id ? pairA : match.winner_pair_id === pairB.id ? pairB : null
  const substitutions = substitutionLabels(players, lineup)
  const score = computeMatchScoreFromMatch(match)

  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-900">
            {pairLabel(players, pairA)} <span className="text-neutral-400">vs</span> {pairLabel(players, pairB)}
          </p>
          <p className={cx('mt-1 text-xs', winnerPair ? 'text-neutral-600' : 'text-neutral-400')}>
            {winnerPair ? `Ganaron ${pairLabel(players, winnerPair)}` : 'Pendiente'}
            {score ? ` · ${score.scoreLine}` : ''}
          </p>
        </div>
        {winnerPair ? <Badge className="bg-brand/10 text-brand">Cerrado</Badge> : <Badge className="bg-neutral-200 text-neutral-600">Pendiente</Badge>}
      </div>

      {(substitutions.length > 0 || (showBallDuty && ballDuty)) && (
        <div className="mt-2 space-y-1 text-xs text-neutral-500">
          {substitutions.length > 0 && <p>{substitutions.join(' · ')}</p>}
          {showBallDuty && ballDuty && <p>Pelotas: {playerName(players, ballDuty.player_id)}</p>}
        </div>
      )}
    </div>
  )
}
