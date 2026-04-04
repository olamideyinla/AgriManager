import type { BaseEntity } from './base'

// ── Country Profile ────────────────────────────────────────────────────────────

export interface TaxBracket {
  min: number
  max: number | null
  rate: number
}

export interface TaxSystem {
  name: string
  period: 'annual' | 'monthly'
  brackets: TaxBracket[]
  minimumTax: { enabled: boolean; rate: number; basis: string } | null
}

export interface StatutoryDeduction {
  id: string
  name: string
  shortCode: string
  paidBy: 'employee' | 'employer' | 'both'
  employeeRate: number | null
  employeeFixedAmount: number | null
  employeeCap: number | null
  employerRate: number | null
  employerFixedAmount: number | null
  employerCap: number | null
  basis: 'gross' | 'basic' | 'pensionable' | 'basic_housing_transport' | 'custom' | 'graduated'
  basisDescription: string
  preTax: boolean
  mandatory: boolean
  mandatoryConditions: string | null
  notes: string | null
}

export interface AllowanceType {
  id: string
  name: string
  taxable: boolean
  partOfPensionable: boolean
  commonPercentageOfBasic: number | null
  notes: string | null
}

export interface TaxRelief {
  id: string
  name: string
  type: 'fixed' | 'percentage' | 'capped_percentage' | 'graduated'
  value: number | null
  cap: number | null
  basis: string | null
  requiresDocumentation: boolean
  documentationDescription: string | null
  conditions: string | null
  notes: string | null
}

export interface PayrollThreshold {
  id: string
  name: string
  annualAmount: number
  description: string
}

export interface CountryPayrollProfile {
  countryCode: string
  countryName: string
  currency: string
  lastVerified: string
  effectiveDate: string
  sourceNotes: string
  fiscalYearStart: string
  taxYearStart: string
  taxSystem: TaxSystem
  statutoryDeductions: StatutoryDeduction[]
  allowanceTypes: AllowanceType[]
  taxReliefs: TaxRelief[]
  thresholds: PayrollThreshold[]
}

// ── Payroll Settings ───────────────────────────────────────────────────────────

export interface PayrollRateOverride {
  deductionId: string
  field: 'employeeRate' | 'employerRate' | 'employeeCap' | 'employerCap'
  originalValue: number
  overrideValue: number
  reason: string | null
  setAt: string
}

export interface SalaryStructureTemplate {
  basicPercentage: number
  housingPercentage: number
  transportPercentage: number
  otherAllowances: { name: string; percentage: number }[]
}

export interface PayrollSettings extends BaseEntity {
  organizationId: string
  countryCode: string
  isRegisteredEmployer: boolean
  employerTaxId: string | null
  pensionEnrolled: boolean
  pfaName: string | null
  pfaAccountNumber: string | null
  stateOfOperation: string | null
  nhfEnrolled: boolean
  nhisEnrolled: boolean
  payDay: number
  payrollRateOverrides: PayrollRateOverride[]
  defaultSalaryStructure: SalaryStructureTemplate | null
}

// ── Worker Payroll Profile ─────────────────────────────────────────────────────

export interface WorkerSalaryStructure {
  basic: number
  housing: number
  transport: number
  otherAllowances: { name: string; amount: number; taxable: boolean }[]
  grossTotal: number
}

export interface CustomDeduction {
  id: string
  name: string
  amount: number
  frequency: 'once' | 'monthly' | 'until_cleared'
  remainingBalance: number | null
  startMonth: string
  endMonth: string | null
}

export interface WorkerPayrollProfile extends BaseEntity {
  workerId: string
  organizationId: string
  salaryType: 'monthly' | 'daily'
  grossMonthlySalary: number | null
  dailyRate: number | null
  salaryStructure: WorkerSalaryStructure
  taxId: string | null
  annualRentPaid: number | null
  hasRentDocumentation: boolean
  pensionApplicable: boolean
  pensionPin: string | null
  nhfApplicable: boolean
  nhisApplicable: boolean
  lifeInsurancePremium: number | null
  otherDeductions: CustomDeduction[]
  bankName: string | null
  bankAccountNumber: string | null
  startDate: string
}

// ── Payroll Run ────────────────────────────────────────────────────────────────

export interface PayslipEarning {
  name: string
  amount: number
}

export interface PayslipDeduction {
  name: string
  shortCode: string
  amount: number
  isStatutory: boolean
}

export interface PayslipEmployerContribution {
  name: string
  shortCode: string
  amount: number
}

export interface PayslipRecord extends BaseEntity {
  payrollRunId: string
  workerId: string
  workerName: string
  period: string
  earnings: PayslipEarning[]
  deductions: PayslipDeduction[]
  employerContributions: PayslipEmployerContribution[]
  grossPay: number
  totalDeductions: number
  netPay: number
  totalEmployerCost: number
  taxableIncome: number
  appliedReliefs: { name: string; amount: number }[]
  assumptions: string[]
}

export interface PayrollRun extends BaseEntity {
  organizationId: string
  period: string
  status: 'draft' | 'approved' | 'paid'
  runDate: string
  approvedBy: string | null
  approvedAt: string | null
  totalGrossPay: number
  totalNetPay: number
  totalEmployeeDeductions: number
  totalEmployerCosts: number
  totalPAYE: number
  totalPension: number
  workerCount: number
  countryCode: string
  profileVersionDate: string
  notes: string | null
}

// ── Remittance ─────────────────────────────────────────────────────────────────

export interface RemittanceObligation extends BaseEntity {
  organizationId: string
  period: string
  deductionType: string
  deductionName: string
  totalAmount: number
  dueDate: string
  remittanceTo: string
  status: 'pending' | 'remitted' | 'overdue'
  remittedDate: string | null
  remittedAmount: number | null
  remittedReference: string | null
  notes: string | null
}
