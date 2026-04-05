import { useEffect, useState } from 'react'
import { Copy, Share2, CheckCircle, TrendingUp, Users, DollarSign, Award } from 'lucide-react'
import { usePartnerStore } from '../../../stores/partner-store'
import { partnerSupabase } from '../../../core/config/supabase-partner'
import type { PartnerReferral } from '../../../shared/types/partner'

const BASE_URL = 'https://agrimanagerx.com'

const STATUS_COLORS: Record<string, string> = {
  signup:    'bg-blue-100 text-blue-700',
  trial:     'bg-amber-100 text-amber-700',
  converted: 'bg-green-100 text-green-700',
  churned:   'bg-red-100 text-red-700',
}

const TIER_THRESHOLDS: Record<string, { next: string; at: number }> = {
  standard: { next: 'Silver', at: 25 },
  silver:   { next: 'Gold',   at: 50 },
  gold:     { next: '',       at: Infinity },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Stats {
  totalReferred: number
  activePro: number
  thisMonthEarnings: number
}

export default function PartnerDashboardPage() {
  const partner  = usePartnerStore(s => s.partner)
  const [copied, setCopied]       = useState(false)
  const [referrals, setReferrals] = useState<PartnerReferral[]>([])
  const [stats, setStats]         = useState<Stats>({ totalReferred: 0, activePro: 0, thisMonthEarnings: 0 })
  const [loading, setLoading]     = useState(true)

  const referralLink = partner?.referralCode
    ? `${BASE_URL}/auth/signup?ref=${partner.referralCode}`
    : null

  const waText = referralLink
    ? encodeURIComponent(
        `Hi! I came across an app that helps farmers track flocks and finances — even without internet. It's called AgriManagerX. You can try it free: ${referralLink}`
      )
    : ''

  const copyLink = () => {
    if (!referralLink) return
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  useEffect(() => {
    if (!partner) return
    setLoading(true)

    const fetchData = async () => {
      const now      = new Date()
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      const [refRes, earningsRes] = await Promise.all([
        partnerSupabase
          .from('partner_referrals')
          .select('*')
          .eq('partner_id', partner.id)
          .order('created_at', { ascending: false })
          .limit(10),
        partnerSupabase
          .from('partner_commissions')
          .select('amount')
          .eq('partner_id', partner.id)
          .eq('period', monthStr)
          .neq('status', 'paid'),
      ])

      const refs = (refRes.data ?? []) as PartnerReferral[]
      setReferrals(refs)

      const activePro   = refs.filter(r => r.status === 'converted').length
      const earnings    = (earningsRes.data ?? []).reduce((sum: number, c: Record<string, unknown>) => sum + Number(c.amount ?? 0), 0)

      setStats({
        totalReferred:     refs.length,
        activePro,
        thisMonthEarnings: earnings,
      })
      setLoading(false)
    }

    void fetchData()
  }, [partner])

  if (!partner) return null

  const tierInfo = TIER_THRESHOLDS[partner.tier]
  const toNext   = tierInfo.next ? Math.max(0, tierInfo.at - stats.activePro) : 0
  const progress = tierInfo.next ? Math.min(100, (stats.activePro / tierInfo.at) * 100) : 100

  return (
    <div className="space-y-6">
      {/* Referral link card */}
      <div className="bg-primary-700 text-white rounded-2xl p-5">
        <p className="text-xs text-primary-300 font-semibold uppercase tracking-wide mb-1">Your Referral Link</p>
        {referralLink ? (
          <>
            <p className="font-mono text-sm bg-primary-800 rounded-lg px-3 py-2 mb-3 truncate">
              {referralLink}
            </p>
            <div className="flex gap-2">
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 bg-white text-primary-700 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-primary-50 transition-colors flex-1 justify-center"
              >
                {copied ? <CheckCircle size={15} /> : <Copy size={15} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <a
                href={`https://wa.me/?text=${waText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-[#25D366] text-white font-semibold text-sm px-4 py-2 rounded-lg hover:opacity-90 transition-opacity flex-1 justify-center"
              >
                <Share2 size={15} />
                WhatsApp
              </a>
            </div>
          </>
        ) : (
          <p className="text-sm text-primary-200">Your referral link will be generated once your account is approved. Contact us if this takes longer than 24 hours.</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Referred',     value: loading ? '—' : stats.totalReferred,      icon: <Users size={16} />,     color: 'text-blue-600'   },
          { label: 'Active Pro',         value: loading ? '—' : stats.activePro,           icon: <TrendingUp size={16} />, color: 'text-green-600'  },
          { label: 'This Month',         value: loading ? '—' : `$${stats.thisMonthEarnings.toFixed(2)}`, icon: <DollarSign size={16} />, color: 'text-amber-600' },
          { label: 'Tier',               value: loading ? '—' : (partner.tier === 'standard' ? 'Standard' : partner.tier === 'silver' ? '🥈 Silver' : '🥇 Gold'),
            icon: <Award size={16} />, color: 'text-primary-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className={`${s.color} mb-1`}>{s.icon}</div>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tier progress */}
      {tierInfo.next && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-700">Tier Progress</p>
            <span className="text-xs text-gray-500">{toNext} more Pro subs to {tierInfo.next}</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Recent Referrals</h2>
        </div>
        {loading ? (
          <div className="py-10 text-center">
            <div className="w-5 h-5 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin mx-auto" />
          </div>
        ) : referrals.length === 0 ? (
          <div className="py-10 text-center">
            <Users size={32} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No referrals yet. Share your link to get started!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {referrals.map(r => (
              <div key={r.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {r.referredEmail ?? 'Anonymous signup'}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(r.createdAt)}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 capitalize ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
