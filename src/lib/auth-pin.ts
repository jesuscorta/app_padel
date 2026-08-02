const STORAGE_KEY = 'padel_pin_ok'

/** Si no hay PIN en el entorno, el acceso es libre (útil en desarrollo). */
export const pinRequired = Boolean(import.meta.env.VITE_ADMIN_PIN)

export function isPinOk(): boolean {
  if (!pinRequired) return true
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function checkPin(pin: string): boolean {
  const ok = pin === import.meta.env.VITE_ADMIN_PIN
  if (ok) {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // Modo privado: se pedirá el PIN en cada sesión
    }
  }
  return ok
}
