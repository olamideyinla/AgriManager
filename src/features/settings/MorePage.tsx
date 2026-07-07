import { useState, useEffect, useRef, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { supabase } from '../../core/config/supabase'
import { useAuthStore } from '../../stores/auth-store'
import { useUIStore } from '../../stores/ui-store'
import type { Theme, FontSize } from '../../stores/ui-store'
import { Bell, BarChart2, Building2, LogOut, ChevronRight, RefreshCw, Users, ClipboardList, BrainCircuit, Database, Stethoscope, Users2, BellRing, CreditCard, FileText, Banknote, Settings, UserCircle, ShoppingCart, ImageIcon } from 'lucide-react'
import { PermissionGate } from '../../shared/components/PermissionGate'
import { db } from '../../core/database/db'
import type { UserRole } from '../../shared/types'
import { usePageTitle } from '../../shared/hooks/usePageTitle'

// ── Logo helpers ───────────────────────────────────────────────────────────────

/** Resize & compress an image file to at most maxSize×maxSize, returns base64 data URL */
function compressImage(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1)
      const w = Math.round(img.width  * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = reject
    img.src = url
  })
}

// Paths that appear in the desktop sidebar per role — hide from More on lg+ screens
const SIDEBAR_PATHS_BY_ROLE: Record<UserRole, ReadonlySet<string>> = {
  owner:      new Set(['/enterprises', '/financials', '/invoicing', '/payroll', '/reports', '/inventory', '/health', '/labor', '/decision', '/team', '/settings/task-templates', '/alerts', '/settings/reminders']),
  manager:    new Set(['/enterprises', '/financials', '/invoicing', '/payroll', '/reports', '/inventory', '/health', '/labor', '/decision', '/alerts', '/settings/reminders']),
  supervisor: new Set(['/enterprises', '/health', '/labor', '/alerts', '/settings/reminders']),
  worker:     new Set(['/enterprises', '/settings/reminders']),
  viewer:     new Set(['/reports', '/alerts']),
}

const ROLE_COLORS: Record<string, string> = {
  owner:      'bg-amber-100 text-amber-800',
  manager:    'bg-blue-100 text-blue-800',
  supervisor: 'bg-purple-100 text-purple-800',
  worker:     'bg-green-100 text-green-800',
  viewer:     'bg-gray-100 text-gray-700',
}

const THEMES: { value: Theme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light',  label: 'Light'  },
  { value: 'dark',   label: 'Dark'   },
]

const FONT_SIZES: { value: FontSize; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'large',  label: 'Large'  },
]

