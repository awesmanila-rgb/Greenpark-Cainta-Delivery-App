import { useState } from 'react'

export default function StarRating({ label, onSubmit, initialSubmitted = false }) {
  const [hover, setHover] = useState(0)
  const [value, setValue] = useState(0)
  const [submitted, setSubmitted] = useState(initialSubmitted)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleClick(stars) {
    setValue(stars)
    setSubmitting(true)
    setError(null)
    const { error } = await onSubmit(stars)
    setSubmitting(false)
    if (error) {
      setError(error)
      return
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <p className="helper-text" style={{ marginBottom: 0 }}>
        {label}: rated {value > 0 ? `${value}/5` : 'already'} — thank you!
      </p>
    )
  }

  return (
    <div style={{ marginBottom: 'var(--space-2)' }}>
      <p style={{ marginBottom: 4, fontSize: 'var(--text-sm)' }}>{label}</p>
      {error && <div className="error-text">{error}</div>}
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={submitting}
            onClick={() => handleClick(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            style={{
              border: 'none',
              background: 'none',
              fontSize: 24,
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1,
              color: (hover || value) >= n ? 'var(--color-accent)' : 'var(--color-border)',
            }}
            aria-label={`${n} star`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  )
}
