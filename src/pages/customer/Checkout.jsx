import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { friendlyError } from '../../lib/friendlyError'
import { calcTotals, isCodAllowed, DELIVERY_FEES, COD_SURCHARGE, COD_MAX_ORDER_VALUE } from '../../lib/pricing'

const DELIVERY_OPTIONS = [
  { value: 'walk', label: 'Walk', fee: DELIVERY_FEES.walk },
  { value: 'bicycle_motorcycle', label: 'Bicycle / Motorcycle', fee: DELIVERY_FEES.bicycle_motorcycle },
]

export default function Checkout() {
  const { profile } = useAuth()
  const { merchantId, items, subtotal, clearCart } = useCart()
  const navigate = useNavigate()

  const [deliveryMode, setDeliveryMode] = useState('walk')
  const [paymentMethod, setPaymentMethod] = useState('gcash')
  const [zone, setZone] = useState(profile?.zone || '')
  const [landmark, setLandmark] = useState(profile?.landmark || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (items.length === 0) {
    return (
      <div className="page">
        <div className="page-inner">
          <div className="card">
            <p style={{ marginBottom: 'var(--space-3)' }}>Your cart is empty.</p>
            <Link to="/browse" className="btn btn-primary">Browse merchants</Link>
          </div>
        </div>
      </div>
    )
  }

  const codAllowed = isCodAllowed(subtotal)
  const effectivePaymentMethod = codAllowed ? paymentMethod : 'gcash'
  const { deliveryFee, codSurcharge, total } = calcTotals({
    subtotal,
    deliveryMode,
    paymentMethod: effectivePaymentMethod,
  })

  async function handlePlaceOrder() {
    setError(null)

    if (!zone || !landmark || !phone) {
      setError('Please fill in your delivery zone, landmark, and contact number.')
      return
    }

    setSubmitting(true)
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: profile.id,
          merchant_id: merchantId,
          status: 'placed',
          delivery_mode: deliveryMode,
          payment_method: effectivePaymentMethod,
          subtotal,
          delivery_fee: deliveryFee,
          cod_surcharge: codSurcharge,
          total,
          delivery_zone: zone,
          delivery_landmark: landmark,
          delivery_contact_phone: phone,
        })
        .select()
        .single()
      if (orderError) throw orderError

      const orderItemsPayload = items.map((i) => ({
        order_id: order.id,
        product_id: i.productId,
        qty: i.qty,
        price_at_order: i.price,
      }))
      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsPayload)
      if (itemsError) throw itemsError

      // Record the payment intent. For GCash, the customer pays the
      // merchant directly outside the app (GCash transfer) and the
      // merchant confirms in-app — this row just tracks that a
      // confirmation is expected. For COD, this is a placeholder the
      // rider/merchant flow will settle later.
      const { error: paymentError } = await supabase.from('payments').insert({
        order_id: order.id,
        method: effectivePaymentMethod,
        amount: total,
        payer_id: profile.id,
        payee_id: merchantId,
        status: 'pending',
      })
      if (paymentError) throw paymentError

      clearCart()
      navigate(`/orders/${order.id}/confirmation`)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <div className="page-inner">
        <div className="brand">
          <span className="brand-mark">Sakto</span>
          <span className="brand-tag">village delivery</span>
        </div>

        <h1>Checkout</h1>

        {error && <div className="error-text">{error}</div>}

        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--color-ink-soft)', marginBottom: 'var(--space-2)' }}>
            Delivery option
          </label>
          {DELIVERY_OPTIONS.map((opt) => (
            <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
              <input
                type="radio"
                name="deliveryMode"
                value={opt.value}
                checked={deliveryMode === opt.value}
                onChange={() => setDeliveryMode(opt.value)}
              />
              {opt.label} — ₱{opt.fee}
            </label>
          ))}
        </div>

        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--color-ink-soft)', marginBottom: 'var(--space-2)' }}>
            Payment method
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <input
              type="radio"
              name="paymentMethod"
              value="gcash"
              checked={effectivePaymentMethod === 'gcash'}
              onChange={() => setPaymentMethod('gcash')}
            />
            GCash — pay the merchant directly, they confirm before delivery
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 4 }}>
            <input
              type="radio"
              name="paymentMethod"
              value="cod"
              checked={effectivePaymentMethod === 'cod'}
              disabled={!codAllowed}
              onChange={() => setPaymentMethod('cod')}
            />
            Cash on Delivery — +₱{COD_SURCHARGE} (rider fronts payment to merchant)
          </label>
          {!codAllowed && (
            <p className="helper-text" style={{ marginBottom: 0 }}>
              COD isn't available for orders over ₱{COD_MAX_ORDER_VALUE} — this order needs GCash.
            </p>
          )}
        </div>

        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="field">
            <label htmlFor="zone">Purok / Sitio</label>
            <input id="zone" value={zone} onChange={(e) => setZone(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="landmark">Nearest landmark</label>
            <input id="landmark" value={landmark} onChange={(e) => setLandmark(e.target.value)} required />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="phone">Contact number</label>
            <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span>Subtotal</span><span>₱{subtotal.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span>Delivery fee</span><span>₱{deliveryFee.toFixed(2)}</span>
          </div>
          {codSurcharge > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>COD surcharge</span><span>₱{codSurcharge.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginTop: 'var(--space-2)' }}>
            <span>Total</span><span>₱{total.toFixed(2)}</span>
          </div>
        </div>

        <button className="btn btn-primary" onClick={handlePlaceOrder} disabled={submitting}>
          {submitting ? 'Placing order…' : `Place order — ₱${total.toFixed(2)}`}
        </button>

        <div className="link-row">
          <Link to="/cart">Back to cart</Link>
        </div>
      </div>
    </div>
  )
}
