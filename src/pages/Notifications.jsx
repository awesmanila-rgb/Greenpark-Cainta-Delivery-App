import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationsContext'

function timeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function Notifications() {
  const { profile } = useAuth()
  const { history, markAllRead } = useNotifications()
  const navigate = useNavigate()

  useEffect(() => {
    markAllRead()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function goToOrder(orderId) {
    if (!orderId) return
    if (profile?.role === 'customer') navigate(`/orders/${orderId}/confirmation`)
    else if (profile?.role === 'merchant') navigate('/merchant/orders')
    else if (profile?.role === 'rider') navigate('/rider/jobs')
  }

  return (
    <div className="page">
      <div className="page-inner">
        <div className="brand">
          <span className="brand-mark">Sakto</span>
          <span className="brand-tag">village delivery</span>
        </div>

        <h1>Notifications</h1>

        {history.length === 0 ? (
          <div className="card">
            <p style={{ marginBottom: 0 }}>
              Nothing yet — updates on your orders will show up here while the app is open.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {history.map((h) => (
              <button
                key={h.id}
                className="card"
                style={{ textAlign: 'left', border: 'none', cursor: 'pointer' }}
                onClick={() => goToOrder(h.orderId)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{h.message}</span>
                  <span className="helper-text" style={{ marginTop: 0 }}>{timeAgo(h.at)}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="link-row">
          <Link to="/dashboard">Back to dashboard</Link>
        </div>
      </div>
    </div>
  )
}
