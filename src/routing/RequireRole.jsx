import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Wrap a route that should only be reachable by a specific role.
// Does NOT require `verified` status — a merchant should be able to
// prepare their product list while still pending admin approval.
export function RequireRole({ role, children }) {
  const { loading, isAuthenticated, profile } = useAuth()

  if (loading) return <div className="page"><div className="page-inner">Loading…</div></div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!profile) return <div className="page"><div className="page-inner">Setting up your account…</div></div>
  if (profile.status === 'banned') return <Navigate to="/pending" replace />
  if (profile.role !== role) return <Navigate to="/dashboard" replace />

  return children
}
