/**
 * Payroll Run Processor
 *
 * Orchestrates a full monthly payroll:
 *   Load workers → calculate payslips → aggregate → create run + remittances
 */

import { db } from '../../../core/database/db'
import { newId, nowIso } from '../../../shared/types/base'
import { getPayrollProfile } from '../profiles'
import { calculatePayslip } from './payroll-engine'
import type {
  PayrollRun,
  PayslipRecord,
  RemittanceObligation,
  PayrollSettings,
  WorkerPayrollProfile,
} from '../../../shared/types/payroll'

// ── Remittance due date helpers ────────────────────────────────────────────────

function remittanceDueDate(period: string, countryCode: string, deductionId: string): string {
  const [year, month] = period.split('-').map(Number)
  let dueMonth = month + 1
  let dueYear = year
  if (dueMonth > 12) { dueMonth = 1; dueYear++ }

  const mm = String(dueMonth).padStart(2, '0')

  switch (countryCode) {
    case 'NG':
      if (deductionId === 'paye') return `${dueYear}-${mm}-10`      // Nigeria PAYE: 10th following month
      if (deductionId.startsWith('pension')) return `${dueYear}-${mm}-28` // Pension: end of following month
      return `${dueYear}-${mm}-20`
    case 'KE':
      return `${dueYear}-${mm}-09`                                   // Kenya: 9th of following month
    case 'GH':
      return `${dueYear}-${mm}-15`                                   // Ghana: 15th of following month
    default:
      return `${dueYear}-${mm}-15`
  }
}

function remittanceTo(deductionId: string, settings: PayrollSettings): string {
  switch (deductionId) {
    case 'paye':
      if (settings.countryCode === 'NG') {
        return settings.stateOfOperation
          ? `${settings.stateOfOperation} State Internal Revenue Service`
          : 'State Internal Revenue Service (SIRS)'
      }
      if (settings.countryCode === 'KE') return 'Kenya Revenue Authority (KRA)'
      if (settings.countryCode === 'GH') return 'Ghana Revenue Authority (GRA)'
      return 'Tax Authority'
    case 'pension_employee':
    case 'pension_employer':
      if (settings.pfaName) return settings.pfaName
      if (settings.countryCode === 'NG') return 'Pension Fund Administrator (PFA)'
      if (settings.countryCode === 'KE') return 'NSSF Kenya'
      if (settings.countryCode === 'GH') return 'SSNIT Ghana'
      return 'Pension Authority'
    case 'nssf_employee':
    case 'nssf_employer':
      return 'NSSF Kenya'
    case 'nhif':
      return 'NHIF / Social Health Authority (SHA)'
    case 'housing_levy_employee':
    case 'housing_levy_employer':
      return 'Kenya Revenue Authority (KRA) — Housing Levy'
    case 'nhf':
      return 'Federal Mortgage Bank of Nigeria (FMBN) — NHF'
    case 'nsitf':
      return 'Nigeria Social Insurance Trust Fund (NSITF)'
    case 'ssnit_employee':
    case 'ssnit_employer':
      return 'SSNIT Ghana'
    default:
      return 'Relevant Authority'
  }
}

// ── Main run function ─────────────────────────────────────────────────────────

