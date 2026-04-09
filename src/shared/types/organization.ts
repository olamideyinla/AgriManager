import type { BaseEntity } from './base'

export interface Organization extends BaseEntity {
  name: string
  registrationNumber?: string
  taxId?: string
  /** ISO 4217 currency code, default 'USD' */
  currency: string
  defaultUnitSystem: 'metric' | 'imperial'
  /** Base64 data URL or external URL for farm logo — shown on POs, invoices, receipts */
  logoUrl?: string
}
