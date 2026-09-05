import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { friendlyError } from '../../lib/friendlyError'

const TABS = [
  { id: 'pending', label: 'Pending' },
  { id: 'verified', label: 'Verified' },
  { id: 'banned', label: 'Banned' },
]

export default function AdminApprovals() {
  const [tab, setTab] = useState('pending')
  const [users, setUsers] = useState([])
  const [details, setDetails] = useState({}) // user_id -> merchant/rider extra info
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actingId, setActingId] = useState(null)

  async function loadUsers(status) {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .in('role', ['merchant', 'rider'])
      .eq('status', status)
      .order('created_at', { ascending: true })

    if (error) {
      setError(friendlyError(error))
      setLoading(false)
      return
    }

    setUsers(data)

    // Fetch the role-specific rows for whatever's on screen, so we can
    // show shop name / vehicle type without a second round of clicking.
    const merchantIds = data.filter((u) => u.role === 'merchant').map((u) => u.id)
    const riderIds = data.filter((u) => u.role === 'rider').map((u) => u.id)

    const nextDetails = {}

    if (merchantIds.length) {
      const { data: merchants } = await supabase
        .from('merchants')
        .select('user_id, shop_name, gcash_number')
        .in('user_id', merchantIds)
      merchants?.forEach((m) => {
        nextDetails[m.user_id] = { shopName: m.shop_name, gcashNumber: m.gcash_number }
      })
    }

    if (riderIds.length) {
      const { data: riders } = await supabase
        .from('riders')
        .select('user_id, vehicle_type, max_cod_order_value')
        .in('user_id', riderIds)
      riders?.forEach((r) => {
        nextDetails[r.user_id] = { vehicleType: r.vehicle_type, maxCod: r.max_cod_order_value }
      })
    }

    setDetails(nextDetails)
    setLoading(false)
  }

  useEffect(() => {
    loadUsers(tab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  async function setStatus(userId, status) {
    setActingId(userId)
    const { error } = await supabase.from('users').update({ status }).eq('id', userId)
    setActingId(null)
    if (error) {
      setError(friendlyError(error))
      return
    }
    // Remove from current list since its status no longer matches this tab
    setUsers((list) => list.filter((u) => u.id !== userId))
  }

  return (
    <div className="page">
      <div className="page-inner">
        <div className="brand">
          <span className="brand-mark">Sakto</span>
          <span className="brand-tag">village delivery</span>
        </div>

        <h1>Merchant & rider approvals</h1>

        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
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
        ) : users.length === 0 ? (
          <div className="card">
            <p style={{ marginBottom: 0 }}>No {tab} accounts right now.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {users.map((u) => {
              const d = details[u.id] || {}
              return (
                <div key={u.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <strong>{u.name}</strong>
                    <span className="helper-text" style={{ marginTop: 0, textTransform: 'capitalize' }}>
                      {u.role}
                    </span>
                  </div>
                  <p className="helper-text" style={{ marginTop: 4, marginBottom: 4 }}>
                    {u.phone} · {u.zone || 'no zone given'}{u.landmark ? ` · ${u.landmark}` : ''}
                  </p>
                  {u.role === 'merchant' && d.shopName && (
                    <p className="helper-text" style={{ marginTop: 0, marginBottom: 4 }}>
                      Shop: {d.shopName}{d.gcashNumber ? ` · GCash: ${d.gcashNumber}` : ''}
                    </p>
                  )}
                  {u.role === 'rider' && d.vehicleType && (
                    <p className="helper-text" style={{ marginTop: 0, marginBottom: 4 }}>
                      Vehicle: {d.vehicleType} · COD cap: ₱{d.maxCod}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                    {tab !== 'verified' && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ width: 'auto', padding: '8px 14px' }}
                        disabled={actingId === u.id}
                        onClick={() => setStatus(u.id, 'verified')}
                      >
                        Verify
                      </button>
                    )}
                    {tab !== 'banned' && (
                      <button
                        type="button"
                        className="btn"
                        style={{ width: 'auto', padding: '8px 14px', background: 'var(--color-rust)', color: '#fff' }}
                        disabled={actingId === u.id}
                        onClick={() => setStatus(u.id, 'banned')}
                      >
                        Ban
                      </button>
                    )}
                    {tab === 'banned' && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ width: 'auto', padding: '8px 14px' }}
                        disabled={actingId === u.id}
                        onClick={() => setStatus(u.id, 'pending')}
                      >
                        Reinstate to pending
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
