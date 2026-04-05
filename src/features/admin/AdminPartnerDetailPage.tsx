import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, RefreshCw, CheckCircle, DollarSign, Save, Loader2 } from 'lucide-react'
import { supabase } from '../../core/config/supabase'
import type { PartnerCommission, PartnerPayout, PartnerReferral, ReferralStatus, PartnerStatus } from '../../shared/types/partner'

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
  payment_method: string | null
  payment_details: string | null
  created_at: string
}

const STATUS_COLORS: Record<PartnerStatus, string> = {
  pending:   'bg-amber-100 text-amber-700',
  approved:  'bg-green-100 text-green-700',
  suspended: 'bg-orange-100 text-orange-700',
  rejected:  'bg-red-100 text-red-700',
}

const REFERRAL_STATUS_COLORS: Record<ReferralStatus, string> = {
  signup:    'bg-blue-100 text-blue-700',
  trial:     'bg-amber-100 text-amber-700',
  converted: 'bg-green-100 text-green-700',
  churned:   'bg-red-100 text-red-700',
}

const PLAN_TYPES = ['pro_monthly', 'pro_annual'] as const

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminPartnerDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [partner,     setPartner]     = useState<PartnerRow | null>(null)
  const [referrals,   setReferrals]   = useState<PartnerReferral[]>([])
  const [commissions, setCommissions] = useState<PartnerCommission[]>([])
  const [payouts,     setPayouts]     = useState<PartnerPayout[]>([])
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState<'referrals' | 'commissions' | 'payouts'>('referrals')
  const [notes,       setNotes]       = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [updating,    setUpdating]    = useState<string | null>(null)
  const [refreshKey,  setRefreshKey]  = useState(0)

  useEffect(() => {
    if (!id) return
    setLoading(true)

    Promise.all([
      supabase.from('partners').select('*').eq('id', id).single(),
      supabase.from('partner_referrals').select('*').eq('partner_id', id).order('created_at', { ascending: false }),
      supabase.from('partner_commissions').select('*').eq('partner_id', id).order('created_at', { ascending: false }),
      supabase.from('partner_payouts').select('*').eq('partner_id', id).order('requested_at', { ascending: false }),
    ]).then(([pRes, rRes, cRes, payRes]) => {
      if (pRes.data) {
        const row = pRes.data as PartnerRow
        setPartner(row)
        setNotes(row.notes ?? '')
      }
      setReferrals((rRes.data ?? []) as PartnerReferral[])
      setCommissions((cRes.data ?? []) as PartnerCommission[])
      setPayouts((payRes.data ?? []) as PartnerPayout[])
      setLoading(false)
    })
  }, [id, refreshKey])

  const saveNotes = async () => {
    if (!partner) return
    setSavingNotes(true)
    await supabase.from('partners').update({ notes, updated_at: new Date().toISOString() }).eq('id', partner.id)
    setSavingNotes(false)
  }

  const markReferralConverted = async (refId: string, planType: string) => {
    setUpdating(refId)
    const { error } = await supabase
      .from('partner_referrals')
      .update({ status: 'converted', plan_type: planType, converted_at: new Date().toISOString() })
      .eq('id', refId)
    if (!error) {
      setRefreshKey(k => k + 1)
    }
    setUpdating(null)
  }

  const approveCommission = async (commId: string) => {
    setUpdating(commId)
    await supabase.from('partner_commissions').update({ status: 'approved' }).eq('id', commId)
    setCommissions(prev => prev.map(c => c.id === commId ? { ...c, status: 'approved' as const } : c))
    setUpdating(null)
  }

  const markCommissionPaid = async (commId: string) => {
    setUpdating(commId)
    await supabase.from('partner_commissions').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', commId)
    setCommissions(prev => prev.map(c => c.id === commId ? { ...c, status: 'paid' as const } : c))
    setUpdating(null)
  }

  const markPayoutPaid = async (payoutId: string, reference: string) => {
    setUpdating(payoutId)
    await supabase
      .from('partner_payouts')
      .update({ status: 'paid', paid_at: new Date().toISOString(), payment_reference: reference })
      .eq('id', payoutId)
    setPayouts(prev => prev.map(p => p.id === payoutId ? { ...p, status: 'paid' as const, paymentReference: reference } : p))
    setUpdating(null)
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!partner) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Partner not found.</p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Header */}
      <header className="bg-primary-700 text-white px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/admin/partners')} className="text-white/70 hover:text-white">
            <ChevronLeft size={22} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base truncate">{partner.full_name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[partner.status]}`}>
                {partner.status}
              </span>
              <span className="text-xs text-primary-300">{partner.country}{partner.territory ? ` · ${partner.territory}` : ''}</span>
            </div>
          </div>
          <button onClick={() => setRefreshKey(k => k + 1)} className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white">
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-3xl mx-auto flex -mb-px mt-2">
          {(['referrals', 'commissions', 'payouts'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 capitalize transition-colors ${
                tab === t ? 'border-white text-white' : 'border-transparent text-white/60 hover:text-white/80'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Profile card */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-sm space-y-2">
          {[
            { label: 'Email',    value: partner.email },
            { label: 'Phone',    value: partner.phone ?? '—' },
            { label: 'Ref Code', value: partner.referral_code ?? 'Not generated yet' },
            { label: 'Tier',     value: partner.tier },
            { label: 'Joined',   value: fmt(partner.created_at) },
          ].map(row => (
            <div key={row.label} className="flex items-center gap-2">
              <span className="text-gray-400 w-20 flex-shrink-0 text-xs">{row.label}</span>
              <span className="text-gray-800 font-medium text-xs truncate">{row.value}</span>
            </div>
          ))}
        </div>

        {/* Notes */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-700 mb-2">Admin Notes</p>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-400"
            placeholder="Internal notes about this partner…"
          />
          <button
            onClick={() => void saveNotes()}
            disabled={savingNotes}
            className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 disabled:opacity-60"
          >
            {savingNotes ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Save notes
          </button>
        </div>

        {/* ── Referrals tab ── */}
        {tab === 'referrals' && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-sm">Referrals ({referrals.length})</h2>
            </div>
            {referrals.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">No referrals yet.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {referrals.map(r => (
                  <ReferralAdminRow
                    key={r.id}
                    referral={r}
                    isUpdating={updating === r.id}
                    onMarkConverted={markReferralConverted}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Commissions tab ── */}
        {tab === 'commissions' && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">
                Commissions ({commissions.length}) · Total: ${commissions.reduce((s, c) => s + c.amount, 0).toFixed(2)}
              </h2>
            </div>
            {commissions.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">No commissions yet.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {commissions.map(c => (
                  <div key={c.id} className="px-4 py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800">${c.amount.toFixed(2)}</p>
                      <p className="text-xs text-gray-400">{c.period} · {c.commissionType} · {fmt(c.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                        c.status === 'paid' ? 'bg-green-100 text-green-700' :
                        c.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {c.status}
                      </span>
                      {c.status === 'pending' && (
                        <button
                          onClick={() => void approveCommission(c.id)}
                          disabled={updating === c.id}
                          className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline disabled:opacity-50"
                        >
                          {updating === c.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                          Approve
                        </button>
                      )}
                      {c.status === 'approved' && (
                        <button
                          onClick={() => void markCommissionPaid(c.id)}
                          disabled={updating === c.id}
                          className="flex items-center gap-1 text-xs text-green-600 font-medium hover:underline disabled:opacity-50"
                        >
                          {updating === c.id ? <Loader2 size={11} className="animate-spin" /> : <DollarSign size={11} />}
                          Mark Paid
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Payouts tab ── */}
        {tab === 'payouts' && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">Payouts ({payouts.length})</h2>
            </div>
            {payouts.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">No payout requests yet.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {payouts.map(p => (
                  <PayoutAdminRow
                    key={p.id}
                    payout={p}
                    isUpdating={updating === p.id}
                    onMarkPaid={markPayoutPaid}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ReferralAdminRow({
  referral, isUpdating, onMarkConverted,
}: {
  referral: PartnerReferral
  isUpdating: boolean
  onMarkConverted: (id: string, planType: string) => void
}) {
  const [planType, setPlanType] = useState<string>('pro_monthly')
  const [showConvert, setShowConvert] = useState(false)

  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{referral.referredEmail ?? 'Anonymous'}</p>
          <p className="text-xs text-gray-400">{new Date(referral.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize flex-shrink-0 ${REFERRAL_STATUS_COLORS[referral.status]}`}>
          {referral.status}
        </span>
      </div>

      {referral.status !== 'converted' && referral.status !== 'churned' && (
        <>
          {!showConvert ? (
            <button
              onClick={() => setShowConvert(true)}
              className="text-xs text-green-600 font-medium hover:underline"
            >
              Mark as Converted
            </button>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <select
                value={planType}
                onChange={e => setPlanType(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none"
              >
                {PLAN_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <button
                onClick={() => onMarkConverted(referral.id, planType)}
                disabled={isUpdating}
                className="flex items-center gap-1 bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-60"
              >
                {isUpdating ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                Confirm
              </button>
              <button onClick={() => setShowConvert(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PayoutAdminRow({
  payout, isUpdating, onMarkPaid,
}: {
  payout: PartnerPayout
  isUpdating: boolean
  onMarkPaid: (id: string, reference: string) => void
}) {
  const [reference,   setReference]   = useState('')
  const [showPay, setShowPay] = useState(false)

  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <p className="text-sm font-semibold text-gray-800">${payout.totalAmount.toFixed(2)} · {payout.period}</p>
          <p className="text-xs text-gray-400">
            Requested {new Date(payout.requestedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${
          payout.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {payout.status}
        </span>
      </div>

      {payout.status !== 'paid' && (
        <>
          {!showPay ? (
            <button onClick={() => setShowPay(true)} className="text-xs text-green-600 font-medium hover:underline">
              Mark as Paid
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="Payment reference"
                className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none min-w-0"
              />
              <button
                onClick={() => onMarkPaid(payout.id, reference)}
                disabled={isUpdating}
                className="flex items-center gap-1 bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-60 whitespace-nowrap"
              >
                {isUpdating ? <Loader2 size={11} className="animate-spin" /> : <DollarSign size={11} />}
                Paid
              </button>
              <button onClick={() => setShowPay(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
