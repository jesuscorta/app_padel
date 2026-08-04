export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T
  if (!response.ok) throw new Error(payload.error ?? 'Error de servidor')
  return payload
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    method: 'GET',
    credentials: 'include',
  })

  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T
  if (!response.ok) throw new Error(payload.error ?? 'Error de servidor')
  return payload
}
