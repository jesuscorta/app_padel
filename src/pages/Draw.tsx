import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useLeague } from '../lib/LeagueContext'
import { createLeague } from '../lib/db/leagues'
import { shuffle } from '../lib/draw'
import { generateRoundPairings } from '../lib/schedule'
import { BusyOverlay, Button, Card, ConfirmSheet, Spinner } from '../components/ui'
import type { Player } from '../types'

export default function Draw() {
  const { isAdmin } = useAuth()
  const { players, active, loading, refresh } = useLeague()
  const navigate = useNavigate()
  const titulares = players.filter((p) => p.role === 'titular' && p.active)
  const ready = !loading && !active && titulares.length === 8
  const titularesKey = titulares
    .map((player) => player.id)
    .sort()
    .join(',')

  const [order, setOrder] = useState<Player[] | null>(null)
  const [name, setName] = useState(`Liga ${new Date().getFullYear()}`)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const playerById = new Map(titulares.map((player) => [player.id, player]))
  const rounds = order ? generateRoundPairings(order.map((player) => player.id)) : []

  function randomizeOrder() {
    setOrder(shuffle(titulares))
  }

  // Genera el primer sorteo en cuanto hay 8 titulares y reinicia si cambia la base.
  useEffect(() => {
    if (!ready) {
      setOrder(null)
      return
    }

    setOrder((current) => {
      if (!current) return shuffle(titulares)
      const currentKey = current
        .map((player) => player.id)
        .sort()
        .join(',')
      return currentKey === titularesKey ? current : shuffle(titulares)
    })
  }, [ready, titulares, titularesKey])

  if (loading) return <Spinner />
  if (!isAdmin) return <Card className="text-center">Solo el admin puede crear ligas.</Card>

  if (active) {
    return (
      <Card className="space-y-3 text-center">
        <p className="font-semibold">Ya hay una liga activa</p>
        <p className="text-sm text-neutral-500">
          La liga actual ya tiene generadas sus 7 rondas.
        </p>
        <Link to="/">
          <Button full>Ir a la jornada</Button>
        </Link>
      </Card>
    )
  }

  if (titulares.length !== 8) {
    return (
      <Card className="space-y-3 text-center">
        <p className="font-semibold">Se necesitan 8 titulares activos</p>
        <p className="text-sm text-neutral-500">
          Ahora hay {titulares.length}. Completa la lista antes del sorteo.
        </p>
        <Link to="/jugadores">
          <Button full>Gestionar jugadores</Button>
        </Link>
      </Card>
    )
  }

  async function onConfirm() {
    if (!order) return
    setSaving(true)
    setError(null)
    try {
      await createLeague(name, order.map((player) => player.id))
      await refresh()
      navigate('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la liga')
      setSaving(false)
      setConfirmOpen(false)
    }
  }

  return (
    <div className="space-y-4">
      <BusyOverlay open={saving} label="Generando liga…" />
      <div className="space-y-1">
        <h2 className="text-lg font-bold">Sorteo de la liga</h2>
        <p className="text-sm text-neutral-500">
          Repite el sorteo todas las veces que quieras. Al confirmar se generarán las 7 rondas
          completas, sin repetir ninguna pareja.
        </p>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-neutral-600">Nombre de la liga</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
      </label>

      <div className="space-y-3">
        {rounds.map((round) => (
          <div key={round.round} className="space-y-2">
            <p className="text-sm font-semibold text-neutral-600">Ronda {round.round}</p>
            {round.pairs.map(([player1Id, player2Id], index) => (
              <Card key={`${round.round}-${index}`} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                  {index + 1}
                </span>
                <span className="font-semibold">
                  {playerById.get(player1Id)?.name ?? '—'}{' '}
                  <span className="font-normal text-neutral-400">&</span>{' '}
                  {playerById.get(player2Id)?.name ?? '—'}
                </span>
              </Card>
            ))}
          </div>
        ))}
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <div className="flex gap-3">
        <Button variant="secondary" full disabled={saving} onClick={randomizeOrder}>
          Repetir sorteo
        </Button>
        <Button full disabled={saving || !name.trim() || !order} onClick={() => setConfirmOpen(true)}>
          {saving ? 'Generando…' : 'Confirmar liga'}
        </Button>
      </div>

      <ConfirmSheet
        open={confirmOpen}
        title="¿Crear esta liga?"
        message="Se crearán las 7 rondas completas y no se repetirá ninguna pareja dentro de la liga."
        confirmLabel="Crear liga"
        onConfirm={onConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
