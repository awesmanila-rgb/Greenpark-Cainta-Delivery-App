import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'
import { ORDER_STATUS_LABELS } from '../lib/orderStatusLabels'

const NotificationsContext = createContext(null)
let nextLocalId = 1

function messageFor(row) {
  if (row.event_type === 'new_order') return 'New order received'
  const label = ORDER_STATUS_LABELS[row.status] ?? row.status
  return `Order update: ${label}`
}

export function NotificationsProvider({ children }) {
  const { profile } = useAuth()
  const [toasts, setToasts] = useState([])
  const [history, setHistory] = useState([])
  const channelRef = useRef(null)

  function addToast(item) {
    setToasts((t) => [...t, item])
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== item.id))
    }, 6000)
  }

  function dismissToast(id) {
    setToasts((t) => t.filter((x) => x.id !== id))
  }

  async function markAllRead() {
    setHistory((h) => h.map((x) => ({ ...x, read: true })))
    if (!profile?.id) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', profile.id).eq('read', false)
  }

  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    if (!profile?.id || !profile?.role) {
      setHistory([])
      return
    }

    // Load existing persisted notifications for this user.
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to load notifications', error)
          return
        }
        setHistory(
          data.map((row) => ({
            id: row.id,
            message: messageFor(row),
            orderId: row.order_id,
            read: row.read,
            at: new Date(row.created_at),
            persisted: true,
          }))
        )
      })

    const channel = supabase.channel(`notifications-${profile.id}`)

    // Persisted notifications, written server-side by the trigger.
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
      (payload) => {
        const row = payload.new
        const item = {
          id: row.id,
          message: messageFor(row),
          orderId: row.order_id,
          read: false,
          at: new Date(row.created_at),
          persisted: true,
        }
        setHistory((h) => [item, ...h].slice(0, 50))
        addToast(item)
      }
    )

    // Rider-only: unclaimed job became available. Inherently a
    // broadcast, not tied to one user, so it stays client-side/session-only —
    // see the note in notifications_setup.sql for why this isn't persisted.
    if (profile.role === 'rider') {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.new?.status === 'ready_for_pickup' && !payload.new?.rider_id) {
            const item = {
              id: `local-${nextLocalId++}`,
              message: 'New delivery job available',
              orderId: payload.new.id,
              read: false,
              at: new Date(),
              persisted: false,
            }
            setHistory((h) => [item, ...h].slice(0, 50))
            addToast(item)
          }
        }
      )
    }

    channel.subscribe()
    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [profile?.id, profile?.role])

  const unreadCount = history.filter((h) => !h.read).length

  const value = { toasts, history, unreadCount, dismissToast, markAllRead }

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used within a NotificationsProvider')
  return ctx
}
