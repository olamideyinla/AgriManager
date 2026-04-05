/**
 * AdminPartnersPage — manage partner applications and status
 *
 * Required: RLS policies in 013_partners.sql give admin full access.
 */

import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  RefreshCw, LogOut, Users, CheckCircle, Clock, XCircle,
  ChevronRight,
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
}

const STATUS_COLORS: Record<PartnerStatus, string> = {
  pending:   'bg-amber-100 text-amber-700',
  approved:  'bg-green-100 text-green-700',
  suspended: 'bg-orange-100 text-orange-700',
  rejected:  'bg-red-100 text-red-700',
}

const STATUS_FILTERS: { label: string; value: PartnerStatus | 'all' }[] = [
  { label: 'All',       value: 'all'       },
  { label: 'Pending',   value: 'pending'   },
  { label: 'Approved',  value: 'approved'  },
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

  const [partners, setPartners]   = useState<PartnerRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [filter, setFilter]       = useState<PartnerStatus | 'all'>('all')
  const [refreshKey, setRefreshKey] = useState(0)
  const [updating, setUpdating]   = useState<string | null>(null)

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
    silver:    partners.filter(p => p.tier === 'silver').length,
    gold:      partners.filter(p => p.tier === 'gold').length,
  }), [partners])

  const displayed = useMemo(() => (
    filter === 'all' ? partners : partners.filter(p => p.status === filter)
  ), [partners, filter])

  const updateStatus = async (id: string, status: PartnerStatus) => {
    setUpdating(id)
    const { error: err } = await supabase
      .from('partners')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (!err) {
      setPartners(prev => prev.map(p => p.id === id ? { ...p, status } : p))
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
          <button onClick={() => setRefreshKey(k => k + 1)} className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white" title="Refresh">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => void signOut()} className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white" title="Sign out">
            <LogOut size={16} />
          </button>
        </div>

        {/* Tab nav */}
        <div className="max-w-3xl mx-auto flex gap-0 -mb-px overflow-x-auto scrollbar-hide">
          <button onClick={() => navigate('/admin')} className="px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-white/60 hover:text-white/80 whitespace-nowrap">
            Contacts
          </button>
          <button onClick={() => navigate('/admin/users')} className="px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-white/60 hover:text-white/80 whitespace-nowrap">
            Users
          </button>
          <div className="px-4 py-2.5 text-sm font-semibold border-b-2 border-white text-white whitespace-nowrap">
            Partners
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total',    value: stats.total,    icon: <Users size={15} /> },
            { label: 'Pending',  value: stats.pending,  icon: <Clock size={15} /> },
            { label: 'Approved', value: stats.approved, icon: <CheckCircle size={15} /> },
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
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {p.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{p.full_name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {p.country}{p.territory ? ` · ${p.territory}` : ''} · Applied {timeAgo(p.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[p.status]}`}>
                      {p.status}
                    </span>
                    <ChevronRight size={14} className="text-gray-400" />
                  </div>
                </div>

                {/* Action buttons for pending */}
                {p.status === 'pending' && (
                  <div className="flex gap-2 px-4 pb-3.5">
                    <button
                      onClick={() => void updateStatus(p.id, 'approved')}
                      disabled={updating === p.id}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white text-xs font-semibold py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
                    >
                      <CheckCircle size={13} />
                      Approve
                    </button>
                    <button
                      onClick={() => void updateStatus(p.id, 'rejected')}
                      disabled={updating === p.id}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-semibold py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-60"
                    >
                      <XCircle size={13} />
                      Reject
                    </button>
                  </div>
                )}

                {/* Suspend/reinstate for approved */}
                {p.status === 'approved' && (
                  <div className="px-4 pb-3.5">
                    <button
                      onClick={() => void updateStatus(p.id, 'suspended')}
                      disabled={updating === p.id}
                      className="text-xs text-orange-600 font-medium hover:underline disabled:opacity-60"
                    >
                      Suspend partner
                    </button>
                  </div>
                )}

                {p.status === 'suspended' && (
                  <div className="px-4 pb-3.5">
                    <button
                      onClick={() => void updateStatus(p.id, 'approved')}
                      disabled={updating === p.id}
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
    </div>
  )
}
