import type { ReactNode } from 'react'
import { useSubscriptionStore } from '@/stores/subscription-store'
import { UpgradeLimitCard } from './UpgradeOverlay'
import type { TierLimits } from '@/core/config/tiers'
import { TIERS } from '@/core/config/tiers'

interface LimitGateProps {
  limitKey: keyof TierLimits
  currentCount: number
  children: ReactNode
}

export function LimitGate({ limitKey, currentCount, children }: LimitGateProps) {
  const tier = useSubscriptionStore(s => s.tier)
  const isAtLimit = useSubscriptionStore(s => s.checkLimit)
  const atLimit = isAtLimit(limitKey, currentCount)

  if (!atLimit) return <>{children}</>

  const maxCount = TIERS[tier].limits[limitKey]

  return <UpgradeLimitCard limitKey={limitKey} currentCount={currentCount} maxCount={maxCount} />
}
