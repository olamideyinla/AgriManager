import { useEffect, useState } from 'react'
import { Download, X, Share } from 'lucide-react'
import { useUIStore } from '../../stores/ui-store'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'pwa-install-dismissed'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isInStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  )
}

function wasDismissedRecently(): boolean {
  const ts = localStorage.getItem(DISMISSED_KEY)
  if (!ts) return false
  return Date.now() - parseInt(ts, 10) < SEVEN_DAYS_MS
}

export default function InstallPrompt() {
  const addToast = useUIStore(s => s.addToast)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOS, setShowIOS] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Already installed as PWA — never show
    if (isInStandaloneMode()) return
    // Dismissed recently — don't show yet
    if (wasDismissedRecently()) return

    if (isIOS()) {
      // iOS: show manual "Add to Home Screen" instructions
      setShowIOS(true)
      setVisible(true)
      return
    }

    // Android/desktop: use the deferred prompt captured in main.tsx
    const cached = (window as any).__pwaInstallPrompt as BeforeInstallPromptEvent | null
    if (cached) {
      setDeferredPrompt(cached)
      setVisible(true)
    }

    // Also listen in case it fires after this component mounts
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    const onInstalled = () => {
      addToast({ message: 'AgriManagerX added to home screen!', type: 'success' })
      setDeferredPrompt(null)
      setVisible(false)
    }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [addToast])

  const handleDismiss = () => {
    setVisible(false)
    localStorage.setItem(DISMISSED_KEY, String(Date.now()))
  }

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted' || outcome === 'dismissed') {
      setDeferredPrompt(null)
      setVisible(false)
    }
  }

  if (!visible) return null

  // iOS: show "Add to Home Screen" guide
  if (showIOS) {
    return (
      <div className="bg-primary-700 text-white px-4 py-3 flex items-start gap-3">
        <Share className="w-4 h-4 shrink-0 mt-0.5 text-accent" />
        <p className="text-sm flex-1 leading-snug">
          Install AgriManagerX:{' '}
          <span className="font-semibold">
            tap <Share className="inline w-3.5 h-3.5 -mt-0.5" /> Share
          </span>{' '}
          then <span className="font-semibold">"Add to Home Screen"</span>
        </p>
        <button onClick={handleDismiss} className="shrink-0 p-1" aria-label="Dismiss">
          <X className="w-4 h-4 text-white/70" />
        </button>
      </div>
    )
  }

  // Android / desktop: native prompt
  return (
    <div className="bg-primary-500 text-white px-4 py-2 flex items-center gap-3 animate-slide-down">
      <Download className="w-4 h-4 shrink-0" />
      <p className="text-sm flex-1">Install AgriManagerX for offline access</p>
      <button
        onClick={handleInstall}
        className="text-accent font-semibold text-sm shrink-0"
        aria-label="Install app"
      >
        Install
      </button>
      <button onClick={handleDismiss} className="shrink-0" aria-label="Dismiss">
        <X className="w-4 h-4 text-white/70" />
      </button>
    </div>
  )
}
