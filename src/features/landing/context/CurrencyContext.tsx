import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useGeolocatedCurrency, type DetectionMethod } from '../hooks/useGeolocatedCurrency'
import { type CurrencyConfig } from '../config/currencies'
import { trackEvent } from '../../../shared/utils/analytics'

// ── Context type ──────────────────────────────────────────────────────────────

interface CurrencyContextValue {
  currency: CurrencyConfig
  countryCode: string
  isDetecting: boolean
  setCountry: (code: string) => void
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { currency, countryCode, isDetecting, detectionMethod, setCountry } = useGeolocatedCurrency()

  // Fire analytics once detection is complete
  useEffect(() => {
    if (isDetecting) return
    trackEvent('landing_currency_detected', {
      countryCode,
      currencyCode: currency.code,
      detectionMethod: detectionMethod as string,
    })
  }, [isDetecting]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSetCountry = (code: string) => {
    trackEvent('landing_currency_changed', {
      from: countryCode,
      to: code,
    })
    setCountry(code)
  }

  return (
    <CurrencyContext.Provider value={{ currency, countryCode, isDetecting, setCountry: handleSetCountry }}>
      {children}
    </CurrencyContext.Provider>
  )
}

// ── Consumer hook ─────────────────────────────────────────────────────────────

export function useCurrencyContext(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrencyContext must be used inside CurrencyProvider')
  return ctx
}

// Re-export types for convenience
export type { CurrencyConfig, DetectionMethod }
