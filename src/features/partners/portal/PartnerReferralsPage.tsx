import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { usePartnerStore } from '../../../stores/partner-store'
import { partnerSupabase } from '../../../core/config/supabase-partner'
import type { PartnerReferral, ReferralStatus } from '../../../shared/types/partner'

const STATUS_COLORS: Record<ReferralStatus, string> = {
  signup:    'bg-blue-100 text-blue-700',
  trial:     'bg-amber-100 text-amber-700',
  converted: 'bg-green-100 text-green-700',
  churned:   'bg-red-100 text-red-700',
}

const STATUS_FILTERS: { label: string; value: ReferralStatus | 'all' }[] = [
  { label: 'All',       value: 'all'       },
  { label: 'Signed Up', value: 'signup'    },
  { label: 'Trial',     value: 'trial'     },
  { label: 'Converted', value: 'converted' },
  { label: 'Churned',   value: 'churned'   },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function PartnerReferralsPage() {
  const partner  = usePartnerStore(s => s.partner)
  const [referrals, setReferrals] = useState<PartnerReferral[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState<ReferralStatus | 'all'>('all')

  useEffect(() => {
    if (!partner) return
    setLoading(true)
    partnerSupabase
      .from('partner_referrals')
      .select('*')
      .eq('partner_id', partner.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setReferrals((data ?? []) as PartnerReferral[])
        setLoading(false)
      })
  }, [partner])

  const displayed = filter === 'all' ? referrals : referrals.filter(r => r.status === filter)

  const counts = referrals.reduce(
    (acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc },
    {} as Record<ReferralStatus, number>,
  )

  if (!partner) return null

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-bold text-gray-900 text-lg">Referrals</h1>
        <p className="text-sm text-gray-500">All farmers who signed up through your link.</p>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map(f => {
          const count = f.value === 'all'
            ? referrals.length
            : (counts[f.value as ReferralStatus] ?? 0)
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              {f.label} {count > 0 && <span className="ml-1 opacity-70">{count}</span>}
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-5 h-5 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin mx-auto" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="py-12 text-center">
            <Users size={36} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              {filter === 'all' ? 'No referrals yet.' : `No ${filter} referrals.`}
            </p>
          </div>
        ) : (
          <div>
            {/* Header row (desktop) */}
            <div className="hidden sm:grid grid-cols-[1fr_120px_130px_100px] px-4 py-2.5 text-xs font-semibold text-gray-500 border-b border-gray-100 bg-gray-50">
              <span>Email</span>
              <span className="text-center">Status</span>
              <span className="text-right">Signed Up</span>
              <span className="text-right">Converted</span>
            </div>
            <div className="divide-y divide-gray-50">
              {displayed.map(r => (
                <div key={r.id} className="px-4 py-3.5">
                  {/* Mobile layout */}
                  <div className="sm:hidden flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{r.referredEmail ?? 'Anonymous'}</p>
                      <p className="text-xs text-gray-400">{formatDate(r.createdAt)}</p>
                      {r.convertedAt && (
                        <p className="text-xs text-green-600">Converted {formatDate(r.convertedAt)}</p>
                      )}
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 capitalize ${STATUS_COLORS[r.status]}`}>
                      {r.status}
                    </span>
                  </div>
                  {/* Desktop layout */}
                  <div className="hidden sm:grid grid-cols-[1fr_120px_130px_100px] items-center">
                    <span className="text-sm text-gray-800 truncate pr-4">{r.referredEmail ?? 'Anonymous'}</span>
                    <span className="text-center">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[r.status]}`}>
                        {r.status}
                      </span>
                    </span>
                    <span className="text-right text-xs text-gray-500">{formatDate(r.createdAt)}</span>
                    <span className="text-right text-xs text-gray-500">
                      {r.convertedAt ? formatDate(r.convertedAt) : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
