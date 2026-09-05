import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)
const PENDING_REG_KEY = 'sakto_pending_registration'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null) // row from `users` table
  const [loading, setLoading] = useState(true)
  const creatingProfile = useRef(false)

  async function loadProfile(userId) {
    if (!userId) {
      setProfile(null)
      return null
    }
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (error) {
      console.error('Failed to load profile', error)
      setProfile(null)
      return null
    }
    setProfile(data)
    return data
  }

  // Writes the `users` row + role-specific row for an already-created
  // auth user. Shared by the immediate-session path (email confirmation
  // off) and the deferred path (email confirmation on, run after the
  // user confirms and logs in for the first time).
  async function createProfileRows(userId, reg) {
    const { error: profileError } = await supabase.from('users').insert({
      id: userId,
      name: reg.name,
      phone: reg.phone,
      role: reg.role,
      zone: reg.zone,
      landmark: reg.landmark,
      status: 'pending',
    })
    if (profileError) return { error: profileError }

    if (reg.role === 'merchant') {
      const { error: merchantError } = await supabase.from('merchants').insert({
        user_id: userId,
        shop_name: reg.roleDetails.shopName,
        zone: reg.zone,
        landmark: reg.landmark,
        gcash_number: reg.roleDetails.gcashNumber || null,
        operating_hours: reg.roleDetails.operatingHours || null,
      })
      if (merchantError) return { error: merchantError }
    }

    if (reg.role === 'rider') {
      const { error: riderError } = await supabase.from('riders').insert({
        user_id: userId,
        vehicle_type: reg.roleDetails.vehicleType,
      })
      if (riderError) return { error: riderError }
    }

    return { error: null }
  }

  // If someone registered while email confirmation was required, their
  // `users` row wasn't created yet (no session existed at signUp time,
  // so RLS blocked the insert). We stashed their form data — finish the
  // job now that they have a real session.
  async function finishDeferredRegistrationIfAny(userId, userEmail) {
    const raw = sessionStorage.getItem(PENDING_REG_KEY)
    if (!raw) return
    let reg
    try {
      reg = JSON.parse(raw)
    } catch {
      sessionStorage.removeItem(PENDING_REG_KEY)
      return
    }
    if (reg.email !== userEmail) return // not this signup

    creatingProfile.current = true
    const { error } = await createProfileRows(userId, reg)
    creatingProfile.current = false
    sessionStorage.removeItem(PENDING_REG_KEY)
    if (error) {
      console.error('Deferred profile creation failed', error)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        await finishDeferredRegistrationIfAny(session.user.id, session.user.email)
        await loadProfile(session.user.id)
      }
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        if (session?.user) {
          await finishDeferredRegistrationIfAny(session.user.id, session.user.email)
          await loadProfile(session.user.id)
        } else {
          setProfile(null)
        }
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  async function checkPhoneAvailable(phone) {
    const { data, error } = await supabase.rpc('is_phone_available', { p_phone: phone })
    if (error) {
      // If the check itself fails (e.g. function not deployed yet),
      // don't block registration on it — just proceed.
      console.warn('Phone availability check failed', error)
      return true
    }
    return data
  }

  async function registerUser({ email, password, name, phone, role, zone, landmark, roleDetails }) {
    const phoneOk = await checkPhoneAvailable(phone)
    if (!phoneOk) {
      return {
        error: { message: 'That phone number is already registered. Try logging in instead.' },
      }
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })
    if (authError) return { error: authError }

    const userId = authData.user?.id
    if (!userId) {
      return { error: { message: 'Sign up succeeded but no user id was returned.' } }
    }

    const reg = { email, name, phone, role, zone, landmark, roleDetails }

    // No session means Supabase is requiring email confirmation before
    // this user can authenticate — RLS will block writing the profile
    // row right now (auth.uid() would be null). Defer it: stash the
    // form data and finish once they confirm + log in.
    if (!authData.session) {
      sessionStorage.setItem(PENDING_REG_KEY, JSON.stringify(reg))
      return { error: null, needsEmailConfirmation: true }
    }

    const { error: rowsError } = await createProfileRows(userId, reg)
    if (rowsError) {
      return {
        error: {
          message:
            'Your account was created but we could not finish setting up your profile. Please contact support — this is not something you can retry safely.',
          cause: rowsError,
        },
      }
    }

    await loadProfile(userId)
    return { error: null, needsEmailConfirmation: false }
  }

  async function login({ email, password }) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function logout() {
    await supabase.auth.signOut()
    setProfile(null)
  }

  async function requestPasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error }
  }

  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error }
  }

  const value = {
    session,
    profile,
    loading,
    isAuthenticated: !!session,
    role: profile?.role ?? null,
    status: profile?.status ?? null,
    registerUser,
    login,
    logout,
    requestPasswordReset,
    updatePassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
