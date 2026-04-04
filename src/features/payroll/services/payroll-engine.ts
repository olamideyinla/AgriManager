/**
 * Payroll Calculation Engine
 *
 * Country-agnostic: reads rules from whatever CountryPayrollProfile is passed in.
 * Produces a fully-calculated PayslipRecord with earnings, deductions,
 * employer contributions, tax, assumptions, and totals.
 *
 * NOTE: This is a management tool, not a licensed payroll processor.
 * Results should be verified with a qualified tax professional.
 */

import { newId, nowIso } from '../../../shared/types/base'
import type {
  CountryPayrollProfile,
  PayrollSettings,
  WorkerPayrollProfile,
  PayslipRecord,
  PayslipEarning,
  PayslipDeduction,
  PayslipEmployerContribution,
  WorkerSalaryStructure,
  PayrollRateOverride,
} from '../../../shared/types/payroll'

// ── NHIF (Kenya) graduated lookup ─────────────────────────────────────────────

const NHIF_TABLE: { max: number; amount: number }[] = [
  { max: 5999,     amount: 150  },
  { max: 7999,     amount: 300  },
  { max: 11999,    amount: 400  },
  { max: 14999,    amount: 500  },
  { max: 19999,    amount: 600  },
  { max: 24999,    amount: 750  },
  { max: 29999,    amount: 850  },
  { max: 34999,    amount: 900  },
  { max: 39999,    amount: 950  },
  { max: 44999,    amount: 1000 },
  { max: 49999,    amount: 1100 },
  { max: 59999,    amount: 1200 },
  { max: 69999,    amount: 1300 },
  { max: 79999,    amount: 1400 },
  { max: 89999,    amount: 1500 },
  { max: 99999,    amount: 1600 },
  { max: Infinity, amount: 1700 },
]

export function calculateKenyaNHIF(grossMonthly: number): number {
  for (const row of NHIF_TABLE) {
    if (grossMonthly <= row.max) return row.amount
  }
  return 1700
}

// ── Tax bracket engine ────────────────────────────────────────────────────────

export function applyBrackets(
  income: number,
  brackets: { min: number; max: number | null; rate: number }[]
): number {
  if (income <= 0) return 0
  let tax = 0
  let remaining = income

  for (const bracket of brackets) {
    if (remaining <= 0) break
    const bracketWidth = bracket.max !== null ? bracket.max - bracket.min : remaining
    const taxableInBracket = Math.min(remaining, bracketWidth)
    tax += taxableInBracket * (bracket.rate / 100)
    remaining -= taxableInBracket
  }

  return Math.max(0, tax)
}

// ── Rate override helper ──────────────────────────────────────────────────────

function getEffectiveRate(
  deductionId: string,
  field: PayrollRateOverride['field'],
  defaultValue: number | null,
  overrides: PayrollRateOverride[]
): number | null {
  const override = overrides.find(o => o.deductionId === deductionId && o.field === field)
  return override ? override.overrideValue : defaultValue
}

// ── Basis amount resolver ─────────────────────────────────────────────────────

function resolveBasis(
  basis: string,
  structure: WorkerSalaryStructure,
  grossPay: number
): number {
  switch (basis) {
    case 'gross':
      return grossPay
    case 'basic':
      return structure.basic
    case 'basic_housing_transport':
      return structure.basic + structure.housing + structure.transport
    case 'pensionable':
      return structure.basic + structure.housing + structure.transport
    default:
      return grossPay
  }
}

// ── Main calculation function ─────────────────────────────────────────────────

