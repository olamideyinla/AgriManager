import { addDays, addMonths, differenceInCalendarDays, differenceInCalendarMonths, format, parseISO } from 'date-fns'
import type { Machine, MaintenanceSchedule, MaintenanceRecord, FuelLog, UsageLog } from '../../../shared/types'

// ── Depreciation ──────────────────────────────────────────────────────────────

export interface DepreciationResult {
  method: 'straight_line' | 'none'
  currentBookValue: number
  annualDepreciation: number
  monthlyDepreciation: number
  accumulatedDepreciation: number
  percentDepreciated: number
}

export function calculateDepreciation(machine: Machine): DepreciationResult {
  const purchasePrice = machine.purchasePrice ?? 0

  if (
    machine.depreciationMethod === 'none' ||
    machine.purchasePrice == null ||
    machine.usefulLifeYears == null ||
    machine.usefulLifeYears <= 0
  ) {
    return {
      method: 'none',
      currentBookValue: purchasePrice,
      annualDepreciation: 0,
      monthlyDepreciation: 0,
      accumulatedDepreciation: 0,
      percentDepreciated: 0,
    }
  }

  const residualValue = machine.residualValue ?? 0
  const depreciableBase = Math.max(0, machine.purchasePrice - residualValue)
  const annualDepreciation = depreciableBase / machine.usefulLifeYears
  const monthlyDepreciation = annualDepreciation / 12

  const monthsOwned = machine.purchaseDate
    ? Math.max(0, differenceInCalendarMonths(new Date(), parseISO(machine.purchaseDate)))
    : 0

  const accumulatedDepreciation = Math.min(monthlyDepreciation * monthsOwned, depreciableBase)
  const currentBookValue = machine.purchasePrice - accumulatedDepreciation
  const percentDepreciated = depreciableBase > 0 ? (accumulatedDepreciation / depreciableBase) * 100 : 0

  return {
    method: 'straight_line',
    currentBookValue,
    annualDepreciation,
    monthlyDepreciation,
    accumulatedDepreciation,
    percentDepreciated,
  }
}

// ── Total cost of ownership ────────────────────────────────────────────────────

export interface TotalCostOfOwnershipResult {
  totalCost: number
  monthlyCostOfOwnership: number
  costPerHour: number | null
  costPerKm: number | null
  breakdown: { purchase: number; maintenance: number; fuel: number; insurance: number }
}

export function calculateTotalCostOfOwnership(
  machine: Machine,
  maintenanceRecords: MaintenanceRecord[],
  fuelLogs: FuelLog[],
  insuranceCost = 0,
): TotalCostOfOwnershipResult {
  const purchaseCost = machine.purchasePrice ?? 0
  const totalMaintenanceCost = maintenanceRecords.reduce((s, r) => s + r.totalCost, 0)
  const totalFuelCost = fuelLogs.reduce((s, f) => s + f.totalCost, 0)
  const totalCost = purchaseCost + totalMaintenanceCost + totalFuelCost + insuranceCost

  const monthsOwned = machine.purchaseDate
    ? Math.max(1, differenceInCalendarMonths(new Date(), parseISO(machine.purchaseDate)))
    : 1
  const monthlyCostOfOwnership = totalCost / monthsOwned

  const costPerHour = machine.hoursCounter != null && machine.hoursCounter > 0
    ? totalCost / machine.hoursCounter
    : null
  const costPerKm = machine.odometerKm != null && machine.odometerKm > 0
    ? totalCost / machine.odometerKm
    : null

  return {
    totalCost,
    monthlyCostOfOwnership,
    costPerHour,
    costPerKm,
    breakdown: { purchase: purchaseCost, maintenance: totalMaintenanceCost, fuel: totalFuelCost, insurance: insuranceCost },
  }
}

// ── Next maintenance due ───────────────────────────────────────────────────────

