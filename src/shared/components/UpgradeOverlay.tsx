import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, TrendingUp } from 'lucide-react'

// ── Upgrade messages per feature ─────────────────────────────────────────────

const UPGRADE_MESSAGES: Record<string, { title: string; description: string; tier: 'pro' | 'x' }> = {
  batch_comparison:    { title: 'Compare Batches',       description: 'See how your batches stack up side by side.',           tier: 'pro' },
  decision_tools:      { title: 'Decision Tools',         description: 'Data-driven insights to grow and profit.',              tier: 'pro' },
  exportable_reports:  { title: 'Exportable Reports',     description: 'Export PDF and CSV reports for your records.',          tier: 'pro' },
  accounts_receivable: { title: 'Accounts Receivable',    description: 'Track what customers owe you.',                         tier: 'pro' },
  health_event_completion: { title: 'Health Event Completion', description: 'Mark health events complete and track history.',   tier: 'pro' },
  labor_tracking:      { title: 'Labor Tracking',         description: 'Track attendance, wages, and worker performance.',      tier: 'pro' },
  full_alerts:         { title: 'Full Alerts',            description: 'Get all alert types including predictive warnings.',    tier: 'pro' },
  inventory_analytics: { title: 'Inventory Analytics',   description: 'Advanced inventory insights and consumption tracking.',  tier: 'pro' },
  multi_user:          { title: 'Team Management',        description: 'Invite team members and manage permissions.',           tier: 'pro' },
  cross_location_dashboard: { title: 'Cross-Location Dashboard', description: 'View all locations from one command center.', tier: 'x' },
  custom_report_builder:    { title: 'Custom Reports',   description: 'Build and schedule custom reports.',                    tier: 'x' },
  api_access:               { title: 'API Access',       description: 'Integrate with your own systems via API.',              tier: 'x' },
}

function getUpgradeMessage(feature: string) {
  return UPGRADE_MESSAGES[feature] ?? {
    title: 'Pro Feature',
    description: 'Upgrade to Pro to unlock this feature.',
    tier: 'pro' as const,
  }
}

// ── UpgradeOverlay ────────────────────────────────────────────────────────────

interface UpgradeOverlayProps {
  feature: string
  children: ReactNode
}

export function UpgradeOverlay({ feature, children }: UpgradeOverlayProps) {
  const navigate = useNavigate()
  const msg = getUpgradeMessage(feature)

  return (
    <div className="relative">
      {/* Blurred content */}
      <div className="pointer-events-none select-none" style={{ filter: 'blur(3px)', opacity: 0.4 }}>
        {children}
      </div>

      {/* Overlay card */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-primary-100 p-6 max-w-xs w-full text-center">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock size={22} className="text-primary-600" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">{msg.title}</h3>
          <p className="text-sm text-gray-500 mb-4">{msg.description}</p>
          <button
            onClick={() => navigate('/settings/subscription')}
            className="w-full bg-primary-600 text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-primary-700 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <TrendingUp size={16} />
            Upgrade to {msg.tier === 'x' ? 'X' : 'Pro'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── UpgradeLimitCard ──────────────────────────────────────────────────────────

interface UpgradeLimitCardProps {
  limitKey: string
  currentCount: number
  maxCount: number
}

export function UpgradeLimitCard({ limitKey, currentCount, maxCount }: UpgradeLimitCardProps) {
  const navigate = useNavigate()

  const LIMIT_LABELS: Record<string, string> = {
    maxEnterprises:    'enterprises',
    maxLocations:      'locations',
    maxUsers:          'team members',
    maxInventoryItems: 'inventory items',
    maxAnimals:        'animals',
  }

  const label = LIMIT_LABELS[limitKey] ?? limitKey

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
      <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
        <TrendingUp size={18} className="text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800">
          Limit reached ({currentCount}/{maxCount} {label})
        </p>
        <p className="text-xs text-amber-600 mt-0.5">
          Upgrade to Pro for more {label}.
        </p>
        <button
          onClick={() => navigate('/settings/subscription')}
          className="mt-2 text-xs font-semibold text-primary-600 bg-primary-50 px-3 py-1.5 rounded-lg hover:bg-primary-100 active:scale-95 transition-all"
        >
          Upgrade now
        </button>
      </div>
    </div>
  )
}
