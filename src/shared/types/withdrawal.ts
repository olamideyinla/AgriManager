import type { BaseEntity } from './base'

export interface WithdrawalRecord extends BaseEntity {
  enterpriseInstanceId: string
  medicationName: string
  activeIngredient?: string
  treatmentDate: string       // YYYY-MM-DD — last day of treatment
  withdrawalDays: number      // days from label
  withdrawalEndDate: string   // treatmentDate + withdrawalDays (YYYY-MM-DD)
  affectsMeat: boolean
  affectsEggs: boolean
  affectsMilk: boolean
  numberOfAnimals?: number
  animalTagIds?: string       // comma-separated tag IDs
  notes?: string
  recordedBy: string
}
