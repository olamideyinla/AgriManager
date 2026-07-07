import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { calculateNextMaintenanceDue } from '../../../features/machinery/services/machinery-calculator'
import type { Machine, MaintenanceSchedule, MaintenanceRecord, FuelLog, UsageLog } from '../../../shared/types'

// ── useMachines ───────────────────────────────────────────────────────────────

export function useMachines(organizationId: string | undefined): Machine[] | undefined {
  return useLiveQuery(async () => {
    if (!organizationId) return []
    return db.machines.where('organizationId').equals(organizationId).sortBy('name')
  }, [organizationId])
}

export function useMachine(machineId: string | undefined): Machine | undefined {
  return useLiveQuery(async () => {
    if (!machineId) return undefined
    return db.machines.get(machineId)
  }, [machineId])
}

// ── Maintenance ───────────────────────────────────────────────────────────────

export function useMaintenanceSchedules(machineId: string | undefined): MaintenanceSchedule[] | undefined {
  return useLiveQuery(async () => {
    if (!machineId) return []
    return db.maintenanceSchedules.where('machineId').equals(machineId).toArray()
  }, [machineId])
}

export function useMaintenanceRecords(machineId: string | undefined): MaintenanceRecord[] | undefined {
  return useLiveQuery(async () => {
    if (!machineId) return []
    const rows = await db.maintenanceRecords.where('machineId').equals(machineId).toArray()
    return rows.sort((a, b) => b.date.localeCompare(a.date))
  }, [machineId])
}

// ── Fuel & usage ──────────────────────────────────────────────────────────────

export function useFuelLogs(machineId: string | undefined): FuelLog[] | undefined {
  return useLiveQuery(async () => {
    if (!machineId) return []
    const rows = await db.fuelLogs.where('machineId').equals(machineId).toArray()
    return rows.sort((a, b) => b.date.localeCompare(a.date))
  }, [machineId])
}

export function useUsageLogs(machineId: string | undefined): UsageLog[] | undefined {
  return useLiveQuery(async () => {
    if (!machineId) return []
    const rows = await db.usageLogs.where('machineId').equals(machineId).toArray()
    return rows.sort((a, b) => b.date.localeCompare(a.date))
  }, [machineId])
}

// ── Dashboard summary ─────────────────────────────────────────────────────────

export interface MachineryDashboardSummary {
  totalMachines: number
  activeCount: number
  underRepairCount: number
  idleCount: number
  maintenanceDueCount: number
}

/** Counts machines by status and schedules due within 7 days or overdue, across the organization. */
export function useMachineryDashboardSummary(organizationId: string | undefined): MachineryDashboardSummary | undefined {
  return useLiveQuery(async () => {
    if (!organizationId) return undefined
    const machines = await db.machines.where('organizationId').equals(organizationId).toArray()
    const machineIds = machines.map(m => m.id)
    const machineMap = new Map(machines.map(m => [m.id, m]))

    const schedules = machineIds.length > 0
      ? await db.maintenanceSchedules.where('machineId').anyOf(machineIds).toArray()
      : []

    let maintenanceDueCount = 0
    for (const schedule of schedules) {
      const machine = machineMap.get(schedule.machineId)
      if (!machine) continue
      const due = calculateNextMaintenanceDue(schedule, machine)
      const dueSoonByDays = due.daysUntilDue != null && due.daysUntilDue <= 7
      const dueSoonByHours = due.hoursUntilDue != null && due.hoursUntilDue <= 50
      if (due.isOverdue || dueSoonByDays || dueSoonByHours) maintenanceDueCount++
    }

    return {
      totalMachines: machines.length,
      activeCount: machines.filter(m => m.status === 'active').length,
      underRepairCount: machines.filter(m => m.status === 'under_repair').length,
      idleCount: machines.filter(m => m.status === 'idle').length,
      maintenanceDueCount,
    }
  }, [organizationId])
}