export async function runMonthlyPayroll(
  organizationId: string,
  period: string  // YYYY-MM
): Promise<{ run: PayrollRun; payslips: PayslipRecord[]; remittances: RemittanceObligation[] }> {

  // 1. Load settings
  const settings = await db.payrollSettings
    .where('organizationId').equals(organizationId)
    .first() as PayrollSettings | undefined

  if (!settings) throw new Error('Payroll settings not configured for this organization')

  // 2. Load country profile
  const profile = getPayrollProfile(settings.countryCode)
  if (!profile) throw new Error(`No payroll profile for country: ${settings.countryCode}`)

  // 3. Check for existing run
  const existing = await db.payrollRuns
    .where('[organizationId+period]').equals([organizationId, period])
    .first()
  if (existing) throw new Error(`Payroll already exists for ${period}. View or delete it first.`)

  // 4. Load active permanent workers with payroll profiles
  const allWorkerProfiles = await db.workerPayrollProfiles
    .where('organizationId').equals(organizationId)
    .toArray() as WorkerPayrollProfile[]

  if (allWorkerProfiles.length === 0) {
    throw new Error('No workers with payroll profiles found. Set up payroll for at least one worker first.')
  }

  // Load attendance records for this period
  const [periodYear, periodMonth] = period.split('-').map(Number)
  const periodStart = `${period}-01`
  const periodEnd   = `${period}-${new Date(periodYear, periodMonth, 0).getDate()}`

  const attendanceRecords = await db.attendanceRecords
    .where('date').between(periodStart, periodEnd, true, true)
    .toArray()

  // Count present days per worker
  const attendanceDaysMap = new Map<string, number>()
  for (const rec of attendanceRecords) {
    if (rec.status === 'present' || rec.status === 'half_day') {
      const prev = attendanceDaysMap.get(rec.workerId) ?? 0
      attendanceDaysMap.set(rec.workerId, prev + (rec.status === 'half_day' ? 0.5 : 1))
    }
  }

  // Load worker names
  const workers = await db.workers.where('organizationId').equals(organizationId).toArray()
  const workerNameMap = new Map(workers.map(w => [w.id, w.name]))

  // 5. Calculate payslips
  const runId = newId()
  const payslips: PayslipRecord[] = []

  for (const profile_ of [profile]) {  // single pass — profile is constant
    for (const workerProfile of allWorkerProfiles) {
      const attendanceDays = workerProfile.salaryType === 'daily'
        ? attendanceDaysMap.get(workerProfile.workerId)
        : undefined

      const payslip = calculatePayslip(
        workerProfile,
        profile_,
        settings,
        period,
        runId,
        attendanceDays
      )
      payslip.workerName = workerNameMap.get(workerProfile.workerId) ?? 'Unknown Worker'
      payslips.push(payslip)
    }
  }

  // 6. Aggregate totals
  const totalGrossPay            = payslips.reduce((s, p) => s + p.grossPay, 0)
  const totalNetPay              = payslips.reduce((s, p) => s + p.netPay, 0)
  const totalEmployeeDeductions  = payslips.reduce((s, p) => s + p.totalDeductions, 0)
  const totalEmployerCosts       = payslips.reduce((s, p) => s + p.totalEmployerCost, 0)
  const totalPAYE                = payslips.reduce((s, p) => {
    return s + (p.deductions.find(d => d.shortCode === 'PAYE')?.amount ?? 0)
  }, 0)
  const totalPension             = payslips.reduce((s, p) => {
    return s + (p.deductions.find(d => d.shortCode === 'PEN')?.amount ?? 0)
  }, 0)

  // 7. Create PayrollRun
  const now = nowIso()
  const run: PayrollRun = {
    id: runId,
    organizationId,
    period,
    status: 'draft',
    runDate: new Date().toISOString().split('T')[0],
    approvedBy: null,
    approvedAt: null,
    totalGrossPay:           Math.round(totalGrossPay * 100) / 100,
    totalNetPay:             Math.round(totalNetPay * 100) / 100,
    totalEmployeeDeductions: Math.round(totalEmployeeDeductions * 100) / 100,
    totalEmployerCosts:      Math.round(totalEmployerCosts * 100) / 100,
    totalPAYE:               Math.round(totalPAYE * 100) / 100,
    totalPension:            Math.round(totalPension * 100) / 100,
    workerCount:             payslips.length,
    countryCode:             settings.countryCode,
    profileVersionDate:      profile.effectiveDate,
    notes: null,
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending',
  }

  // 8. Generate remittance obligations
  const remittances: RemittanceObligation[] = []

  // Aggregate amounts per deduction type across all payslips
  const remittanceMap = new Map<string, { name: string; total: number }>()

  for (const payslip of payslips) {
    for (const ded of payslip.deductions) {
      if (!ded.isStatutory) continue
      const key = ded.shortCode
      const existing2 = remittanceMap.get(key) ?? { name: ded.name, total: 0 }
      remittanceMap.set(key, { name: ded.name, total: existing2.total + ded.amount })
    }
    for (const contrib of payslip.employerContributions) {
      const key = `${contrib.shortCode}-ER`
      const existing2 = remittanceMap.get(key) ?? { name: contrib.name, total: 0 }
      remittanceMap.set(key, { name: contrib.name, total: existing2.total + contrib.amount })
    }
  }

  // Map shortCode → deductionId for due date / authority lookup
  const shortCodeToId: Record<string, string> = {
    PAYE: 'paye',
    PEN: 'pension_employee',
    'PEN-ER': 'pension_employer',
    NHF: 'nhf',
    NHIS: 'nhis_employee',
    'NHIS-ER': 'nhis_employer',
    NSITF: 'nsitf',
    NSSF: 'nssf_employee',
    'NSSF-ER': 'nssf_employer',
    NHIF: 'nhif',
    HOUSING: 'housing_levy_employee',
    'HOUSING-ER': 'housing_levy_employer',
    SSNIT: 'ssnit_employee',
    'SSNIT-ER': 'ssnit_employer',
  }

  for (const [shortCode, { name, total }] of remittanceMap) {
    if (total <= 0) continue
    const deductionId = shortCodeToId[shortCode] ?? shortCode.toLowerCase()
    const remit: RemittanceObligation = {
      id: newId(),
      organizationId,
      period,
      deductionType: deductionId,
      deductionName: name,
      totalAmount: Math.round(total * 100) / 100,
      dueDate: remittanceDueDate(period, settings.countryCode, deductionId),
      remittanceTo: remittanceTo(deductionId, settings),
      status: 'pending',
      remittedDate: null,
      remittedAmount: null,
      remittedReference: null,
      notes: null,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    }
    remittances.push(remit)
  }

  // 9. Persist to IndexedDB
  await db.transaction('rw', [db.payrollRuns, db.payslipRecords, db.remittanceObligations], async () => {
    await db.payrollRuns.add(run)
    await db.payslipRecords.bulkAdd(payslips)
    await db.remittanceObligations.bulkAdd(remittances)
  })

  return { run, payslips, remittances }
}

