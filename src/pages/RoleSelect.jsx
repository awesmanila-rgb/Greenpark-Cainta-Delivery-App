import { useNavigate } from 'react-router-dom'

const ROLES = [
  {
    id: 'customer',
    title: 'Customer',
    desc: 'Order from village merchants',
  },
  {
    id: 'merchant',
    title: 'Merchant',
    desc: 'Sell your products',
  },
  {
    id: 'rider',
    title: 'Rider',
    desc: 'Deliver orders, earn per trip',
  },
]

export default function RoleSelect() {
  const navigate = useNavigate()

  return (
    <div className="page">
      <div className="page-inner">
        <div className="brand">
          <span className="brand-mark">Sakto</span>
          <span className="brand-tag">village delivery</span>
        </div>

        <h1>Get started</h1>
        <p className="helper-text" style={{ marginBottom: 'var(--space-5)' }}>
          Choose how you'll use the app. You can only register under one role per account.
        </p>

        <div className="role-grid">
          {ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              className="role-card"
              onClick={() => navigate(`/register/${r.id}`)}
            >
              <div className="role-card-title">{r.title}</div>
              <div className="role-card-desc">{r.desc}</div>
            </button>
          ))}
        </div>

        <div className="link-row">
          Already registered? <a href="/login">Log in</a>
        </div>
      </div>
    </div>
  )
}
