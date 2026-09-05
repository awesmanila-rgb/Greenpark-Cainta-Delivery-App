import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { friendlyError } from '../lib/friendlyError'

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await requestPasswordReset(email)
    setSubmitting(false)
    if (error) {
      setError(friendlyError(error))
      return
    }
    setSent(true)
  }

  return (
    <div className="page">
      <div className="page-inner">
        <div className="brand">
          <span className="brand-mark">Sakto</span>
          <span className="brand-tag">village delivery</span>
        </div>

        <h1>Reset your password</h1>

        {sent ? (
          <div className="status-banner">
            <strong>Check your email.</strong>
            <p style={{ marginTop: 'var(--space-2)', marginBottom: 0 }}>
              If an account exists for <strong>{email}</strong>, a reset link is on its way.
            </p>
          </div>
        ) : (
          <form className="card" onSubmit={handleSubmit}>
            {error && <div className="error-text">{error}</div>}
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <div className="link-row">
          <a href="/login">Back to login</a>
        </div>
      </div>
    </div>
  )
}
