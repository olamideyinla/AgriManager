import type { BaseEntity } from './base'

export interface Organization extends BaseEntity {
  name: string
  registrationNumber?: string
  taxId?: string
  /** CURRENCY_MAP country key (e.g. 'NG', 'KE') — single source of truth for currency */
  country?: string
  /** ISO 4217 currency code derived from country at signup, default 'USD' */
  currency: string
  defaultUnitSystem: 'metric' | 'imperial'
  /** Base64 data URL or external URL for farm logo — shown on POs, invoices, receipts */
  logoUrl?: string
}
