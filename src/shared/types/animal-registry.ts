import type { BaseEntity } from './base'

export type AnimalSex = 'male' | 'female' | 'unknown'
export type AnimalStatus = 'active' | 'sold' | 'deceased' | 'transferred'
export type AnimalEventType =
  | 'birth' | 'weaning' | 'breeding' | 'pregnancy_confirmed'
  | 'farrowing' | 'treatment' | 'sold' | 'deceased' | 'transferred' | 'other'

export interface AnimalRecord extends BaseEntity {
  enterpriseInstanceId: string
  organizationId: string
  tagId: string
  name?: string
  sex: AnimalSex
  birthDate?: string        // YYYY-MM-DD
  damId?: string            // AnimalRecord.id of mother
  sireId?: string           // AnimalRecord.id of father
  breedOrStrain?: string
  acquisitionDate: string   // YYYY-MM-DD
  acquisitionCostCents?: number
  status: AnimalStatus
  notes?: string
}

export interface AnimalWeightEntry extends BaseEntity {
  animalId: string
  enterpriseInstanceId: string
  organizationId: string
  date: string              // YYYY-MM-DD
  weightKg: number
  bodyConditionScore?: number   // 1–5 BCS
  notes?: string
}

export interface AnimalEvent extends BaseEntity {
  animalId: string
  enterpriseInstanceId: string
  organizationId: string
  date: string
  eventType: AnimalEventType
  description?: string
  amountCents?: number
  notes?: string
}
