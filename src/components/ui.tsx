import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'danger' | 'ghost'

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white active:bg-brand-dark',
  accent: 'bg-accent text-brand-dark active:brightness-95',
  secondary: 'bg-neutral-200 text-neutral-900 active:bg-neutral-300',
  danger: 'bg-red-600 text-white active:bg-red-700',
  ghost: 'bg-transparent text-brand active:bg-neutral-100',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  full?: boolean
}

export function Button({ variant = 'primary', full, className, ...props }: ButtonProps) {
  return (
    <button
      className={cx(
        'min-h-11 rounded-xl px-4 py-2.5 font-semibold transition active:scale-[.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-40 disabled:active:scale-100',
        buttonVariants[variant],
        full && 'w-full',
        className,
      )}
      {...props}
    />
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-2xl bg-white p-4 shadow-sm', className)}>{children}</div>
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cx('flex justify-center py-8', className)} role="status" aria-label="Cargando">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-brand" />
    </div>
  )
}

export function BusyOverlay({ open, label = 'Cargando…' }: { open: boolean; label?: string }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/25 px-6" role="status" aria-label={label}>
      <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-xl">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-neutral-200 border-t-brand" />
        <span className="text-sm font-semibold text-neutral-700">{label}</span>
      </div>
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <p className="text-lg font-semibold text-neutral-700">{title}</p>
      {children && <div className="text-sm text-neutral-500">{children}</div>}
    </div>
  )
}

export function ErrorState({ title = 'No se pudo cargar', children, onRetry }: { title?: string; children?: ReactNode; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center" role="alert">
      <p className="text-lg font-semibold text-neutral-800">{title}</p>
      {children && <div className="max-w-sm text-sm text-neutral-600">{children}</div>}
      {onRetry && <Button variant="secondary" onClick={onRetry}>Reintentar</Button>}
    </div>
  )
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'success' | 'error' }) {
  const tones = {
    info: 'border-brand/20 bg-brand/5 text-brand',
    success: 'border-green-200 bg-green-50 text-green-900',
    error: 'border-red-200 bg-red-50 text-red-900',
  }
  return <Card className={`border py-3 text-sm font-medium ${tones[tone]}`}><div role={tone === 'error' ? 'alert' : 'status'} aria-live="polite">{children}</div></Card>
}

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function Sheet({ open, onClose, title, children }: SheetProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const panel = panelRef.current
    const firstFocusable = panel?.querySelector<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href]')
    firstFocusable?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function trapFocus(event: KeyboardEvent) {
      if (event.key !== 'Tab' || !panel) return
      const focusable = [...panel.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href]')]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', trapFocus)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', trapFocus)
      openerRef.current?.focus()
    }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="presentation" onKeyDown={(event) => { if (event.key === 'Escape') onClose() }}>
      <button aria-label="Cerrar panel" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div ref={panelRef} className="animate-slide-up relative flex max-h-[90dvh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-xl" role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined}>
        <div className="flex shrink-0 items-center justify-between gap-4 px-5 pb-3 pt-5">
          {title && <h2 id={titleId} className="text-lg font-bold text-neutral-900">{title}</h2>}
          <button type="button" className="min-h-11 min-w-11 rounded-xl text-sm font-semibold text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" onClick={onClose}>Cerrar</button>
        </div>
        <div className="overflow-y-auto px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  )
}

interface ConfirmSheetProps {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  danger,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  return (
    <Sheet open={open} onClose={onCancel} title={title}>
      {message && <p className="mb-4 text-sm text-neutral-600">{message}</p>}
      <div className="flex gap-3">
        <Button variant="secondary" full onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} full onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Sheet>
  )
}

interface SegmentedOption<T extends string> {
  value: T
  label: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegmentedOption<T>[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex rounded-xl bg-neutral-200 p-1" aria-label="Opciones de clasificación">
      {options.map((o) => (
        <button
          key={o.value}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition',
            value === o.value ? 'bg-white text-brand shadow-sm' : 'text-neutral-700',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        className,
      )}
    >
      {children}
    </span>
  )
}
