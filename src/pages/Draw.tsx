import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLeague } from '../lib/LeagueContext'
import { createLeague } from '../lib/db/leagues'
import { drawPairs } from '../lib/draw'
import { Button, Card, ConfirmSheet, Spinner } from '../components/ui'
import type { Player } from '../types'

export default function Draw() {
  const { players, active, loading, refresh } = useLeague()
  const navigate = useNavigate()
  const titulares = players.filter((p) => p.role === 'titular' && p.active)
  const ready = !loading && !active && titulares.length === 8

  const [pairs, setPairs] = useState<[Player, Player][] | null>(null)
  const [name, setName] = useState(`Liga ${new Date().getFullYear()}`)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sorteo inicial automático en cuanto hay 8 titulares
  useEffect(() => {
    if (ready) setPairs((prev) => prev ?? drawPairs(titulares))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  if (loading) return <Spinner />

  if (active) {
    return (
      <Card className="space-y-3 text-center">
        <p className="font-semibold">Ya hay una liga activa</p>
        <p className="text-sm text-neutral-500">
          Las parejas están fijas hasta que finalice la liga actual.
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
    if (!pairs) return
    setSaving(true)
    setError(null)
    try {
      await createLeague(
        name,
        pairs.map(([a, b]) => ({ player1Id: a.id, player2Id: b.id })),
      )
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
      <div className="space-y-1">
        <h2 className="text-lg font-bold">Sorteo de parejas</h2>
        <p className="text-sm text-neutral-500">
          Repite el sorteo todas las veces que quieras. Al confirmar, las parejas quedarán fijas
          hasta el final de la liga.
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
        {pairs?.map(([a, b], i) => (
          <Card key={`${a.id}-${b.id}`} className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
              {i + 1}
            </span>
            <span className="font-semibold">
              {a.name} <span className="font-normal text-neutral-400">&</span> {b.name}
            </span>
          </Card>
        ))}
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <div className="flex gap-3">
        <Button variant="secondary" full disabled={saving} onClick={() => setPairs(drawPairs(titulares))}>
          Repetir sorteo
        </Button>
        <Button full disabled={saving || !name.trim() || !pairs} onClick={() => setConfirmOpen(true)}>
          Confirmar parejas
        </Button>
      </div>

      <ConfirmSheet
        open={confirmOpen}
        title="¿Fijar estas parejas?"
        message="Se creará la liga y las parejas no podrán modificarse hasta que finalice."
        confirmLabel="Crear liga"
        onConfirm={onConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
