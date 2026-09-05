import { useNotifications } from '../context/NotificationsContext'

export default function ToastStack() {
  const { toasts, dismissToast } = useNotifications()

  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 'var(--space-3)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        width: 'calc(100% - 32px)',
        maxWidth: 'var(--max-width)',
      }}
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismissToast(t.id)}
          style={{
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-3) var(--space-4)',
            textAlign: 'left',
            fontSize: 'var(--text-sm)',
            fontFamily: 'inherit',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {t.message}
        </button>
      ))}
    </div>
  )
}
