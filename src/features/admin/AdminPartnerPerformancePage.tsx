/**
 * AdminPartnerPerformancePage — financial & recruitment leaderboard for all partners
 */

import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  RefreshCw, LogOut, TrendingUp, Users, DollarSign,
  CheckCircle, ChevronRight, ArrowUpDown,
} from 'lucide-react'
import { supabase } from '../../core/config/supabase'
import { useAuthStore } from '../../stores/auth-store'
import type { PartnerStatus } from '../../shared/types/partner'

interface PartnerRow {
  id: string
  full_name: string
  country: string
  territory: string | null
  status: PartnerStatus
  tier: string
  partner_type: string
  parent_partner_id: string | null
  created_at: string
}

interface ReferralRow {
  id: string
  partner_id: string
  status: string
  created_at: string
}

interface CommissionRow {
  id: string
  partner_id: string
  amount: number
  status: string
  commission_type: string
  created_at: string
}

type Period  = 'all' | 'month' | 'quarter'
type SortKey = 'earned' | 'referrals' | 'conversion' | 'paid'

interface PartnerMetrics {
  partner: PartnerRow
  referralTotal: number
  referralConverted: number
  conversionRate: number
  totalEarned: number
  pendingAmount: number
  approvedAmount: number
  paidAmount: number
  overrideEarned: number
  subPartnerCount: number
}

