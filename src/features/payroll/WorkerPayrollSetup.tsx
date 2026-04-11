/**
 * WorkerPayrollSetup — set up or edit a worker's payroll profile.
 * Route: /payroll/worker/:workerId
 *
 * Salary structure uses named component amounts (Basic, Housing, Transport,
 * Lunch, + custom allowances). Gross is auto-computed. Standard for all
 * countries — statutory deductions are driven by the country payroll profile.
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Plus, Trash2, Save, Info } from 'lucide-react'
import { useAuthStore } from '../../stores/auth-store'
import { db } from '../../core/database/db'
import { nowIso } from '../../shared/types/base'
import type { WorkerPayrollProfile, WorkerSalaryStructure, CustomDeduction } from '../../shared/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function newId() { return crypto.randomUUID() }
function num(s: string) { return parseFloat(s) || 0 }
function fmt(n: number) { return n > 0 ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—' }

interface OtherAllowRow { id: string; name: string; amount: string }

// ── Amount input ──────────────────────────────────────────────────────────────

function AmountInput({
  label, sublabel, value, onChange, hint,
}: {
  label: string
  sublabel?: string
  value: string
  onChange: (v: string) => void
  hint?: string
}) {
  return (
    <div>
      <label className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        {sublabel && <span className="text-xs text-gray-400">{sublabel}</span>}
      </label>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="0.00"
        min="0"
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
      />
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WorkerPayrollSetup() {
  const navigate        = useNavigate()
  const { workerId }    = useParams<{ workerId: string }>()
  const organizationId  = useAuthStore(s => s.appUser?.organizationId)

  const worker = useLiveQuery(async () => {
    if (!workerId) return null
    return db.workers.get(workerId)
  }, [workerId])

  const existing = useLiveQuery(async () => {
    if (!workerId) return null
    return db.workerPayrollProfiles.where('workerId').equals(workerId).first()
  }, [workerId])

  // ── Salary type ──────────────────────────────────────────────────────────

  const [salaryType, setSalaryType] = useState<'monthly' | 'daily'>('monthly')
  const [dailyRate,  setDailyRate]  = useState('')

  // ── Salary components ────────────────────────────────────────────────────

  const [basicAmt,     setBasicAmt]     = useState('')
  const [housingAmt,   setHousingAmt]   = useState('')
  const [transportAmt, setTransportAmt] = useState('')
  const [lunchAmt,     setLunchAmt]     = useState('')
  const [otherAllow,   setOtherAllow]   = useState<OtherAllowRow[]>([])

  // ── Tax & reliefs ────────────────────────────────────────────────────────

  const [taxId,        setTaxId]        = useState('')
  const [annualRent,   setAnnualRent]   = useState('')
  const [rentDocs,     setRentDocs]     = useState(false)
  const [lifeInsurance,setLifeInsurance]= useState('')

  // ── Statutory elections ──────────────────────────────────────────────────

  const [pensionApply, setPensionApply] = useState(true)
  const [pensionPin,   setPensionPin]   = useState('')
  const [nhfApply,     setNhfApply]     = useState(false)
  const [nhisApply,    setNhisApply]    = useState(false)

  // ── Bank details ─────────────────────────────────────────────────────────

  const [bankName,     setBankName]     = useState('')
  const [bankAccount,  setBankAccount]  = useState('')

  // ── Custom deductions (loans, advances, etc.) ────────────────────────────

  const [otherDeductions, setOtherDeductions] = useState<CustomDeduction[]>([])

  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  // ── Pre-fill from existing profile ────────────────────────────────────────

  useEffect(() => {
    if (!existing) return
    setSalaryType(existing.salaryType)
    setDailyRate(existing.dailyRate?.toString() ?? '')

    const s = existing.salaryStructure
    setBasicAmt(s.basic > 0 ? String(s.basic) : '')
    setHousingAmt(s.housing > 0 ? String(s.housing) : '')
    setTransportAmt(s.transport > 0 ? String(s.transport) : '')
    setLunchAmt((s.lunch ?? 0) > 0 ? String(s.lunch) : '')
    setOtherAllow(
      s.otherAllowances
        .filter(a => a.amount > 0)
        .map(a => ({ id: newId(), name: a.name, amount: String(a.amount) }))
    )

    setTaxId(existing.taxId ?? '')
    setAnnualRent(existing.annualRentPaid?.toString() ?? '')
    setRentDocs(existing.hasRentDocumentation)
    setLifeInsurance(existing.lifeInsurancePremium?.toString() ?? '')
    setPensionApply(existing.pensionApplicable)
    setPensionPin(existing.pensionPin ?? '')
    setNhfApply(existing.nhfApplicable)
    setNhisApply(existing.nhisApplicable)
    setBankName(existing.bankName ?? '')
    setBankAccount(existing.bankAccountNumber ?? '')
    setOtherDeductions(existing.otherDeductions)
  }, [existing])

  if (!organizationId || !workerId) return null

  // ── Derived totals ────────────────────────────────────────────────────────

  const basic         = num(basicAmt)
  const housing       = num(housingAmt)
  const transport     = num(transportAmt)
  const lunch         = num(lunchAmt)
  const allowTotal    = otherAllow.reduce((s, a) => s + num(a.amount), 0)
  const pensionable   = basic + housing + transport
  const grossMonthly  = salaryType === 'monthly'
    ? pensionable + lunch + allowTotal
    : num(dailyRate) * 26
  const dailyEquiv    = num(dailyRate) * 26

  // ── Build structure ───────────────────────────────────────────────────────

  function buildStructure(): WorkerSalaryStructure {
    return {
      basic,
      housing,
      transport,
      lunch: lunch || undefined,
      otherAllowances: otherAllow
        .filter(a => a.name.trim() && num(a.amount) > 0)
        .map(a => ({ name: a.name.trim(), amount: num(a.amount), taxable: true })),
      grossTotal: grossMonthly,
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    const ts = nowIso()
    const structure = buildStructure()
    const profile: WorkerPayrollProfile = {
      id:                     existing?.id ?? newId(),
      workerId:               workerId!,
      organizationId:         organizationId!,
      salaryType,
      grossMonthlySalary:     salaryType === 'monthly' ? grossMonthly || null : dailyEquiv || null,
      dailyRate:              salaryType === 'daily' ? num(dailyRate) || null : null,
      salaryStructure:        structure,
      taxId:                  taxId.trim() || null,
      annualRentPaid:         annualRent ? num(annualRent) : null,
      hasRentDocumentation:   rentDocs,
      pensionApplicable:      pensionApply,
      pensionPin:             pensionPin.trim() || null,
      nhfApplicable:          nhfApply,
      nhisApplicable:         nhisApply,
      lifeInsurancePremium:   lifeInsurance ? num(lifeInsurance) : null,
      otherDeductions,
      bankName:               bankName.trim() || null,
      bankAccountNumber:      bankAccount.trim() || null,
      startDate:              existing?.startDate ?? new Date().toISOString().slice(0, 10),
      syncStatus:             'pending',
      createdAt:              existing?.createdAt ?? ts,
      updatedAt:              ts,
    }
    await db.workerPayrollProfiles.put(profile)
    setSaving(false)
    setSaved(true)
    setTimeout(() => { setSaved(false); navigate(-1) }, 1200)
  }

  // ── Allowance row helpers ─────────────────────────────────────────────────

  function addAllow() {
    setOtherAllow(prev => [...prev, { id: newId(), name: '', amount: '' }])
  }

  function updateAllow(id: string, patch: Partial<OtherAllowRow>) {
    setOtherAllow(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a))
  }

  function removeAllow(id: string) {
    setOtherAllow(prev => prev.filter(a => a.id !== id))
  }

  // ── Deduction row helpers ─────────────────────────────────────────────────

  function addDeduction() {
    const d: CustomDeduction = {
      id: newId(), name: '', amount: 0, frequency: 'monthly',
      remainingBalance: null, startMonth: new Date().toISOString().slice(0, 7), endMonth: null,
    }
    setOtherDeductions(prev => [...prev, d])
  }

  function updateDeduction(id: string, patch: Partial<CustomDeduction>) {
    setOtherDeductions(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d))
  }

  function removeDeduction(id: string) {
    setOtherDeductions(prev => prev.filter(d => d.id !== id))
  }

  const canSave = salaryType === 'daily' ? num(dailyRate) > 0 : grossMonthly > 0

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col safe-top safe-bottom">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="touch-target text-gray-500">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">{worker?.name ?? 'Worker'}</h1>
          <p className="text-xs text-gray-500">Payroll Profile</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !canSave}
          className="flex items-center gap-1.5 bg-primary-600 text-white text-sm font-semibold px-4 py-2 rounded-lg active:bg-primary-700 disabled:opacity-60"
        >
          <Save size={16} />
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* ── Salary type ────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Payment Type</h2>
          <div className="flex bg-gray-100 rounded-xl p-1">
            {(['monthly', 'daily'] as const).map(type => (
              <button
                key={type}
                onClick={() => setSalaryType(type)}
                className={`flex-1 py-1.5 text-sm font-medium rounded-lg capitalize transition-colors ${
                  salaryType === type ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {salaryType === 'daily' && (
            <AmountInput
              label="Daily Rate"
              sublabel={`≈ ${fmt(num(dailyRate) * 26)}/mo`}
              value={dailyRate}
              onChange={setDailyRate}
              hint="Estimated monthly = daily rate × 26 working days"
            />
          )}
        </section>

        {/* ── Salary structure ────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Salary Breakdown</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Enter the amount for each component.{salaryType === 'monthly' ? ' Gross is auto-computed.' : ' Used for statutory deduction calculations.'}
            </p>
          </div>

          {/* Pensionable components */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs font-semibold text-primary-700 uppercase tracking-wide">Pensionable Components</span>
              <div className="group relative">
                <Info size={12} className="text-gray-400 cursor-help" />
                <div className="absolute left-0 bottom-5 w-64 bg-gray-800 text-white text-xs rounded-lg p-2.5 hidden group-hover:block z-10 shadow-lg">
                  Pension is calculated on Basic + Housing + Transport only. These three components form the pensionable emoluments.
                </div>
              </div>
            </div>
            <AmountInput
              label="Basic Salary"
              value={basicAmt}
              onChange={setBasicAmt}
            />
            <AmountInput
              label="Housing Allowance"
              value={housingAmt}
              onChange={setHousingAmt}
            />
            <AmountInput
              label="Transport Allowance"
              value={transportAmt}
              onChange={setTransportAmt}
            />
          </div>

          {pensionable > 0 && (
            <div className="bg-primary-50 rounded-xl px-3 py-2 text-xs text-primary-700 flex justify-between">
              <span>Pensionable base</span>
              <span className="font-semibold">{pensionable.toLocaleString()}</span>
            </div>
          )}

          {/* Non-pensionable allowances */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Other Allowances</span>
              <div className="group relative">
                <Info size={12} className="text-gray-400 cursor-help" />
                <div className="absolute left-0 bottom-5 w-64 bg-gray-800 text-white text-xs rounded-lg p-2.5 hidden group-hover:block z-10 shadow-lg">
                  Lunch and other allowances are taxable but NOT part of pensionable emoluments. They are included in gross and therefore in NHF and PAYE calculations.
                </div>
              </div>
            </div>
            <AmountInput
              label="Lunch Allowance"
              value={lunchAmt}
              onChange={setLunchAmt}
            />
            {otherAllow.map(a => (
              <div key={a.id} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={a.name}
                  onChange={e => updateAllow(a.id, { name: e.target.value })}
                  placeholder="Allowance name"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  value={a.amount}
                  onChange={e => updateAllow(a.id, { amount: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  className="w-28 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
                <button onClick={() => removeAllow(a.id)} className="text-red-400 shrink-0">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              onClick={addAllow}
              className="flex items-center gap-1 text-xs text-primary-600 font-medium"
            >
              <Plus size={13} /> Add Allowance
            </button>
          </div>

          {/* Gross summary */}
          {grossMonthly > 0 && (
            <div className="border-t border-gray-100 pt-3 space-y-1.5">
              {salaryType === 'monthly' && (
                <>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Pensionable (Basic + Housing + Transport)</span>
                    <span>{pensionable.toLocaleString()}</span>
                  </div>
                  {(lunch + allowTotal) > 0 && (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Other allowances</span>
                      <span>{(lunch + allowTotal).toLocaleString()}</span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between text-sm font-bold text-gray-900">
                <span>Gross Monthly Salary</span>
                <span>{grossMonthly.toLocaleString()}</span>
              </div>
            </div>
          )}
        </section>

        {/* ── Tax & reliefs ───────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Tax & Reliefs</h2>
          <AmountInput
            label="Tax ID (optional)"
            value={taxId}
            onChange={setTaxId}
            hint="TIN / KRA PIN / TIN GH"
          />
          <AmountInput
            label="Annual Rent Paid (for rent relief)"
            value={annualRent}
            onChange={setAnnualRent}
          />
          {annualRent && num(annualRent) > 0 && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rentDocs}
                onChange={e => setRentDocs(e.target.checked)}
                className="w-4 h-4 rounded text-primary-600"
              />
              <span className="text-sm text-gray-700">Has rent documentation</span>
            </label>
          )}
          <AmountInput
            label="Annual Life Insurance Premium (for relief)"
            value={lifeInsurance}
            onChange={setLifeInsurance}
          />
        </section>

        {/* ── Statutory elections ─────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Statutory Deductions</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Statutory deductions are subtracted before income tax is calculated.
            </p>
          </div>

          {/* Pension */}
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm text-gray-900">Pension Applicable</p>
              <p className="text-xs text-gray-500">
                Employee contribution · based on pensionable emoluments
                {pensionable > 0 ? ` (${pensionable.toLocaleString()})` : ''}
              </p>
            </div>
            <input
              type="checkbox"
              checked={pensionApply}
              onChange={e => setPensionApply(e.target.checked)}
              className="w-5 h-5 rounded text-primary-600"
            />
          </label>
          {pensionApply && (
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Pension PIN (optional)</label>
              <input
                type="text"
                value={pensionPin}
                onChange={e => setPensionPin(e.target.value)}
                placeholder="RSA PIN / NSSF number"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
              />
            </div>
          )}

          {/* NHF */}
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm text-gray-900">NHF Applicable</p>
              <p className="text-xs text-gray-500">National Housing Fund — % of gross salary</p>
            </div>
            <input
              type="checkbox"
              checked={nhfApply}
              onChange={e => setNhfApply(e.target.checked)}
              className="w-5 h-5 rounded text-primary-600"
            />
          </label>

          {/* NHIS */}
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm text-gray-900">NHIS Applicable</p>
              <p className="text-xs text-gray-500">Health insurance — % of basic salary</p>
            </div>
            <input
              type="checkbox"
              checked={nhisApply}
              onChange={e => setNhisApply(e.target.checked)}
              className="w-5 h-5 rounded text-primary-600"
            />
          </label>

          {/* PAYE info bar */}
          {grossMonthly > 0 && (
            <div className="bg-blue-50 rounded-xl px-3 py-2.5 text-xs text-blue-700 space-y-1">
              <p className="font-semibold">How PAYE is calculated</p>
              <p>Taxable income = Gross − Pension − NHF − NHIS − Reliefs</p>
              <p>Tax brackets are applied to the annual taxable income, then divided by 12.</p>
              {pensionable > 0 && pensionApply && (
                <p className="text-blue-600">
                  Pension deduction: {pensionable.toLocaleString()} × rate (pre-tax, reduces taxable income)
                </p>
              )}
              {nhfApply && (
                <p className="text-blue-600">
                  NHF deduction: {grossMonthly.toLocaleString()} × rate (pre-tax, reduces taxable income)
                </p>
              )}
            </div>
          )}
        </section>

        {/* ── Bank details ─────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Bank Details</h2>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Bank Name</label>
            <input
              type="text"
              value={bankName}
              onChange={e => setBankName(e.target.value)}
              placeholder="e.g. First Bank"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Account Number</label>
            <input
              type="text"
              value={bankAccount}
              onChange={e => setBankAccount(e.target.value)}
              placeholder="10-digit account number"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
            />
          </div>
        </section>

        {/* ── Custom deductions (loans, advances) ──────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">Other Deductions</h2>
              <p className="text-xs text-gray-400">Loans, salary advances, etc. Applied after tax.</p>
            </div>
            <button
              onClick={addDeduction}
              className="flex items-center gap-1 text-xs text-primary-600 font-medium"
            >
              <Plus size={14} /> Add
            </button>
          </div>
          {otherDeductions.length === 0 && (
            <p className="text-xs text-gray-400">No custom deductions.</p>
          )}
          {otherDeductions.map(d => (
            <div key={d.id} className="border border-gray-100 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={d.name}
                  onChange={e => updateDeduction(d.id, { name: e.target.value })}
                  placeholder="Deduction name"
                  className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm"
                />
                <button onClick={() => removeDeduction(d.id)} className="text-red-400">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={d.amount || ''}
                  onChange={e => updateDeduction(d.id, { amount: Number(e.target.value) })}
                  placeholder="Amount"
                  className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm"
                />
                <select
                  value={d.frequency}
                  onChange={e => updateDeduction(d.id, { frequency: e.target.value as CustomDeduction['frequency'] })}
                  className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white"
                >
                  <option value="monthly">Monthly</option>
                  <option value="once">Once</option>
                  <option value="until_cleared">Until Cleared</option>
                </select>
              </div>
              {d.frequency === 'until_cleared' && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Remaining Balance</label>
                  <input
                    type="number"
                    value={d.remainingBalance ?? ''}
                    onChange={e => updateDeduction(d.id, { remainingBalance: Number(e.target.value) })}
                    placeholder="Total balance to recover"
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm"
                  />
                </div>
              )}
            </div>
          ))}
        </section>

        <p className="text-xs text-gray-400 text-center pb-4">
          Payroll calculations are estimates only. Always verify statutory rates with a qualified tax professional.
        </p>
      </div>
    </div>
  )
}
