import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Crown, Zap, Star } from 'lucide-react'
import { useSubscriptionStore } from '@/stores/subscription-store'
import { TIERS, type TierSlug } from '@/core/config/tiers'
import { getCurrencyConfig, formatPrice } from '@/core/config/currencies'
import { format } from 'date-fns'

// ── Tier badge ────────────────────────────────────────────────────────────────

const TIER_BADGE: Record<TierSlug, { icon: typeof Check; color: string; bg: string }> = {
  free: { icon: Check,  color: 'text-gray-600',   bg: 'bg-gray-100' },
  pro:  { icon: Zap,    color: 'text-primary-700', bg: 'bg-primary-100' },
  x:    { icon: Crown,  color: 'text-amber-700',   bg: 'bg-amber-100' },
}

// ── Plan feature lists for display ────────────────────────────────────────────

const FREE_DISPLAY_FEATURES = [
  'Up to 3 enterprises',
  'Daily production entry',
  'Basic financial tracking',
  'Basic inventory (10 items)',
  'Critical alerts',
  'Health schedule view',
  'CSV export',
  'Offline mode',
  '1 user',
]

const PRO_DISPLAY_FEATURES = [
  'Up to 10 enterprises',
  'Up to 10 team members',
  'Exportable PDF & CSV reports',
  'Accounts receivable',
  'Decision tools & calculators',
  'Labor & payroll tracking',
  'Full alert suite',
  'Unlimited inventory items',
  'Animal registry',
  'Batch comparison analysis',
  'Budget targets',
]

const X_DISPLAY_FEATURES = [
  'Unlimited enterprises & locations',
  'Cross-location dashboard',
  'Custom report builder',
  'Scheduled email reports',
  'Trend forecasting',
  'Feed optimization insights',
  'Compliance & audit trail',
  'API access & webhooks',
  'Bulk data export',
  'Priority support',
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function SubscriptionPage() {
  const navigate = useNavigate()
  const { tier, expiresAt, countryCode } = useSubscriptionStore()
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')

  const currency = getCurrencyConfig(countryCode)
  const proMonthly = formatPrice(currency.pro.monthly, currency)
  const proAnnual  = formatPrice(currency.pro.annual, currency)
  const xAnnual    = formatPrice(currency.x.annual, currency)

  const { icon: BadgeIcon, color: badgeColor, bg: badgeBg } = TIER_BADGE[tier]

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Header */}
      <div className="bg-primary-600 px-4 pt-safe-top pb-5">
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white -ml-2"
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-white text-xl font-bold leading-tight">Subscription</h1>
            <p className="text-white/70 text-sm">Manage your plan</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Current plan card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Current Plan</p>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${badgeBg}`}>
              <BadgeIcon size={20} className={badgeColor} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900">{TIERS[tier].name} — {TIERS[tier].tagline}</p>
              {expiresAt && tier !== 'free' && (
                <p className="text-xs text-gray-500">
                  Renews {format(new Date(expiresAt), 'd MMM yyyy')}
                </p>
              )}
              {tier === 'free' && (
                <p className="text-xs text-gray-500">Free forever</p>
              )}
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${
              tier === 'free' ? 'bg-gray-100 text-gray-600' :
              tier === 'pro'  ? 'bg-primary-100 text-primary-700' :
                                'bg-amber-100 text-amber-700'
            }`}>
              {tier.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Billing toggle (for Pro) */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-2 bg-gray-100 rounded-full p-1">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                billingPeriod === 'monthly' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                billingPeriod === 'annual' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
            >
              Annual <span className="text-emerald-600 text-xs">–17%</span>
            </button>
          </div>
        </div>

        {/* Free plan card */}
        <div className={`bg-white rounded-2xl border-2 p-5 ${tier === 'free' ? 'border-primary-400' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-bold text-gray-900">Free</h3>
            {tier === 'free' && (
              <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded-full">Current</span>
            )}
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-0.5">$0</p>
          <p className="text-xs text-gray-400 mb-4">Forever</p>
          <ul className="space-y-2 mb-5">
            {FREE_DISPLAY_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                <Check size={14} className="text-emerald-500 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          {tier === 'free' ? (
            <div className="w-full text-center py-2.5 rounded-xl text-sm font-semibold text-gray-400 bg-gray-50">
              Current Plan
            </div>
          ) : (
            <div className="w-full text-center py-2.5 rounded-xl text-sm font-semibold text-gray-400 bg-gray-50">
              Downgrade
            </div>
          )}
        </div>

        {/* Pro plan card */}
        <div className={`bg-primary-600 rounded-2xl border-2 border-primary-600 p-5 relative overflow-hidden ${tier === 'pro' ? 'ring-2 ring-primary-400 ring-offset-2' : ''}`}>
          <div className="absolute top-4 right-4 bg-accent text-gray-900 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Star size={10} /> Most Popular
          </div>
          <div className="flex items-center gap-2 mb-1">
            <Zap size={18} className="text-accent" />
            <h3 className="text-lg font-bold text-white">Pro</h3>
          </div>
          <p className="text-3xl font-bold text-white mb-0.5">
            {billingPeriod === 'monthly' ? proMonthly : proAnnual}
          </p>
          <p className="text-xs text-primary-200 mb-4">
            {billingPeriod === 'monthly' ? 'per month' : 'per year (save ~17%)'}
          </p>
          <ul className="space-y-2 mb-5">
            {PRO_DISPLAY_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-white">
                <Check size={14} className="text-accent flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          {tier === 'pro' ? (
            <div className="w-full text-center py-2.5 rounded-xl text-sm font-semibold bg-white/20 text-white">
              Current Plan
            </div>
          ) : (
            <button
              onClick={() => navigate(`/settings/subscription/payment?plan=pro&period=${billingPeriod}`)}
              className="w-full bg-white text-primary-700 font-semibold py-2.5 rounded-xl text-sm hover:bg-primary-50 active:scale-95 transition-all"
            >
              Upgrade to Pro
            </button>
          )}
        </div>

        {/* X plan card */}
        <div className={`bg-gray-900 rounded-2xl border-2 border-gray-700 p-5 ${tier === 'x' ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}>
          <div className="flex items-center gap-2 mb-1">
            <Crown size={18} className="text-amber-400" />
            <h3 className="text-lg font-bold text-white">X</h3>
          </div>
          <p className="text-3xl font-bold text-white mb-0.5">{xAnnual}</p>
          <p className="text-xs text-gray-400 mb-4">per year · billed annually</p>
          <ul className="space-y-2 mb-5">
            {X_DISPLAY_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                <Check size={14} className="text-amber-400 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          {tier === 'x' ? (
            <div className="w-full text-center py-2.5 rounded-xl text-sm font-semibold bg-white/10 text-white">
              Current Plan
            </div>
          ) : (
            <button
              onClick={() => navigate('/settings/subscription/payment?plan=x&period=annual')}
              className="w-full bg-amber-400 text-gray-900 font-semibold py-2.5 rounded-xl text-sm hover:bg-amber-300 active:scale-95 transition-all"
            >
              Upgrade to X
            </button>
          )}
        </div>

        {/* Currency note */}
        <p className="text-center text-xs text-gray-400 pb-4">
          Prices shown in {currency.code}. Billing in local currency where available.
        </p>
      </div>
    </div>
  )
}
