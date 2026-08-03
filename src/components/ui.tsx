import type { ButtonHTMLAttributes, ReactNode } from 'react'

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
        'min-h-11 rounded-xl px-4 py-2.5 font-semibold transition active:scale-[.98] disabled:opacity-40 disabled:active:scale-100',
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

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function Sheet({ open, onClose, title, children }: SheetProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <button aria-label="Cerrar" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="animate-slide-up relative w-full max-w-md rounded-t-3xl bg-white p-5 pb-safe shadow-xl">
        {title && <h2 className="mb-3 text-lg font-bold">{title}</h2>}
        {children}
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
    <div className="flex rounded-xl bg-neutral-200 p-1" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition',
            value === o.value ? 'bg-white text-brand shadow-sm' : 'text-neutral-500',
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
