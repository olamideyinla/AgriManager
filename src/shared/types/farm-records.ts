import type { BaseEntity } from './base'

export interface BatchCloseout extends BaseEntity {
  enterpriseInstanceId: string
  organizationId: string
  closeoutDate: string                  // YYYY-MM-DD
  totalDays: number
  finalCount: number
  totalDeaths: number
  mortalityRate: number                 // percentage
  totalEggsProduced?: number            // layers only
  totalFeedConsumedKg: number
  avgFCR?: number
  totalRevenueCents: number
  totalFeedCostCents: number
  netProfitCents: number
  notes?: string
}

export interface ThinningRecord extends BaseEntity {
  enterpriseInstanceId: string
  organizationId: string
  date: string
  count: number
  avgWeightKg?: number
  reason?: string
  disposal: 'sold' | 'culled' | 'transferred'
  proceedsAmountCents: number
  notes?: string
}

export interface PlacementRecord extends BaseEntity {
  enterpriseInstanceId: string
  organizationId: string
  placementDate: string
  count: number
  source?: string
  supplier?: string
  unitCostCents: number
  totalCostCents: number
  avgInitialWeightG?: number
  breedOrStrain?: string
  notes?: string
}

export interface FishStockingRecord extends BaseEntity {
  enterpriseInstanceId: string
  organizationId: string
  stockingDate: string
  species?: string
  count: number
  avgWeightG?: number
  source?: string
  supplier?: string
  pricePerKgCents: number
  totalCostCents: number
  notes?: string
}

export interface LitterConditionLog extends BaseEntity {
  enterpriseInstanceId: string
  organizationId: string
  date: string
  condition: 'good' | 'wet' | 'dry' | 'caked'
  ammoniaLevel?: 'low' | 'medium' | 'high'
  action: 'none' | 'turned' | 'replaced' | 'material_added'
  materialAdded?: string
  materialAmountKg?: number
  notes?: string
}

export interface SoilTestRecord extends BaseEntity {
  enterpriseInstanceId: string
  organizationId: string
  testDate: string
  lab?: string
  ph?: number
  nitrogenKgHa?: number
  phosphorusKgHa?: number
  potassiumKgHa?: number
  organicMatterPct?: number
  recommendation?: string
  notes?: string
}

export interface PostHarvestRecord extends BaseEntity {
  enterpriseInstanceId: string
  organizationId: string
  date: string
  totalHarvestKg: number
  gradeAKg?: number
  gradeBKg?: number
  gradeCKg?: number
  storedKg?: number
  soldKg?: number
  wasteKg?: number
  storageLocation?: string
  storageMethod?: string
  processingMethod?: string
  notes?: string
}
