import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import { useSubscriptionStore } from '@/stores/subscription-store'
import { getCurrencyConfig, formatPrice } from '@/core/config/currencies'
import { TIERS } from '@/core/config/tiers'

const WHATSAPP_NUMBER = '254700000000' // Replace with actual business number

export default function SubscriptionPaymentPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const plan   = (searchParams.get('plan') ?? 'pro') as 'pro' | 'x'
  const period = (searchParams.get('period') ?? 'monthly') as 'monthly' | 'annual'

  const countryCode = useSubscriptionStore(s => s.countryCode)
  const currency    = getCurrencyConfig(countryCode)

  const tierConfig = TIERS[plan]

  const price =
    plan === 'x'
      ? formatPrice(currency.x.annual, currency)
      : period === 'annual'
        ? formatPrice(currency.pro.annual, currency)
        : formatPrice(currency.pro.monthly, currency)

  const periodLabel =
    plan === 'x' ? 'per year' :
    period === 'annual' ? 'per year' : 'per month'

  const waMessage = encodeURIComponent(
    `Hi! I'd like to activate the AgriManager ${tierConfig.name} plan (${price} ${periodLabel}). Please help me complete the payment.`
  )
  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMessage}`

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
            <p className="text-white/70 text-sm">{tierConfig.name} plan</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-5">
        {/* Plan summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
          <p className="text-sm text-gray-500 mb-1">You selected</p>
          <p className="text-2xl font-bold text-gray-900">
            AgriManager {tierConfig.name}
          </p>
          <p className="text-3xl font-bold text-primary-600 mt-2">{price}</p>
          <p className="text-sm text-gray-400">{periodLabel}</p>
        </div>

        {/* Coming soon message */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="text-sm font-semibold text-amber-800 mb-2">Payment integration coming soon</p>
          <p className="text-sm text-amber-700 leading-relaxed">
            Online payment is not yet available. Contact us on WhatsApp to activate your plan instantly.
            We'll set it up for you within minutes.
          </p>
        </div>

        {/* WhatsApp button */}
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 w-full bg-[#25D366] text-white font-semibold py-4 rounded-2xl text-base hover:bg-[#1ebe5a] active:scale-95 transition-all shadow-sm"
        >
          <MessageCircle size={22} />
          Contact Us on WhatsApp
        </a>

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
