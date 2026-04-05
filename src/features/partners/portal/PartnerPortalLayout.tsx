import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, LayoutDashboard, Users, DollarSign, Wrench } from 'lucide-react'
import { usePartnerStore } from '../../../stores/partner-store'

const TIER_LABELS: Record<string, string> = {
  standard: '',
  silver:   '🥈 Silver',
  gold:     '🥇 Gold',
}

const NAV = [
  { to: '/partners/portal',           label: 'Dashboard',  icon: <LayoutDashboard size={18} />, end: true },
  { to: '/partners/portal/referrals', label: 'Referrals',  icon: <Users size={18} /> },
  { to: '/partners/portal/earnings',  label: 'Earnings',   icon: <DollarSign size={18} /> },
  { to: '/partners/portal/toolkit',   label: 'Toolkit',    icon: <Wrench size={18} /> },
]

export default function PartnerPortalLayout() {
  const navigate = useNavigate()
  const partner  = usePartnerStore(s => s.partner)
  const signOut  = usePartnerStore(s => s.signOut)

  const handleSignOut = async () => {
    await signOut()
    navigate('/partners/signin', { replace: true })
  }

  const tierLabel = partner ? TIER_LABELS[partner.tier] : ''

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-primary-700 text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => navigate('/partners')} className="text-xl font-bold">🌾</button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">{partner?.fullName ?? 'Partner'}</span>
            {tierLabel && (
              <span className="text-xs bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                {tierLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-primary-300">Partner Portal</p>
        </div>
        <button
          onClick={() => void handleSignOut()}
          title="Sign out"
          className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white"
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* Tab nav */}
      <nav className="bg-white border-b border-gray-200 sticky top-14 z-30">
        <div className="max-w-4xl mx-auto flex overflow-x-auto scrollbar-hide">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Page content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
