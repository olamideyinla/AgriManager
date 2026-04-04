/**
 * PayrollSettingsPage — configure org-level payroll settings.
 * MANAGEMENT TOOL DISCLAIMER: Not a licensed payroll processor.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Save } from 'lucide-react'
import { useAuthStore } from '../../stores/auth-store'
import { db } from '../../core/database/db'
import { nowIso } from '../../shared/types/base'
import { getSupportedPayrollCountries } from './profiles'
import type { PayrollSettings } from '../../shared/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function newId() {
  return crypto.randomUUID()
}

const COUNTRIES = getSupportedPayrollCountries()

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PayrollSettingsPage() {
  const navigate       = useNavigate()
  const organizationId = useAuthStore(s => s.appUser?.organizationId)

  const existing = useLiveQuery(async () => {
    if (!organizationId) return null
    return db.payrollSettings.where('organizationId').equals(organizationId).first()
  }, [organizationId])

  // Form state
  const [countryCode,           setCountryCode]           = useState('NG')
  const [isRegisteredEmployer,  setIsRegisteredEmployer]  = useState(false)
  const [employerTaxId,         setEmployerTaxId]         = useState('')
  const [pensionEnrolled,       setPensionEnrolled]       = useState(true)
  const [pfaName,               setPfaName]               = useState('')
  const [pfaAccountNumber,      setPfaAccountNumber]      = useState('')
  const [stateOfOperation,      setStateOfOperation]      = useState('')
  const [nhfEnrolled,           setNhfEnrolled]           = useState(false)
  const [nhisEnrolled,          setNhisEnrolled]          = useState(false)
  const [payDay,                setPayDay]                = useState(25)
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  // Pre-fill from existing settings
  useEffect(() => {
    if (!existing) return
    setCountryCode(existing.countryCode)
    setIsRegisteredEmployer(existing.isRegisteredEmployer)
    setEmployerTaxId(existing.employerTaxId ?? '')
    setPensionEnrolled(existing.pensionEnrolled)
    setPfaName(existing.pfaName ?? '')
    setPfaAccountNumber(existing.pfaAccountNumber ?? '')
    setStateOfOperation(existing.stateOfOperation ?? '')
    setNhfEnrolled(existing.nhfEnrolled)
    setNhisEnrolled(existing.nhisEnrolled)
    setPayDay(existing.payDay)
  }, [existing])

  if (!organizationId) return null

  const isNigeria = countryCode === 'NG'

  async function handleSave() {
    if (!organizationId) return
    setSaving(true)
    const ts = nowIso()
    const settings: PayrollSettings = {
      id:                   existing?.id ?? newId(),
      organizationId,
      countryCode,
      isRegisteredEmployer,
      employerTaxId:        employerTaxId.trim() || null,
      pensionEnrolled,
      pfaName:              pfaName.trim() || null,
      pfaAccountNumber:     pfaAccountNumber.trim() || null,
      stateOfOperation:     stateOfOperation.trim() || null,
      nhfEnrolled,
      nhisEnrolled,
      payDay:               Math.min(28, Math.max(1, payDay)),
      payrollRateOverrides: existing?.payrollRateOverrides ?? [],
      defaultSalaryStructure: existing?.defaultSalaryStructure ?? null,
      syncStatus:           'pending',
      createdAt:            existing?.createdAt ?? ts,
      updatedAt:            ts,
    }
    await db.payrollSettings.put(settings)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col safe-top safe-bottom">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="touch-target text-gray-500">
          <ArrowLeft size={22} />
        </button>
        <h1 className="flex-1 text-lg font-bold text-gray-900">Payroll Settings</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 bg-primary-600 text-white text-sm font-semibold px-4 py-2 rounded-lg active:bg-primary-700 disabled:opacity-60"
        >
          <Save size={16} />
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Country */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Country & Tax Jurisdiction</h2>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Country</label>
            <select
              value={countryCode}
              onChange={e => setCountryCode(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white"
            >
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Sets tax brackets, statutory deductions, and currency for payroll calculations.
            </p>
          </div>
          {isNigeria && (
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">State of Operation</label>
              <input
                type="text"
                value={stateOfOperation}
                onChange={e => setStateOfOperation(e.target.value)}
                placeholder="e.g. Lagos"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
              />
            </div>
          )}
        </section>

        {/* Employer registration */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Employer Registration</h2>
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm text-gray-900">Registered Employer</p>
              <p className="text-xs text-gray-500">Has a Tax Identification Number with the revenue authority</p>
            </div>
            <input
              type="checkbox"
              checked={isRegisteredEmployer}
              onChange={e => setIsRegisteredEmployer(e.target.checked)}
              className="w-5 h-5 rounded text-primary-600"
            />
          </label>
          {isRegisteredEmployer && (
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">
                {isNigeria ? 'FIRS TIN' : countryCode === 'KE' ? 'PIN' : 'Employer TIN'}
              </label>
              <input
                type="text"
                value={employerTaxId}
                onChange={e => setEmployerTaxId(e.target.value)}
                placeholder="e.g. 1234567-0001"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
              />
            </div>
          )}
        </section>

        {/* Pension / PFA */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Pension</h2>
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm text-gray-900">Pension Enrolled</p>
              <p className="text-xs text-gray-500">
                {isNigeria ? 'Employee 8% + Employer 10% on pensionable emoluments' : 'Statutory pension contributions'}
              </p>
            </div>
            <input
              type="checkbox"
              checked={pensionEnrolled}
              onChange={e => setPensionEnrolled(e.target.checked)}
              className="w-5 h-5 rounded text-primary-600"
            />
          </label>
          {pensionEnrolled && isNigeria && (
            <>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">PFA Name</label>
                <input
                  type="text"
                  value={pfaName}
                  onChange={e => setPfaName(e.target.value)}
                  placeholder="e.g. Stanbic IBTC Pensions"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">PFA Account Number</label>
                <input
                  type="text"
                  value={pfaAccountNumber}
                  onChange={e => setPfaAccountNumber(e.target.value)}
                  placeholder="Pension Fund Account Number"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                />
              </div>
            </>
          )}
        </section>

        {/* Nigeria-only: NHF & NHIS */}
        {isNigeria && (
          <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">Nigeria-Specific Schemes</h2>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm text-gray-900">NHF Enrolled</p>
                <p className="text-xs text-gray-500">National Housing Fund — 2.5% of gross monthly salary</p>
              </div>
              <input
                type="checkbox"
                checked={nhfEnrolled}
                onChange={e => setNhfEnrolled(e.target.checked)}
                className="w-5 h-5 rounded text-primary-600"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm text-gray-900">NHIS Enrolled</p>
                <p className="text-xs text-gray-500">National Health Insurance — 5% employee / 10% employer on basic</p>
              </div>
              <input
                type="checkbox"
                checked={nhisEnrolled}
                onChange={e => setNhisEnrolled(e.target.checked)}
                className="w-5 h-5 rounded text-primary-600"
              />
            </label>
          </section>
        )}

        {/* Pay day */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Pay Schedule</h2>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Pay Day of Month</label>
            <input
              type="number"
              value={payDay}
              onChange={e => setPayDay(Number(e.target.value))}
              min={1} max={28}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">Day 1–28. Shown on payslips.</p>
          </div>
        </section>

        {/* Disclaimer */}
        <p className="text-xs text-gray-400 text-center px-4 pb-4">
          AgriManagerX is a management tool, not a licensed payroll processor.
          Tax rates and thresholds shown are for guidance only. Always verify with a qualified tax professional.
        </p>
      </div>
    </div>
  )
}
