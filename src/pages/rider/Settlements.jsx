import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { friendlyError } from '../../lib/friendlyError'

export default function Settlements() {
  const { profile } = useAuth()
  const [settlements, setSettlements] = useState([])
  const [merchantNames, setMerchantNames] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('rider_settlements')
        .select('*, orders(merchant_id, delivery_zone, delivery_landmark)')
        .eq('rider_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) {
        setError(friendlyError(error))
        setLoading(false)
        return
      }
      setSettlements(data)

      const merchantIds = [...new Set(data.map((s) => s.orders?.merchant_id).filter(Boolean))]
      if (merchantIds.length > 0) {
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

  const owed = settlements.filter((s) => !s.settled)
  const totalOwed = owed.reduce((sum, s) => sum + Number(s.amount_fronted), 0)

  return (
    <div className="page">
      <div className="page-inner">
        <div className="brand">
          <span className="brand-mark">Sakto</span>
          <span className="brand-tag">village delivery</span>
        </div>

        <h1>Your COD float</h1>

        {error && <div className="error-text">{error}</div>}

        {loading ? (
          <p>Loading…</p>
        ) : (
          <>
            <div className="status-banner">
              <strong>₱{totalOwed.toFixed(2)} outstanding</strong>
              <p style={{ marginTop: 'var(--space-2)', marginBottom: 0 }}>
                {owed.length === 0
                  ? "You're all settled up."
                  : `Across ${owed.length} order${owed.length > 1 ? 's' : ''} you fronted to merchants but haven't marked delivered yet.`}
              </p>
            </div>

            {settlements.length === 0 ? (
              <div className="card">
                <p style={{ marginBottom: 0 }}>No COD jobs yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {settlements.map((s) => (
                  <div key={s.id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{merchantNames[s.orders?.merchant_id] ?? 'Merchant'}</strong>
                      <span style={{ color: s.settled ? 'var(--color-primary)' : 'var(--color-rust)' }}>
                        {s.settled ? 'Settled' : 'Outstanding'}
                      </span>
                    </div>
                    <p className="helper-text" style={{ marginTop: 4, marginBottom: 0 }}>
                      Fronted ₱{Number(s.amount_fronted).toFixed(2)} · {s.orders?.delivery_zone}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div className="link-row">
          <Link to="/rider/jobs">Back to jobs</Link>
        </div>
        <div className="link-row">
          <Link to="/dashboard">Back to dashboard</Link>
        </div>
      </div>
    </div>
  )
}
