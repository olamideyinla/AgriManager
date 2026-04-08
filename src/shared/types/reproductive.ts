import type { BaseEntity } from './base'

export type ReproductiveEventType =
  | 'heat_observed'
  | 'service_natural'
  | 'service_ai'
  | 'pregnancy_check_positive'
  | 'pregnancy_check_negative'
  | 'farrowing'
  | 'calving'
  | 'kindling'
  | 'weaning'
  | 'dry_off'
  | 'abortion'

export interface ReproductiveEvent extends BaseEntity {
  enterpriseInstanceId: string
  animalId?: string         // optional link to individual animal record
  animalTagId?: string      // tag/ear number for quick reference
  eventType: ReproductiveEventType
  eventDate: string         // YYYY-MM-DD
  litterSize?: number       // total born (farrowing/calving/kindling)
  litterSizeAlive?: number  // born alive
  maleCount?: number
  femaleCount?: number
  weaningWeight?: number    // kg average at weaning
  gestationDays?: number    // days from service to birth
  sireTagId?: string        // father ID for AI/service records
  damTagId?: string         // mother ID
  notes?: string
  recordedBy: string
}
