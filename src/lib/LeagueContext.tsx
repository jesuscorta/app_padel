import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { LeagueData, Player } from '../types'
import { getActiveLeagueData } from './db/leagues'
import { listPlayers } from './db/players'

interface LeagueContextValue {
  loading: boolean
  error: string | null
  failed: boolean
  stale: boolean
  players: Player[]
  active: LeagueData | null
  refresh: () => Promise<void>
}

const LeagueContext = createContext<LeagueContextValue | null>(null)
const CACHE_KEY = 'padel_snapshot_v1'

interface SnapshotCache {
  players: Player[]
  active: LeagueData | null
}

function readCache(): SnapshotCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as SnapshotCache) : null
  } catch {
    return null
  }
}

function writeCache(value: SnapshotCache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(value))
  } catch {
    // Ignora límites de almacenamiento o modo privado
  }
}

export function LeagueProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [stale, setStale] = useState(false)
  const [players, setPlayers] = useState<Player[]>([])
  const [active, setActive] = useState<LeagueData | null>(null)

  const refresh = useCallback(async () => {
    const cached = readCache()
    setError(null)
    setFailed(false)
    try {
      const [playersData, activeData] = await Promise.all([listPlayers(), getActiveLeagueData()])
      setStale(false)
      setPlayers(playersData)
      setActive(activeData)
      writeCache({ players: playersData, active: activeData })
    } catch (e) {
      if (cached) {
        setPlayers(cached.players)
        setActive(cached.active)
        setStale(true)
        setError('Sin conexión: mostrando la última información guardada en este dispositivo')
      } else {
        setFailed(true)
        setError(e instanceof Error ? e.message : 'Error al cargar los datos')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <LeagueContext.Provider value={{ loading, error, failed, stale, players, active, refresh }}>
      {children}
    </LeagueContext.Provider>
  )
}

export function useLeague(): LeagueContextValue {
  const ctx = useContext(LeagueContext)
  if (!ctx) throw new Error('useLeague debe usarse dentro de LeagueProvider')
  return ctx
}

/** Mapa id → jugador para resolver nombres en cualquier pantalla. */
export function playerMap(players: Player[]): Map<string, Player> {
  return new Map(players.map((p) => [p.id, p]))
}

export function playerName(players: Player[], id: string): string {
  return players.find((p) => p.id === id)?.name ?? '—'
}
