import { useMemo, useState, type FormEvent } from 'react'
import { useLeague } from '../lib/LeagueContext'
import { createPlayer, updatePlayer } from '../lib/db/players'
import { Badge, BusyOverlay, Button, Card, Sheet, Spinner, cx } from '../components/ui'
import type { Player, PlayerRole } from '../types'

const TITULARES_NECESARIOS = 8

export default function Players() {
  const { players, active, loading, refresh } = useLeague()
  const [newTitular, setNewTitular] = useState('')
  const [newSustituto, setNewSustituto] = useState('')
  const [editing, setEditing] = useState<Player | null>(null)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)

  const titulares = useMemo(() => players.filter((p) => p.role === 'titular'), [players])
  const sustitutos = useMemo(() => players.filter((p) => p.role === 'sustituto'), [players])
  const titularesActivos = titulares.filter((p) => p.active)

  const idsEnLigaActiva = useMemo(() => {
    if (!active) return new Set<string>()
    return new Set(active.pairs.flatMap((p) => [p.player1_id, p.player2_id]))
  }, [active])

  async function onAdd(role: PlayerRole, name: string, clear: () => void) {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      await createPlayer(name, role)
      clear()
      await refresh()
    } finally {
      setSaving(false)
    }
  }

  async function onToggleActive(player: Player) {
    await updatePlayer(player.id, { active: !player.active })
    await refresh()
  }

  async function onRename(e: FormEvent) {
    e.preventDefault()
    if (!editing || !editName.trim()) return
    setSaving(true)
    try {
      await updatePlayer(editing.id, { name: editName.trim() })
      setEditing(null)
      await refresh()
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner />

  function renderAddForm(
    role: PlayerRole,
    value: string,
    setValue: (v: string) => void,
    placeholder: string,
    disabled: boolean,
  ) {
    return (
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          onAdd(role, value, () => setValue(''))
        }}
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="min-h-11 flex-1 rounded-xl border border-neutral-300 px-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
        <Button type="submit" variant="secondary" disabled={disabled || saving || !value.trim()}>
          Añadir
        </Button>
      </form>
    )
  }

  function renderList(list: Player[], showCount?: { actives: number; needed: number }) {
    return (
      <Card className="divide-y divide-neutral-100 p-0">
        {showCount && (
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium text-neutral-600">
              Activos: {showCount.actives}/{showCount.needed}
            </span>
            {showCount.actives === showCount.needed ? (
              <Badge className="bg-green-100 text-green-800">Listos para el sorteo</Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-800">Faltan jugadores</Badge>
            )}
          </div>
        )}
        {list.map((p) => {
          const enLiga = idsEnLigaActiva.has(p.id)
          return (
            <div key={p.id} className="flex items-center gap-2 px-4 py-3">
              <button
                className={cx(
                  'flex-1 text-left font-medium',
                  !p.active && 'text-neutral-400 line-through',
                )}
                onClick={() => {
                  setEditing(p)
                  setEditName(p.name)
                }}
              >
                {p.name}
              </button>
              {enLiga && <Badge className="bg-brand/10 text-brand">En liga</Badge>}
              <Button
                variant={p.active ? 'ghost' : 'secondary'}
                className="min-h-9 px-3 py-1 text-sm"
                disabled={enLiga && p.active}
                title={enLiga && p.active ? 'No se puede dar de baja durante la liga' : undefined}
                onClick={() => onToggleActive(p)}
              >
                {p.active ? 'Dar de baja' : 'Reactivar'}
              </Button>
            </div>
          )
        })}
        {list.length === 0 && <p className="px-4 py-6 text-center text-sm text-neutral-400">Nadie por aquí todavía</p>}
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <BusyOverlay open={saving} label="Guardando jugador…" />
      <section className="space-y-3">
        <h2 className="text-lg font-bold">Titulares</h2>
        {renderList(titulares, { actives: titularesActivos.length, needed: TITULARES_NECESARIOS })}
        {titularesActivos.length < TITULARES_NECESARIOS &&
          renderAddForm('titular', newTitular, setNewTitular, 'Nuevo titular…', false)}
        {titularesActivos.length > TITULARES_NECESARIOS && (
          <p className="text-sm text-amber-700">
            Hay más de {TITULARES_NECESARIOS} titulares activos: da de baja a alguno antes del
            sorteo.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Sustitutos</h2>
        <p className="text-sm text-neutral-500">
          Crea aquí los sustitutos que luego podrás asignar en cualquier partido desde la jornada.
        </p>
        {renderList(sustitutos)}
        {renderAddForm('sustituto', newSustituto, setNewSustituto, 'Nuevo sustituto…', false)}
      </section>

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title="Editar nombre">
        <form onSubmit={onRename} className="space-y-3">
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            autoFocus
            className="min-h-11 w-full rounded-xl border border-neutral-300 px-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
          <Button type="submit" full disabled={saving || !editName.trim()}>
            Guardar
          </Button>
        </form>
      </Sheet>
    </div>
  )
}
