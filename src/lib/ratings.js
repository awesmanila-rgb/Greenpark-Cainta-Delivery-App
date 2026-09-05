import { supabase } from './supabaseClient'

// Returns { [userId]: { avg: number, count: number } } for the given
// user ids. Aggregated client-side since Supabase-js doesn't do
// group-by aggregates without a view/RPC — fine at village scale.
export async function fetchRatingSummaries(userIds) {
  if (!userIds || userIds.length === 0) return {}

  const { data, error } = await supabase
    .from('ratings')
    .select('rated_user_id, stars')
    .in('rated_user_id', userIds)

  if (error || !data) return {}

  const sums = {}
  const counts = {}
  data.forEach((r) => {
    sums[r.rated_user_id] = (sums[r.rated_user_id] || 0) + r.stars
    counts[r.rated_user_id] = (counts[r.rated_user_id] || 0) + 1
  })

  const summaries = {}
  Object.keys(counts).forEach((id) => {
    summaries[id] = { avg: sums[id] / counts[id], count: counts[id] }
  })
  return summaries
}
