import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useLocationSharing } from '../../context/LocationSharingContext'
import { friendlyError } from '../../lib/friendlyError'

const TABS = [
  { id: 'available', label: 'Available' },
  { id: 'active', label: 'My jobs' },
  { id: 'history', label: 'History' },
]

const ACTIVE_STATUSES = ['rider_assigned', 'picked_up', 'out_for_delivery']
const HISTORY_STATUSES = ['delivered', 'rider_settled']

export default function JobList() {
  const { profile } = useAuth()
  const { hasActiveJob, sharing, permissionDenied } = useLocationSharing()
  const [tab, setTab] = useState('available')
  const [orders, setOrders] = useState([])
  const [itemsByOrder, setItemsByOrder] = useState({})
  const [merchantsByOrder, setMerchantsByOrder] = useState({})
  const [maxCodOrderValue, setMaxCodOrderValue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actingId, setActingId] = useState(null)

  useEffect(() => {
    if (!profile?.id) return
    supabase
      .from('riders')
      .select('max_cod_order_value')
      .eq('user_id', profile.id)
      .single()
      .then(({ data }) => setMaxCodOrderValue(data?.max_cod_order_value ?? null))
  }, [profile?.id])

  async function loadOrders() {
    setLoading(true)
    setError(null)

    let query = supabase.from('orders').select('*')
    if (tab === 'available') {
      query = query.eq('status', 'ready_for_pickup').is('rider_id', null)
    } else if (tab === 'active') {
      query = query.eq('rider_id', profile.id).in('status', ACTIVE_STATUSES)
    } else {
      query = query.eq('rider_id', profile.id).in('status', HISTORY_STATUSES)
    }
    query = query.order('created_at', { ascending: tab !== 'history' })

    const { data, error } = await query
    if (error) {
      setError(friendlyError(error))
      setLoading(false)
      return
    }
    setOrders(data)

    if (data.length > 0) {
      const orderIds = data.map((o) => o.id)
      const merchantIds = [...new Set(data.map((o) => o.merchant_id))]

      const [{ data: items }, { data: merchants }] = await Promise.all([
        supabase
          .from('order_items')
          .select('order_id, qty, price_at_order, products(name, unit)')
          .in('order_id', orderIds),
        supabase.from('merchants').select('user_id, shop_name, zone, landmark').in('user_id', merchantIds),
      ])

      const groupedItems = {}
      items?.forEach((i) => {
        if (!groupedItems[i.order_id]) groupedItems[i.order_id] = []
        groupedItems[i.order_id].push(i)
      })
      setItemsByOrder(groupedItems)

      const merchantMap = {}
      merchants?.forEach((m) => {
        merchantMap[m.user_id] = m
      })
      setMerchantsByOrder(merchantMap)
    } else {
      setItemsByOrder({})
      setMerchantsByOrder({})
    }

    setLoading(false)
  }

  useEffect(() => {
    if (profile?.id) loadOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, tab])

  async function claimJob(order) {
    setActingId(order.id)
    setError(null)
    const { error } = await supabase
      .from('orders')
      .update({ status: 'rider_assigned', rider_id: profile.id })
      .eq('id', order.id)
    setActingId(null)
    if (error) {
      setError(friendlyError(error))
      return
    }
    setOrders((list) => list.filter((o) => o.id !== order.id))
  }

  async function markPickedUp(order) {
    setActingId(order.id)
    setError(null)

    const { error: orderError } = await supabase
      .from('orders')
      .update({ status: 'picked_up' })
      .eq('id', order.id)
    if (orderError) {
      setActingId(null)
      setError(friendlyError(orderError))
      return
    }

    if (order.payment_method === 'cod') {
      const { error: settlementError } = await supabase.from('rider_settlements').insert({
        rider_id: profile.id,
        order_id: order.id,
        amount_fronted: order.subtotal,
        settled: false,
      })
      if (settlementError) {
        setError(friendlyError(settlementError))
      }
    }

    setActingId(null)
    setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, status: 'picked_up' } : o)))
  }

  async function markDelivered(order) {
    setActingId(order.id)
    setError(null)

    const finalStatus = order.payment_method === 'cod' ? 'rider_settled' : 'delivered'
    const { error: orderError } = await supabase
      .from('orders')
      .update({ status: finalStatus })
      .eq('id', order.id)
    if (orderError) {
      setActingId(null)
      setError(friendlyError(orderError))
      return
    }

    if (order.payment_method === 'cod') {
      const { error: settlementError } = await supabase
        .from('rider_settlements')
        .update({ settled: true, settled_at: new Date().toISOString() })
        .eq('order_id', order.id)
      if (settlementError) {
        setError(friendlyError(settlementError))
      }
    }

    setActingId(null)
    setOrders((list) => list.filter((o) => o.id !== order.id))
  }

  const codBlockedBecauseOfCap = (order) =>
    order.payment_method === 'cod' &&
    maxCodOrderValue != null &&
    Number(order.subtotal) > Number(maxCodOrderValue)

  return (
    <div className="page">
      <div className="page-inner">
        <div className="brand">
          <span className="brand-mark">Sakto</span>
          <span className="brand-tag">village delivery</span>
        </div>

        <h1>Delivery jobs</h1>

        {hasActiveJob && (
          <p className="helper-text" style={{ marginBottom: 'var(--space-3)' }}>
            {permissionDenied
              ? '⚠️ Location permission denied — the customer on your active job can\'t see your live position. You can still deliver normally.'
              : sharing
              ? '📍 Sharing your live location with the customer on your active job.'
              : '📍 Turning on location sharing for your active job…'}
          </p>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="btn"
              style={{
                width: 'auto',
                padding: '8px 14px',
                background: tab === t.id ? 'var(--color-primary)' : 'var(--color-surface)',
                color: tab === t.id ? '#fff' : 'var(--color-ink)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && <div className="error-text">{error}</div>}

        {loading ? (
          <p>Loading…</p>
        ) : orders.length === 0 ? (
          <div className="card">
            <p style={{ marginBottom: 0 }}>
              {tab === 'available' ? 'No jobs available right now.' : `No ${tab} jobs.`}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {orders.map((o) => {
              const items = itemsByOrder[o.id] || []
              const merchant = merchantsByOrder[o.merchant_id]
              const earnings = Number(o.delivery_fee) + Number(o.cod_surcharge)
              const blocked = tab === 'available' && codBlockedBecauseOfCap(o)

              return (
                <div key={o.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <strong>{merchant?.shop_name ?? 'Merchant'}</strong>
                    <span className="helper-text" style={{ marginTop: 0 }}>
                      earn ₱{earnings.toFixed(2)}
                    </span>
                  </div>
                  <p className="helper-text" style={{ marginTop: 4, marginBottom: 4 }}>
                    Pickup: {merchant?.zone} — {merchant?.landmark}
                  </p>

                  <ul style={{ margin: 'var(--space-2) 0', paddingLeft: 'var(--space-4)' }}>
                    {items.map((it, idx) => (
                      <li key={idx} className="helper-text" style={{ marginTop: 0 }}>
                        {it.qty} × {it.products?.name}
                      </li>
                    ))}
                  </ul>

                  <p className="helper-text" style={{ marginTop: 0, marginBottom: 4 }}>
                    Deliver to: {o.delivery_zone} — {o.delivery_landmark} · {o.delivery_contact_phone}
                  </p>
                  <p className="helper-text" style={{ marginTop: 0, marginBottom: 'var(--space-3)' }}>
                    {o.payment_method === 'gcash'
                      ? 'GCash — already confirmed by merchant'
                      : `COD — you front ₱${Number(o.subtotal).toFixed(2)} to the merchant at pickup`}
                    {' · '}
                    {o.delivery_mode === 'walk' ? 'Walk' : 'Bicycle/Motorcycle'}
                  </p>

                  {blocked && (
                    <p className="error-text">
                      This order's subtotal is above your COD limit (₱{maxCodOrderValue}) — you can't front this amount.
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    {tab === 'available' && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ width: 'auto', padding: '8px 14px' }}
                        disabled={actingId === o.id || blocked}
                        onClick={() => claimJob(o)}
                      >
                        Accept job
                      </button>
                    )}
                    {tab === 'active' && o.status === 'rider_assigned' && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ width: 'auto', padding: '8px 14px' }}
                        disabled={actingId === o.id}
                        onClick={() => markPickedUp(o)}
                      >
                        Mark picked up
                      </button>
                    )}
                    {tab === 'active' && (o.status === 'picked_up' || o.status === 'out_for_delivery') && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ width: 'auto', padding: '8px 14px' }}
                        disabled={actingId === o.id}
                        onClick={() => markDelivered(o)}
                      >
                        Mark delivered
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
