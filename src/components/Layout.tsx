import type { ComponentType } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useLeague } from '../lib/LeagueContext'
import { IconCalendar, IconHistory, IconSettings, IconTrophy } from './icons'
import { cx } from './ui'

interface NavItemProps {
  to: string
  icon: ComponentType<{ className?: string }>
  label: string
  end?: boolean
  activePaths?: string[]
}

function NavItem({ to, icon: Icon, label, end, activePaths }: NavItemProps) {
  const location = useLocation()
  const isChildRouteActive = activePaths?.includes(location.pathname) ?? false
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cx(
          'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand',
          isActive || isChildRouteActive ? 'text-brand' : 'text-neutral-600',
        )
      }
    >
      <Icon className="h-6 w-6" />
      {label}
    </NavLink>
  )
}

export default function Layout() {
  const { isAdmin, role, logout } = useAuth()
  const { active, error, stale, refresh } = useLeague()
  const location = useLocation()
  const adminChildRoute = ['/ligas', '/pelotas', '/jugadores', '/sorteo'].includes(location.pathname)
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="pt-safe sticky top-0 z-40 bg-brand text-white">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="shrink-0 text-lg font-bold">Liga de Pádel</span>
          <div className="flex min-w-0 items-center gap-1.5">
            {role && <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium">{role === 'admin' ? 'Admin' : 'Participante'}</span>}
            {active && (
              <span className="min-w-0 truncate rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium">
                {active.league.name}
              </span>
            )}
            <button className="min-h-11 shrink-0 px-1 text-xs font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" onClick={() => void logout()}>
              Salir
            </button>
          </div>
        </div>
        {error && (
          <div className={cx('flex items-center justify-between gap-3 px-4 py-2 text-xs font-medium', stale ? 'bg-amber-100 text-amber-900' : 'bg-red-100 text-red-900')} role="alert">
            <span>{error}</span>
            <button className="min-h-9 shrink-0 font-bold underline" onClick={() => void refresh()}>Reintentar</button>
          </div>
        )}
      </header>
      <main className="flex-1 px-4 pb-28 pt-4" tabIndex={-1}>
        <Outlet />
      </main>
      <nav aria-label="Navegación principal" className="pb-safe fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-md">
          <NavItem to="/" end icon={IconCalendar} label="Jornada" />
          <NavItem to="/clasificacion" icon={IconTrophy} label="Clasificación" />
          <NavItem to="/historial" icon={IconHistory} label="Historial" />
          {isAdmin && <NavItem to="/ajustes" icon={IconSettings} label="Más" activePaths={adminChildRoute ? [location.pathname] : undefined} />}
        </div>
      </nav>
    </div>
  )
}
