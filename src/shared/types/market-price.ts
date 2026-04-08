import type { BaseEntity } from './base'

export interface MarketPrice extends BaseEntity {
  organizationId: string
  commodity: string     // e.g. 'Eggs (dozen)', 'Broiler live weight per kg'
  pricePerUnit: number  // in org currency
  unit: string          // 'dozen', 'kg', 'liter', 'head', etc.
  priceDate: string     // YYYY-MM-DD
  source?: string       // 'local_market', 'cooperative', 'exporter', etc.
  notes?: string
}