export interface NextMaintenanceDueResult {
  nextDueDate: string | null
  nextDueHours: number | null
  nextDueKm: number | null
  isOverdue: boolean
  daysUntilDue: number | null
  hoursUntilDue: number | null
  kmUntilDue: number | null
}

export function calculateNextMaintenanceDue(
  schedule: MaintenanceSchedule,
  machine: Machine,
  avgHoursPerDay?: number,
): NextMaintenanceDueResult {
  let nextDueDate: string | null = null
  let nextDueHours: number | null = null
  let nextDueKm: number | null = null

  if (schedule.intervalType === 'days' && schedule.lastPerformedDate) {
    nextDueDate = format(addDays(parseISO(schedule.lastPerformedDate), schedule.intervalValue), 'yyyy-MM-dd')
  } else if (schedule.intervalType === 'months' && schedule.lastPerformedDate) {
    nextDueDate = format(addMonths(parseISO(schedule.lastPerformedDate), schedule.intervalValue), 'yyyy-MM-dd')
  } else if (schedule.intervalType === 'hours' && schedule.lastPerformedHours != null) {
    nextDueHours = schedule.lastPerformedHours + schedule.intervalValue
    if (avgHoursPerDay && avgHoursPerDay > 0 && machine.hoursCounter != null) {
      const hoursRemaining = nextDueHours - machine.hoursCounter
      nextDueDate = format(addDays(new Date(), Math.ceil(hoursRemaining / avgHoursPerDay)), 'yyyy-MM-dd')
    }
  } else if (schedule.intervalType === 'km' && schedule.lastPerformedKm != null) {
    nextDueKm = schedule.lastPerformedKm + schedule.intervalValue
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let daysUntilDue: number | null = null
  let hoursUntilDue: number | null = null
  let kmUntilDue: number | null = null
  let isOverdue = false

  if (nextDueDate) {
    daysUntilDue = differenceInCalendarDays(parseISO(nextDueDate), today)
    isOverdue = daysUntilDue < 0
  }
  if (nextDueHours != null && machine.hoursCounter != null) {
    hoursUntilDue = nextDueHours - machine.hoursCounter
    if (hoursUntilDue < 0) isOverdue = true
  }
  if (nextDueKm != null && machine.odometerKm != null) {
    kmUntilDue = nextDueKm - machine.odometerKm
    if (kmUntilDue < 0) isOverdue = true
  }

  return { nextDueDate, nextDueHours, nextDueKm, isOverdue, daysUntilDue, hoursUntilDue, kmUntilDue }
}

// ── Fuel efficiency ─────────────────────────────────────────────────────────────

export interface FuelEfficiencyResult {
  totalFuelLiters: number
  totalFuelCost: number
  totalHours: number
  totalKm: number
  litersPerHour: number | null
  litersPerKm: number | null
  kmPerLiter: number | null
  fuelCostPerHour: number | null
}

export function calculateFuelEfficiency(fuelLogs: FuelLog[], usageLogs: UsageLog[]): FuelEfficiencyResult {
  const totalFuelLiters = fuelLogs.reduce((s, f) => s + f.quantity, 0)
  const totalFuelCost = fuelLogs.reduce((s, f) => s + f.totalCost, 0)
  const totalHours = usageLogs.reduce((s, u) => s + (u.hoursUsed ?? 0), 0)
  const totalKm = usageLogs.reduce((s, u) => s + (u.kmDriven ?? 0), 0)

  return {
    totalFuelLiters,
    totalFuelCost,
    totalHours,
    totalKm,
    litersPerHour: totalHours > 0 ? totalFuelLiters / totalHours : null,
    litersPerKm: totalKm > 0 ? totalFuelLiters / totalKm : null,
    kmPerLiter: totalFuelLiters > 0 && totalKm > 0 ? totalKm / totalFuelLiters : null,
    fuelCostPerHour: totalHours > 0 ? totalFuelCost / totalHours : null,
  }
}