export function calculatePayslip(
  worker: WorkerPayrollProfile,
  profile: CountryPayrollProfile,
  settings: PayrollSettings,
  period: string,          // YYYY-MM
  payrollRunId: string,
  attendanceDays?: number  // for daily-rated workers
): PayslipRecord {
  const assumptions: string[] = []
  const appliedReliefs: { name: string; amount: number }[] = []
  const earnings: PayslipEarning[] = []
  const deductions: PayslipDeduction[] = []
  const employerContributions: PayslipEmployerContribution[] = []

  const overrides = settings.payrollRateOverrides ?? []

  // ── 1. GROSS PAY ────────────────────────────────────────────────────────────

  let grossPay: number
  const structure = worker.salaryStructure

  if (worker.salaryType === 'daily') {
    const days = attendanceDays ?? 26
    if (attendanceDays === undefined) {
      assumptions.push(`Daily worker: attendance not provided — using 26 working days`)
    } else {
      assumptions.push(`Daily worker: ${days} days × ${profile.currency} ${worker.dailyRate?.toLocaleString() ?? 0} = gross`)
    }
    grossPay = (worker.dailyRate ?? 0) * days
  } else {
    grossPay = worker.grossMonthlySalary ?? structure.grossTotal ?? 0
  }

  // Build earnings array
  if (structure.basic > 0)    earnings.push({ name: 'Basic Salary',       amount: structure.basic })
  if (structure.housing > 0)  earnings.push({ name: 'Housing Allowance',  amount: structure.housing })
  if (structure.transport > 0)earnings.push({ name: 'Transport Allowance',amount: structure.transport })
  for (const a of structure.otherAllowances) {
    if (a.amount > 0) earnings.push({ name: a.name, amount: a.amount })
  }
  if (earnings.length === 0) {
    earnings.push({ name: 'Gross Pay', amount: grossPay })
    assumptions.push('Using gross pay — no salary structure breakdown provided')
  }

  // ── 2. PENSIONABLE EMOLUMENTS ───────────────────────────────────────────────

  const pensionableEmoluments = structure.basic + structure.housing + structure.transport

  // ── 3. PRE-TAX STATUTORY DEDUCTIONS ────────────────────────────────────────

  let totalPreTaxDeductions = 0

  for (const ded of profile.statutoryDeductions) {
    if (!ded.preTax) continue
    if (ded.paidBy === 'employer') continue

    // Check worker applicability
    if (ded.id === 'pension_employee' && !worker.pensionApplicable) {
      assumptions.push('Pension not deducted — worker marked as exempt')
      continue
    }
    if (ded.id === 'nhf' && !worker.nhfApplicable) {
      assumptions.push('NHF not deducted — worker not enrolled')
      continue
    }
    if (ded.id === 'nhis_employee' && !worker.nhisApplicable) {
      assumptions.push('NHIS not deducted — worker not enrolled')
      continue
    }
    // Ghana Tier 3 - skip if no rate configured (it's voluntary)
    if (ded.id === 'tier3_voluntary') continue

    const basisAmount = ded.basis === 'pensionable' || ded.basis === 'basic_housing_transport'
      ? pensionableEmoluments
      : resolveBasis(ded.basis, structure, grossPay)

    const rate = getEffectiveRate(ded.id, 'employeeRate', ded.employeeRate, overrides)
    const fixedAmt = ded.employeeFixedAmount
    let amount = 0

    if (ded.basis === 'graduated') {
      // Only NHIF uses graduated pre-tax (Kenya NHIF is actually post-tax — handle in post-tax block)
      continue
    } else if (rate !== null) {
      amount = basisAmount * (rate / 100)
    } else if (fixedAmt !== null) {
      amount = fixedAmt
    }

    const cap = getEffectiveRate(ded.id, 'employeeCap', ded.employeeCap, overrides)
    if (cap !== null && amount > cap) amount = cap

    amount = Math.round(amount * 100) / 100
    if (amount > 0) {
      const rateLabel = rate !== null ? ` (${rate}%)` : ''
      deductions.push({
        name: `${ded.name}${rateLabel}`,
        shortCode: ded.shortCode,
        amount,
        isStatutory: true,
      })
      totalPreTaxDeductions += amount
    }
  }

  // ── 4 & 5. TAX RELIEFS → TAXABLE INCOME ────────────────────────────────────

  const annualGross = grossPay * 12
  let annualIncomeReliefs = totalPreTaxDeductions * 12  // pension, NHF, NHIS already computed monthly

  // Income-reducing reliefs (reduce taxable income)
  for (const relief of profile.taxReliefs) {
    if (relief.id === 'rent_relief') {
      if (worker.annualRentPaid && worker.annualRentPaid > 0) {
        const rentRelief = Math.min(
          (relief.value! / 100) * worker.annualRentPaid,
          relief.cap!
        )
        annualIncomeReliefs += rentRelief
        appliedReliefs.push({ name: relief.name, amount: rentRelief / 12 })
      } else {
        assumptions.push('No rent relief applied — rent details not provided')
      }
    }
    if (relief.id === 'life_insurance') {
      if (worker.lifeInsurancePremium && worker.lifeInsurancePremium > 0) {
        annualIncomeReliefs += worker.lifeInsurancePremium
        appliedReliefs.push({ name: relief.name, amount: worker.lifeInsurancePremium / 12 })
      }
    }
  }

  const annualTaxableIncome = Math.max(0, annualGross - annualIncomeReliefs)

  // ── 6 & 7. COMPUTE PAYE ─────────────────────────────────────────────────────

  let monthlyPAYE = 0
  let taxableIncome = annualTaxableIncome / 12  // monthly equivalent

  if (profile.taxSystem.period === 'annual') {
    // Nigeria: apply brackets to annual income, divide by 12
    const annualPAYE = applyBrackets(annualTaxableIncome, profile.taxSystem.brackets)
    monthlyPAYE = annualPAYE / 12
  } else {
    // Kenya / Ghana: apply brackets to monthly taxable income
    const monthlyTaxableIncome = annualTaxableIncome / 12
    monthlyPAYE = applyBrackets(monthlyTaxableIncome, profile.taxSystem.brackets)
    taxableIncome = monthlyTaxableIncome
  }

  // Apply tax credits (post-tax reliefs — reduce computed tax, not income)
  for (const relief of profile.taxReliefs) {
    if (relief.id === 'personal_relief' && relief.type === 'fixed' && relief.value) {
      monthlyPAYE = Math.max(0, monthlyPAYE - relief.value)
      appliedReliefs.push({ name: relief.name, amount: relief.value })
    }
    if (relief.id === 'insurance_relief') {
      // Applied if worker has relevant insurance — for now assume not provided
      // TODO: extend WorkerPayrollProfile with insurance premium for Kenya
    }
  }

  monthlyPAYE = Math.round(monthlyPAYE * 100) / 100

  if (monthlyPAYE > 0) {
    deductions.push({
      name: 'PAYE Tax',
      shortCode: 'PAYE',
      amount: monthlyPAYE,
      isStatutory: true,
    })
  }

  // ── 8. POST-TAX STATUTORY DEDUCTIONS ───────────────────────────────────────

  for (const ded of profile.statutoryDeductions) {
    if (ded.preTax) continue
    if (ded.paidBy === 'employer') continue

    // Skip NHIS employer — already handled in employer block
    if (ded.paidBy === 'both' && ded.id === 'tier3_voluntary') continue

    const basisAmount = resolveBasis(ded.basis, structure, grossPay)
    const rate = getEffectiveRate(ded.id, 'employeeRate', ded.employeeRate, overrides)
    const fixedAmt = ded.employeeFixedAmount
    let amount = 0

    if (ded.basis === 'graduated') {
      // Kenya NHIF
      if (ded.id === 'nhif') {
        amount = calculateKenyaNHIF(grossPay)
      }
    } else if (rate !== null) {
      amount = basisAmount * (rate / 100)
    } else if (fixedAmt !== null) {
      amount = fixedAmt
    }

    const cap = getEffectiveRate(ded.id, 'employeeCap', ded.employeeCap, overrides)
    if (cap !== null && amount > cap) amount = cap

    amount = Math.round(amount * 100) / 100
    if (amount > 0) {
      const rateLabel = rate !== null ? ` (${rate}%)` : ''
      deductions.push({
        name: `${ded.name}${rateLabel}`,
        shortCode: ded.shortCode,
        amount,
        isStatutory: true,
      })
    }
  }

  // ── 9. CUSTOM DEDUCTIONS ────────────────────────────────────────────────────

  for (const custom of worker.otherDeductions) {
    const [year, month] = period.split('-').map(Number)
    const [sy, sm] = custom.startMonth.split('-').map(Number)
    const startedOrBeforeNow = (sy < year) || (sy === year && sm <= month)

    let apply = false
    if (custom.frequency === 'monthly' && startedOrBeforeNow) apply = true
    if (custom.frequency === 'once' && custom.startMonth === period) apply = true
    if (custom.frequency === 'until_cleared' && startedOrBeforeNow && (custom.remainingBalance ?? 0) > 0) {
      apply = true
    }

    if (!apply) continue

    const dedAmount = custom.frequency === 'until_cleared'
      ? Math.min(custom.amount, custom.remainingBalance ?? custom.amount)
      : custom.amount

    deductions.push({
      name: custom.name,
      shortCode: 'DED',
      amount: Math.round(dedAmount * 100) / 100,
      isStatutory: false,
    })
  }

  // ── 10. EMPLOYER CONTRIBUTIONS ──────────────────────────────────────────────

  for (const ded of profile.statutoryDeductions) {
    if (ded.paidBy === 'employee') continue

    // Check enrollments
    if (ded.id === 'pension_employer' && !worker.pensionApplicable) continue
    if (ded.id === 'nhis_employer' && !worker.nhisApplicable) continue
    if (ded.id === 'tier3_voluntary') continue

    const basisAmount = ded.basis === 'basic_housing_transport' || ded.basis === 'pensionable'
      ? pensionableEmoluments
      : resolveBasis(ded.basis, structure, grossPay)

    const rate = getEffectiveRate(ded.id, 'employerRate', ded.employerRate, overrides)
    const fixedAmt = ded.employerFixedAmount
    let amount = 0

    if (rate !== null) {
      amount = basisAmount * (rate / 100)
    } else if (fixedAmt !== null) {
      amount = fixedAmt
    }

    const cap = getEffectiveRate(ded.id, 'employerCap', ded.employerCap, overrides)
    if (cap !== null && amount > cap) amount = cap

    amount = Math.round(amount * 100) / 100
    if (amount > 0) {
      const rateLabel = rate !== null ? ` (${rate}%)` : ''
      employerContributions.push({
        name: `${ded.name}${rateLabel}`,
        shortCode: ded.shortCode,
        amount,
      })
    }
  }

  // ── 11. TOTALS ──────────────────────────────────────────────────────────────

  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0)
  const netPay = Math.max(0, Math.round((grossPay - totalDeductions) * 100) / 100)
  const totalEmployerContributions = employerContributions.reduce((s, c) => s + c.amount, 0)
  const totalEmployerCost = Math.round((grossPay + totalEmployerContributions) * 100) / 100

  // ── 12. PAYSLIP RECORD ──────────────────────────────────────────────────────

  const now = nowIso()
  return {
    id: newId(),
    payrollRunId,
    workerId: worker.workerId,
    workerName: '',  // filled by runner
    period,
    earnings,
    deductions,
    employerContributions,
    grossPay: Math.round(grossPay * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    netPay,
    totalEmployerCost,
    taxableIncome: Math.round(taxableIncome * 100) / 100,
    appliedReliefs,
    assumptions: [...new Set(assumptions)],
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending',
  }
}
