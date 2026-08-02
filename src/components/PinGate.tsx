import { useState, type FormEvent, type ReactNode } from 'react'
import { checkPin, isPinOk, pinRequired } from '../lib/auth-pin'
import { IconBall } from './icons'

export default function PinGate({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState(isPinOk)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  if (ok || !pinRequired) return <>{children}</>

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (checkPin(pin.trim())) {
      setOk(true)
    } else {
      setError(true)
      setPin('')
    }
  }

  return (
    <main className="pt-safe pb-safe flex min-h-dvh flex-col items-center justify-center gap-6 bg-brand px-8">
      <IconBall className="h-16 w-16 text-accent" />
      <h1 className="text-2xl font-bold text-white">Liga de Pádel</h1>
      <form onSubmit={onSubmit} className="w-full max-w-xs space-y-3">
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          value={pin}
          onChange={(e) => {
            setPin(e.target.value)
            setError(false)
          }}
          placeholder="PIN de acceso"
          className="w-full rounded-xl border-0 px-4 py-3 text-center text-2xl tracking-[0.5em] text-neutral-900 outline-none focus:ring-4 focus:ring-accent/60"
        />
        {error && <p className="text-center text-sm font-medium text-red-200">PIN incorrecto</p>}
        <button
          type="submit"
          className="w-full rounded-xl bg-accent px-4 py-3 font-bold text-brand-dark transition active:scale-[.98]"
        >
          Entrar
        </button>
      </form>
    </main>
  )
}
