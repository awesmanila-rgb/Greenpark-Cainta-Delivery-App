import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { profile, logout } = useAuth()

  return (
    <div className="page">
      <div className="page-inner">
        <div className="brand">
          <span className="brand-mark">Sakto</span>
          <span className="brand-tag">village delivery</span>
        </div>

        <h1>Welcome, {profile?.name?.split(' ')[0]}</h1>

        {profile?.role === 'merchant' ? (
          <>
            <Link to="/merchant/orders" className="card" style={{ display: 'block', marginBottom: 'var(--space-3)', textDecoration: 'none' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Incoming orders</div>
              <p className="helper-text" style={{ marginBottom: 0 }}>Accept orders and confirm GCash payments.</p>
            </Link>
            <Link to="/merchant/products" className="card" style={{ display: 'block', marginBottom: 'var(--space-4)', textDecoration: 'none' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Manage your products</div>
              <p className="helper-text" style={{ marginBottom: 0 }}>Add or edit what you're selling.</p>
            </Link>
          </>
        ) : profile?.role === 'admin' ? (
          <Link to="/admin/approvals" className="card" style={{ display: 'block', marginBottom: 'var(--space-4)', textDecoration: 'none' }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Merchant & rider approvals</div>
            <p className="helper-text" style={{ marginBottom: 0 }}>Review and verify or ban pending accounts.</p>
          </Link>
        ) : profile?.role === 'customer' ? (
          <>
            <Link to="/browse" className="card" style={{ display: 'block', marginBottom: 'var(--space-3)', textDecoration: 'none' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Browse merchants</div>
              <p className="helper-text" style={{ marginBottom: 0 }}>Order from a shop in the village.</p>
            </Link>
            <Link to="/orders" className="card" style={{ display: 'block', marginBottom: 'var(--space-4)', textDecoration: 'none' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Your orders</div>
              <p className="helper-text" style={{ marginBottom: 0 }}>See past and current orders.</p>
            </Link>
          </>
        ) : profile?.role === 'rider' ? (
          <>
            <Link to="/rider/jobs" className="card" style={{ display: 'block', marginBottom: 'var(--space-3)', textDecoration: 'none' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Delivery jobs</div>
              <p className="helper-text" style={{ marginBottom: 0 }}>See available jobs and manage your active deliveries.</p>
            </Link>
            <Link to="/rider/settlements" className="card" style={{ display: 'block', marginBottom: 'var(--space-4)', textDecoration: 'none' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Your COD float</div>
              <p className="helper-text" style={{ marginBottom: 0 }}>Track what you've fronted and what's outstanding.</p>
            </Link>
          </>
        ) : (
          <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
            <p style={{ marginBottom: 0 }}>Getting things ready.</p>
          </div>
        )}

        <Link to="/profile" className="btn btn-ghost" style={{ display: 'block', textAlign: 'center', marginBottom: 'var(--space-2)' }}>
          Edit profile
        </Link>
        <button className="btn btn-ghost" onClick={logout}>
          Log out
        </button>
      </div>
    </div>
  )
}
