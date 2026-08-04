import { createHmac, timingSafeEqual } from 'node:crypto'

export type SessionRole = 'participant' | 'admin'

interface SessionPayload {
  role: SessionRole
  issuedAt: number
  expiresAt: number
}

const COOKIE_NAME = 'padel_session'

function secret(): string {
  const value = process.env.SESSION_SECRET
  if (!value) throw new Error('SESSION_SECRET no está configurado')
  return value
}

function sign(value: string): string {
  return createHmac('sha256', secret()).update(value).digest('base64url')
}

function encode(payload: SessionPayload): string {
  const value = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${value}.${sign(value)}`
}

function decode(token: string | undefined): SessionPayload | null {
  if (!token) return null
  const [value, signature] = token.split('.')
  if (!value || !signature) return null
  const expected = Buffer.from(sign(value))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null
  const payload = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as SessionPayload
  if (payload.expiresAt < Date.now()) return null
  return payload
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {}
  return Object.fromEntries(
    cookieHeader.split(';').map((part) => {
      const [key, ...rest] = part.trim().split('=')
      return [key, decodeURIComponent(rest.join('='))]
    }),
  )
}

export function getRoleFromCookie(cookieHeader: string | undefined): SessionRole | null {
  const cookies = parseCookies(cookieHeader)
  return decode(cookies[COOKIE_NAME])?.role ?? null
}

export function createSessionCookie(role: SessionRole): string {
  const token = encode({
    role,
    issuedAt: Date.now(),
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
  })
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
}
