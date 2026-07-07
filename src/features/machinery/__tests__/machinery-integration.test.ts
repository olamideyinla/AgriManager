import { describe, it, expect, beforeEach } from 'vitest'
import { format, subDays } from 'date-fns'
import { db } from '../../../core/database/db'
import { newId, nowIso } from '../../../shared/types/base'
import { seedOrgHierarchy } from '../../../test-utils/test-db'
import { AlertEngine } from '../../../core/services/alert-engine'
import { AlertRuleId } from '../../../core/config/constants'
import { calculateNextMaintenanceDue } from '../services/machinery-calculator'
import type { Machine } from '../../../shared/types'

function baseMachine(orgId: string, overrides: Partial<Machine> = {}): Machine {
  const now = nowIso()
  return {
    id: newId(),
    organizationId: orgId,
    name: 'Generator — 10KVA',
    category: 'generator',
    make: null, model: null, serialNumber: null, yearOfManufacture: null,
    purchaseDate: null, purchasePrice: null,
    currentEstimatedValue: null,
    depreciationMethod: 'none',
    usefulLifeYears: null, residualValue: null,
    fuelType: 'diesel', fuelCapacityLiters: null, averageFuelConsumption: null,
    hoursCounter: null, odometerKm: null,
    assignedLocationId: null, assignedEnterpriseIds: [],
    status: 'active',
    photoUrl: null,
    insuranceProvider: null, insurancePolicyNumber: null, insuranceExpiryDate: null,
    notes: null,
    createdAt: now, updatedAt: now, syncStatus: 'pending',
    ...overrides,
  }
}

let orgId: string

beforeEach(async () => {
  const { org } = await seedOrgHierarchy()
  orgId = org.id
})

describe('Machine creation', () => {
  it('persists a machine to IndexedDB', async () => {
    const machine = baseMachine(orgId, { purchasePrice: 450_000, purchaseDate: '2023-03-01' })
    await db.machines.put(machine)

    const stored = await db.machines.get(machine.id)
    expect(stored).toBeDefined()
    expect(stored?.name).toBe('Generator — 10KVA')
    expect(stored?.organizationId).toBe(orgId)
  })

  it('auto-creates a financial transaction for the purchase price', async () => {
    const machine = baseMachine(orgId, { purchasePrice: 450_000, purchaseDate: '2023-03-01' })
    await db.machines.put(machine)
    await db.financialTransactions.add({
      id: newId(),
      organizationId: orgId,
      date: machine.purchaseDate!,
      type: 'expense',
      category: 'equipment',
      amount: machine.purchasePrice!,
      paymentMethod: 'cash',
      notes: `Purchase: ${machine.name}`,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      syncStatus: 'pending',
    })

    const txns = await db.financialTransactions.where('organizationId').equals(orgId).toArray()
    expect(txns).toHaveLength(1)
    expect(txns[0].category).toBe('equipment')
    expect(txns[0].amount).toBe(450_000)
  })
})

describe('Maintenance recording', () => {
  it('creates a maintenance record linked to an auto-created financial transaction', async () => {
    const machine = baseMachine(orgId)
    await db.machines.put(machine)

    const txnId = newId()
    const now = nowIso()
    await db.financialTransactions.add({
      id: txnId,
      organizationId: orgId,
      date: '2026-01-15',
      type: 'expense',
      category: 'equipment',
      amount: 25_000,
      paymentMethod: 'cash',
      notes: `Maintenance: ${machine.name}`,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    })
    await db.maintenanceRecords.add({
      id: newId(),
      machineId: machine.id,
      scheduleId: null,
      date: '2026-01-15',
      type: 'repair',
      description: 'Replaced fan belt',
      partsUsed: [{ name: 'Fan belt', partNumber: null, quantity: 1, unitCost: 15_000, totalCost: 15_000 }],
      laborDescription: null,
      laborCost: 10_000,
      partsCost: 15_000,
      totalCost: 25_000,
      otherCost: null,
      performedBy: 'in-house',
      workshopName: null,
      hourMeterReading: null,
      odometerReading: null,
      downtimeDays: 1,
      nextActionRequired: null,
      photoUrls: [],
      linkedFinancialTransactionId: txnId,
      notes: null,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    })

    const records = await db.maintenanceRecords.where('machineId').equals(machine.id).toArray()
    expect(records).toHaveLength(1)
    expect(records[0].linkedFinancialTransactionId).toBe(txnId)

    const txn = await db.financialTransactions.get(txnId)
    expect(txn?.category).toBe('equipment')
    expect(txn?.amount).toBe(25_000)
  })
})

