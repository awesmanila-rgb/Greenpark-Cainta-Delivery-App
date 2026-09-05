import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'

const ACTIVE_STATUSES = ['rider_assigned', 'picked_up', 'out_for_delivery']
const MIN_SEND_INTERVAL_MS = 10000 // throttle writes — don't hammer the DB on every GPS tick

const LocationSharingContext = createContext(null)

export function LocationSharingProvider({ children }) {
  const { profile } = useAuth()
  const [hasActiveJob, setHasActiveJob] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const watchIdRef = useRef(null)
  const lastSentAtRef = useRef(0)
  const channelRef = useRef(null)

  // Track whether this rider currently has a job in an active state —
  // that's the only window we share location in.
  useEffect(() => {
    if (profile?.role !== 'rider' || !profile?.id) {
      setHasActiveJob(false)
      return
    }

    let cancelled = false

    async function checkActiveJob() {
      const { data } = await supabase
        .from('orders')
        .select('id')
        .eq('rider_id', profile.id)
        .in('status', ACTIVE_STATUSES)
        .limit(1)
      if (!cancelled) setHasActiveJob((data?.length ?? 0) > 0)
    }
    checkActiveJob()

    if (channelRef.current) supabase.removeChannel(channelRef.current)
    const channel = supabase
      .channel(`rider-active-check-${profile.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `rider_id=eq.${profile.id}` },
        () => checkActiveJob()
      )
      .subscribe()
    channelRef.current = channel

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [profile?.id, profile?.role])

  // Actually watch + upload position, only while hasActiveJob is true.
  useEffect(() => {
    if (!hasActiveJob || !profile?.id) {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
        setSharing(false)
      }
      return
    }

    if (!('geolocation' in navigator)) return

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now()
        if (now - lastSentAtRef.current < MIN_SEND_INTERVAL_MS) return
        lastSentAtRef.current = now

        supabase
          .from('rider_locations')
          .upsert({
            rider_id: profile.id,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            updated_at: new Date().toISOString(),
          })
          .then(({ error }) => {
            if (error) console.error('Failed to update location', error)
          })

        setSharing(true)
        setPermissionDenied(false)
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setPermissionDenied(true)
        setSharing(false)
      },
      { enableHighAccuracy: false, maximumAge: 15000, timeout: 20000 }
    )
    watchIdRef.current = watchId

    return () => {
      navigator.geolocation.clearWatch(watchId)
      watchIdRef.current = null
      setSharing(false)
    }
  }, [hasActiveJob, profile?.id])

  return (
    <LocationSharingContext.Provider value={{ hasActiveJob, sharing, permissionDenied }}>
      {children}
    </LocationSharingContext.Provider>
  )
}

export function useLocationSharing() {
  const ctx = useContext(LocationSharingContext)
  if (!ctx) throw new Error('useLocationSharing must be used within a LocationSharingProvider')
  return ctx
}
