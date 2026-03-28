import { useState, useEffect, useCallback } from 'react'
import { CURRENCY_MAP, getCurrencyConfig, type CurrencyConfig } from '../config/currencies'

// ── Types ─────────────────────────────────────────────────────────────────────

export type DetectionMethod = 'cached' | 'debug' | 'locale' | 'timezone' | 'ip' | 'default' | 'manual'

type GeoState = {
  countryCode: string
  currency: CurrencyConfig
  isDetecting: boolean
  detectionMethod: DetectionMethod
}

// ── Timezone → country map ────────────────────────────────────────────────────

const TIMEZONE_COUNTRY: Record<string, string> = {
  'Africa/Nairobi': 'KE',
  'Africa/Dar_es_Salaam': 'TZ',
  'Africa/Kampala': 'UG',
  'Africa/Kigali': 'RW',
  'Africa/Addis_Ababa': 'ET',
  'Africa/Lagos': 'NG',
  'Africa/Accra': 'GH',
  'Africa/Dakar': 'SN',
  'Africa/Abidjan': 'CI',
  'Africa/Douala': 'CM',
  'Africa/Johannesburg': 'ZA',
  'Africa/Lusaka': 'ZM',
  'Africa/Blantyre': 'MW',
  'Africa/Cairo': 'EG',
  'Africa/Harare': 'ZW',
  'Africa/Nairobi_anchor': 'KE',
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
  'Asia/Karachi': 'PK',
  'Asia/Dhaka': 'BD',
  'Asia/Manila': 'PH',
  'Asia/Jakarta': 'ID',
  'Asia/Makassar': 'ID',
  'Asia/Jayapura': 'ID',
  'Asia/Ho_Chi_Minh': 'VN',
  'Asia/Saigon': 'VN',
  'America/Sao_Paulo': 'BR',
  'America/Fortaleza': 'BR',
  'America/Manaus': 'BR',
  'America/Belem': 'BR',
  'America/Recife': 'BR',
  'America/Mexico_City': 'MX',
  'America/Tijuana': 'MX',
  'America/Monterrey': 'MX',
  'America/Bogota': 'CO',
}

// ── Detection helpers (synchronous) ──────────────────────────────────────────

function detectFromLocale(): string | null {
  try {
    const locale =
      navigator.language ??
      (navigator.languages && navigator.languages[0]) ??
      ''
    const parts = locale.split('-')
    if (parts.length >= 2) {
      const code = parts[parts.length - 1].toUpperCase()
      if (CURRENCY_MAP[code]) return code
    }
  } catch {
    // navigator not available
  }
  return null
}

function detectFromTimezone(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const code = TIMEZONE_COUNTRY[tz]
    if (code && CURRENCY_MAP[code]) return code
  } catch {
    // Intl not available
  }
  return null
}

// ── Detection helpers (async) ─────────────────────────────────────────────────

async function detectFromIP(): Promise<string | null> {
  // Primary: ipapi.co
  try {
    const res = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(3000),
    })
    if (res.ok) {
      const data = (await res.json()) as { country_code?: string }
      const code = data.country_code?.toUpperCase()
      if (code && CURRENCY_MAP[code]) return code
    }
  } catch {
    // timeout or blocked
  }

  // Fallback: api.country.is
  try {
    const res = await fetch('https://api.country.is', {
      signal: AbortSignal.timeout(3000),
    })
    if (res.ok) {
      const data = (await res.json()) as { country?: string }
      const code = data.country?.toUpperCase()
      if (code && CURRENCY_MAP[code]) return code
    }
  } catch {
    // timeout or blocked
  }

  return null
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

const CACHE_KEY = 'agri_detected_country'

function readCache(): string | null {
  try {
    const v = localStorage.getItem(CACHE_KEY)
    return v && CURRENCY_MAP[v] ? v : null
  } catch {
    return null
  }
}

export function cacheCountry(code: string): void {
  try {
    localStorage.setItem(CACHE_KEY, code)
  } catch {
    // localStorage unavailable
  }
}

// ── Sync init ─────────────────────────────────────────────────────────────────

function buildInitialState(): GeoState {
  // 0. Debug override (?debug_currency=XX, dev only)
  if (import.meta.env.DEV) {
    try {
      const params = new URLSearchParams(window.location.search)
      const dbg = params.get('debug_currency')?.toUpperCase()
      if (dbg && CURRENCY_MAP[dbg]) {
        return { countryCode: dbg, currency: getCurrencyConfig(dbg), isDetecting: false, detectionMethod: 'debug' }
      }
    } catch { /* ignore */ }
  }

  // 1. Cached result (fastest — avoids re-detection on every page load)
  const cached = readCache()
  if (cached) {
    return { countryCode: cached, currency: getCurrencyConfig(cached), isDetecting: false, detectionMethod: 'cached' }
  }

  // 2. Browser locale (synchronous, instant)
  const fromLocale = detectFromLocale()
  if (fromLocale) {
    cacheCountry(fromLocale)
    return { countryCode: fromLocale, currency: getCurrencyConfig(fromLocale), isDetecting: false, detectionMethod: 'locale' }
  }

  // 3. Timezone (synchronous, instant)
  const fromTz = detectFromTimezone()
  if (fromTz) {
    cacheCountry(fromTz)
    return { countryCode: fromTz, currency: getCurrencyConfig(fromTz), isDetecting: false, detectionMethod: 'timezone' }
  }

  // 4. Need async IP detection — show default until resolved
  return { countryCode: 'DEFAULT', currency: CURRENCY_MAP.DEFAULT, isDetecting: true, detectionMethod: 'default' }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useGeolocatedCurrency() {
  const [state, setState] = useState<GeoState>(buildInitialState)

  // If sync detection was insufficient, try the IP API once after mount
  useEffect(() => {
    if (!state.isDetecting) return
    let cancelled = false

    detectFromIP().then(code => {
      if (cancelled) return
      if (code) {
        cacheCountry(code)
        setState({ countryCode: code, currency: getCurrencyConfig(code), isDetecting: false, detectionMethod: 'ip' })
      } else {
        setState(s => ({ ...s, isDetecting: false }))
      }
    })

    return () => { cancelled = true }
  }, [state.isDetecting])

  const setCountry = useCallback((code: string) => {
    cacheCountry(code)
    setState({ countryCode: code, currency: getCurrencyConfig(code), isDetecting: false, detectionMethod: 'manual' })
  }, [])

  return { ...state, setCountry }
}
