import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { friendlyError } from '../../lib/friendlyError'
import { ORDER_STATUS_LABELS } from '../../lib/orderStatusLabels'

export default function OrderHistory() {
  const { profile } = useAuth()
  const [orders, setOrders] = useState([])
  const [merchantNames, setMerchantNames] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) {
        setError(friendlyError(error))
        setLoading(false)
        return
      }
      setOrders(data)

      if (data.length > 0) {
        const merchantIds = [...new Set(data.map((o) => o.merchant_id))]
        const { data: merchants } = await supabase
          .from('merchants')
          .select('user_id, shop_name')
          .in('user_id', merchantIds)
        const map = {}
        merchants?.forEach((m) => (map[m.user_id] = m.shop_name))
        setMerchantNames(map)
      }

      setLoading(false)
    }
    if (profile?.id) load()
  }, [profile?.id])

  return (
    <div className="page">
      <div className="page-inner">
        <div className="brand">
          <span className="brand-mark">Sakto</span>
          <span className="brand-tag">village delivery</span>
        </div>

        <h1>Your orders</h1>

        {error && <div className="error-text">{error}</div>}

        {loading ? (
          <p>Loading…</p>
        ) : orders.length === 0 ? (
          <div className="card">
            <p style={{ marginBottom: 'var(--space-3)' }}>You haven't placed an order yet.</p>
            <Link to="/browse" className="btn btn-primary">Browse merchants</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {orders.map((o) => (
              <Link
                key={o.id}
                to={`/orders/${o.id}/confirmation`}
                className="card"
                style={{ display: 'block', textDecoration: 'none' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <strong>{merchantNames[o.merchant_id] ?? 'Merchant'}</strong>
                  <span className="helper-text" style={{ marginTop: 0 }}>₱{Number(o.total).toFixed(2)}</span>
                </div>
                <p className="helper-text" style={{ marginTop: 4, marginBottom: 0 }}>
                  {ORDER_STATUS_LABELS[o.status] ?? o.status} · {new Date(o.created_at).toLocaleDateString()}
                </p>
              </Link>
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
