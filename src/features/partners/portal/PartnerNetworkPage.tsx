import { useEffect, useState } from 'react'
import { Network, Users } from 'lucide-react'
import { usePartnerStore } from '../../../stores/partner-store'
import { partnerSupabase } from '../../../core/config/supabase-partner'
import type { PartnerStatus, PartnerTier } from '../../../shared/types/partner'

interface SubPartner {
  id: string
  full_name: string
  country: string
  territory: string | null
  status: PartnerStatus
  tier: PartnerTier
  created_at: string
}

interface SubPartnerStats {
  referralCount: number
  overrideTotal: number
}

const STATUS_COLORS: Record<PartnerStatus, string> = {
  pending:   'bg-amber-100 text-amber-700',
  approved:  'bg-green-100 text-green-700',
  suspended: 'bg-orange-100 text-orange-700',
  rejected:  'bg-red-100 text-red-700',
}

const TIER_LABELS: Record<PartnerTier, string> = {
  standard: 'Standard',
  silver:   '🥈 Silver',
  gold:     '🥇 Gold',
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function PartnerNetworkPage() {
  const partner = usePartnerStore(s => s.partner)

  const [subPartners, setSubPartners] = useState<SubPartner[]>([])
  const [statsMap, setStatsMap]       = useState<Map<string, SubPartnerStats>>(new Map())
  const [loading, setLoading]         = useState(true)
  const [overrideTotal, setOverrideTotal] = useState(0)

  useEffect(() => {
    if (!partner) return
    setLoading(true)

    const fetchNetwork = async () => {
      // 1. Fetch sub-partners
      const { data: subData } = await partnerSupabase
        .from('partners')
        .select('id, full_name, country, territory, status, tier, created_at')
        .eq('parent_partner_id', partner.id)
        .order('created_at', { ascending: false })

      const subs = (subData ?? []) as SubPartner[]
      setSubPartners(subs)

      if (subs.length === 0) {
        setLoading(false)
        return
      }

      const subIds = subs.map(s => s.id)

      // 2. Fetch override commissions for this super partner (with referral's partner_id)
      const { data: overrideData } = await partnerSupabase
        .from('partner_commissions')
        .select('amount, referral_id')
        .eq('partner_id', partner.id)
        .eq('commission_type', 'override')

      const overrides = (overrideData ?? []) as { amount: number; referral_id: string }[]
      const totalOverride = overrides.reduce((s, o) => s + o.amount, 0)
      setOverrideTotal(totalOverride)

      // 3. Fetch referral counts per sub-partner
      const { data: refData } = await partnerSupabase
        .from('partner_referrals')
        .select('partner_id')
        .in('partner_id', subIds)

      const refs = (refData ?? []) as { partner_id: string }[]

      // 4. Fetch all referral IDs that belong to sub-partners (to map overrides → sub-partner)
      const { data: subRefData } = await partnerSupabase
        .from('partner_referrals')
        .select('id, partner_id')
        .in('partner_id', subIds)

      const subRefMap = new Map<string, string>()
      for (const r of (subRefData ?? []) as { id: string; partner_id: string }[]) {
        subRefMap.set(r.id, r.partner_id)
      }

      // Build stats map
      const map = new Map<string, SubPartnerStats>()
      for (const sub of subs) {
        map.set(sub.id, { referralCount: 0, overrideTotal: 0 })
      }
      for (const r of refs) {
        const existing = map.get(r.partner_id)
        if (existing) existing.referralCount += 1
      }
      for (const o of overrides) {
        const subPartnerId = subRefMap.get(o.referral_id)
        if (subPartnerId) {
          const existing = map.get(subPartnerId)
          if (existing) existing.overrideTotal += o.amount
        }
      }

      setStatsMap(map)
      setLoading(false)
    }

    void fetchNetwork()
  }, [partner])

  if (!partner) return null

  const activeCount = subPartners.filter(s => s.status === 'approved').length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-bold text-gray-900 text-lg">Your Network</h1>
        <p className="text-sm text-gray-500">Sub-partners you have recruited and their performance.</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-xl font-bold text-purple-600">{loading ? '—' : subPartners.length}</p>
          <p className="text-xs text-gray-500">Sub-Partners</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-xl font-bold text-green-600">{loading ? '—' : activeCount}</p>
          <p className="text-xs text-gray-500">Active</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-xl font-bold text-amber-600">{loading ? '—' : `$${overrideTotal.toFixed(2)}`}</p>
          <p className="text-xs text-gray-500">Override Earned</p>
        </div>
      </div>

      {/* Sub-partner list */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Sub-Partners</h2>
        </div>

        {loading ? (
          <div className="py-10 text-center">
            <div className="w-5 h-5 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin mx-auto" />
          </div>
        ) : subPartners.length === 0 ? (
          <div className="py-12 text-center px-6">
            <Network size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-700 mb-1">No sub-partners yet</p>
            <p className="text-sm text-gray-500">
              Share your recruitment link from the Dashboard to start building your network.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {subPartners.map(sub => {
              const s = statsMap.get(sub.id)
              return (
                <div key={sub.id} className="px-4 py-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {initials(sub.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{sub.full_name}</p>
                      <p className="text-xs text-gray-400">
                        {sub.country}{sub.territory ? ` · ${sub.territory}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[sub.status]}`}>
                        {sub.status}
                      </span>
                      <span className="text-xs text-gray-500">{TIER_LABELS[sub.tier]}</span>
                    </div>
                  </div>
                  {s && (
                    <p className="text-xs text-gray-500 pl-12">
                      Referrals: <span className="font-semibold text-gray-700">{s.referralCount}</span>
                      {' · '}
                      Override from them: <span className="font-semibold text-purple-700">${s.overrideTotal.toFixed(2)}</span>
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Info note */}
      <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 text-xs text-purple-700">
        <p className="font-semibold mb-1">How override commissions work</p>
        <p>You earn 10% of every commission your sub-partners generate. Override commissions appear in your Earnings tab and are included in payout requests.</p>
      </div>
    </div>
  )
}
