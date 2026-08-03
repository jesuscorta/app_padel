interface ShareDayMatch {
  pairA: string
  pairB: string
  ballDuty: string
  scoreLine?: string
}

interface ShareDayCardProps {
  leagueName: string
  roundNumber: number
  dayNumber: number
  matches: ShareDayMatch[]
}

export default function ShareDayCard({
  leagueName,
  roundNumber,
  dayNumber,
  matches,
}: ShareDayCardProps) {
  return (
    <div className="w-[720px] bg-[#f6faf7] p-8 text-[#0f172a]">
      <div className="overflow-hidden rounded-[32px] border border-[#d9e6dd] bg-white shadow-sm">
        <div className="bg-[#14532d] px-8 py-6 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">Liga de Pádel</p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black leading-none">{leagueName}</h1>
              <p className="mt-2 text-lg font-semibold text-white/80">
                Ronda {roundNumber} · Jornada {dayNumber}
              </p>
            </div>
            <div className="rounded-full bg-white/12 px-4 py-2 text-sm font-bold">Compartir jornada</div>
          </div>
        </div>

        <div className="space-y-4 p-6">
          {matches.map((match, index) => (
            <div key={`${match.pairA}-${match.pairB}-${index}`} className="rounded-3xl bg-[#f6faf7] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748b]">
                Partido {index + 1}
              </p>
              <p className="mt-2 text-2xl font-black leading-tight text-[#14532d]">
                {match.pairA}
              </p>
              <p className="my-2 text-center text-sm font-bold uppercase tracking-[0.2em] text-[#94a3b8]">
                vs
              </p>
              <p className="text-2xl font-black leading-tight text-[#14532d]">{match.pairB}</p>
              {match.scoreLine && (
                <div className="mt-4 rounded-2xl bg-[#14532d]/6 px-4 py-3 text-center text-base font-bold text-[#14532d]">
                  {match.scoreLine}
                </div>
              )}
              <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#334155] ring-1 ring-[#e2e8f0]">
                Pelotas: <span className="text-[#14532d]">{match.ballDuty}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
