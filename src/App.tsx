import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { supabaseConfigured } from './lib/supabase'
import { AuthProvider } from './lib/AuthContext'
import { LeagueProvider } from './lib/LeagueContext'
import PinGate from './components/PinGate'
import Layout from './components/Layout'
import Home from './pages/Home'
import Standings from './pages/Standings'
import Balls from './pages/Balls'
import History from './pages/History'
import Settings from './pages/Settings'
import Players from './pages/Players'
import Draw from './pages/Draw'
import Leagues from './pages/Leagues'
import { Link } from 'react-router-dom'

function NotFound() {
  return <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center"><h1 className="text-2xl font-bold text-brand">Página no encontrada</h1><p className="text-neutral-600">La dirección no existe o ya no está disponible.</p><Link to="/" className="flex min-h-11 items-center rounded-xl bg-brand px-4 py-2.5 font-semibold text-white">Ir a Jornada</Link></main>
}

const router = createBrowserRouter([
  {
    element: (
      <AuthProvider>
        <PinGate>
          <LeagueProvider>
            <Layout />
          </LeagueProvider>
        </PinGate>
      </AuthProvider>
    ),
    children: [
      { path: '/', element: <Home /> },
      { path: '/clasificacion', element: <Standings /> },
      { path: '/pelotas', element: <Balls /> },
      { path: '/historial', element: <History /> },
      { path: '/ajustes', element: <Settings /> },
      { path: '/jugadores', element: <Players /> },
      { path: '/ligas', element: <Leagues /> },
      { path: '/sorteo', element: <Draw /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

function SetupScreen() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold text-brand">Liga de Pádel</h1>
      <div className="rounded-2xl bg-amber-100 p-4 text-sm text-amber-900">
        <p className="font-semibold">Supabase no está configurado todavía</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            Crea un proyecto gratuito en{' '}
            <a className="underline" href="https://supabase.com" target="_blank" rel="noreferrer">
              supabase.com
            </a>
          </li>
          <li>
            En el SQL Editor, ejecuta <code>supabase/migrations/0001_init.sql</code> y después{' '}
            <code>supabase/seed.sql</code>
          </li>
          <li>
            Copia <code>.env.example</code> a <code>.env</code> con tu URL y tu anon key
          </li>
          <li>
            Configura también <code>PARTICIPANT_CODE</code>, <code>ADMIN_PIN</code>, <code>SESSION_SECRET</code> y <code>SUPABASE_SERVICE_ROLE_KEY</code>
          </li>
          <li>
            Reinicia <code>npm run dev</code>
          </li>
        </ol>
      </div>
    </main>
  )
}

export default function App() {
  if (!supabaseConfigured) return <SetupScreen />
  return <RouterProvider router={router} />
}
