import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/core/config/supabase'
import { type TierSlug, type TierLimits, tierHasFeature, isAtLimit as checkLimit } from '@/core/config/tiers'

type BillingPeriod = 'monthly' | 'annual'

interface SubscriptionState {
  tier: TierSlug
  billingPeriod: BillingPeriod | null
  expiresAt: string | null
  countryCode: string
  setSubscription: (tier: TierSlug, billingPeriod: BillingPeriod | null, expiresAt: string | null) => void
  setCountry: (code: string) => void
  hasFeature: (feature: string) => boolean
  checkLimit: (limitKey: keyof TierLimits, currentCount: number) => boolean
  loadFromSupabase: (organizationId: string) => Promise<void>
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      tier: 'free',
      billingPeriod: null,
      expiresAt: null,
      countryCode: 'DEFAULT',
      setSubscription: (tier, billingPeriod, expiresAt) => set({ tier, billingPeriod, expiresAt }),
      setCountry: (code) => set({ countryCode: code }),
      hasFeature: (feature) => tierHasFeature(get().tier, feature),
      checkLimit: (limitKey, currentCount) => checkLimit(get().tier, limitKey, currentCount),
      loadFromSupabase: async (organizationId) => {
        try {
          const { data } = await supabase
            .from('subscriptions')
            .select('tier, billing_period, expires_at, country_code, status')
            .eq('organization_id', organizationId)
            .maybeSingle()
          if (!data) return
          const now = new Date().toISOString()
          const isExpired = data.expires_at && data.expires_at < now && data.status !== 'active'
          const tier: TierSlug = (isExpired ? 'free' : data.tier) as TierSlug
          set({
            tier,
            billingPeriod: data.billing_period as BillingPeriod | null,
            expiresAt: data.expires_at,
            countryCode: data.country_code ?? 'DEFAULT',
          })
        } catch { /* offline — keep cached state */ }
      },
    }),
    { name: 'subscription-store' }
  )
)
