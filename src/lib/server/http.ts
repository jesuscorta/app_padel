import type { IncomingMessage, ServerResponse } from 'node:http'

export async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk))
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

export function json(res: ServerResponse, status: number, body: unknown, headers?: Record<string, string>) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  for (const [key, value] of Object.entries(headers ?? {})) res.setHeader(key, value)
  res.end(JSON.stringify(body))
}

export function methodNotAllowed(res: ServerResponse) {
  json(res, 405, { error: 'Método no permitido' })
}
