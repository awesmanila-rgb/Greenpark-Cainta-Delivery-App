import { useAuth } from '../context/AuthContext'

export default function Pending() {
  const { profile, logout } = useAuth()
  const isBanned = profile?.status === 'banned'

  return (
    <div className="page">
      <div className="page-inner">
        <div className="brand">
          <span className="brand-mark">Sakto</span>
          <span className="brand-tag">village delivery</span>
        </div>

        <div className="status-banner" style={isBanned ? { borderLeftColor: 'var(--color-rust)' } : undefined}>
          <strong>{isBanned ? 'Account suspended' : 'Account created.'}</strong>
          <p style={{ marginTop: 'var(--space-2)', marginBottom: 0 }}>
            {isBanned
              ? 'Your account has been suspended. Please contact the village coordinator to find out why and what to do next.'
              : profile?.role === 'customer'
              ? 'You can start browsing while we finish setting things up.'
              : "An admin needs to verify your account before you can go live. This usually doesn't take long — check back soon."}
          </p>
        </div>

        <div className="card">
          <p><strong>Name:</strong> {profile?.name}</p>
          <p><strong>Role:</strong> {profile?.role}</p>
          <p style={{ marginBottom: 0 }}><strong>Status:</strong> {profile?.status}</p>
        </div>

        <button className="btn btn-ghost" style={{ marginTop: 'var(--space-4)' }} onClick={logout}>
          Log out
        </button>
      </div>
    </div>
  )
}
