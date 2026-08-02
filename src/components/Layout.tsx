import type { ComponentType } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useLeague } from '../lib/LeagueContext'
import { IconBall, IconCalendar, IconHistory, IconSettings, IconTrophy } from './icons'
import { cx } from './ui'

interface NavItemProps {
  to: string
  icon: ComponentType<{ className?: string }>
  label: string
  end?: boolean
}

function NavItem({ to, icon: Icon, label, end }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cx(
          'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition',
          isActive ? 'text-brand' : 'text-neutral-400',
        )
      }
    >
      <Icon className="h-6 w-6" />
      {label}
    </NavLink>
  )
}

export default function Layout() {
  const { active, error, stale } = useLeague()
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="pt-safe sticky top-0 z-40 bg-brand text-white">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-lg font-bold">Liga de Pádel</span>
          {active && (
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium">
              {active.league.name}
            </span>
          )}
        </div>
        {error && (
          <div className={cx('px-4 py-2 text-xs font-medium', stale ? 'bg-amber-100 text-amber-900' : 'bg-red-100 text-red-900')}>
            {error}
          </div>
        )}
      </header>
      <main className="flex-1 px-4 pb-28 pt-4">
        <Outlet />
      </main>
      <nav className="pb-safe fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-md">
          <NavItem to="/" end icon={IconCalendar} label="Jornada" />
          <NavItem to="/clasificacion" icon={IconTrophy} label="Clasificación" />
          <NavItem to="/pelotas" icon={IconBall} label="Pelotas" />
          <NavItem to="/historial" icon={IconHistory} label="Historial" />
          <NavItem to="/ajustes" icon={IconSettings} label="Ajustes" />
        </div>
      </nav>
    </div>
  )
}
