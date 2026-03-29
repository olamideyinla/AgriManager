import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Loader2, Shield } from 'lucide-react'
import { useSubscriptionStore } from '@/stores/subscription-store'
import { getCurrencyConfig, formatPrice, CURRENCY_MAP } from '@/core/config/currencies'
import { TIERS } from '@/core/config/tiers'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/core/config/supabase'

// ── Paystack types ────────────────────────────────────────────────────────────

declare global {
  interface Window {
    PaystackPop: {
      setup: (config: PaystackConfig) => { openIframe: () => void }
    }
  }
}

interface PaystackConfig {
  key: string
  email: string
  amount: number // smallest currency unit (kobo / pesewa / cent)
  currency: string
  ref: string
  metadata?: Record<string, unknown>
  onClose: () => void
  callback: (response: { reference: string }) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Paystack natively supports these currency codes (2025)
const PAYSTACK_SUPPORTED = new Set(['NGN', 'GHS', 'ZAR', 'USD', 'EUR', 'GBP', 'EGP', 'KES'])

function loadPaystackScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) { resolve(); return }
    const existing = document.querySelector('script[src*="js.paystack.co"]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Paystack script load error')))
      return
    }
    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load payment system'))
    document.head.appendChild(script)
  })
}

function generateRef(orgId: string): string {
  return `amx-${orgId.slice(0, 8)}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SubscriptionPaymentPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const plan   = (searchParams.get('plan') ?? 'pro') as 'pro' | 'x'
  const period = (searchParams.get('period') ?? 'monthly') as 'monthly' | 'annual'

  const { appUser } = useAuthStore()
  const { countryCode, setSubscription } = useSubscriptionStore()
  const tierConfig  = TIERS[plan]

  // Determine which currency to charge in
  const localCurrency = getCurrencyConfig(countryCode)
  const useLocalCurrency = PAYSTACK_SUPPORTED.has(localCurrency.code)
  const chargeCurrency = useLocalCurrency ? localCurrency : CURRENCY_MAP['DEFAULT']!

  const priceNum =
    plan === 'x'
      ? chargeCurrency.x.annual
      : period === 'annual'
        ? chargeCurrency.pro.annual
        : chargeCurrency.pro.monthly

  const price = formatPrice(priceNum, chargeCurrency)
  const periodLabel = plan === 'x' ? 'per year' : period === 'annual' ? 'per year' : 'per month'
  const isAnnual = plan === 'x' || period === 'annual'

  const [scriptReady, setScriptReady] = useState(false)
  const [paying, setPaying]           = useState(false)
  const [paid, setPaid]               = useState(false)
  const [error, setError]             = useState<string | null>(null)

  useEffect(() => {
    loadPaystackScript()
      .then(() => setScriptReady(true))
      .catch(() => setError('Could not load payment system. Check your internet connection and try again.'))
  }, [])

  const handlePay = () => {
    if (!scriptReady || !window.PaystackPop) return
    if (!appUser) { setError('You must be signed in to upgrade.'); return }

    // Paystack needs an email — derive from phone if not set
    const email = appUser.email
      ?? `${(appUser.phone ?? '').replace(/\D/g, '')}@agrimanager.app`

    // Amount in smallest currency unit (kobo / pesewa / cent = × 100)
    const amount = Math.round(priceNum * 100)

    setPaying(true)
    setError(null)

    const handler = window.PaystackPop.setup({
      key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string ?? '',
      email,
      amount,
      currency: chargeCurrency.code,
      ref: generateRef(appUser.organizationId),
      metadata: {
        organization_id: appUser.organizationId,
        plan,
        period: isAnnual ? 'annual' : 'monthly',
        custom_fields: [
          { display_name: 'Plan',   variable_name: 'plan',   value: plan },
          { display_name: 'Period', variable_name: 'period', value: isAnnual ? 'annual' : 'monthly' },
        ],
      },
      onClose: () => setPaying(false),
      callback: async (response) => {
        try {
          const now = new Date()
          const expiresAt = new Date(now)
          if (isAnnual) expiresAt.setFullYear(expiresAt.getFullYear() + 1)
          else expiresAt.setMonth(expiresAt.getMonth() + 1)
          const expiresIso = expiresAt.toISOString()

          // Upsert subscription record in Supabase
          await supabase.from('subscriptions').upsert(
            {
              organization_id:     appUser.organizationId,
              tier:                plan,
              billing_period:      isAnnual ? 'annual' : 'monthly',
              expires_at:          expiresIso,
              status:              'active',
              country_code:        countryCode,
              paystack_reference:  response.reference,
              updated_at:          now.toISOString(),
            },
            { onConflict: 'organization_id' },
          )

          // Update local store immediately (so UI reflects upgrade at once)
          setSubscription(plan, isAnnual ? 'annual' : 'monthly', expiresIso)

          setPaid(true)
        } catch {
          setError(
            'Payment received but we could not activate your plan. Please contact support with reference: ' +
            response.reference,
          )
        } finally {
          setPaying(false)
        }
      },
    })
    handler.openIframe()
  }

  // ── Success state ─────────────────────────────────────────────────────────

  if (paid) {
    return (
      <div className="min-h-dvh bg-white flex flex-col items-center justify-center px-6 text-center safe-top safe-bottom">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle size={40} className="text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">You're all set!</h1>
        <p className="text-gray-500 mb-8">
          {tierConfig.name} plan is now active. Enjoy your upgraded features.
        </p>
        <button
          onClick={() => navigate('/dashboard', { replace: true })}
          className="btn-primary w-full max-w-xs"
        >
          Go to Dashboard
        </button>
      </div>
    )
  }

  // ── Payment form ──────────────────────────────────────────────────────────

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
            <h1 className="text-white text-xl font-bold leading-tight">Complete Upgrade</h1>
            <p className="text-white/70 text-sm">{tierConfig.name} plan · {tierConfig.tagline}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-5">
        {/* Plan summary card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
          <p className="text-sm text-gray-500 mb-1">You selected</p>
          <p className="text-2xl font-bold text-gray-900">AgriManager {tierConfig.name}</p>
          <p className="text-3xl font-bold text-primary-600 mt-2">{price}</p>
          <p className="text-sm text-gray-400">{periodLabel}</p>
          {!useLocalCurrency && (
            <p className="text-xs text-amber-600 mt-1">
              Charged in USD (your local currency is not yet supported by Paystack)
            </p>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Pay button */}
        <button
          onClick={handlePay}
          disabled={!scriptReady || paying}
          className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {paying ? (
            <><Loader2 size={20} className="animate-spin" /> Processing…</>
          ) : !scriptReady ? (
            <><Loader2 size={20} className="animate-spin" /> Loading…</>
          ) : (
            `Pay ${price}`
          )}
        </button>

        {/* Trust signal */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <Shield size={12} />
          <span>Secured by Paystack · SSL encrypted</span>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="w-full text-center py-3 text-sm text-gray-500 font-medium"
        >
          Go back
        </button>
      </div>
    </div>
  )
}
