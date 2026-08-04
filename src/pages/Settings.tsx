import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { Card } from '../components/ui'
import { EmptyState } from '../components/ui'

export default function Settings() {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <EmptyState title="Sin acceso">Esta zona es solo para administración.</EmptyState>
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold">Más</h2>
      <Card className="divide-y divide-neutral-100 p-0">
        <Link to="/pelotas" className="flex items-center justify-between px-4 py-4 font-medium">
          Pelotas
          <span className="text-neutral-300">›</span>
        </Link>
        <Link to="/jugadores" className="flex items-center justify-between px-4 py-4 font-medium">
          Jugadores
          <span className="text-neutral-300">›</span>
        </Link>
        <Link to="/ligas" className="flex items-center justify-between px-4 py-4 font-medium">
          Ligas
          <span className="text-neutral-300">›</span>
        </Link>
      </Card>
    </div>
  )
}
