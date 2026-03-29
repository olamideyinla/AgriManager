import type { ReactNode } from 'react'
import { useSubscriptionStore } from '@/stores/subscription-store'
import { UpgradeOverlay } from './UpgradeOverlay'

interface FeatureGateProps {
  feature: string
  /** If true, render children with blur overlay instead of hiding entirely. */
  softLock?: boolean
  /** Fallback to render when locked (instead of nothing or overlay). */
  fallback?: ReactNode
  children: ReactNode
}

export function FeatureGate({ feature, softLock = false, fallback, children }: FeatureGateProps) {
  const hasFeature = useSubscriptionStore(s => s.hasFeature)
  const allowed = hasFeature(feature)

  if (allowed) return <>{children}</>

  if (softLock) {
    return <UpgradeOverlay feature={feature}>{children}</UpgradeOverlay>
  }

  if (fallback !== undefined) {
    return <>{fallback}</>
  }

  return null
}
