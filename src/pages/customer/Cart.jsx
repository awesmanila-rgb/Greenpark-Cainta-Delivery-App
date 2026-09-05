import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'

export default function Cart() {
  const { merchantName, items, subtotal, updateQty, removeItem } = useCart()
  const navigate = useNavigate()

  return (
    <div className="page">
      <div className="page-inner">
        <div className="brand">
          <span className="brand-mark">Sakto</span>
          <span className="brand-tag">village delivery</span>
        </div>

        <h1>Your cart</h1>

        {items.length === 0 ? (
          <div className="card">
            <p style={{ marginBottom: 'var(--space-3)' }}>Your cart is empty.</p>
            <Link to="/browse" className="btn btn-primary">Browse merchants</Link>
          </div>
        ) : (
          <>
            <p className="helper-text" style={{ marginBottom: 'var(--space-3)' }}>
              From {merchantName}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              {items.map((i) => (
                <div key={i.productId} className="card" style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                  <img
                    src={i.photoUrl}
                    alt={i.name}
                    style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{i.name}</div>
                    <div className="helper-text" style={{ marginTop: 0 }}>₱{Number(i.price).toFixed(2)} / {i.unit}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ width: 32, height: 32, padding: 0 }}
                      onClick={() => updateQty(i.productId, i.qty - 1)}
                    >
                      −
                    </button>
                    <span>{i.qty}</span>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ width: 32, height: 32, padding: 0 }}
                      onClick={() => updateQty(i.productId, i.qty + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal</span>
                <strong>₱{subtotal.toFixed(2)}</strong>
              </div>
              <p className="helper-text" style={{ marginBottom: 0 }}>
                Delivery fee and any COD surcharge are added at checkout.
              </p>
            </div>

            <button className="btn btn-primary" onClick={() => navigate('/checkout')}>
              Proceed to checkout
            </button>
          </>
        )}

        <div className="link-row">
          <Link to="/browse">Continue browsing</Link>
        </div>
      </div>
    </div>
  )
}
