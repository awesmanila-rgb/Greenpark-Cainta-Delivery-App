import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { friendlyError } from '../lib/friendlyError'

const VEHICLE_OPTIONS = [
  { value: 'walk', label: 'Walk' },
  { value: 'bicycle', label: 'Bicycle' },
  { value: 'motorcycle', label: 'Motorcycle' },
]

export default function Profile() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [zone, setZone] = useState('')
  const [landmark, setLandmark] = useState('')

  // merchant-only
  const [shopName, setShopName] = useState('')
  const [gcashNumber, setGcashNumber] = useState('')
  const [operatingHours, setOperatingHours] = useState('')

  // rider-only
  const [vehicleType, setVehicleType] = useState('walk')

  useEffect(() => {
    async function load() {
      if (!profile) return
      setName(profile.name || '')
      setPhone(profile.phone || '')
      setZone(profile.zone || '')
      setLandmark(profile.landmark || '')

      if (profile.role === 'merchant') {
        const { data } = await supabase
          .from('merchants')
          .select('shop_name, gcash_number, operating_hours')
          .eq('user_id', profile.id)
          .single()
        if (data) {
          setShopName(data.shop_name || '')
          setGcashNumber(data.gcash_number || '')
          setOperatingHours(data.operating_hours || '')
        }
      }

      if (profile.role === 'rider') {
        const { data } = await supabase
          .from('riders')
          .select('vehicle_type')
          .eq('user_id', profile.id)
          .single()
        if (data) setVehicleType(data.vehicle_type)
      }

      setLoading(false)
    }
    load()
  }, [profile])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaved(false)

    if (!name || !phone) {
      setError('Name and phone are required.')
      return
    }
    if (profile.role === 'merchant' && !shopName) {
      setError('Shop name is required.')
      return
    }

    setSubmitting(true)
    try {
      const { error: userError } = await supabase
        .from('users')
        .update({ name, phone, zone: zone || null, landmark: landmark || null })
        .eq('id', profile.id)
      if (userError) throw userError

      if (profile.role === 'merchant') {
        const { error: merchantError } = await supabase
          .from('merchants')
          .update({
            shop_name: shopName,
            zone: zone || null,
            landmark: landmark || null,
            gcash_number: gcashNumber || null,
            operating_hours: operatingHours || null,
          })
          .eq('user_id', profile.id)
        if (merchantError) throw merchantError
      }

      if (profile.role === 'rider') {
        const { error: riderError } = await supabase
          .from('riders')
          .update({ vehicle_type: vehicleType })
          .eq('user_id', profile.id)
        if (riderError) throw riderError
      }

      setSaved(true)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-inner">Loading…</div>
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

        <h1>Your profile</h1>

        <form className="card" onSubmit={handleSubmit}>
          {error && <div className="error-text">{error}</div>}
          {saved && (
            <p className="helper-text" style={{ color: 'var(--color-primary)', marginBottom: 'var(--space-3)' }}>
              Saved.
            </p>
          )}

          <div className="field">
            <label htmlFor="name">Full name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="field">
            <label htmlFor="phone">Phone number</label>
            <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>

          {profile.role === 'merchant' && (
            <>
              <div className="field">
                <label htmlFor="shopName">Shop name</label>
                <input id="shopName" value={shopName} onChange={(e) => setShopName(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="gcashNumber">GCash number</label>
                <input id="gcashNumber" value={gcashNumber} onChange={(e) => setGcashNumber(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="operatingHours">Operating hours</label>
                <input
                  id="operatingHours"
                  placeholder="e.g. 8am - 8pm daily"
                  value={operatingHours}
                  onChange={(e) => setOperatingHours(e.target.value)}
                />
              </div>
            </>
          )}

          {profile.role === 'rider' && (
            <div className="field">
              <label htmlFor="vehicleType">How you deliver</label>
              <select id="vehicleType" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
                {VEHICLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="field">
            <label htmlFor="zone">Purok / Sitio</label>
            <input id="zone" value={zone} onChange={(e) => setZone(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="landmark">Nearest landmark</label>
            <input id="landmark" value={landmark} onChange={(e) => setLandmark(e.target.value)} />
          </div>

          <button className="btn btn-primary" type="submit" disabled={submitting} style={{ marginTop: 'var(--space-4)' }}>
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </form>

        <div className="link-row">
          <Link to="/dashboard">Back to dashboard</Link>
        </div>
      </div>
    </div>
  )
}
