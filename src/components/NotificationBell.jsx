import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationsContext'

export default function NotificationBell() {
  const { isAuthenticated } = useAuth()
  const { unreadCount } = useNotifications()
  const navigate = useNavigate()

  if (!isAuthenticated) return null

  return (
    <button
      onClick={() => navigate('/notifications')}
      aria-label="Notifications"
      style={{
        position: 'fixed',
        top: 'var(--space-3)',
        right: 'var(--space-3)',
        zIndex: 999,
        width: 44,
        height: 44,
        borderRadius: '50%',
        border: 'none',
        background: 'var(--color-surface)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: 18,
      }}
    >
      🔔
      {unreadCount > 0 && (
        <span
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            background: 'var(--color-rust)',
            color: '#fff',
            borderRadius: '50%',
            minWidth: 18,
            height: 18,
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
          }}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  )
}
