export type TierSlug = 'free' | 'pro' | 'x'

export type TierLimits = {
  maxEnterprises: number
  maxLocations: number
  maxUsers: number
  maxInventoryItems: number
  maxAnimals: number
  dataRetentionYears: number
}

export type TierConfig = {
  slug: TierSlug
  name: string
  tagline: string
  monthlyUsd: number | null
  annualUsd: number
  limits: TierLimits
  features: string[]
}

export const TIERS: Record<TierSlug, TierConfig> = {
  free: {
    slug: 'free',
    name: 'Free',
    tagline: 'Record & track',
    monthlyUsd: 0,
    annualUsd: 0,
    limits: { maxEnterprises: 3, maxLocations: 1, maxUsers: 1, maxInventoryItems: 10, maxAnimals: 0, dataRetentionYears: -1 },
    features: ['daily_entry','basic_dashboard','financial_entry','financial_dashboard','basic_inventory','critical_alerts','health_schedule_view','csv_export','offline','journal'],
  },
  pro: {
    slug: 'pro',
    name: 'Pro',
    tagline: 'Grow & profit',
    monthlyUsd: 10,
    annualUsd: 100,
    limits: { maxEnterprises: 10, maxLocations: 3, maxUsers: 10, maxInventoryItems: -1, maxAnimals: 200, dataRetentionYears: 3 },
    features: ['invoicing','exportable_reports','accounts_receivable','recurring_transactions','batch_comparison','dashboard_trends','budget_targets','health_event_completion','decision_tools','full_alerts','labor_tracking','worker_task_reminders','animal_registry','loan_readiness','custom_breeds','custom_units','dashboard_customization','data_import','printable_sheets','whatsapp_sharing','weather_integration','multi_user','inventory_analytics'],
  },
  x: {
    slug: 'x',
    name: 'X',
    tagline: 'Scale & command',
    monthlyUsd: null,
    annualUsd: 1500,
    limits: { maxEnterprises: -1, maxLocations: -1, maxUsers: -1, maxInventoryItems: -1, maxAnimals: -1, dataRetentionYears: -1 },
    features: ['unlimited_everything','cross_location_dashboard','cross_location_financials','location_comparison','centralized_inventory','custom_report_builder','scheduled_email_reports','trend_forecasting','seasonal_analysis','feed_optimization_insights','compliance_reports','full_audit_trail','input_traceability','custom_roles','worker_analytics','shift_management','api_access','webhooks','bulk_data_export','priority_sync','priority_support'],
  },
}

export function tierHasFeature(tier: TierSlug, feature: string): boolean {
  if (tier === 'x') return true
  if (tier === 'pro') return TIERS.pro.features.includes(feature) || TIERS.free.features.includes(feature)
  return TIERS.free.features.includes(feature)
}

export function isAtLimit(tier: TierSlug, limitKey: keyof TierLimits, currentCount: number): boolean {
  const limit = TIERS[tier].limits[limitKey]
  if (limit === -1) return false
  return currentCount >= limit
}