export default function MorePage() {
  usePageTitle('Settings')
  const navigate  = useNavigate()
  const appUser   = useAuthStore(s => s.appUser)
  const signOut   = useAuthStore(s => s.signOut)
  const theme     = useUIStore(s => s.theme)
  const setTheme  = useUIStore(s => s.setTheme)
  const fontSize  = useUIStore(s => s.fontSize)
  const setFontSize = useUIStore(s => s.setFontSize)
  const addToast  = useUIStore(s => s.addToast)

  const logoInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)

  const org = useLiveQuery(
    () => appUser ? db.organizations.get(appUser.organizationId) : undefined,
    [appUser?.organizationId],
  )

  const handleLogoChange = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0]
    if (!file || !org) return
    setIsUploadingLogo(true)
    try {
      const dataUrl = await compressImage(file)
      await db.organizations.update(org.id, {
        logoUrl:    dataUrl,
        updatedAt:  new Date().toISOString(),
        syncStatus: 'pending',
      })
      addToast({ type: 'success', message: 'Logo saved' })
    } catch {
      addToast({ type: 'error', message: 'Failed to save logo' })
    } finally {
      setIsUploadingLogo(false)
      // Reset input so same file can be re-selected
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  const handleRemoveLogo = async () => {
    if (!org) return
    await db.organizations.update(org.id, {
      logoUrl:    undefined,
      updatedAt:  new Date().toISOString(),
      syncStatus: 'pending',
    })
    addToast({ type: 'info', message: 'Logo removed' })
  }

  // Track whether the sidebar is visible (lg breakpoint = 1024px)
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024)
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    signOut()
    navigate('/sign-in')
  }

  const allItems = [
    { icon: UserCircle,    label: 'Profile',          to: '/settings/profile',           permission: null },
    { icon: CreditCard,    label: 'Subscription',    to: '/settings/subscription',     permission: null },
    { icon: FileText,      label: 'Invoicing',       to: '/invoicing',                 permission: 'financial:read' as const },
    { icon: Banknote,      label: 'Payroll',          to: '/payroll',                   permission: 'financial:read' as const },
    { icon: Settings,      label: 'Payroll Settings', to: '/payroll/settings',          permission: 'financial:read' as const },
    { icon: ShoppingCart,  label: 'Procurement',     to: '/procurement/orders',        permission: 'financial:read' as const },
    { icon: BrainCircuit,  label: 'Decision Tools',  to: '/decision',                  permission: null },
    { icon: Stethoscope,   label: 'Health Schedule', to: '/health',                    permission: null },
    { icon: Users2,        label: 'Labor',           to: '/labor',                     permission: null },
    { icon: ClipboardList, label: 'Task Templates',  to: '/settings/task-templates',   permission: 'users:manage' as const },
    { icon: BellRing,      label: 'Reminders',       to: '/settings/reminders',        permission: null },
    { icon: Bell,          label: 'Alerts',           to: '/alerts',                    permission: null },
    { icon: Building2,     label: 'Enterprises',      to: '/enterprises',               permission: null },
    { icon: BarChart2,     label: 'Financials',       to: '/financials',                permission: 'financial:read' as const },
    { icon: Database,      label: 'Data Management',  to: '/settings/data-management',  permission: null },
    { icon: RefreshCw,     label: 'Sync',             to: '/sync',                      permission: null },
    { icon: Users,         label: 'Team',             to: '/team',                      permission: 'users:manage' as const },
    { icon: ClipboardList, label: 'Activity Log',     to: '/settings/activity-log',     permission: 'users:manage' as const },
  ]

  // On desktop the sidebar is visible, so hide items already shown there
  const sidebarPaths = isDesktop && appUser
    ? SIDEBAR_PATHS_BY_ROLE[appUser.role] ?? new Set<string>()
    : new Set<string>()
  const items = allItems.filter(i => !sidebarPaths.has(i.to))

  return (
    <div className="px-4 pt-4 pb-8 fade-in space-y-4">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">More</h1>

      {/* Profile */}
      {appUser && (
        <button
          onClick={() => navigate('/settings/profile')}
          className="card dark:bg-[var(--bg-card)] dark:border-gray-700 p-4 w-full text-left active:bg-gray-50 dark:active:bg-gray-700/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center shrink-0">
              <span className="text-primary-700 dark:text-primary-300 font-bold text-base">
                {appUser.fullName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{appUser.fullName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {appUser.phone ?? appUser.email ?? 'Tap to edit profile'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${ROLE_COLORS[appUser.role] ?? 'bg-gray-100 text-gray-700'}`}>
                {appUser.role}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </button>
      )}

      {/* Farm Branding */}
      <div className="card dark:bg-[var(--bg-card)] dark:border-gray-700">
        <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
          Farm Branding
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
          Logo appears on invoices, receipts &amp; purchase orders
        </p>
        <div className="flex items-center gap-4">
          {/* Logo preview */}
          <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 flex items-center justify-center overflow-hidden shrink-0 bg-gray-50 dark:bg-gray-800">
            {org?.logoUrl ? (
              <img src={org.logoUrl} alt="Farm logo" className="w-full h-full object-contain" />
            ) : (
              <ImageIcon className="w-6 h-6 text-gray-300 dark:text-gray-600" />
            )}
          </div>
          {/* Upload controls */}
          <div className="flex-1 space-y-2">
            <button
              onClick={() => logoInputRef.current?.click()}
              disabled={isUploadingLogo}
              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-primary-600 text-white active:bg-primary-700 disabled:opacity-60 transition-colors"
            >
              {isUploadingLogo ? 'Saving…' : org?.logoUrl ? 'Change Logo' : 'Upload Logo'}
            </button>
            {org?.logoUrl && (
              <button
                onClick={handleRemoveLogo}
                className="w-full py-1.5 text-xs text-red-500 font-medium active:opacity-70"
              >
                Remove logo
              </button>
            )}
          </div>
        </div>
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleLogoChange}
        />
        {org?.name && (
          <p className="text-xs text-gray-400 mt-3 text-center">{org.name}</p>
        )}
      </div>

      {/* Appearance */}
      <div className="card dark:bg-[var(--bg-card)] dark:border-gray-700">
        <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Appearance
        </h2>

        <div className="mb-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Theme</p>
          <div className="flex rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
            {THEMES.map(t => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  theme === t.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-[var(--bg-card)] text-gray-600 dark:text-gray-400'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Text Size</p>
          <div className="flex rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
            {FONT_SIZES.map(s => (
              <button
                key={s.value}
                onClick={() => setFontSize(s.value)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  fontSize === s.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-[var(--bg-card)] text-gray-600 dark:text-gray-400'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Nav items */}
      <div className="card dark:bg-[var(--bg-card)] dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
        {items.map(({ icon: Icon, label, to, permission }) => {
          const btn = (
            <button key={to} onClick={() => navigate(to)}
              className="w-full flex items-center gap-3 py-3 text-left">
              <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0" />
              <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          )
          if (permission) {
            return (
              <PermissionGate key={to} permission={permission}>
                {btn}
              </PermissionGate>
            )
          }
          return btn
        })}
        <button onClick={handleSignOut}
          className="w-full flex items-center gap-3 py-3 text-left text-red-600">
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="flex-1 text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  )
}
