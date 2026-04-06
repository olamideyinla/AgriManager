import { useEffect, useState } from 'react'
import { DollarSign, Loader2 } from 'lucide-react'
import { usePartnerStore } from '../../../stores/partner-store'
import { partnerSupabase } from '../../../core/config/supabase-partner'
import type { PartnerCommission, PartnerPayout } from '../../../shared/types/partner'

const MIN_PAYOUT = 20

const STATUS_COLORS: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  paid:     'bg-green-100 text-green-700',
}

export default function PartnerEarningsPage() {
  const partner  = usePartnerStore(s => s.partner)
  const [commissions, setCommissions] = useState<PartnerCommission[]>([])
  const [payouts, setPayouts]         = useState<PartnerPayout[]>([])
  const [loading, setLoading]         = useState(true)
  const [requesting, setRequesting]   = useState(false)
  const [payoutMsg, setPayoutMsg]     = useState<string | null>(null)

  useEffect(() => {
    if (!partner) return
    setLoading(true)
    Promise.all([
      partnerSupabase.from('partner_commissions').select('*').eq('partner_id', partner.id).order('created_at', { ascending: false }),
      partnerSupabase.from('partner_payouts').select('*').eq('partner_id', partner.id).order('requested_at', { ascending: false }),
    ]).then(([cRes, pRes]) => {
      setCommissions((cRes.data ?? []) as PartnerCommission[])
      setPayouts((pRes.data ?? []) as PartnerPayout[])
      setLoading(false)
    })
  }, [partner])

  const direct    = commissions.filter(c => c.commissionType !== 'override')
  const overrides = commissions.filter(c => c.commissionType === 'override')

  const totals = {
    pending:         direct.filter(c => c.status === 'pending').reduce((s, c) => s + c.amount, 0),
    approved:        commissions.filter(c => c.status === 'approved').reduce((s, c) => s + c.amount, 0),
    paid:            commissions.filter(c => c.status === 'paid').reduce((s, c) => s + c.amount, 0),
    overridePending: overrides.filter(c => c.status === 'pending').reduce((s, c) => s + c.amount, 0),
  }

  const isSuper = partner?.partnerType === 'super'

  const pendingIds = commissions.filter(c => c.status === 'pending').map(c => c.id)
  const pendingTotal = totals.pending + totals.overridePending
  const canRequest = pendingTotal >= MIN_PAYOUT && pendingIds.length > 0

  const now       = new Date()
  const periodStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const requestPayout = async () => {
    if (!partner || !canRequest) return
    setRequesting(true)
    setPayoutMsg(null)
    const { error } = await partnerSupabase.from('partner_payouts').insert({
      partner_id:     partner.id,
      period:         periodStr,
      total_amount:   pendingTotal,
      commission_ids: pendingIds,
      status:         'requested',
    })
    if (error) {
      setPayoutMsg(`Error: ${error.message}`)
    } else {
      setPayoutMsg('Payout requested! We\'ll process it by the 15th.')
    }
    setRequesting(false)
  }

  if (!partner) return null

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-bold text-gray-900 text-lg">Earnings</h1>
        <p className="text-sm text-gray-500">Your commissions and payout history.</p>
      </div>

      {/* Summary */}
      <div className={`grid gap-3 ${isSuper ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
        {[
          { label: 'Pending',  value: totals.pending,  color: 'text-amber-600' },
          { label: 'Approved', value: totals.approved, color: 'text-blue-600'  },
          { label: 'Paid',     value: totals.paid,     color: 'text-green-600' },
          ...(isSuper ? [{ label: 'Override Pending', value: totals.overridePending, color: 'text-purple-600' }] : []),
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
            <p className={`text-lg font-bold ${s.color}`}>${s.value.toFixed(2)}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Payout request */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-gray-900 text-sm">Request Payout</p>
            <p className="text-xs text-gray-500">
              {canRequest
                ? `$${pendingTotal.toFixed(2)} available — minimum $${MIN_PAYOUT}`
                : `Minimum $${MIN_PAYOUT} required (you have $${pendingTotal.toFixed(2)})`}
            </p>
          </div>
          <button
            onClick={() => void requestPayout()}
            disabled={!canRequest || requesting}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              canRequest && !requesting
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {requesting ? <Loader2 size={14} className="animate-spin" /> : <DollarSign size={14} />}
            Request Payout
          </button>
        </div>
        {payoutMsg && (
          <p className={`mt-3 text-xs ${payoutMsg.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>
            {payoutMsg}
          </p>
        )}
      </div>

      {/* Monthly breakdown */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Monthly Breakdown</h2>
        </div>
        {loading ? (
          <div className="py-10 text-center">
            <div className="w-5 h-5 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin mx-auto" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center">
            <DollarSign size={36} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No commissions yet. Refer your first farmer to get started!</p>
          </div>
        ) : (
          <div>
            <div className="divide-y divide-gray-50">
              {commissions.map(c => (
                <div key={c.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800">
                      ${c.amount.toFixed(2)}
                      <span className="text-xs font-normal text-gray-400 ml-1">({(c.rate * 100).toFixed(0)}%)</span>
                    </p>
                    <p className="text-xs text-gray-400">{c.period}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {c.commissionType === 'override' ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Override</span>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Direct</span>
                    )}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {c.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Payout history */}
      {payouts.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Payout History</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {payouts.map(p => (
              <div key={p.id} className="px-4 py-3.5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{p.period}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(p.requestedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {p.paymentReference && ` · ${p.paymentReference}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">${p.totalAmount.toFixed(2)}</p>
                  <span className={`text-xs font-medium capitalize ${p.status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
