import { useState, type FormEvent, type ReactNode } from 'react'
import { useAuth, type AppRole } from '../lib/AuthContext'
import { IconBall } from './icons'
import { BusyOverlay } from './ui'

export default function PinGate({ children }: { children: ReactNode }) {
  const { role, loading, login } = useAuth()
  const [nextRole, setNextRole] = useState<AppRole>('participant')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (loading) return <BusyOverlay open label="Cargando sesión…" />
  if (role) return <>{children}</>

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    login(nextRole, code.trim())
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Código incorrecto')
        setCode('')
      })
      .finally(() => setSaving(false))
  }

  return (
    <main className="pt-safe pb-safe flex min-h-dvh flex-col items-center justify-center gap-6 bg-brand px-8">
      <BusyOverlay open={saving} label="Entrando…" />
      <IconBall className="h-16 w-16 text-accent" />
      <h1 className="text-2xl font-bold text-white">Liga de Pádel</h1>
      <p className="max-w-xs text-center text-sm text-white/80">
        Entra como participante para consultar la liga o como admin para gestionarla.
      </p>
      <form onSubmit={onSubmit} className="w-full max-w-xs space-y-3">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/10 p-1">
          <button
            type="button"
            onClick={() => setNextRole('participant')}
            aria-pressed={nextRole === 'participant'}
            className={nextRole === 'participant' ? 'rounded-xl bg-white px-3 py-2 text-sm font-bold text-brand' : 'rounded-xl px-3 py-2 text-sm font-bold text-white'}
          >
            Participante
          </button>
          <button
            type="button"
            onClick={() => setNextRole('admin')}
            aria-pressed={nextRole === 'admin'}
            className={nextRole === 'admin' ? 'rounded-xl bg-white px-3 py-2 text-sm font-bold text-brand' : 'rounded-xl px-3 py-2 text-sm font-bold text-white'}
          >
            Admin
          </button>
        </div>
        <p className="text-center text-xs text-white/70">
          {nextRole === 'participant'
            ? 'Modo solo lectura'
            : 'Modo completo de administración'}
        </p>
        <label className="sr-only" htmlFor="access-code">{nextRole === 'participant' ? 'Código de acceso de participante' : 'PIN de administrador'}</label>
        <input
          id="access-code"
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          value={code}
          onChange={(e) => {
            setCode(e.target.value)
            setError(null)
          }}
          placeholder={nextRole === 'participant' ? 'Código de 4 dígitos' : 'PIN de admin'}
          className="w-full rounded-xl border-0 px-4 py-3 text-center text-2xl tracking-[0.5em] text-neutral-900 outline-none focus:ring-4 focus:ring-accent/60"
        />
        {error && <p className="text-center text-sm font-medium text-red-200" role="alert">{error}</p>}
        <button
          type="submit"
          disabled={saving || !code.trim()}
          className="w-full rounded-xl bg-accent px-4 py-3 font-bold text-brand-dark transition active:scale-[.98]"
        >
          Entrar
        </button>
      </form>
    </main>
  )
}