const STATUS_COLORS: Record<PartnerStatus, string> = {
  pending:   'bg-amber-100 text-amber-700',
  approved:  'bg-green-100 text-green-700',
  suspended: 'bg-orange-100 text-orange-700',
  rejected:  'bg-red-100 text-red-700',
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('en-NG', { maximumFractionDigits: 0 })
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function MetricCell({ label, value, sub, highlight, purple }: {
  label: string; value: string; sub: string; highlight?: boolean; purple?: boolean
}) {
  return (
    <div className={`rounded-xl p-2 ${purple ? 'bg-purple-50' : highlight ? 'bg-green-50' : 'bg-gray-50'}`}>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className={`text-xs font-bold leading-tight ${purple ? 'text-purple-700' : highlight ? 'text-green-700' : 'text-gray-800'}`}>
        {value}
      </p>
      <p className="text-xs text-gray-400 leading-tight">{sub}</p>
    </div>
  )
}

export default function AdminPartnerPerformancePage() {
  const navigate = useNavigate()
  const signOut  = useAuthStore(s => s.signOut)

  const [partners,    setPartners]    = useState<PartnerRow[]>([])
  const [referrals,   setReferrals]   = useState<ReferralRow[]>([])
  const [commissions, setCommissions] = useState<CommissionRow[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [period,      setPeriod]      = useState<Period>('all')
  const [sortKey,     setSortKey]     = useState<SortKey>('earned')
  const [refreshKey,  setRefreshKey]  = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      supabase
        .from('partners')
        .select('id, full_name, country, territory, status, tier, partner_type, parent_partner_id, created_at')
        .order('created_at', { ascending: false }),
      supabase.from('partner_referrals').select('id, partner_id, status, created_at'),
      supabase.from('partner_commissions').select('id, partner_id, amount, status, commission_type, created_at'),
    ]).then(([pRes, rRes, cRes]) => {
      if (cancelled) return
      if (pRes.error || rRes.error || cRes.error) {
        setError(pRes.error?.message ?? rRes.error?.message ?? cRes.error?.message ?? 'Unknown error')
        setLoading(false)
        return
      }
      setPartners((pRes.data ?? []) as PartnerRow[])
      setReferrals((rRes.data ?? []) as ReferralRow[])
      setCommissions((cRes.data ?? []) as CommissionRow[])
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [refreshKey])

  const cutoff = useMemo<string | null>(() => {
    if (period === 'month')   return new Date(Date.now() - 30 * 86_400_000).toISOString()
    if (period === 'quarter') return new Date(Date.now() - 90 * 86_400_000).toISOString()
    return null
  }, [period])

  const filteredRefs  = useMemo(() => cutoff ? referrals.filter(r   => r.created_at   >= cutoff!) : referrals,   [referrals,   cutoff])
  const filteredComms = useMemo(() => cutoff ? commissions.filter(c => c.created_at >= cutoff!) : commissions, [commissions, cutoff])

  const metrics = useMemo<PartnerMetrics[]>(() => {
    // Build sub-partner count map
    const subMap = new Map<string, number>()
    for (const p of partners) {
      if (p.parent_partner_id) {
        subMap.set(p.parent_partner_id, (subMap.get(p.parent_partner_id) ?? 0) + 1)
      }
    }

    return partners.map(p => {
      const pRefs  = filteredRefs.filter(r  => r.partner_id  === p.id)
      const pComms = filteredComms.filter(c => c.partner_id === p.id)

      const converted      = pRefs.filter(r => r.status === 'converted').length
      const totalEarned    = pComms.reduce((s, c) => s + c.amount, 0)
      const pendingAmount  = pComms.filter(c => c.status === 'pending').reduce((s, c) => s + c.amount, 0)
      const approvedAmount = pComms.filter(c => c.status === 'approved').reduce((s, c) => s + c.amount, 0)
      const paidAmount     = pComms.filter(c => c.status === 'paid').reduce((s, c) => s + c.amount, 0)
      const overrideEarned = pComms.filter(c => c.commission_type === 'override').reduce((s, c) => s + c.amount, 0)

      return {
        partner: p,
        referralTotal:     pRefs.length,
        referralConverted: converted,
        conversionRate:    pRefs.length > 0 ? Math.round(converted / pRefs.length * 100) : 0,
        totalEarned,
        pendingAmount,
        approvedAmount,
        paidAmount,
        overrideEarned,
        subPartnerCount: subMap.get(p.id) ?? 0,
      }
    })
  }, [partners, filteredRefs, filteredComms])

  const sorted = useMemo(() => {
    const active = metrics.filter(m => m.partner.status !== 'rejected')
    return [...active].sort((a, b) => {
      if (sortKey === 'earned')     return b.totalEarned    - a.totalEarned
      if (sortKey === 'referrals')  return b.referralTotal  - a.referralTotal
      if (sortKey === 'conversion') return b.conversionRate - a.conversionRate
      if (sortKey === 'paid')       return b.paidAmount     - a.paidAmount
      return 0
    })
  }, [metrics, sortKey])

  const totals = useMemo(() => ({
    total:      partners.length,
    approved:   partners.filter(p => p.status === 'approved').length,
    superCount: partners.filter(p => p.partner_type === 'super').length,
    referrals:  filteredRefs.length,
    converted:  filteredRefs.filter(r => r.status === 'converted').length,
    earned:     filteredComms.reduce((s, c) => s + c.amount, 0),
    paid:       filteredComms.filter(c => c.status === 'paid').reduce((s, c) => s + c.amount, 0),
    override:   filteredComms.filter(c => c.commission_type === 'override').reduce((s, c) => s + c.amount, 0),
  }), [partners, filteredRefs, filteredComms])

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Header */}
      <header className="bg-primary-700 text-white px-4 pt-safe-top">
        <div className="max-w-3xl mx-auto flex items-center gap-3 py-4">
          <button onClick={() => navigate('/admin/partners')} className="text-white/70 hover:text-white text-sm">
            ← Partners
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg">Performance</h1>
            <p className="text-xs text-primary-200">Financial &amp; recruitment metrics</p>
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
          <button onClick={() => navigate('/admin')}          className="px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-white/60 hover:text-white/80 whitespace-nowrap">Contacts</button>
          <button onClick={() => navigate('/admin/users')}    className="px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-white/60 hover:text-white/80 whitespace-nowrap">Users</button>
          <button onClick={() => navigate('/admin/partners')} className="px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-white/60 hover:text-white/80 whitespace-nowrap">Partners</button>
          <div className="px-4 py-2.5 text-sm font-semibold border-b-2 border-white text-white whitespace-nowrap">Performance</div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* Period filter */}
        <div className="flex gap-2 flex-wrap">
          {([
            { label: 'All Time',   value: 'all'     },
            { label: 'This Month', value: 'month'   },
            { label: 'Last 90d',   value: 'quarter' },
          ] as { label: string; value: Period }[]).map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${period === p.value ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Overview stats */}
        {!loading && !error && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Active Partners', value: totals.approved,   icon: <Users size={15} />,          color: 'text-primary-600' },
                { label: 'Super Partners',  value: totals.superCount, icon: <span>⭐</span>,               color: 'text-purple-600'  },
                { label: 'Total Referrals', value: totals.referrals,  icon: <TrendingUp size={15} />,     color: 'text-blue-600'    },
                { label: 'Converted',       value: totals.converted,  icon: <CheckCircle size={15} />,    color: 'text-green-600'   },
              ].map(s => (
                <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-3 text-center shadow-sm">
                  <div className={`flex justify-center mb-1 ${s.color}`}>{s.icon}</div>
                  <p className="text-xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-primary-50 border border-primary-200 rounded-2xl p-3 text-center">
                <p className="text-lg font-bold text-primary-800">₦{fmt(totals.earned)}</p>
                <p className="text-xs text-primary-600">Total Commissions</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-2xl p-3 text-center">
                <p className="text-lg font-bold text-green-800">₦{fmt(totals.paid)}</p>
                <p className="text-xs text-green-600">Paid Out</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3 text-center">
                <p className="text-lg font-bold text-purple-800">₦{fmt(totals.override)}</p>
                <p className="text-xs text-purple-600">Override Earned</p>
              </div>
            </div>

            {/* Conversion rate banner */}
            {totals.referrals > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-900">Overall Conversion Rate</p>
                  <p className="text-xs text-blue-600">{totals.converted} paid out of {totals.referrals} referrals</p>
                </div>
                <p className="text-2xl font-extrabold text-blue-700">
                  {Math.round(totals.converted / totals.referrals * 100)}%
                </p>
              </div>
            )}
          </>
        )}

        {/* Sort controls */}
        {!loading && !error && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <ArrowUpDown size={11} /> Sort by:
            </span>
            {([
              { label: 'Earnings',   value: 'earned'     },
              { label: 'Referrals',  value: 'referrals'  },
              { label: 'Conversion', value: 'conversion' },
              { label: 'Paid Out',   value: 'paid'       },
            ] as { label: string; value: SortKey }[]).map(s => (
              <button
                key={s.value}
                onClick={() => setSortKey(s.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${sortKey === s.value ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="w-6 h-6 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading performance data…</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
            <p className="text-sm text-red-700 font-medium mb-2">Could not load data</p>
            <p className="text-xs text-red-500 mb-3">{error}</p>
            <button onClick={() => setRefreshKey(k => k + 1)} className="text-sm text-primary-600 font-semibold hover:underline">
              Try again
            </button>
          </div>
        )}

        {/* Leaderboard */}
        {!loading && !error && sorted.length === 0 && (
          <div className="text-center py-16">
            <DollarSign size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No partner data yet</p>
          </div>
        )}

        {!loading && !error && sorted.length > 0 && (
          <div className="space-y-3">
            {sorted.map((m, rank) => (
              <div
                key={m.partner.id}
                className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/admin/partners/${m.partner.id}`)}
              >
                <div className="px-4 py-4 flex items-start gap-3">
                  {/* Rank badge */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1 ${
                    rank === 0 ? 'bg-amber-400 text-white' :
                    rank === 1 ? 'bg-gray-300 text-gray-700' :
                    rank === 2 ? 'bg-amber-700/70 text-white' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {rank + 1}
                  </div>

                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    m.partner.partner_type === 'super' ? 'bg-purple-100 text-purple-700' : 'bg-primary-100 text-primary-700'
                  }`}>
                    {initials(m.partner.full_name)}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    {/* Name row */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <span className="font-semibold text-gray-900 text-sm">{m.partner.full_name}</span>
                      {m.partner.partner_type === 'super' && (
                        <span className="text-xs bg-purple-500 text-white px-1.5 py-0.5 rounded-full font-bold">Super</span>
                      )}
                      {m.partner.tier !== 'standard' && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold capitalize">{m.partner.tier}</span>
                      )}
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full capitalize ${STATUS_COLORS[m.partner.status]}`}>
                        {m.partner.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2.5">
                      {m.partner.country}{m.partner.territory ? ` · ${m.partner.territory}` : ''}
                    </p>

                    {/* Metrics */}
                    <div className={`grid gap-2 ${m.partner.partner_type === 'super' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
                      <MetricCell
                        label="Referrals"
                        value={`${m.referralTotal} referred`}
                        sub={`${m.referralConverted} converted (${m.conversionRate}%)`}
                      />
                      <MetricCell
                        label="Total Earned"
                        value={`₦${fmt(m.totalEarned)}`}
                        sub={`₦${fmt(m.paidAmount)} paid out`}
                        highlight
                      />
                      {m.partner.partner_type === 'super' && (
                        <MetricCell
                          label="Override"
                          value={`₦${fmt(m.overrideEarned)}`}
                          sub={`${m.subPartnerCount} sub-partner${m.subPartnerCount !== 1 ? 's' : ''}`}
                          purple
                        />
                      )}
                      <MetricCell
                        label="Pending"
                        value={`₦${fmt(m.pendingAmount)}`}
                        sub={`₦${fmt(m.approvedAmount)} approved`}
                      />
                    </div>
                  </div>

                  <ChevronRight size={14} className="text-gray-400 flex-shrink-0 mt-1" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
