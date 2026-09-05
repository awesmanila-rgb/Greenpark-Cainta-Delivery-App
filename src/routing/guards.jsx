import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Wrap any route that requires a logged-in, loaded profile.
export function RequireAuth({ children }) {
  const { loading, isAuthenticated } = useAuth()

  if (loading) return <div className="page"><div className="page-inner">Loading…</div></div>
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return children
}

// Once logged in, route to the right place based on status/role.
// Order matters: banned overrides everything, regardless of role.
export function RouteByStatus() {
  const { loading, isAuthenticated, profile } = useAuth()

  if (loading) return <div className="page"><div className="page-inner">Loading…</div></div>
  if (!isAuthenticated) return <Navigate to="/" replace />

  if (!profile) return <div className="page"><div className="page-inner">Setting up your account…</div></div>

  if (profile.status === 'banned') {
    return <Navigate to="/pending" replace />
  }

  if (profile.role !== 'customer' && profile.status !== 'verified') {
    return <Navigate to="/pending" replace />
  }

  return <Navigate to="/dashboard" replace />
}
