import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { friendlyError } from '../../lib/friendlyError'
import { fetchRatingSummaries } from '../../lib/ratings'

export default function MerchantList() {
  const [merchants, setMerchants] = useState([])
  const [ratings, setRatings] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      // RLS already restricts this to verified merchants (or the
      // merchant's own row, or admin) — see rls_policies.sql.
      const { data, error } = await supabase
        .from('merchants')
        .select('user_id, shop_name, zone, landmark, operating_hours, users!inner(status)')
        .eq('users.status', 'verified')
        .order('shop_name')

      if (error) {
        setError(friendlyError(error))
        setLoading(false)
        return
      }
      setMerchants(data)
      setRatings(await fetchRatingSummaries(data.map((m) => m.user_id)))
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="page">
      <div className="page-inner">
        <div className="brand">
          <span className="brand-mark">Sakto</span>
          <span className="brand-tag">village delivery</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-4)' }}>
          <h1 style={{ marginBottom: 0 }}>Merchants</h1>
          <Link to="/cart" className="helper-text">View cart</Link>
        </div>

        {error && <div className="error-text">{error}</div>}

        {loading ? (
          <p>Loading…</p>
        ) : merchants.length === 0 ? (
          <div className="card">
            <p style={{ marginBottom: 0 }}>No merchants are live yet — check back soon.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {merchants.map((m) => {
              const rating = ratings[m.user_id]
              return (
                <Link
                  key={m.user_id}
                  to={`/merchants/${m.user_id}`}
                  className="card"
                  style={{ display: 'block', textDecoration: 'none' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontWeight: 600, fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)' }}>
                      {m.shop_name}
                    </span>
                    {rating && (
                      <span className="helper-text" style={{ marginTop: 0, color: 'var(--color-accent)' }}>
                        ★ {rating.avg.toFixed(1)} ({rating.count})
                      </span>
                    )}
                  </div>
                  <div className="helper-text" style={{ marginTop: 4, marginBottom: 0 }}>
                    {m.zone}{m.landmark ? ` · ${m.landmark}` : ''}
                    {m.operating_hours ? ` · ${m.operating_hours}` : ''}
                  </div>
                </Link>
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
