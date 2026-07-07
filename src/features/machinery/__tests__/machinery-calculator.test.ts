import { describe, it, expect } from 'vitest'
import { addMonths, format, subDays } from 'date-fns'
import {
  calculateDepreciation,
  calculateTotalCostOfOwnership,
  calculateNextMaintenanceDue,
  calculateFuelEfficiency,
} from '../services/machinery-calculator'
import type { Machine, MaintenanceSchedule, MaintenanceRecord, FuelLog, UsageLog } from '../../../shared/types'

function baseMachine(overrides: Partial<Machine> = {}): Machine {
  return {
    id: 'm1',
    organizationId: 'org1',
    name: 'Test Machine',
    category: 'generator',
    make: null, model: null, serialNumber: null, yearOfManufacture: null,
    purchaseDate: null, purchasePrice: null,
    currentEstimatedValue: null,
    depreciationMethod: 'none',
    usefulLifeYears: null, residualValue: null,
    fuelType: null, fuelCapacityLiters: null, averageFuelConsumption: null,
    hoursCounter: null, odometerKm: null,
    assignedLocationId: null, assignedEnterpriseIds: [],
    status: 'active',
    photoUrl: null,
    insuranceProvider: null, insurancePolicyNumber: null, insuranceExpiryDate: null,
    notes: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), syncStatus: 'pending',
    ...overrides,
  }
}

function baseSchedule(overrides: Partial<MaintenanceSchedule> = {}): MaintenanceSchedule {
  return {
    id: 's1', machineId: 'm1', name: 'Oil Change',
    intervalType: 'hours', intervalValue: 250,
    lastPerformedDate: null, lastPerformedHours: null, lastPerformedKm: null,
    nextDueDate: null, nextDueHours: null, nextDueKm: null,
    estimatedCost: null, notes: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), syncStatus: 'pending',
    ...overrides,
  }
}

describe('calculateDepreciation', () => {
  it('computes straight-line book value for a machine purchased 3 years ago', () => {
    const purchaseDate = format(addMonths(new Date(), -36), 'yyyy-MM-dd')
    const machine = baseMachine({
      depreciationMethod: 'straight_line',
      purchasePrice: 500_000,
      usefulLifeYears: 10,
      residualValue: 50_000,
      purchaseDate,
    })
    const result = calculateDepreciation(machine)
    expect(result.accumulatedDepreciation).toBeCloseTo(135_000, 0)
    expect(result.currentBookValue).toBeCloseTo(365_000, 0)
  })

  it('caps book value at residual value once past useful life', () => {
    const purchaseDate = format(addMonths(new Date(), -200), 'yyyy-MM-dd')
    const machine = baseMachine({
      depreciationMethod: 'straight_line',
      purchasePrice: 500_000,
      usefulLifeYears: 10,
      residualValue: 50_000,
      purchaseDate,
    })
    const result = calculateDepreciation(machine)
    expect(result.currentBookValue).toBeCloseTo(50_000, 0)
    expect(result.currentBookValue).toBeGreaterThanOrEqual(50_000 - 0.01)
  })

  it('returns purchase price as book value when method is none', () => {
    const machine = baseMachine({ depreciationMethod: 'none', purchasePrice: 500_000 })
    const result = calculateDepreciation(machine)
    expect(result.method).toBe('none')
    expect(result.currentBookValue).toBe(500_000)
    expect(result.accumulatedDepreciation).toBe(0)
  })
})

