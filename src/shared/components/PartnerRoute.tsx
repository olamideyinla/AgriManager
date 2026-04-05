import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Wheat } from 'lucide-react'
import { usePartnerStore } from '../../stores/partner-store'

function LoadingScreen() {
  return (
    <div className="flex h-dvh items-center justify-center bg-primary-700">
      <div className="text-center">
        <Wheat size={48} className="mx-auto mb-3 text-accent animate-pulse" />
        <p className="text-sm text-primary-200">Loading…</p>
      </div>
    </div>
  )
}

function PendingApprovalScreen() {
  const signOut = usePartnerStore(s => s.signOut)
  return (
    <div className="flex h-dvh items-center justify-center bg-gray-50 px-6">
      <div className="max-w-sm text-center">
        <div className="text-5xl mb-4">⏳</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Application Under Review</h1>
        <p className="text-sm text-gray-600 mb-6">
          Your partner application is being reviewed. We'll notify you by email within 3 business days.
        </p>
        <button
          onClick={() => void signOut()}
          className="text-sm text-primary-600 font-medium hover:underline"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

export function PartnerRoute({ children }: { children: React.ReactNode }) {
  const initialize   = usePartnerStore(s => s.initialize)
  const isLoading    = usePartnerStore(s => s.isLoading)
  const partner      = usePartnerStore(s => s.partner)
  const hasInitialized = usePartnerStore(s => s.hasInitialized)

  useEffect(() => { void initialize() }, [initialize])

  if (!hasInitialized || isLoading) return <LoadingScreen />
  if (!partner) return <Navigate to="/partners/signin" replace />
  if (partner.status === 'pending')   return <PendingApprovalScreen />
  if (partner.status !== 'approved')  return <Navigate to="/partners/apply" replace />
  return <>{children}</>
}
