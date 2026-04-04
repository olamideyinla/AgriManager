import type { CountryPayrollProfile } from '../../../shared/types/payroll'
import { NIGERIA_PROFILE } from './nigeria'
import { KENYA_PROFILE } from './kenya'
import { GHANA_PROFILE } from './ghana'

export { NIGERIA_PROFILE } from './nigeria'
export { KENYA_PROFILE }   from './kenya'
export { GHANA_PROFILE }   from './ghana'

export const COUNTRY_PROFILES: Record<string, CountryPayrollProfile> = {
  NG: NIGERIA_PROFILE,
  KE: KENYA_PROFILE,
  GH: GHANA_PROFILE,
}

export function getPayrollProfile(countryCode: string): CountryPayrollProfile | null {
  return COUNTRY_PROFILES[countryCode] ?? null
}

export function getSupportedPayrollCountries(): { code: string; name: string }[] {
  return Object.entries(COUNTRY_PROFILES).map(([code, p]) => ({ code, name: p.countryName }))
}
