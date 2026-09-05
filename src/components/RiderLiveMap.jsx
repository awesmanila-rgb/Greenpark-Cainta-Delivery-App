import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabaseClient'

// Leaflet's default marker icons reference image files by URL that
// don't resolve correctly through Vite's bundler — point them at the
// CDN copies instead of hand-rolling icon assets for this one use.
const riderIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

function timeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ago`
}

export default function RiderLiveMap({ riderId }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [noLocationYet, setNoLocationYet] = useState(false)

  function upsertPosition(lat, lng, updatedAt) {
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, { attributionControl: true }).setView([lat, lng], 16)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current)
      markerRef.current = L.marker([lat, lng], { icon: riderIcon }).addTo(mapRef.current)
    } else {
      markerRef.current.setLatLng([lat, lng])
      mapRef.current.panTo([lat, lng])
    }
    setLastUpdated(new Date(updatedAt))
    setNoLocationYet(false)
  }

  useEffect(() => {
    let cancelled = false

    supabase
      .from('rider_locations')
      .select('lat, lng, updated_at')
      .eq('rider_id', riderId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        if (data) upsertPosition(data.lat, data.lng, data.updated_at)
        else setNoLocationYet(true)
      })

    const channel = supabase
      .channel(`rider-location-${riderId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rider_locations', filter: `rider_id=eq.${riderId}` },
        (payload) => {
          if (payload.new) upsertPosition(payload.new.lat, payload.new.lng, payload.new.updated_at)
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [riderId])

  if (noLocationYet) {
    return (
      <p className="helper-text" style={{ marginBottom: 0 }}>
        Waiting for your rider's location to come through…
      </p>
    )
  }

  return (
    <div>
      <div
        ref={mapContainerRef}
        style={{ width: '100%', height: 220, borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}
      />
      {lastUpdated && (
        <p className="helper-text" style={{ marginTop: 'var(--space-2)', marginBottom: 0 }}>
          Updated {timeAgo(lastUpdated)}
        </p>
      )}
    </div>
  )
}
