import type { BaseEntity } from './base'

export type MachineCategory =
  | 'generator' | 'pump' | 'tractor' | 'vehicle' | 'processing'
  | 'irrigation' | 'sprayer' | 'incubator' | 'cold_storage' | 'feed_mill'
  | 'tools' | 'other'

export type MachineStatus = 'active' | 'under_repair' | 'idle' | 'retired' | 'sold'

export type FuelType = 'petrol' | 'diesel' | 'electric' | 'solar' | 'manual' | 'none'

export type DepreciationMethod = 'straight_line' | 'none'

export interface Machine extends BaseEntity {
  organizationId: string
  name: string
  category: MachineCategory
  make: string | null
  model: string | null
  serialNumber: string | null
  yearOfManufacture: number | null
  purchaseDate: string | null // YYYY-MM-DD
  purchasePrice: number | null
  currentEstimatedValue: number | null
  depreciationMethod: DepreciationMethod
  usefulLifeYears: number | null
  residualValue: number | null
  fuelType: FuelType | null
  fuelCapacityLiters: number | null
  averageFuelConsumption: string | null
  hoursCounter: number | null
  odometerKm: number | null
  assignedLocationId: string | null
  assignedEnterpriseIds: string[]
  status: MachineStatus
  photoUrl: string | null
  insuranceProvider: string | null
  insurancePolicyNumber: string | null
  insuranceExpiryDate: string | null
  notes: string | null
}

export type MaintenanceIntervalType = 'hours' | 'days' | 'km' | 'months'

export interface MaintenanceSchedule extends BaseEntity {
  machineId: string
  name: string
  intervalType: MaintenanceIntervalType
  intervalValue: number
  lastPerformedDate: string | null
  lastPerformedHours: number | null
  lastPerformedKm: number | null
  nextDueDate: string | null
  nextDueHours: number | null
  nextDueKm: number | null
  estimatedCost: number | null
  notes: string | null
}

export type MaintenanceType = 'scheduled' | 'repair' | 'overhaul' | 'inspection' | 'emergency'

export interface MaintenancePart {
  name: string
  partNumber: string | null
  quantity: number
  unitCost: number
  totalCost: number
}

export interface MaintenanceRecord extends BaseEntity {
  machineId: string
  scheduleId: string | null
  date: string // YYYY-MM-DD
  type: MaintenanceType
  description: string
  partsUsed: MaintenancePart[]
  laborDescription: string | null
  laborCost: number | null
  partsCost: number | null
  totalCost: number
  otherCost: number | null
  performedBy: string | null
  workshopName: string | null
  hourMeterReading: number | null
  odometerReading: number | null
  downtimeDays: number | null
  nextActionRequired: string | null
  photoUrls: string[]
  linkedFinancialTransactionId: string | null
  notes: string | null
}

export interface FuelLog extends BaseEntity {
  machineId: string
  date: string // YYYY-MM-DD
  quantity: number // liters
  unitCost: number
  totalCost: number
  hourMeterReading: number | null
  odometerReading: number | null
  fuelType: string
  supplier: string | null
  receiptReference: string | null
  enterpriseInstanceId: string | null
  linkedFinancialTransactionId: string | null
  notes: string | null
}

export interface UsageLog extends BaseEntity {
  machineId: string
  date: string // YYYY-MM-DD
  hoursUsed: number | null
  kmDriven: number | null
  purpose: string
  enterpriseInstanceId: string | null
  operatedBy: string | null
  notes: string | null
}
