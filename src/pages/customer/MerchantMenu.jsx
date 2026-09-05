import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { friendlyError } from '../../lib/friendlyError'
import { useCart } from '../../context/CartContext'
import { fetchRatingSummaries } from '../../lib/ratings'

export default function MerchantMenu() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addItem, items, merchantId } = useCart()

  const [merchant, setMerchant] = useState(null)
  const [rating, setRating] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .select('user_id, shop_name, zone, landmark, operating_hours')
        .eq('user_id', id)
        .single()
      if (merchantError) {
        setError(friendlyError(merchantError))
        setLoading(false)
        return
      }
      setMerchant(merchantData)

      const summaries = await fetchRatingSummaries([id])
      setRating(summaries[id] ?? null)

      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('merchant_id', id)
        .eq('active', true)
        .order('category', { ascending: true, nullsFirst: false })

      if (productError) {
        setError(friendlyError(productError))
      } else {
        setProducts(productData)
      }
      setLoading(false)
    }
    load()
  }, [id])

  function handleAdd(product) {
    addItem({ id: merchant.user_id, shopName: merchant.shop_name }, product)
  }

  const cartCountForThisMerchant =
    merchantId === id ? items.reduce((sum, i) => sum + i.qty, 0) : 0

  if (loading) {
    return (
      <div className="page">
        <div className="page-inner">Loading…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-inner">
          <div className="error-text">{error}</div>
          <Link to="/browse">Back to merchants</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-inner">
        <div className="brand">
          <span className="brand-mark">Sakto</span>
          <span className="brand-tag">village delivery</span>
        </div>

        <h1 style={{ marginBottom: 4 }}>{merchant.shop_name}</h1>
        <p className="helper-text" style={{ marginBottom: 'var(--space-4)' }}>
          {merchant.zone}{merchant.landmark ? ` · ${merchant.landmark}` : ''}
          {merchant.operating_hours ? ` · ${merchant.operating_hours}` : ''}
          {rating && <> · <span style={{ color: 'var(--color-accent)' }}>★ {rating.avg.toFixed(1)} ({rating.count})</span></>}
        </p>

        {products.length === 0 ? (
          <div className="card">
            <p style={{ marginBottom: 0 }}>This shop hasn't listed any products yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {products.map((p) => (
              <div key={p.id} className="card" style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <img
                  src={p.photo_url}
                  alt={p.name}
                  style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div className="helper-text" style={{ marginTop: 0 }}>
                    ₱{Number(p.price).toFixed(2)} / {p.unit}
                    {p.stock_qty <= 0 ? ' · out of stock' : ''}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: 'auto', padding: '8px 14px', alignSelf: 'center' }}
                  disabled={p.stock_qty <= 0}
                  onClick={() => handleAdd(p)}
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        )}

        {cartCountForThisMerchant > 0 && (
          <button
            type="button"
            className="btn btn-primary"
            style={{ position: 'sticky', bottom: 'var(--space-4)', marginTop: 'var(--space-5)' }}
            onClick={() => navigate('/cart')}
          >
            View cart ({cartCountForThisMerchant})
          </button>
        )}

        <div className="link-row">
          <Link to="/browse">Back to merchants</Link>
        </div>
      </div>
    </div>
  )
}
