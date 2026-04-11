/**
 * AdminPartnersPage — manage partner applications and status
 *
 * Required: RLS policies in 013_partners.sql give admin full access.
 */

import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  RefreshCw, LogOut, Users, CheckCircle, Clock, XCircle,
  ChevronRight, UserPlus, Star, Loader2, Search,
} from 'lucide-react'
import { supabase } from '../../core/config/supabase'
import { useAuthStore } from '../../stores/auth-store'
import type { PartnerStatus } from '../../shared/types/partner'

interface PartnerRow {
  id: string
  user_id: string
  full_name: string
  email: string
  phone: string | null
  country: string
  territory: string | null
  referral_code: string | null
  status: PartnerStatus
  tier: string
  notes: string | null
  created_at: string
  updated_at: string
  partner_type: string
}

interface AppUserRow {
  id: string
  email: string | null
  full_name: string
  phone: string | null
  role: string
}

const STATUS_COLORS: Record<PartnerStatus, string> = {
  pending:   'bg-amber-100 text-amber-700',
  approved:  'bg-green-100 text-green-700',
  suspended: 'bg-orange-100 text-orange-700',
  rejected:  'bg-red-100 text-red-700',
}

const STATUS_FILTERS: { label: string; value: PartnerStatus | 'all' | 'super' }[] = [
  { label: 'All',       value: 'all'       },
  { label: 'Pending',   value: 'pending'   },
  { label: 'Approved',  value: 'approved'  },
  { label: 'Super',     value: 'super'     },
  { label: 'Suspended', value: 'suspended' },
  { label: 'Rejected',  value: 'rejected'  },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

export default function AdminPartnersPage() {
  const navigate = useNavigate()
  const signOut  = useAuthStore(s => s.signOut)
  const [searchParams] = useSearchParams()

  const [partners, setPartners]     = useState<PartnerRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const initialFilter = (searchParams.get('filter') as PartnerStatus | 'all' | 'super') ?? 'all'
  const [filter, setFilter]         = useState<PartnerStatus | 'all' | 'super'>(initialFilter)
  const [refreshKey, setRefreshKey] = useState(0)
  const [updating, setUpdating]     = useState<string | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [addOpen, setAddOpen]       = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    supabase
      .from('partners')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) { setError(err.message); setLoading(false); return }
        setPartners((data as PartnerRow[]) ?? [])
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [refreshKey])

  const stats = useMemo(() => ({
    total:     partners.length,
    pending:   partners.filter(p => p.status === 'pending').length,
    approved:  partners.filter(p => p.status === 'approved').length,
    super:     partners.filter(p => p.partner_type === 'super').length,
    silver:    partners.filter(p => p.tier === 'silver').length,
    gold:      partners.filter(p => p.tier === 'gold').length,
  }), [partners])

  const displayed = useMemo(() => {
    if (filter === 'all')   return partners
    if (filter === 'super') return partners.filter(p => p.partner_type === 'super')
    return partners.filter(p => p.status === filter)
  }, [partners, filter])

  const updateStatus = async (id: string, status: PartnerStatus) => {
    setUpdating(id)
    setUpdateError(null)
    const { error: err } = await supabase
      .from('partners')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (err) {
      setUpdateError(`Failed to update: ${err.message}`)
    } else {
      setPartners(prev => prev.map(p => p.id === id ? { ...p, status } : p))
    }
    setUpdating(null)
  }

  const promoteToSuper = async (id: string) => {
    setUpdating(id + ':super')
    const { error: err } = await supabase
      .from('partners')
      .update({ partner_type: 'super' })
      .eq('id', id)
    if (!err) {
      setPartners(prev => prev.map(p => p.id === id ? { ...p, partner_type: 'super' } : p))
    }
    setUpdating(null)
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Header */}
      <header className="bg-primary-700 text-white px-4 pt-safe-top">
        <div className="max-w-3xl mx-auto flex items-center gap-3 py-4">
          <button onClick={() => navigate('/admin')} className="text-white/70 hover:text-white text-sm">
            ← Admin
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg">Partners</h1>
            <p className="text-xs text-primary-200">Commission sales partner management</p>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white"
            title="Assign user as partner"
          >
            <UserPlus size={16} />
          </button>
          <button onClick={() => setRefreshKey(k => k + 1)} className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white" title="Refresh">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => void signOut()} className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white" title="Sign out">
            <LogOut size={16} />
          </button>
        </div>

        {/* Tab nav */}
        <div className="max-w-3xl mx-auto flex gap-0 -mb-px overflow-x-auto scrollbar-hide">
          <button onClick={() => navigate('/admin')}              className="px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-white/60 hover:text-white/80 whitespace-nowrap">Contacts</button>
          <button onClick={() => navigate('/admin/users')}        className="px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-white/60 hover:text-white/80 whitespace-nowrap">Users</button>
          <div className="px-4 py-2.5 text-sm font-semibold border-b-2 border-white text-white whitespace-nowrap">Partners</div>
          <button onClick={() => navigate('/admin/performance')}  className="px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-white/60 hover:text-white/80 whitespace-nowrap">Performance</button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { label: 'Total',    value: stats.total,    icon: <Users size={15} /> },
            { label: 'Pending',  value: stats.pending,  icon: <Clock size={15} /> },
            { label: 'Approved', value: stats.approved, icon: <CheckCircle size={15} /> },
            { label: 'Super',    value: stats.super,    icon: <span className="text-xs">⭐</span> },
            { label: 'Silver',   value: stats.silver,   icon: <span className="text-xs">🥈</span> },
            { label: 'Gold',     value: stats.gold,     icon: <span className="text-xs">🥇</span> },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-3 text-center shadow-sm">
              <div className="text-primary-600 flex justify-center mb-1">{s.icon}</div>
              <p className="text-xl font-bold text-gray-900">{loading ? '—' : s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Update error banner */}
        {updateError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-red-700">{updateError}</p>
            <button onClick={() => setUpdateError(null)} className="text-red-400 hover:text-red-600 text-lg leading-none ml-3">✕</button>
          </div>
        )}

        {/* Status filter */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f.value ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="w-6 h-6 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading partners…</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
            <p className="text-sm text-red-700 font-medium mb-2">Could not load partners</p>
            <p className="text-xs text-red-500 mb-3">{error}</p>
            <button onClick={() => setRefreshKey(k => k + 1)} className="text-sm text-primary-600 font-semibold hover:underline">
              Try again
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && displayed.length === 0 && (
          <div className="text-center py-16">
            <Users size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No partners found</p>
          </div>
        )}

        {/* Partner cards */}
        {!loading && !error && displayed.length > 0 && (
          <div className="space-y-2">
            {displayed.map(p => (
              <div key={p.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                {/* Summary row */}
                <div
                  className="px-4 py-3.5 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => navigate(`/admin/partners/${p.id}`)}
                >
                  <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {p.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{p.full_name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {p.country}{p.territory ? ` · ${p.territory}` : ''} · {timeAgo(p.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {p.partner_type === 'super' && (
                      <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full font-bold">Super</span>
                    )}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[p.status]}`}>
                      {p.status}
                    </span>
                    <ChevronRight size={14} className="text-gray-400" />
                  </div>
                </div>

                {/* Pending: approve / reject */}
                {p.status === 'pending' && (
                  <div className="px-4 pb-3.5">
                    <div className="flex gap-2">
                      <button
                        onClick={() => void updateStatus(p.id, 'approved')}
                        disabled={updating === p.id}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white text-xs font-semibold py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
                      >
                        {updating === p.id
                          ? <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                          : <CheckCircle size={13} />
                        }
                        Approve
                      </button>
                      <button
                        onClick={() => void updateStatus(p.id, 'rejected')}
                        disabled={updating === p.id}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-semibold py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-60"
                      >
                        <XCircle size={13} /> Reject
                      </button>
                    </div>
                  </div>
                )}

                {/* Approved: suspend + promote to super */}
                {p.status === 'approved' && (
                  <div className="px-4 pb-3.5 flex items-center gap-4">
                    <button
                      onClick={() => void updateStatus(p.id, 'suspended')}
                      disabled={!!updating}
                      className="text-xs text-orange-600 font-medium hover:underline disabled:opacity-60"
                    >
                      Suspend
                    </button>
                    {p.partner_type === 'standard' && (
                      <button
                        onClick={e => { e.stopPropagation(); void promoteToSuper(p.id) }}
                        disabled={updating === p.id + ':super'}
                        className="flex items-center gap-1 text-xs text-purple-600 font-semibold hover:underline disabled:opacity-60"
                      >
                        {updating === p.id + ':super'
                          ? <Loader2 size={11} className="animate-spin" />
                          : <Star size={11} />
                        }
                        Make Super Partner
                      </button>
                    )}
                  </div>
                )}

                {/* Suspended: reinstate */}
                {p.status === 'suspended' && (
                  <div className="px-4 pb-3.5">
                    <button
                      onClick={() => void updateStatus(p.id, 'approved')}
                      disabled={!!updating}
                      className="text-xs text-green-600 font-medium hover:underline disabled:opacity-60"
                    >
                      Reinstate partner
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Partner panel */}
      {addOpen && (
        <AddPartnerPanel
          onClose={() => setAddOpen(false)}
          onCreated={() => { setAddOpen(false); setRefreshKey(k => k + 1) }}
        />
      )}
    </div>
  )
}

// ── Add Partner Sheet ──────────────────────────────────────────────────────────

function AddPartnerPanel({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [search,    setSearch]    = useState('')
  const [users,     setUsers]     = useState<AppUserRow[]>([])
  const [searching, setSearching] = useState(false)
  const [selected,  setSelected]  = useState<AppUserRow | null>(null)
  const [country,   setCountry]   = useState('')
  const [territory, setTerritory] = useState('')
  const [creating,  setCreating]  = useState(false)
  const [partnerType, setPartnerType] = useState<'standard' | 'super'>('standard')
  const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)

  const searchUsers = async () => {
    const q = search.trim()
    if (q.length < 2) return
    setSearching(true)
    const { data } = await supabase
      .from('app_users')
      .select('id, email, full_name, phone, role')
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(8)
    setUsers((data ?? []) as AppUserRow[])
    setSearching(false)
  }

  const createPartner = async () => {
    if (!selected || !country.trim()) return
    setCreating(true)
    setMsg(null)

    // Check for existing partner account
    const { data: existing } = await supabase
      .from('partners')
      .select('id')
      .eq('user_id', selected.id)
      .maybeSingle()

    if (existing) {
      setMsg({ kind: 'error', text: 'This user already has a partner account.' })
      setCreating(false)
      return
    }

    // Step 1 — insert with status='pending'
    const { data: inserted, error: insertErr } = await supabase
      .from('partners')
      .insert({
        user_id:      selected.id,
        full_name:    selected.full_name,
        email:        selected.email ?? '',
        phone:        selected.phone ?? null,
        country:      country.trim(),
        territory:    territory.trim() || null,
        status:       'pending',
        tier:         'standard',
        partner_type: partnerType,
      })
      .select('id')
      .single()

    if (insertErr || !inserted) {
      setMsg({ kind: 'error', text: insertErr?.message ?? 'Insert failed' })
      setCreating(false)
      return
    }

    const newId = (inserted as { id: string }).id

    // Step 2 — update to 'approved' → triggers referral_code generation
    const { error: approveErr } = await supabase
      .from('partners')
      .update({ status: 'approved' })
      .eq('id', newId)

    if (approveErr) {
      setMsg({ kind: 'error', text: `Created but approval failed: ${approveErr.message}` })
      setCreating(false)
      return
    }

    // Step 3 — if super, promote (triggers recruitment_code generation)
    if (partnerType === 'super') {
      await supabase.from('partners').update({ partner_type: 'super' }).eq('id', newId)
    }

    onCreated()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <h2 className="font-bold text-gray-900 text-base">Assign User as Partner</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4">
          {!selected ? (
            <>
              <p className="text-xs text-gray-500">
                Search for an existing registered user and create a partner account for them directly — no application form required.
              </p>

              {/* Search */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && void searchUsers()}
                    placeholder="Name or email…"
                    className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    autoFocus
                  />
                </div>
                <button
                  onClick={() => void searchUsers()}
                  disabled={searching || search.trim().length < 2}
                  className="bg-primary-600 text-white text-sm font-semibold px-4 rounded-xl hover:bg-primary-700 disabled:opacity-50 whitespace-nowrap"
                >
                  {searching ? '…' : 'Search'}
                </button>
              </div>

              {/* Results */}
              {users.length > 0 && (
                <div className="space-y-2">
                  {users.map(u => (
                    <button
                      key={u.id}
                      onClick={() => setSelected(u)}
                      className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-primary-50 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {u.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{u.full_name}</p>
                        <p className="text-xs text-gray-400 truncate">{u.email ?? '—'} · {u.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {users.length === 0 && search.trim().length >= 2 && !searching && (
                <p className="text-sm text-gray-400 text-center py-6">No users found for "{search}"</p>
              )}
            </>
          ) : (
            <>
              {/* Selected user card */}
              <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-xl border border-primary-200">
                <div className="w-9 h-9 rounded-full bg-primary-200 text-primary-800 flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {selected.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-primary-900 text-sm">{selected.full_name}</p>
                  <p className="text-xs text-primary-600">{selected.email} · {selected.role}</p>
                </div>
                <button
                  onClick={() => { setSelected(null); setUsers([]) }}
                  className="text-xs text-gray-400 hover:text-gray-600 font-medium"
                >
                  Change
                </button>
              </div>

              {/* Partner type */}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Partner Type</p>
                <div className="flex gap-2">
                  {(['standard', 'super'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setPartnerType(t)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors capitalize ${
                        partnerType === t
                          ? t === 'super' ? 'bg-purple-600 border-purple-600 text-white' : 'bg-primary-600 border-primary-600 text-white'
                          : 'bg-white border-gray-200 text-gray-600'
                      }`}
                    >
                      {t === 'super' ? '⭐ Super Partner' : 'Standard Partner'}
                    </button>
                  ))}
                </div>
                {partnerType === 'super' && (
                  <p className="text-xs text-purple-600 mt-1.5">
                    Super Partners earn 10% override commissions on sub-partners they recruit.
                  </p>
                )}
              </div>

              {/* Country */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Country <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  placeholder="e.g. Nigeria"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  autoFocus
                />
              </div>

              {/* Territory */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Territory / State <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={territory}
                  onChange={e => setTerritory(e.target.value)}
                  placeholder="e.g. Lagos"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>

              {msg && (
                <p className={`text-xs rounded-lg px-3 py-2 ${msg.kind === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  {msg.text}
                </p>
              )}

              <button
                onClick={() => void createPartner()}
                disabled={creating || !country.trim()}
                className="w-full bg-primary-600 text-white font-bold py-3 rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
              >
                {creating
                  ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Creating…</>
                  : 'Create Partner Account'
                }
              </button>
              <p className="text-xs text-gray-400 text-center pb-2">
                Account will be approved immediately. A referral code is auto-generated.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
