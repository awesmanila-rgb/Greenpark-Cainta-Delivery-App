import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { friendlyError } from '../../lib/friendlyError'

const ACTIVE_STATUSES = [
  'placed',
  'merchant_accepted',
  'awaiting_payment_confirmation',
  'payment_confirmed',
  'ready_for_pickup',
  'rider_assigned',
  'picked_up',
  'out_for_delivery',
]
const HISTORY_STATUSES = ['delivered', 'rider_settled', 'cancelled', 'payment_issue']

const STATUS_LABELS = {
  placed: 'New order',
  merchant_accepted: 'Accepted',
  awaiting_payment_confirmation: 'Waiting for GCash payment',
  payment_confirmed: 'Payment confirmed',
  ready_for_pickup: 'Ready for pickup — waiting for a rider',
  rider_assigned: 'Rider assigned',
  picked_up: 'Picked up by rider',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  rider_settled: 'Delivered',
  cancelled: 'Cancelled',
  payment_issue: 'Payment issue flagged',
}

export default function OrderList() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('active')
  const [orders, setOrders] = useState([])
  const [itemsByOrder, setItemsByOrder] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actingId, setActingId] = useState(null)

  async function loadOrders() {
    setLoading(true)
    setError(null)

    const statuses = tab === 'active' ? ACTIVE_STATUSES : HISTORY_STATUSES
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('merchant_id', profile.id)
      .in('status', statuses)
      .order('created_at', { ascending: tab === 'active' })

    if (error) {
      setError(friendlyError(error))
      setLoading(false)
      return
    }
    setOrders(data)

    if (data.length > 0) {
      const orderIds = data.map((o) => o.id)
      const { data: items } = await supabase
        .from('order_items')
        .select('order_id, qty, price_at_order, products(name, unit)')
        .in('order_id', orderIds)

      const grouped = {}
      items?.forEach((i) => {
        if (!grouped[i.order_id]) grouped[i.order_id] = []
        grouped[i.order_id].push(i)
      })
      setItemsByOrder(grouped)
    } else {
      setItemsByOrder({})
    }

    setLoading(false)
  }

  useEffect(() => {
    if (profile?.id) loadOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, tab])

  async function updateOrderStatus(order, nextStatus) {
    setActingId(order.id)
    setError(null)
    const { error } = await supabase.from('orders').update({ status: nextStatus }).eq('id', order.id)
    setActingId(null)
    if (error) {
      setError(friendlyError(error))
      return
    }
    setOrders((list) =>
      tab === 'active' && !ACTIVE_STATUSES.includes(nextStatus)
        ? list.filter((o) => o.id !== order.id)
        : list.map((o) => (o.id === order.id ? { ...o, status: nextStatus } : o))
    )
  }

  async function acceptOrder(order) {
    const nextStatus = order.payment_method === 'gcash' ? 'awaiting_payment_confirmation' : 'ready_for_pickup'
    await updateOrderStatus(order, nextStatus)
  }

  async function confirmPayment(order) {
    setActingId(order.id)
    setError(null)

    const { error: paymentError } = await supabase
      .from('payments')
      .update({ status: 'confirmed', confirmed_by: profile.id, confirmed_at: new Date().toISOString() })
      .eq('order_id', order.id)
    if (paymentError) {
      setActingId(null)
      setError(friendlyError(paymentError))
      return
    }

    await updateOrderStatus(order, 'payment_confirmed')
  }

  async function markReadyForPickup(order) {
    await updateOrderStatus(order, 'ready_for_pickup')
  }

  async function cancelOrder(order) {
    if (!window.confirm('Cancel this order? This cannot be undone from here.')) return
    await updateOrderStatus(order, 'cancelled')
  }

  return (
    <div className="page">
      <div className="page-inner">
        <div className="brand">
          <span className="brand-mark">Sakto</span>
          <span className="brand-tag">village delivery</span>
        </div>

        <h1>Orders</h1>

        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          {['active', 'history'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="btn"
              style={{
                width: 'auto',
                padding: '8px 14px',
                background: tab === t ? 'var(--color-primary)' : 'var(--color-surface)',
                color: tab === t ? '#fff' : 'var(--color-ink)',
                textTransform: 'capitalize',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {error && <div className="error-text">{error}</div>}

        {loading ? (
          <p>Loading…</p>
        ) : orders.length === 0 ? (
          <div className="card">
            <p style={{ marginBottom: 0 }}>No {tab} orders right now.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {orders.map((o) => {
              const items = itemsByOrder[o.id] || []
              return (
                <div key={o.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <strong>{STATUS_LABELS[o.status] ?? o.status}</strong>
                    <span className="helper-text" style={{ marginTop: 0 }}>
                      ₱{Number(o.total).toFixed(2)}
                    </span>
                  </div>

                  <ul style={{ margin: 'var(--space-2) 0', paddingLeft: 'var(--space-4)' }}>
                    {items.map((it, idx) => (
                      <li key={idx} className="helper-text" style={{ marginTop: 0 }}>
                        {it.qty} × {it.products?.name} ({it.products?.unit})
                      </li>
                    ))}
                  </ul>

                  <p className="helper-text" style={{ marginTop: 0, marginBottom: 4 }}>
                    Deliver to: {o.delivery_zone} — {o.delivery_landmark} · {o.delivery_contact_phone}
                  </p>
                  <p className="helper-text" style={{ marginTop: 0, marginBottom: 'var(--space-3)' }}>
                    {o.payment_method === 'gcash' ? 'GCash' : 'Cash on Delivery'} ·{' '}
                    {o.delivery_mode === 'walk' ? 'Walk' : 'Bicycle/Motorcycle'}
                  </p>

                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    {o.status === 'placed' && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ width: 'auto', padding: '8px 14px' }}
                        disabled={actingId === o.id}
                        onClick={() => acceptOrder(o)}
                      >
                        Accept order
                      </button>
                    )}
                    {o.status === 'awaiting_payment_confirmation' && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ width: 'auto', padding: '8px 14px' }}
                        disabled={actingId === o.id}
                        onClick={() => confirmPayment(o)}
                      >
                        Confirm GCash payment received
                      </button>
                    )}
                    {o.status === 'payment_confirmed' && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ width: 'auto', padding: '8px 14px' }}
                        disabled={actingId === o.id}
                        onClick={() => markReadyForPickup(o)}
                      >
                        Mark ready for pickup
                      </button>
                    )}
                    {ACTIVE_STATUSES.includes(o.status) && o.status !== 'ready_for_pickup' && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ width: 'auto', padding: '8px 14px' }}
                        disabled={actingId === o.id}
                        onClick={() => cancelOrder(o)}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="link-row">
          <Link to="/dashboard">Back to dashboard</Link>
        </div>
      </div>
    </div>
  )
}
