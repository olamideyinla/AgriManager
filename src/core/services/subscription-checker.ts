import { supabase } from '@/core/config/supabase'
import { useSubscriptionStore } from '@/stores/subscription-store'
import type { TierSlug } from '@/core/config/tiers'

const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000

export async function checkSubscriptionStatus(organizationId: string): Promise<void> {
  try {
    const { data } = await supabase
      .from('subscriptions')
      .select('tier, billing_period, expires_at, status')
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (!data) return

    const store = useSubscriptionStore.getState()
    const now = Date.now()

    if (data.expires_at) {
      const expiresMs = new Date(data.expires_at as string).getTime()
      if (expiresMs < now) {
        const inGrace = (now - expiresMs) < GRACE_PERIOD_MS
        store.setSubscription(inGrace ? data.tier as TierSlug : 'free', null, data.expires_at as string)
        return
      }
    }

    store.setSubscription(
      data.tier as TierSlug,
      data.billing_period as 'monthly' | 'annual' | null,
      data.expires_at as string | null,
    )
  } catch { /* non-fatal */ }
}
