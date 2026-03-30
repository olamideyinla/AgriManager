/**
 * AdminUsersPage — track all registered users across all organizations
 *
 * Required Supabase SQL (run once in SQL editor or apply migration):
 *
 *   create policy "admin select app_users" on app_users
 *     for select to authenticated
 *     using (auth.email() = 'olamide.eyinla@gmail.com');
 *
 *   create policy "admin select organizations" on organizations
 *     for select to authenticated
 *     using (auth.email() = 'olamide.eyinla@gmail.com');
 */

import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, RefreshCw, LogOut, Users, Building2,
  TrendingUp, Calendar, Shield, ChevronDown, ChevronUp,
} from 'lucide-react'
import { supabase } from '../../core/config/supabase'
import { useAuthStore } from '../../stores/auth-store'

type OrgRow = { id: string; name: string }

type AppUserRow = {
  id: string
  email: string | null
  full_name: string
  phone: string | null
  role: string
  is_active: boolean
  created_at: string
  organization_id: string
  organizations: OrgRow | null
}

const ROLE_COLORS: Record<string, string> = {
  owner:      'bg-amber-100 text-amber-800',
  manager:    'bg-blue-100 text-blue-800',
  supervisor: 'bg-purple-100 text-purple-800',
  worker:     'bg-green-100 text-green-800',
  viewer:     'bg-gray-100 text-gray-700',
}

