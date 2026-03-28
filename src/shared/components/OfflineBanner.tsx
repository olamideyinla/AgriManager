import { useEffect, useRef } from 'react'
import { WifiOff } from 'lucide-react'
import { useUIStore } from '../../stores/ui-store'

export function OfflineBanner() {
  const isOnline  = useUIStore(s => s.isOnline)
  const addToast  = useUIStore(s => s.addToast)
  const wasOfflineRef = useRef(false)

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true
    } else if (wasOfflineRef.current) {
      wasOfflineRef.current = false
      addToast({ message: 'Back online', type: 'success' })
    }
  }, [isOnline, addToast])

  if (isOnline) return null

  return (
    <div
      className="bg-amber-500 text-white px-3 py-1 flex items-center gap-1.5 animate-slide-down"
      role="status"
      aria-live="polite"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span className="text-xs font-semibold tracking-wide flex-1">
        Offline — changes saved locally
      </span>
    </div>
  )
}