// ── Approve payroll run ───────────────────────────────────────────────────────

export async function approvePayrollRun(runId: string, approvedBy: string): Promise<void> {
  await db.payrollRuns.update(runId, {
    status: 'approved',
    approvedBy,
    approvedAt: nowIso(),
    updatedAt: nowIso(),
    syncStatus: 'pending',
  })
}

// ── Mark payroll as paid ──────────────────────────────────────────────────────

export async function markPayrollPaid(
  runId: string,
  organizationId: string
): Promise<void> {
  const run = await db.payrollRuns.get(runId)
  if (!run) throw new Error('Payroll run not found')
  if (run.status !== 'approved') throw new Error('Payroll must be approved before marking as paid')

  // Load payslips to create financial transactions
  const payslips = await db.payslipRecords
    .where('payrollRunId').equals(runId)
    .toArray()

  const now = nowIso()
  const today = now.split('T')[0]

  await db.transaction('rw', [db.payrollRuns, db.financialTransactions], async () => {
    // One financial transaction per worker (net pay)
    for (const payslip of payslips) {
      await db.financialTransactions.add({
        id: newId(),
        organizationId,
        date: today,
        type: 'expense',
        category: 'labor',
        amount: payslip.netPay,
        notes: `Salary — ${payslip.workerName} (${payslip.period})`,
        reference: runId,
        paymentMethod: 'bank',
        createdAt: now,
        updatedAt: now,
        syncStatus: 'pending',
      })
    }

    // Employer costs summary transaction
    if (run.totalEmployerCosts > run.totalGrossPay) {
      await db.financialTransactions.add({
        id: newId(),
        organizationId,
        date: today,
        type: 'expense',
        category: 'labor',
        amount: run.totalEmployerCosts - run.totalGrossPay,
        notes: `Employer statutory contributions — ${run.period}`,
        reference: runId,
        paymentMethod: 'bank',
        createdAt: now,
        updatedAt: now,
        syncStatus: 'pending',
      })
    }

    await db.payrollRuns.update(runId, {
      status: 'paid',
      updatedAt: now,
      syncStatus: 'pending',
    })
  })
}
