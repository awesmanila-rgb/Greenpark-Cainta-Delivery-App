import { useState } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { friendlyError } from '../lib/friendlyError'

const ROLE_LABELS = {
  customer: 'Customer',
  merchant: 'Merchant',
  rider: 'Rider',
}

const VEHICLE_OPTIONS = [
  { value: 'walk', label: 'Walk' },
  { value: 'bicycle', label: 'Bicycle' },
  { value: 'motorcycle', label: 'Motorcycle' },
]

export default function Register() {
  const { role } = useParams()
  const navigate = useNavigate()
  const { registerUser } = useAuth()

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    zone: '',
    landmark: '',
    // merchant-only
    shopName: '',
    gcashNumber: '',
    operatingHours: '',
    // rider-only
    vehicleType: 'walk',
  })

  if (!ROLE_LABELS[role]) {
    return <Navigate to="/" replace />
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!form.name || !form.phone || !form.email || !form.password) {
      setError('Please fill in all required fields.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (role === 'merchant' && !form.shopName) {
      setError('Shop name is required.')
      return
    }
    if ((role === 'merchant' || role === 'rider') && (!form.zone || !form.landmark)) {
      setError('Zone/Purok and a landmark are required so customers and riders can find you.')
      return
    }

    setSubmitting(true)
    const { error, needsEmailConfirmation } = await registerUser({
      email: form.email,
      password: form.password,
      name: form.name,
      phone: form.phone,
      role,
      zone: form.zone || null,
      landmark: form.landmark || null,
      roleDetails: {
        shopName: form.shopName,
        gcashNumber: form.gcashNumber,
        operatingHours: form.operatingHours,
        vehicleType: form.vehicleType,
      },
    })
    setSubmitting(false)

    if (error) {
      setError(friendlyError(error))
      return
    }

    if (needsEmailConfirmation) {
      setAwaitingConfirmation(true)
      return
    }

    navigate('/redirect')
  }

  if (awaitingConfirmation) {
    return (
      <div className="page">
        <div className="page-inner">
          <div className="brand">
            <span className="brand-mark">Sakto</span>
            <span className="brand-tag">village delivery</span>
          </div>
          <div className="status-banner">
            <strong>Almost done — check your email.</strong>
            <p style={{ marginTop: 'var(--space-2)', marginBottom: 0 }}>
              We sent a confirmation link to <strong>{form.email}</strong>. Tap it, then come
              back and log in to finish setting up your account.
            </p>
          </div>
          <div className="link-row">
            <a href="/login">Go to login</a>
          </div>
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

        <h1>Register as {ROLE_LABELS[role]}</h1>

        <form className="card" onSubmit={handleSubmit}>
          {error && <div className="error-text">{error}</div>}

          <div className="field">
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="phone">Phone number</label>
            <input
              id="phone"
              type="tel"
              placeholder="09XX XXX XXXX"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              required
            />
            <div className="helper-text">Used by riders/customers to reach you if the app is slow to update.</div>
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              minLength={6}
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              minLength={6}
              value={form.confirmPassword}
              onChange={(e) => update('confirmPassword', e.target.value)}
              required
            />
          </div>

          {role === 'merchant' && (
            <>
              <div className="field">
                <label htmlFor="shopName">Shop name</label>
                <input
                  id="shopName"
                  value={form.shopName}
                  onChange={(e) => update('shopName', e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="gcashNumber">GCash number (optional for now)</label>
                <input
                  id="gcashNumber"
                  value={form.gcashNumber}
                  onChange={(e) => update('gcashNumber', e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="operatingHours">Operating hours</label>
                <input
                  id="operatingHours"
                  placeholder="e.g. 8am - 8pm daily"
                  value={form.operatingHours}
                  onChange={(e) => update('operatingHours', e.target.value)}
                />
              </div>
            </>
          )}

          {role === 'rider' && (
            <div className="field">
              <label htmlFor="vehicleType">How will you deliver?</label>
              <select
                id="vehicleType"
                value={form.vehicleType}
                onChange={(e) => update('vehicleType', e.target.value)}
              >
                {VEHICLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(role === 'merchant' || role === 'rider' || role === 'customer') && (
            <>
              <div className="field">
                <label htmlFor="zone">
                  Purok / Sitio {role === 'customer' ? '(optional)' : ''}
                </label>
                <input
                  id="zone"
                  placeholder="e.g. Purok 3"
                  value={form.zone}
                  onChange={(e) => update('zone', e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="landmark">
                  Nearest landmark {role === 'customer' ? '(optional)' : ''}
                </label>
                <input
                  id="landmark"
                  placeholder="e.g. malapit sa chapel"
                  value={form.landmark}
                  onChange={(e) => update('landmark', e.target.value)}
                />
              </div>
            </>
          )}

          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className="link-row">
          Already registered? <a href="/login">Log in</a>
        </div>
      </div>
    </div>
  )
}