describe('calculateTotalCostOfOwnership', () => {
  it('computes monthly cost of ownership over 24 months', () => {
    const purchaseDate = format(addMonths(new Date(), -24), 'yyyy-MM-dd')
    const machine = baseMachine({ purchasePrice: 500_000, purchaseDate })
    const maintenance: MaintenanceRecord[] = [
      { id: 'r1', machineId: 'm1', scheduleId: null, date: '2026-01-01', type: 'repair',
        description: 'x', partsUsed: [], laborDescription: null, laborCost: null, partsCost: null,
        totalCost: 80_000, otherCost: null, performedBy: null, workshopName: null,
        hourMeterReading: null, odometerReading: null, downtimeDays: null, nextActionRequired: null,
        photoUrls: [], linkedFinancialTransactionId: null, notes: null,
        createdAt: '', updatedAt: '', syncStatus: 'pending' },
    ]
    const fuel: FuelLog[] = [
      { id: 'f1', machineId: 'm1', date: '2026-01-01', quantity: 100, unitCost: 1200, totalCost: 120_000,
        hourMeterReading: null, odometerReading: null, fuelType: 'diesel', supplier: null,
        receiptReference: null, enterpriseInstanceId: null, linkedFinancialTransactionId: null, notes: null,
        createdAt: '', updatedAt: '', syncStatus: 'pending' },
    ]
    const result = calculateTotalCostOfOwnership(machine, maintenance, fuel)
    expect(result.totalCost).toBe(700_000)
    expect(result.monthlyCostOfOwnership).toBeCloseTo(29_166.67, 1)
  })

  it('computes cost per hour from the machine hour meter', () => {
    const machine = baseMachine({ purchasePrice: 500_000, hoursCounter: 2847, purchaseDate: '2020-01-01' })
    const maintenance: MaintenanceRecord[] = [
      { id: 'r1', machineId: 'm1', scheduleId: null, date: '2026-01-01', type: 'repair',
        description: 'x', partsUsed: [], laborDescription: null, laborCost: null, partsCost: null,
        totalCost: 80_000, otherCost: null, performedBy: null, workshopName: null,
        hourMeterReading: null, odometerReading: null, downtimeDays: null, nextActionRequired: null,
        photoUrls: [], linkedFinancialTransactionId: null, notes: null,
        createdAt: '', updatedAt: '', syncStatus: 'pending' },
    ]
    const fuel: FuelLog[] = [
      { id: 'f1', machineId: 'm1', date: '2026-01-01', quantity: 100, unitCost: 1200, totalCost: 120_000,
        hourMeterReading: null, odometerReading: null, fuelType: 'diesel', supplier: null,
        receiptReference: null, enterpriseInstanceId: null, linkedFinancialTransactionId: null, notes: null,
        createdAt: '', updatedAt: '', syncStatus: 'pending' },
    ]
    const result = calculateTotalCostOfOwnership(machine, maintenance, fuel)
    expect(result.costPerHour).toBeCloseTo(245.87, 1)
  })
})

describe('calculateFuelEfficiency', () => {
  it('computes liters per hour', () => {
    const fuelLogs: FuelLog[] = [
      { id: 'f1', machineId: 'm1', date: '2026-01-01', quantity: 500, unitCost: 1, totalCost: 500,
        hourMeterReading: null, odometerReading: null, fuelType: 'diesel', supplier: null,
        receiptReference: null, enterpriseInstanceId: null, linkedFinancialTransactionId: null, notes: null,
        createdAt: '', updatedAt: '', syncStatus: 'pending' },
    ]
    const usageLogs: UsageLog[] = [
      { id: 'u1', machineId: 'm1', date: '2026-01-01', hoursUsed: 200, kmDriven: null,
        purpose: 'x', enterpriseInstanceId: null, operatedBy: null, notes: null,
        createdAt: '', updatedAt: '', syncStatus: 'pending' },
    ]
    const result = calculateFuelEfficiency(fuelLogs, usageLogs)
    expect(result.litersPerHour).toBeCloseTo(2.5, 5)
  })
})

describe('calculateNextMaintenanceDue', () => {
  it('reports hours remaining when interval is hours-based', () => {
    const schedule = baseSchedule({ intervalType: 'hours', intervalValue: 250, lastPerformedHours: 2600 })
    const machine = baseMachine({ hoursCounter: 2830 }) // 230 hours since last service
    const result = calculateNextMaintenanceDue(schedule, machine)
    expect(result.nextDueHours).toBe(2850)
    expect(result.hoursUntilDue).toBe(20)
    expect(result.isOverdue).toBe(false)
  })

  it('reports days remaining when interval is days-based and not yet due', () => {
    const lastPerformedDate = format(subDays(new Date(), 85), 'yyyy-MM-dd')
    const schedule = baseSchedule({ intervalType: 'days', intervalValue: 90, lastPerformedDate })
    const machine = baseMachine()
    const result = calculateNextMaintenanceDue(schedule, machine)
    expect(result.daysUntilDue).toBe(5)
    expect(result.isOverdue).toBe(false)
  })

  it('flags overdue when the interval has passed', () => {
    const lastPerformedDate = format(subDays(new Date(), 100), 'yyyy-MM-dd')
    const schedule = baseSchedule({ intervalType: 'days', intervalValue: 90, lastPerformedDate })
    const machine = baseMachine()
    const result = calculateNextMaintenanceDue(schedule, machine)
    expect(result.daysUntilDue).toBe(-10)
    expect(result.isOverdue).toBe(true)
  })
})
