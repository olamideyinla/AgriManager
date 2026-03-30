/**
 * AdminContactsPage — view contact form submissions
 *
 * Required Supabase SQL (run once in SQL editor):
 *
 *   create policy "admin select" on contact_messages
 *     for select to authenticated
 *     using (auth.email() = 'olamide.eyinla@gmail.com');
 */

import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, RefreshCw, LogOut, Mail, Phone, MessageSquare, User, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../../core/config/supabase'
import { useAuthStore } from '../../stores/auth-store'

type ContactMessage = {
  id: string
  name: string | null
  email: string
  phone: string
  message: string
  created_at: string
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function MessageCard({ msg }: { msg: ContactMessage }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
              {(msg.name ?? msg.email).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">
                {msg.name ?? <span className="text-gray-400 font-normal italic">No name</span>}
              </p>
              <p className="text-xs text-gray-400">{timeAgo(msg.created_at)}</p>
            </div>
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">
            {formatDate(msg.created_at)}
          </span>
        </div>

        {/* Contact info */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
          <a
            href={`mailto:${msg.email}`}
            className="flex items-center gap-1.5 text-xs text-primary-600 hover:underline"
          >
            <Mail size={12} />
            {msg.email}
          </a>
          <a
            href={`tel:${msg.phone}`}
            className="flex items-center gap-1.5 text-xs text-gray-600 hover:underline"
          >
            <Phone size={12} />
            {msg.phone}
          </a>
        </div>

        {/* Message */}
        <div className="text-sm text-gray-700 leading-relaxed">
          {expanded ? (
            <>
              <p className="whitespace-pre-wrap">{msg.message}</p>
              <button
                onClick={() => setExpanded(false)}
                className="mt-2 text-xs text-primary-600 flex items-center gap-1 hover:underline"
              >
                <ChevronUp size={12} /> Show less
              </button>
            </>
          ) : (
            <>
              <p className="line-clamp-3">{msg.message}</p>
              {msg.message.length > 150 && (
                <button
                  onClick={() => setExpanded(true)}
                  className="mt-1 text-xs text-primary-600 flex items-center gap-1 hover:underline"
                >
                  <ChevronDown size={12} /> Show more
                </button>
              )}
            </>
          )}
        </div>

        {/* Mobile date */}
        <p className="mt-3 text-xs text-gray-400 sm:hidden flex items-center gap-1">
          <Calendar size={10} />
          {formatDate(msg.created_at)}
        </p>
      </div>

      {/* Reply shortcuts */}
      <div className="border-t border-gray-50 px-4 py-2.5 flex gap-3">
        <a
          href={`mailto:${msg.email}?subject=Re: Your AgriManagerX enquiry`}
          className="text-xs font-medium text-primary-600 hover:underline flex items-center gap-1"
        >
          <Mail size={11} /> Reply by email
        </a>
        <a
          href={`https://wa.me/${msg.phone.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(msg.name ?? '')}%2C%20thanks%20for%20contacting%20AgriManagerX!`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-[#25D366] hover:underline flex items-center gap-1"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          WhatsApp
        </a>
      </div>
    </div>
  )
}

export default function AdminContactsPage() {
  const navigate = useNavigate()
  const signOut = useAuthStore(s => s.signOut)

  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) { setError(err.message); setLoading(false); return }
        setMessages((data as ContactMessage[]) ?? [])
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [refreshKey])

  const filtered = useMemo(() => {
    if (!search.trim()) return messages
    const q = search.toLowerCase()
    return messages.filter(m =>
      m.email.toLowerCase().includes(q) ||
      m.phone.includes(q) ||
      (m.name ?? '').toLowerCase().includes(q) ||
      m.message.toLowerCase().includes(q)
    )
  }, [messages, search])

  const todayCount = useMemo(() => {
    const today = new Date().toDateString()
    return messages.filter(m => new Date(m.created_at).toDateString() === today).length
  }, [messages])

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Header */}
      <header className="bg-primary-700 text-white px-4 pt-safe-top">
        <div className="max-w-3xl mx-auto flex items-center gap-3 py-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-white/70 hover:text-white text-sm"
          >
            ← App
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg leading-tight">Admin</h1>
            <p className="text-xs text-primary-200">AgriManagerX dashboard</p>
          </div>
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => void signOut()}
            className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>

        {/* Tab nav */}
        <div className="max-w-3xl mx-auto flex gap-0 -mb-px">
          <button onClick={() => navigate('/admin/users')} className="px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-white/60 hover:text-white/80">
            Users
          </button>
          <div className="px-4 py-2.5 text-sm font-semibold border-b-2 border-white text-white">
            Contacts
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: messages.length, icon: <MessageSquare size={16} /> },
            { label: 'Today', value: todayCount, icon: <Calendar size={16} /> },
            { label: 'Contacts', value: new Set(messages.map(m => m.email)).size, icon: <User size={16} /> },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-3 text-center shadow-sm">
              <div className="text-primary-600 flex justify-center mb-1">{s.icon}</div>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, phone or message…"
            className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Results count when filtering */}
        {search && (
          <p className="text-xs text-gray-500 -mt-2">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"
          </p>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="w-6 h-6 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading messages…</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
            <p className="text-sm text-red-700 font-medium mb-1">Could not load messages</p>
            <p className="text-xs text-red-500 mb-3">{error}</p>
            <p className="text-xs text-gray-500">
              Make sure you've added the SELECT policy in Supabase:
            </p>
            <pre className="mt-2 text-left text-xs bg-red-100 rounded-lg p-3 overflow-x-auto text-red-700">{
`create policy "admin select" on contact_messages
  for select to authenticated
  using (auth.email() = 'olamide.eyinla@gmail.com');`
            }</pre>
            <button
              onClick={() => setRefreshKey(k => k + 1)}
              className="mt-3 text-sm text-primary-600 font-semibold hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-16">
            <MessageSquare size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              {search ? 'No messages match your search' : 'No messages yet'}
            </p>
          </div>
        )}

        {/* Message list */}
        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map(msg => (
              <MessageCard key={msg.id} msg={msg} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
