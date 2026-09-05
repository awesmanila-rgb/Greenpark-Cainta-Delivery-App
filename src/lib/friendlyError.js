// Translates raw Supabase/Postgres errors into plain language.
// Falls back to the original message if nothing matches, so we
// never hide an error entirely — just make the common ones readable.

const PATTERNS = [
  {
    test: /users_phone_key/i,
    message: 'That phone number is already registered. Try logging in instead.',
  },
  {
    test: /duplicate key value violates unique constraint "users_pkey"/i,
    message: 'An account already exists for this email. Try logging in instead.',
  },
  {
    test: /user already registered|already been registered/i,
    message: 'An account already exists for this email. Try logging in instead.',
  },
  {
    test: /invalid login credentials/i,
    message: 'Incorrect email or password.',
  },
  {
    test: /email not confirmed/i,
    message: 'Please confirm your email before logging in — check your inbox for the confirmation link.',
  },
  {
    test: /password should be at least/i,
    message: 'Password must be at least 6 characters.',
  },
  {
    test: /rate limit/i,
    message: 'Too many attempts — please wait a moment and try again.',
  },
  {
    test: /ratings_order_id_rated_user_id_rated_by_key/i,
    message: 'You already rated this.',
  },
  {
    test: /network|fetch failed|failed to fetch/i,
    message: 'Connection issue — check your signal and try again. Your entries are still filled in.',
  },
]

export function friendlyError(error) {
  if (!error) return null
  const raw = error.message || String(error)
  const match = PATTERNS.find((p) => p.test.test(raw))
  return match ? match.message : raw
}
