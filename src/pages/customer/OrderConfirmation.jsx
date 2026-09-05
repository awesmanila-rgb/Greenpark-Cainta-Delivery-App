import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { friendlyError } from '../../lib/friendlyError'
import { ORDER_STATUS_LABELS } from '../../lib/orderStatusLabels'
import StarRating from '../../components/StarRating'
import RiderLiveMap from '../../components/RiderLiveMap'

const COMPLETED_STATUSES = ['delivered', 'rider_settled']
const TRACKING_STATUSES = ['rider_assigned', 'picked_up', 'out_for_delivery']

export default function OrderConfirmation() {
  const { id } = useParams()
  const { profile } = useAuth()
  const [order, setOrder] = useState(null)
  const [merchantName, setMerchantName] = useState(null)
  const [existingRatings, setExistingRatings] = useState([]) // rated_user_id values already rated
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('orders').select('*').eq('id', id).single()
      if (error) {
        setError(friendlyError(error))
        setLoading(false)
        return
      }
      setOrder(data)

      const { data: merchant } = await supabase
        .from('merchants')
        .select('shop_name')
        .eq('user_id', data.merchant_id)
        .single()
      setMerchantName(merchant?.shop_name ?? null)

      if (COMPLETED_STATUSES.includes(data.status)) {
        const { data: ratings } = await supabase
          .from('ratings')
          .select('rated_user_id')
          .eq('order_id', id)
          .eq('rated_by', profile.id)
        setExistingRatings(ratings?.map((r) => r.rated_user_id) ?? [])
      }

      setLoading(false)
    }
    if (profile?.id) load()
  }, [id, profile?.id])

  // Keep the status (and therefore the live map's visibility) current
  // without requiring a manual reload — this is what makes the map
  // actually show up the moment a rider gets assigned.
  useEffect(() => {
    const channel = supabase
      .channel(`order-confirmation-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        (payload) => setOrder((o) => (o ? { ...o, ...payload.new } : o))
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [id])

  async function submitRating(ratedUserId, stars) {
    const { error } = await supabase.from('ratings').insert({
      order_id: id,
      rated_user_id: ratedUserId,
      rated_by: profile.id,
      stars,
    })
    if (error) return { error: friendlyError(error) }
    return { error: null }
  }

  async function cancelOrder() {
    if (!window.confirm('Cancel this order?')) return
    setCancelling(true)
    setError(null)
    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', id)
    setCancelling(false)
    if (error) {
      setError(friendlyError(error))
      return
    }
    setOrder((o) => ({ ...o, status: 'cancelled' }))
  }

  return (
    <div className="page">
      <div className="page-inner">
        <div className="brand">
          <span className="brand-mark">Sakto</span>
          <span className="brand-tag">village delivery</span>
        </div>

        {loading ? (
          <p>Loading…</p>
        ) : error ? (
          <div className="error-text">{error}</div>
        ) : (
          <>
            <div className="status-banner">
              <strong>Thanks for your order!</strong>
              <p style={{ marginTop: 'var(--space-2)', marginBottom: 0 }}>
                {ORDER_STATUS_LABELS[order.status] ?? order.status}
              </p>
            </div>

            <div className="card">
              <p><strong>Total:</strong> ₱{Number(order.total).toFixed(2)}</p>
              <p><strong>Payment:</strong> {order.payment_method === 'gcash' ? 'GCash' : 'Cash on Delivery'}</p>
              <p style={{ marginBottom: 0 }}>
                <strong>Delivery to:</strong> {order.delivery_zone} — {order.delivery_landmark}
              </p>
            </div>

            {order.payment_method === 'gcash' && !COMPLETED_STATUSES.includes(order.status) && (
              <p className="helper-text" style={{ marginTop: 'var(--space-3)' }}>
                Send payment to the merchant's GCash number and wait for them to confirm it
                in-app before your order moves to pickup.
              </p>
            )}

            {TRACKING_STATUSES.includes(order.status) && order.rider_id && (
              <div className="card" style={{ marginTop: 'var(--space-4)' }}>
                <p style={{ fontWeight: 600, marginBottom: 'var(--space-3)' }}>Your rider</p>
                <RiderLiveMap riderId={order.rider_id} />
              </div>
            )}

            {order.status === 'placed' && (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ marginTop: 'var(--space-4)' }}
                disabled={cancelling}
                onClick={cancelOrder}
              >
                {cancelling ? 'Cancelling…' : 'Cancel order'}
              </button>
            )}

            {COMPLETED_STATUSES.includes(order.status) && (
              <div className="card" style={{ marginTop: 'var(--space-4)' }}>
                <p style={{ fontWeight: 600, marginBottom: 'var(--space-3)' }}>How was it?</p>
                <StarRating
                  label={merchantName ?? 'Merchant'}
                  onSubmit={(stars) => submitRating(order.merchant_id, stars)}
                  initialSubmitted={existingRatings.includes(order.merchant_id)}
                />
                {order.rider_id && (
                  <StarRating
                    label="Your rider"
                    onSubmit={(stars) => submitRating(order.rider_id, stars)}
                    initialSubmitted={existingRatings.includes(order.rider_id)}
                  />
                )}
              </div>
            )}
          </>
        )}

        <div className="link-row">
          <Link to="/browse">Order something else</Link>
        </div>
        <div className="link-row">
          <Link to="/dashboard">Back to dashboard</Link>
        </div>
      </div>
    </div>
  )
}