const ROLES = ['owner', 'manager', 'supervisor', 'worker', 'viewer']

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function UserCard({ user, defaultOpen = false }: { user: AppUserRow; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const initials = user.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
          {initials}
        </div>

        {/* Name + org */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{user.full_name}</p>
          <p className="text-xs text-gray-400 truncate">
            {user.organizations?.name ?? 'No org'} · {timeAgo(user.created_at)}
          </p>
        </div>

        {/* Role badge + status */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[user.role] ?? 'bg-gray-100 text-gray-700'}`}>
            {user.role}
          </span>
          {!user.is_active && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-500">
              inactive
            </span>
          )}
          {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-50 px-4 pb-4 pt-3 space-y-2">
          {user.email && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="text-gray-400 w-12 flex-shrink-0">Email</span>
              <a href={`mailto:${user.email}`} className="text-primary-600 hover:underline truncate">{user.email}</a>
            </div>
          )}
          {user.phone && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="text-gray-400 w-12 flex-shrink-0">Phone</span>
              <a href={`tel:${user.phone}`} className="hover:underline">{user.phone}</a>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="text-gray-400 w-12 flex-shrink-0">Org</span>
            <span>{user.organizations?.name ?? '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="text-gray-400 w-12 flex-shrink-0">Joined</span>
            <span>{formatDate(user.created_at)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="text-gray-400 w-12 flex-shrink-0">ID</span>
            <span className="font-mono text-gray-400 truncate">{user.id}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminUsersPage() {
  const navigate = useNavigate()
  const signOut = useAuthStore(s => s.signOut)

  const [users, setUsers]         = useState<AppUserRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [search, setSearch]       = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [showInactive, setShowInactive] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    supabase
      .from('app_users')
      .select('id, email, full_name, phone, role, is_active, created_at, organization_id, organizations(id, name)')
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) { setError(err.message); setLoading(false); return }
        setUsers((data as AppUserRow[]) ?? [])
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [refreshKey])

  // Stats
  const now = Date.now()
  const weekAgo  = now - 7  * 24 * 60 * 60 * 1000
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000

  const stats = useMemo(() => ({
    total:    users.length,
    newWeek:  users.filter(u => new Date(u.created_at).getTime() > weekAgo).length,
    newMonth: users.filter(u => new Date(u.created_at).getTime() > monthAgo).length,
    orgs:     new Set(users.map(u => u.organization_id)).size,
  }), [users]) // eslint-disable-line react-hooks/exhaustive-deps

  // Filtered list
  const filtered = useMemo(() => {
    let list = users
    if (!showInactive) list = list.filter(u => u.is_active)
    if (roleFilter !== 'all') list = list.filter(u => u.role === roleFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(u =>
        u.full_name.toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q) ||
        (u.phone ?? '').includes(q) ||
        (u.organizations?.name ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [users, search, roleFilter, showInactive])

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Header */}
      <header className="bg-primary-700 text-white px-4 pt-safe-top">
        <div className="max-w-3xl mx-auto flex items-center gap-3 py-4">
          <button onClick={() => navigate('/dashboard')} className="text-white/70 hover:text-white text-sm">
            ← App
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg leading-tight">Admin</h1>
            <p className="text-xs text-primary-200">AgriManagerX dashboard</p>
          </div>
          <button onClick={() => setRefreshKey(k => k + 1)} className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white" title="Refresh">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => void signOut()} className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white" title="Sign out">
            <LogOut size={16} />
          </button>
        </div>

        {/* Tab nav */}
        <div className="max-w-3xl mx-auto flex gap-0 -mb-px">
          <div className="px-4 py-2.5 text-sm font-semibold border-b-2 border-white text-white">
            Users
          </div>
          <button onClick={() => navigate('/admin')} className="px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-white/60 hover:text-white/80">
            Contacts
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Users',   value: stats.total,    icon: <Users size={15} /> },
            { label: 'New (7 days)',  value: stats.newWeek,  icon: <TrendingUp size={15} /> },
            { label: 'New (30 days)', value: stats.newMonth, icon: <Calendar size={15} /> },
            { label: 'Orgs',         value: stats.orgs,     icon: <Building2 size={15} /> },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-3 text-center shadow-sm">
              <div className="text-primary-600 flex justify-center mb-1">{s.icon}</div>
              <p className="text-xl font-bold text-gray-900">{loading ? '—' : s.value}</p>
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
            placeholder="Search by name, email, phone or org…"
            className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${roleFilter === 'all' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
          >
            All roles
          </button>
          {ROLES.map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(roleFilter === r ? 'all' : r)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${roleFilter === r ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
            >
              {r}
            </button>
          ))}
          <button
            onClick={() => setShowInactive(v => !v)}
            className={`ml-auto px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${showInactive ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-white border border-gray-200 text-gray-500'}`}
          >
            <Shield size={11} />
            {showInactive ? 'Hiding inactive' : 'Show inactive'}
          </button>
        </div>

        {/* Result count */}
        {(search || roleFilter !== 'all') && !loading && (
          <p className="text-xs text-gray-500 -mt-2">
            {filtered.length} user{filtered.length !== 1 ? 's' : ''} match{filtered.length === 1 ? 'es' : ''} your filters
          </p>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="w-6 h-6 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading users…</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
            <p className="text-sm text-red-700 font-medium mb-1">Could not load users</p>
            <p className="text-xs text-red-500 mb-3">{error}</p>
            <p className="text-xs text-gray-500 mb-2">Make sure you've applied the admin policies in Supabase:</p>
            <pre className="text-left text-xs bg-red-100 rounded-lg p-3 overflow-x-auto text-red-700 whitespace-pre-wrap">{
`create policy "admin select app_users" on app_users
  for select to authenticated
  using (auth.email() = 'olamide.eyinla@gmail.com');

create policy "admin select organizations" on organizations
  for select to authenticated
  using (auth.email() = 'olamide.eyinla@gmail.com');`
            }</pre>
            <button onClick={() => setRefreshKey(k => k + 1)} className="mt-3 text-sm text-primary-600 font-semibold hover:underline">
              Try again
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-16">
            <Users size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              {search || roleFilter !== 'all' ? 'No users match your filters' : 'No users found'}
            </p>
          </div>
        )}

        {/* User list */}
        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map(u => <UserCard key={u.id} user={u} />)}
          </div>
        )}
      </div>
    </div>
  )
}