describe('Fuel logging', () => {
  it('creates a fuel log linked to an auto-created financial transaction (category: fuel)', async () => {
    const machine = baseMachine(orgId)
    await db.machines.put(machine)

    const txnId = newId()
    const now = nowIso()
    await db.financialTransactions.add({
      id: txnId,
      organizationId: orgId,
      date: '2026-02-01',
      type: 'expense',
      category: 'fuel',
      amount: 60_000,
      paymentMethod: 'cash',
      notes: `Fuel: ${machine.name}`,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    })
    await db.fuelLogs.add({
      id: newId(),
      machineId: machine.id,
      date: '2026-02-01',
      quantity: 50,
      unitCost: 1200,
      totalCost: 60_000,
      hourMeterReading: null,
      odometerReading: null,
      fuelType: 'diesel',
      supplier: null,
      receiptReference: null,
      enterpriseInstanceId: null,
      linkedFinancialTransactionId: txnId,
      notes: null,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    })

    const logs = await db.fuelLogs.where('machineId').equals(machine.id).toArray()
    expect(logs).toHaveLength(1)

    const txn = await db.financialTransactions.get(txnId)
    expect(txn?.category).toBe('fuel')
    expect(txn?.amount).toBe(60_000)
  })
})

describe('Maintenance schedule due-date calculation', () => {
  it('calculates next due date correctly from a stored schedule', async () => {
    const machine = baseMachine(orgId)
    await db.machines.put(machine)

    const lastPerformedDate = format(subDays(new Date(), 85), 'yyyy-MM-dd')
    const now = nowIso()
    const scheduleId = newId()
    await db.maintenanceSchedules.add({
      id: scheduleId,
      machineId: machine.id,
      name: 'Full Service',
      intervalType: 'days',
      intervalValue: 90,
      lastPerformedDate,
      lastPerformedHours: null,
      lastPerformedKm: null,
      nextDueDate: null,
      nextDueHours: null,
      nextDueKm: null,
      estimatedCost: null,
      notes: null,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    })

    const schedule = await db.maintenanceSchedules.get(scheduleId)
    const due = calculateNextMaintenanceDue(schedule!, machine)
    expect(due.daysUntilDue).toBe(5)
    expect(due.isOverdue).toBe(false)
  })
})

describe('Hour meter update re-evaluates overdue status', () => {
  it('flags a schedule as overdue once the machine hour meter passes the due threshold', async () => {
    const machine = baseMachine(orgId, { hoursCounter: 2600 })
    await db.machines.put(machine)

    const now = nowIso()
    const scheduleId = newId()
    await db.maintenanceSchedules.add({
      id: scheduleId,
      machineId: machine.id,
      name: 'Oil Change',
      intervalType: 'hours',
      intervalValue: 250,
      lastPerformedDate: null,
      lastPerformedHours: 2600,
      lastPerformedKm: null,
      nextDueDate: null,
      nextDueHours: null,
      nextDueKm: null,
      estimatedCost: null,
      notes: null,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    })

    // Before more usage: not yet due
    let schedule = await db.maintenanceSchedules.get(scheduleId)
    let due = calculateNextMaintenanceDue(schedule!, machine)
    expect(due.isOverdue).toBe(false)
    expect(due.hoursUntilDue).toBe(250)

    // Simulate usage pushing the hour meter past the threshold
    await db.machines.update(machine.id, { hoursCounter: 2900, updatedAt: nowIso(), syncStatus: 'pending' })
    const updatedMachine = await db.machines.get(machine.id)
    schedule = await db.maintenanceSchedules.get(scheduleId)
    due = calculateNextMaintenanceDue(schedule!, updatedMachine!)
    expect(due.isOverdue).toBe(true)
    expect(due.hoursUntilDue).toBe(-50)
  })

  it('raises a high-severity alert once maintenance is overdue', async () => {
    const machine = baseMachine(orgId, { hoursCounter: 2900 })
    await db.machines.put(machine)

    const now = nowIso()
    const scheduleId = newId()
    await db.maintenanceSchedules.add({
      id: scheduleId,
      machineId: machine.id,
      name: 'Oil Change',
      intervalType: 'hours',
      intervalValue: 250,
      lastPerformedDate: null,
      lastPerformedHours: 2600,
      lastPerformedKm: null,
      nextDueDate: null,
      nextDueHours: null,
      nextDueKm: null,
      estimatedCost: null,
      notes: null,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    })

    const engine = new AlertEngine()
    await engine.checkAlerts(orgId)

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const alertCount = await (db.alerts as any)
      .filter((a: any) => a.ruleId === AlertRuleId.machineryMaintenanceOverdue(scheduleId))
      .count()
    /* eslint-enable @typescript-eslint/no-explicit-any */
    expect(alertCount).toBe(1)
  })
})
