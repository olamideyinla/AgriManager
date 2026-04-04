/**
 * WorkerPayrollSetup — set up or edit a worker's payroll profile.
 * Route: /payroll/worker/:workerId
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'
import { useAuthStore } from '../../stores/auth-store'
import { db } from '../../core/database/db'
import { nowIso } from '../../shared/types/base'
import type { WorkerPayrollProfile, WorkerSalaryStructure, CustomDeduction } from '../../shared/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function newId() { return crypto.randomUUID() }

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

  // ── Form state ────────────────────────────────────────────────────────────

  const [salaryType,       setSalaryType]       = useState<'monthly' | 'daily'>('monthly')
  const [grossMonthly,     setGrossMonthly]      = useState('')
  const [dailyRate,        setDailyRate]         = useState('')
  const [basicPct,         setBasicPct]          = useState(50)
  const [housingPct,       setHousingPct]        = useState(30)
  const [transportPct,     setTransportPct]      = useState(20)
  const [taxId,            setTaxId]             = useState('')
  const [annualRent,       setAnnualRent]        = useState('')
  const [rentDocs,         setRentDocs]          = useState(false)
  const [pensionApply,     setPensionApply]      = useState(true)
  const [pensionPin,       setPensionPin]        = useState('')
  const [nhfApply,         setNhfApply]          = useState(false)
  const [nhisApply,        setNhisApply]         = useState(false)
  const [lifeInsurance,    setLifeInsurance]     = useState('')
  const [bankName,         setBankName]          = useState('')
  const [bankAccount,      setBankAccount]       = useState('')
  const [otherDeductions,  setOtherDeductions]   = useState<CustomDeduction[]>([])
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  // Pre-fill from existing profile
  useEffect(() => {
    if (!existing) return
    setSalaryType(existing.salaryType)
    setGrossMonthly(existing.grossMonthlySalary?.toString() ?? '')
    setDailyRate(existing.dailyRate?.toString() ?? '')
    const s = existing.salaryStructure
    const g = s.grossTotal || 1
    setBasicPct(Math.round((s.basic / g) * 100))
    setHousingPct(Math.round((s.housing / g) * 100))
    setTransportPct(Math.round((s.transport / g) * 100))
    setTaxId(existing.taxId ?? '')
    setAnnualRent(existing.annualRentPaid?.toString() ?? '')
    setRentDocs(existing.hasRentDocumentation)
    setPensionApply(existing.pensionApplicable)
    setPensionPin(existing.pensionPin ?? '')
    setNhfApply(existing.nhfApplicable)
    setNhisApply(existing.nhisApplicable)
    setLifeInsurance(existing.lifeInsurancePremium?.toString() ?? '')
    setBankName(existing.bankName ?? '')
    setBankAccount(existing.bankAccountNumber ?? '')
    setOtherDeductions(existing.otherDeductions)
  }, [existing])

  if (!organizationId || !workerId) return null

  // ── Derived salary structure ───────────────────────────────────────────────

  function buildStructure(): WorkerSalaryStructure {
    const gross = salaryType === 'monthly' ? Number(grossMonthly) || 0 : (Number(dailyRate) || 0) * 26
    const basic     = gross * basicPct     / 100
    const housing   = gross * housingPct   / 100
    const transport = gross * transportPct / 100
    return { basic, housing, transport, otherAllowances: [], grossTotal: gross }
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
      grossMonthlySalary:     salaryType === 'monthly' ? Number(grossMonthly) || null : null,
      dailyRate:              salaryType === 'daily'   ? Number(dailyRate)    || null : null,
      salaryStructure:        structure,
      taxId:                  taxId.trim() || null,
      annualRentPaid:         annualRent ? Number(annualRent) : null,
      hasRentDocumentation:   rentDocs,
      pensionApplicable:      pensionApply,
      pensionPin:             pensionPin.trim() || null,
      nhfApplicable:          nhfApply,
      nhisApplicable:         nhisApply,
      lifeInsurancePremium:   lifeInsurance ? Number(lifeInsurance) : null,
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

  // ── Add custom deduction ──────────────────────────────────────────────────

  function addDeduction() {
    const d: CustomDeduction = {
      id: newId(),
      name: '',
      amount: 0,
      frequency: 'monthly',
      remainingBalance: null,
      startMonth: new Date().toISOString().slice(0, 7),
      endMonth: null,
    }
    setOtherDeductions(prev => [...prev, d])
  }

  function updateDeduction(id: string, patch: Partial<CustomDeduction>) {
    setOtherDeductions(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d))
  }

  function removeDeduction(id: string) {
    setOtherDeductions(prev => prev.filter(d => d.id !== id))
  }

  const gross = salaryType === 'monthly' ? Number(grossMonthly) || 0 : (Number(dailyRate) || 0) * 26
  const pctSum = basicPct + housingPct + transportPct
  const pctOk  = pctSum === 100

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
          disabled={saving || !pctOk}
          className="flex items-center gap-1.5 bg-primary-600 text-white text-sm font-semibold px-4 py-2 rounded-lg active:bg-primary-700 disabled:opacity-60"
        >
          <Save size={16} />
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Salary */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Salary</h2>

          {/* Salary type toggle */}
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

          {salaryType === 'monthly' ? (
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Gross Monthly Salary</label>
              <input
                type="number"
                value={grossMonthly}
                onChange={e => setGrossMonthly(e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
              />
            </div>
          ) : (
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Daily Rate</label>
              <input
                type="number"
                value={dailyRate}
                onChange={e => setDailyRate(e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                Estimated monthly = {(Number(dailyRate) || 0) * 26} (26 working days)
              </p>
            </div>
          )}
        </section>

        {/* Salary structure */}
        {gross > 0 && (
          <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Salary Structure</h2>
              {!pctOk && (
                <span className="text-xs text-red-500 font-medium">Must total 100% (now {pctSum}%)</span>
              )}
            </div>
            {[
              { label: 'Basic',     pct: basicPct,     set: setBasicPct },
              { label: 'Housing',   pct: housingPct,   set: setHousingPct },
              { label: 'Transport', pct: transportPct, set: setTransportPct },
            ].map(({ label, pct, set }) => (
              <div key={label}>
                <label className="text-xs text-gray-500 font-medium mb-1 flex justify-between">
                  <span>{label}</span>
                  <span>{(gross * pct / 100).toFixed(0)}</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0} max={100}
                    value={pct}
                    onChange={e => set(Number(e.target.value))}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    value={pct}
                    onChange={e => set(Number(e.target.value))}
                    className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center"
                    min={0} max={100}
                  />
                  <span className="text-xs text-gray-500">%</span>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Tax */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Tax & Reliefs</h2>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Tax ID (optional)</label>
            <input
              type="text"
              value={taxId}
              onChange={e => setTaxId(e.target.value)}
              placeholder="TIN / KRA PIN / TIN GH"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Annual Rent Paid (for rent relief)</label>
            <input
              type="number"
              value={annualRent}
              onChange={e => setAnnualRent(e.target.value)}
              placeholder="0.00"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
            />
          </div>
          {annualRent && Number(annualRent) > 0 && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rentDocs}
                onChange={e => setRentDocs(e.target.checked)}
                className="w-4 h-4 rounded text-primary-600"
              />
              <span className="text-sm text-gray-700">Has rent documentation (receipt / tenancy agreement)</span>
            </label>
          )}
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Annual Life Insurance Premium (for relief)</label>
            <input
              type="number"
              value={lifeInsurance}
              onChange={e => setLifeInsurance(e.target.value)}
              placeholder="0.00"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
            />
          </div>
        </section>

        {/* Statutory elections */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Statutory Elections</h2>
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm text-gray-900">Pension Applicable</p>
              <p className="text-xs text-gray-500">Deduct employee pension contribution</p>
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
                placeholder="RSA/NSSF PIN"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
              />
            </div>
          )}
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm text-gray-900">NHF Applicable</p>
              <p className="text-xs text-gray-500">National Housing Fund (Nigeria only)</p>
            </div>
            <input
              type="checkbox"
              checked={nhfApply}
              onChange={e => setNhfApply(e.target.checked)}
              className="w-5 h-5 rounded text-primary-600"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm text-gray-900">NHIS Applicable</p>
              <p className="text-xs text-gray-500">National Health Insurance (Nigeria only)</p>
            </div>
            <input
              type="checkbox"
              checked={nhisApply}
              onChange={e => setNhisApply(e.target.checked)}
              className="w-5 h-5 rounded text-primary-600"
            />
          </label>
        </section>

        {/* Bank details */}
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

        {/* Custom deductions */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Other Deductions</h2>
            <button
              onClick={addDeduction}
              className="flex items-center gap-1 text-xs text-primary-600 font-medium"
            >
              <Plus size={14} />
              Add
            </button>
          </div>
          {otherDeductions.length === 0 && (
            <p className="text-xs text-gray-400">No custom deductions. Add loans, advances, etc.</p>
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
          Payroll calculations are estimates only. Always verify statutory rates with a tax professional.
        </p>
      </div>
    </div>
  )
}
