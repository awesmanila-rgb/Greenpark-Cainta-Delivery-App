import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { friendlyError } from '../../lib/friendlyError'

export default function ProductList() {
  const { profile } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [togglingId, setTogglingId] = useState(null)

  async function loadProducts() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('merchant_id', profile.id)
      .order('created_at', { ascending: false })
    if (error) {
      setError(friendlyError(error))
    } else {
      setProducts(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (profile?.id) loadProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  async function toggleActive(product) {
    setTogglingId(product.id)
    const { error } = await supabase
      .from('products')
      .update({ active: !product.active })
      .eq('id', product.id)
    setTogglingId(null)
    if (error) {
      setError(friendlyError(error))
      return
    }
    setProducts((list) =>
      list.map((p) => (p.id === product.id ? { ...p, active: !p.active } : p))
    )
  }

  return (
    <div className="page">
      <div className="page-inner">
        <div className="brand">
          <span className="brand-mark">Sakto</span>
          <span className="brand-tag">village delivery</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-4)' }}>
          <h1 style={{ marginBottom: 0 }}>Your products</h1>
          <Link to="/merchant/products/new" className="btn btn-primary" style={{ width: 'auto', padding: '10px 16px' }}>
            + Add
          </Link>
        </div>

        {error && <div className="error-text">{error}</div>}

        {loading ? (
          <p>Loading…</p>
        ) : products.length === 0 ? (
          <div className="card">
            <p style={{ marginBottom: 'var(--space-3)' }}>
              No products yet. Add your first one — a photo is required (e.g. balut, chicharon).
            </p>
            <Link to="/merchant/products/new" className="btn btn-primary">
              Add your first product
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {products.map((p) => (
              <div key={p.id} className="card" style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <img
                  src={p.photo_url}
                  alt={p.name}
                  style={{
                    width: 72,
                    height: 72,
                    objectFit: 'cover',
                    borderRadius: 'var(--radius-sm)',
                    flexShrink: 0,
                    opacity: p.active ? 1 : 0.4,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div className="helper-text" style={{ marginTop: 0 }}>
                    ₱{Number(p.price).toFixed(2)} / {p.unit} · stock: {p.stock_qty}
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                    <Link
                      to={`/merchant/products/${p.id}/edit`}
                      className="btn btn-ghost"
                      style={{ width: 'auto', padding: '6px 12px', fontSize: 'var(--text-xs)' }}
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ width: 'auto', padding: '6px 12px', fontSize: 'var(--text-xs)' }}
                      disabled={togglingId === p.id}
                      onClick={() => toggleActive(p)}
                    >
                      {p.active ? 'Mark out of stock' : 'Mark in stock'}
                    </button>
                  </div>
                </div>
              </div>
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
