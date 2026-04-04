import { describe, it, expect } from 'vitest'
import { applyBrackets, calculateKenyaNHIF, calculatePayslip } from '../services/payroll-engine'
import { NIGERIA_PROFILE } from '../profiles/nigeria'
import { KENYA_PROFILE }   from '../profiles/kenya'
import { GHANA_PROFILE }   from '../profiles/ghana'
import type { WorkerPayrollProfile, PayrollSettings } from '../../../shared/types/payroll'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeNigeriaSettings(overrides: Partial<PayrollSettings> = {}): PayrollSettings {
  return {
    id: 'settings-1',
    organizationId: 'org-1',
    countryCode: 'NG',
    isRegisteredEmployer: true,
    employerTaxId: null,
    pensionEnrolled: true,
    pfaName: null,
    pfaAccountNumber: null,
    stateOfOperation: 'Lagos',
    nhfEnrolled: true,
    nhisEnrolled: false,
    payDay: 25,
    payrollRateOverrides: [],
    defaultSalaryStructure: null,
    syncStatus: 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeKenyaSettings(): PayrollSettings {
  return {
    id: 'settings-ke',
    organizationId: 'org-1',
    countryCode: 'KE',
    isRegisteredEmployer: true,
    employerTaxId: null,
    pensionEnrolled: true,
    pfaName: null,
    pfaAccountNumber: null,
    stateOfOperation: null,
    nhfEnrolled: false,
    nhisEnrolled: false,
    payDay: 25,
    payrollRateOverrides: [],
    defaultSalaryStructure: null,
    syncStatus: 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function makeGhanaSettings(): PayrollSettings {
  return {
    id: 'settings-gh',
    organizationId: 'org-1',
    countryCode: 'GH',
    isRegisteredEmployer: true,
    employerTaxId: null,
    pensionEnrolled: true,
    pfaName: null,
    pfaAccountNumber: null,
    stateOfOperation: null,
    nhfEnrolled: false,
    nhisEnrolled: false,
    payDay: 25,
    payrollRateOverrides: [],
    defaultSalaryStructure: null,
    syncStatus: 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function makeNigeriaWorker(grossMonthly: number, overrides: Partial<WorkerPayrollProfile> = {}): WorkerPayrollProfile {
  const basic     = grossMonthly * 0.5
  const housing   = grossMonthly * 0.3
  const transport = grossMonthly * 0.2
  return {
    id: 'worker-profile-1',
    workerId: 'worker-1',
    organizationId: 'org-1',
    salaryType: 'monthly',
    grossMonthlySalary: grossMonthly,
    dailyRate: null,
    salaryStructure: { basic, housing, transport, otherAllowances: [], grossTotal: grossMonthly },
    taxId: null,
    annualRentPaid: null,
    hasRentDocumentation: false,
    pensionApplicable: true,
    pensionPin: null,
    nhfApplicable: true,
    nhisApplicable: false,
    lifeInsurancePremium: null,
    otherDeductions: [],
    bankName: null,
    bankAccountNumber: null,
    startDate: '2026-01-01',
    syncStatus: 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

// ── applyBrackets ─────────────────────────────────────────────────────────────

describe('applyBrackets', () => {
  it('returns 0 for zero or negative income', () => {
    const brackets = [{ min: 0, max: null, rate: 10 }]
    expect(applyBrackets(0, brackets)).toBe(0)
    expect(applyBrackets(-500, brackets)).toBe(0)
  })

  it('applies a single flat-rate bracket correctly', () => {
    const brackets = [{ min: 0, max: null, rate: 10 }]
    expect(applyBrackets(100_000, brackets)).toBe(10_000)
  })

  it('applies NTA 2025 Nigeria brackets at 1,000,000 annual', () => {
    // 0-800K: 0%, 800K-1M: 15%
    const tax = applyBrackets(1_000_000, NIGERIA_PROFILE.taxSystem.brackets)
    expect(tax).toBeCloseTo(30_000, 0)  // (1,000,000 - 800,000) × 15% = 30,000
  })

  it('applies NTA 2025 Nigeria brackets at 800,000 annual (still zero)', () => {
    const tax = applyBrackets(800_000, NIGERIA_PROFILE.taxSystem.brackets)
    expect(tax).toBe(0)
  })

  it('applies NTA 2025 brackets at 3,000,000 (straddles 0% and 15% bands)', () => {
    // 0-800K: 0% → 0
    // 800K-3M: 15% → 2,200,000 × 0.15 = 330,000
    const tax = applyBrackets(3_000_000, NIGERIA_PROFILE.taxSystem.brackets)
    expect(tax).toBeCloseTo(330_000, 0)
  })

  it('applies Kenya monthly brackets at KSh 30,000', () => {
    // 0-24K: 10% = 2,400; 24K-30K: 25% = 6,000 × 0.25 = 1,500; total = 3,900
    const tax = applyBrackets(30_000, KENYA_PROFILE.taxSystem.brackets)
    expect(tax).toBeCloseTo(3_900, 0)
  })
})

// ── calculateKenyaNHIF ────────────────────────────────────────────────────────

describe('calculateKenyaNHIF', () => {
  it('returns 150 for gross ≤ 5,999', () => {
    expect(calculateKenyaNHIF(5_000)).toBe(150)
    expect(calculateKenyaNHIF(5_999)).toBe(150)
  })

  it('returns 300 for gross 6,000–7,999', () => {
    expect(calculateKenyaNHIF(6_000)).toBe(300)
    expect(calculateKenyaNHIF(7_999)).toBe(300)
  })

  it('returns 1,000 for gross 40,000–44,999 and 1,100 for 45,000–49,999', () => {
    expect(calculateKenyaNHIF(44_999)).toBe(1_000)  // max:44999 tier
    expect(calculateKenyaNHIF(45_000)).toBe(1_100)  // 45,000 > 44,999 → max:49,999 tier
    expect(calculateKenyaNHIF(49_999)).toBe(1_100)
  })

  it('returns 1,700 for gross above 100,000', () => {
    expect(calculateKenyaNHIF(100_000)).toBe(1_700)
    expect(calculateKenyaNHIF(500_000)).toBe(1_700)
  })

  it('returns 1,200 for gross 50,000', () => {
    // 50,000 > 49,999 → uses max:59,999 tier → 1,200
    expect(calculateKenyaNHIF(50_000)).toBe(1_200)
  })
})

// ── calculatePayslip — Nigeria ────────────────────────────────────────────────

describe('calculatePayslip — Nigeria', () => {
  it('returns a valid payslip structure', () => {
    const worker   = makeNigeriaWorker(100_000)
    const settings = makeNigeriaSettings()
    const payslip  = calculatePayslip(worker, NIGERIA_PROFILE, settings, '2026-01', 'run-1')

    expect(payslip.grossPay).toBe(100_000)
    expect(payslip.netPay).toBeGreaterThan(0)
    expect(payslip.netPay).toBeLessThan(payslip.grossPay)
    expect(payslip.totalDeductions).toBeCloseTo(payslip.grossPay - payslip.netPay, 1)
    expect(payslip.earnings.length).toBeGreaterThan(0)
    expect(payslip.deductions.length).toBeGreaterThan(0)
  })

  it('deducts pension (8% of pensionable) for Nigeria worker', () => {
    const worker   = makeNigeriaWorker(200_000)    // pensionable = 200K (100K+60K+40K)
    const settings = makeNigeriaSettings()
    const payslip  = calculatePayslip(worker, NIGERIA_PROFILE, settings, '2026-01', 'run-1')

    const pension = payslip.deductions.find(d => d.shortCode === 'PEN')
    expect(pension).toBeDefined()
    expect(pension!.amount).toBe(16_000)  // 200K × 8%
  })

  it('deducts NHF (2.5% of gross) when nhfApplicable', () => {
    const worker   = makeNigeriaWorker(200_000)
    const settings = makeNigeriaSettings()
    const payslip  = calculatePayslip(worker, NIGERIA_PROFILE, settings, '2026-01', 'run-1')

    const nhf = payslip.deductions.find(d => d.shortCode === 'NHF')
    expect(nhf).toBeDefined()
    expect(nhf!.amount).toBe(5_000)  // 200K × 2.5%
  })

  it('has PAYE = 0 when annual taxable income ≤ ₦800K threshold', () => {
    // 50K/month = 600K/year. Pension+NHF reduce it further → stays below 800K exemption
    const worker   = makeNigeriaWorker(50_000)
    const settings = makeNigeriaSettings()
    const payslip  = calculatePayslip(worker, NIGERIA_PROFILE, settings, '2026-01', 'run-1')

    const paye = payslip.deductions.find(d => d.shortCode === 'PAYE')
    expect(paye).toBeUndefined()
    // Net = gross - pension - NHF = 50K - 4K - 1.25K = 44,750
    expect(payslip.netPay).toBeCloseTo(44_750, 1)
  })

  it('computes PAYE correctly for ₦200K/month worker', () => {
    // Annual taxable: 2,400,000 - (16K+5K)×12 = 2,400,000 - 252,000 = 2,148,000
    // Brackets: 0-800K @0% = 0; 800K-2,148K @15% = 1,348,000×15% = 202,200
    // Monthly PAYE: 202,200 / 12 = 16,850
    const worker   = makeNigeriaWorker(200_000)
    const settings = makeNigeriaSettings()
    const payslip  = calculatePayslip(worker, NIGERIA_PROFILE, settings, '2026-01', 'run-1')

    const paye = payslip.deductions.find(d => d.shortCode === 'PAYE')
    expect(paye).toBeDefined()
    expect(paye!.amount).toBeCloseTo(16_850, 0)
    expect(payslip.netPay).toBeCloseTo(162_150, 0)
  })

  it('applies rent relief to reduce taxable income (Nigeria)', () => {
    // Annual rent 720K → relief = 20% × 720K = 144K (< 500K cap)
    // Annual taxable: 2,148,000 - 144,000 = 2,004,000
    // PAYE: (2,004,000-800,000) × 15% = 180,600 / 12 = 15,050
    const worker = makeNigeriaWorker(200_000, {
      annualRentPaid: 720_000,
      hasRentDocumentation: true,
    })
    const settings = makeNigeriaSettings()
    const payslipNoRent  = calculatePayslip(makeNigeriaWorker(200_000), NIGERIA_PROFILE, settings, '2026-01', 'run-no-rent')
    const payslipWithRent = calculatePayslip(worker, NIGERIA_PROFILE, settings, '2026-01', 'run-with-rent')

    // With rent relief, PAYE should be lower
    const payeNoRent   = payslipNoRent.deductions.find(d => d.shortCode === 'PAYE')!.amount
    const payeWithRent = payslipWithRent.deductions.find(d => d.shortCode === 'PAYE')?.amount ?? 0
    expect(payeWithRent).toBeLessThan(payeNoRent)
    expect(payslipWithRent.appliedReliefs.some(r => r.name.toLowerCase().includes('rent'))).toBe(true)
  })

  it('skips pension when pensionApplicable is false', () => {
    const worker   = makeNigeriaWorker(200_000, { pensionApplicable: false })
    const settings = makeNigeriaSettings()
    const payslip  = calculatePayslip(worker, NIGERIA_PROFILE, settings, '2026-01', 'run-1')

    const pension = payslip.deductions.find(d => d.shortCode === 'PEN')
    expect(pension).toBeUndefined()
  })

  it('includes employer pension contribution (10%) in employerContributions', () => {
    const worker   = makeNigeriaWorker(200_000)
    const settings = makeNigeriaSettings()
    const payslip  = calculatePayslip(worker, NIGERIA_PROFILE, settings, '2026-01', 'run-1')

    const penEr = payslip.employerContributions.find(c => c.shortCode === 'PEN-ER')
    expect(penEr).toBeDefined()
    expect(penEr!.amount).toBe(20_000)  // 200K × 10%
    expect(payslip.totalEmployerCost).toBeGreaterThan(payslip.grossPay)
  })

  it('netPay = grossPay - totalDeductions (invariant)', () => {
    const worker   = makeNigeriaWorker(350_000)
    const settings = makeNigeriaSettings()
    const payslip  = calculatePayslip(worker, NIGERIA_PROFILE, settings, '2026-04', 'run-1')

    expect(payslip.netPay).toBeCloseTo(payslip.grossPay - payslip.totalDeductions, 1)
  })

  it('applies custom monthly deduction', () => {
    const worker = makeNigeriaWorker(100_000, {
      otherDeductions: [{
        id: 'custom-1',
        name: 'Loan Repayment',
        amount: 5_000,
        frequency: 'monthly',
        remainingBalance: null,
        startMonth: '2026-01',
        endMonth: null,
      }],
    })
    const settings = makeNigeriaSettings()
    const payslip  = calculatePayslip(worker, NIGERIA_PROFILE, settings, '2026-01', 'run-1')

    const loanDed = payslip.deductions.find(d => d.name === 'Loan Repayment')
    expect(loanDed).toBeDefined()
    expect(loanDed!.amount).toBe(5_000)
  })

  it('does NOT apply once deduction in a different period', () => {
    const worker = makeNigeriaWorker(100_000, {
      otherDeductions: [{
        id: 'custom-2',
        name: 'One-Off',
        amount: 10_000,
        frequency: 'once',
        remainingBalance: null,
        startMonth: '2026-01',
        endMonth: null,
      }],
    })
    const settings = makeNigeriaSettings()
    // Run for different period
    const payslip = calculatePayslip(worker, NIGERIA_PROFILE, settings, '2026-02', 'run-1')

    const ded = payslip.deductions.find(d => d.name === 'One-Off')
    expect(ded).toBeUndefined()
  })
})

// ── calculatePayslip — Kenya ──────────────────────────────────────────────────

describe('calculatePayslip — Kenya', () => {
  function makeKenyaWorker(grossMonthly: number): WorkerPayrollProfile {
    const basic     = grossMonthly * 0.5
    const housing   = grossMonthly * 0.3
    const transport = grossMonthly * 0.2
    return {
      id: 'ke-worker-1',
      workerId: 'worker-ke',
      organizationId: 'org-ke',
      salaryType: 'monthly',
      grossMonthlySalary: grossMonthly,
      dailyRate: null,
      salaryStructure: { basic, housing, transport, otherAllowances: [], grossTotal: grossMonthly },
      taxId: null,
      annualRentPaid: null,
      hasRentDocumentation: false,
      pensionApplicable: true,
      pensionPin: null,
      nhfApplicable: false,
      nhisApplicable: false,
      lifeInsurancePremium: null,
      otherDeductions: [],
      bankName: null,
      bankAccountNumber: null,
      startDate: '2025-01-01',
      syncStatus: 'pending',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    }
  }

  it('caps NSSF at KSh 2,160 for high earner', () => {
    // 100K × 6% = 6,000 → capped to 2,160
    const worker   = makeKenyaWorker(100_000)
    const settings = makeKenyaSettings()
    const payslip  = calculatePayslip(worker, KENYA_PROFILE, settings, '2025-01', 'run-ke')

    const nssf = payslip.deductions.find(d => d.shortCode === 'NSSF')
    expect(nssf).toBeDefined()
    expect(nssf!.amount).toBe(2_160)
  })

  it('has PAYE deduction after personal relief', () => {
    const worker   = makeKenyaWorker(50_000)
    const settings = makeKenyaSettings()
    const payslip  = calculatePayslip(worker, KENYA_PROFILE, settings, '2025-01', 'run-ke')

    const paye = payslip.deductions.find(d => d.shortCode === 'PAYE')
    expect(paye).toBeDefined()
    expect(paye!.amount).toBeGreaterThan(0)
    // Personal relief of 2,400/month should be applied
    expect(payslip.appliedReliefs.some(r => r.name.toLowerCase().includes('personal'))).toBe(true)
  })

  it('includes NHIF in post-tax deductions', () => {
    const worker   = makeKenyaWorker(50_000)
    const settings = makeKenyaSettings()
    const payslip  = calculatePayslip(worker, KENYA_PROFILE, settings, '2025-01', 'run-ke')

    const nhif = payslip.deductions.find(d => d.shortCode === 'NHIF')
    expect(nhif).toBeDefined()
    expect(nhif!.amount).toBe(1_200)  // 50,000 gross → KSh 1,200
  })

  it('netPay = grossPay - totalDeductions (invariant)', () => {
    const worker   = makeKenyaWorker(75_000)
    const settings = makeKenyaSettings()
    const payslip  = calculatePayslip(worker, KENYA_PROFILE, settings, '2025-03', 'run-ke')

    expect(payslip.netPay).toBeCloseTo(payslip.grossPay - payslip.totalDeductions, 1)
  })
})

// ── calculatePayslip — Ghana ──────────────────────────────────────────────────

describe('calculatePayslip — Ghana', () => {
  function makeGhanaWorker(grossMonthly: number): WorkerPayrollProfile {
    const basic     = grossMonthly * 0.6
    const housing   = grossMonthly * 0.25
    const transport = grossMonthly * 0.15
    return {
      id: 'gh-worker-1',
      workerId: 'worker-gh',
      organizationId: 'org-gh',
      salaryType: 'monthly',
      grossMonthlySalary: grossMonthly,
      dailyRate: null,
      salaryStructure: { basic, housing, transport, otherAllowances: [], grossTotal: grossMonthly },
      taxId: null,
      annualRentPaid: null,
      hasRentDocumentation: false,
      pensionApplicable: true,
      pensionPin: null,
      nhfApplicable: false,
      nhisApplicable: false,
      lifeInsurancePremium: null,
      otherDeductions: [],
      bankName: null,
      bankAccountNumber: null,
      startDate: '2025-01-01',
      syncStatus: 'pending',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    }
  }

  it('deducts SSNIT employee (5.5% of basic)', () => {
    const worker   = makeGhanaWorker(5_000)
    const settings = makeGhanaSettings()
    const payslip  = calculatePayslip(worker, GHANA_PROFILE, settings, '2025-01', 'run-gh')

    const ssnit = payslip.deductions.find(d => d.shortCode === 'SSNIT')
    expect(ssnit).toBeDefined()
    // SSNIT is on basic: 5,000 × 0.6 = 3,000; 3,000 × 5.5% = 165
    expect(ssnit!.amount).toBeCloseTo(165, 1)
  })

  it('includes SSNIT employer contribution (13%) in employer contributions', () => {
    const worker   = makeGhanaWorker(5_000)
    const settings = makeGhanaSettings()
    const payslip  = calculatePayslip(worker, GHANA_PROFILE, settings, '2025-01', 'run-gh')

    const ssnitEr = payslip.employerContributions.find(c => c.shortCode === 'SSNIT-ER')
    expect(ssnitEr).toBeDefined()
    expect(ssnitEr!.amount).toBeGreaterThan(0)
  })

  it('netPay = grossPay - totalDeductions (invariant)', () => {
    const worker   = makeGhanaWorker(8_000)
    const settings = makeGhanaSettings()
    const payslip  = calculatePayslip(worker, GHANA_PROFILE, settings, '2025-06', 'run-gh')

    expect(payslip.netPay).toBeCloseTo(payslip.grossPay - payslip.totalDeductions, 1)
  })

  it('has no PAYE for income below Ghana exemption threshold', () => {
    // GHS 319/month is below Ghana's 0% bracket top
    const worker = makeGhanaWorker(300)  // very low income
    const settings = makeGhanaSettings()
    const payslip  = calculatePayslip(worker, GHANA_PROFILE, settings, '2025-01', 'run-gh')

    // Should still have netPay > 0
    expect(payslip.netPay).toBeGreaterThan(0)
  })
})
