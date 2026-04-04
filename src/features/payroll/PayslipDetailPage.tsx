/**
 * PayslipDetailPage — view a single payslip, download PDF, or share via WhatsApp.
 * Route: /payroll/payslip/:payslipId
 * MANAGEMENT TOOL DISCLAIMER: Not a licensed payroll processor.
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Download, Share2, Info } from 'lucide-react'
import { useAuthStore } from '../../stores/auth-store'
import { db } from '../../core/database/db'
import { generatePayslipPDF, generatePayslipText } from './services/payslip-pdf'
import { getPayrollProfile } from './profiles'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPeriod(period: string): string {
  const [y, m] = period.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({ title, rows, totalLabel, total, currency }: {
  title: string
  rows: { name: string; amount: number }[]
  totalLabel: string
  total: number
  currency: string
}) {
  const symbols: Record<string, string> = { NGN: '₦', KES: 'KSh', GHS: 'GH₵' }
  const sym = symbols[currency] ?? currency

  function fmtAmt(n: number) {
    return `${sym}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{title}</p>
      </div>
      {rows.map(row => (
        <div key={row.name} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50">
          <span className="text-sm text-gray-700">{row.name}</span>
          <span className="text-sm font-medium text-gray-900">{fmtAmt(row.amount)}</span>
        </div>
      ))}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50">
        <span className="text-sm font-bold text-gray-900">{totalLabel}</span>
        <span className="text-sm font-bold text-gray-900">{fmtAmt(total)}</span>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PayslipDetailPage() {
  const navigate      = useNavigate()
  const { payslipId } = useParams<{ payslipId: string }>()
  const organizationId = useAuthStore(s => s.appUser?.organizationId)
  const [exporting, setExporting] = useState(false)

  const payslip = useLiveQuery(async () => {
    if (!payslipId) return null
    return db.payslipRecords.get(payslipId)
  }, [payslipId])

  const settings = useLiveQuery(async () => {
    if (!organizationId) return null
    return db.payrollSettings.where('organizationId').equals(organizationId).first()
  }, [organizationId])

  const org = useLiveQuery(async () => {
    if (!organizationId) return null
    return db.organizations.get(organizationId)
  }, [organizationId])

  if (!payslip || !settings || !org) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading payslip…</p>
      </div>
    )
  }

  const profile = getPayrollProfile(settings.countryCode)
  if (!profile) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center px-8 text-center">
        <p className="text-red-500 text-sm">No payroll profile for country: {settings.countryCode}</p>
      </div>
    )
  }

  const currency = profile.currency

  async function handleDownloadPDF() {
    if (!payslip || !settings || !org || !profile) return
    setExporting(true)
    try {
      const blob = generatePayslipPDF(payslip, settings, profile, org.name)
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `payslip-${payslip.workerName.replace(/\s+/g, '-')}-${payslip.period}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  function handleWhatsApp() {
    if (!payslip || !org || !profile) return
    const text = generatePayslipText(payslip, profile, org.name)
    const encoded = encodeURIComponent(text)
    window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener noreferrer')
  }

  const symbols: Record<string, string> = { NGN: '₦', KES: 'KSh', GHS: 'GH₵' }
  const sym = symbols[currency] ?? currency
  function fmtAmt(n: number) {
    return `${sym}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col safe-top safe-bottom">
      {/* Header */}
      <div className="bg-primary-700 px-4 pt-4 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="touch-target text-white/80">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-white font-bold text-lg flex-1">Payslip</h1>
          <button
            onClick={handleDownloadPDF}
            disabled={exporting}
            className="touch-target text-white/80"
          >
            <Download size={20} />
          </button>
          <button
            onClick={handleWhatsApp}
            className="touch-target text-white/80"
          >
            <Share2 size={20} />
          </button>
        </div>

        {/* Worker + period */}
        <div>
          <p className="text-white font-bold text-xl">{payslip.workerName}</p>
          <p className="text-white/70 text-sm">{fmtPeriod(payslip.period)}</p>
        </div>

        {/* Net pay hero */}
        <div className="mt-4 bg-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-white/70 text-xs font-medium uppercase tracking-wide">Net Pay</p>
            <p className="text-white text-2xl font-bold">{fmtAmt(payslip.netPay)}</p>
          </div>
          <div className="text-right">
            <p className="text-white/70 text-xs">Gross</p>
            <p className="text-white font-semibold">{fmtAmt(payslip.grossPay)}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 -mt-2">
        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
          <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Management tool only. Verify statutory deductions with a qualified tax professional.
          </p>
        </div>

        {/* Earnings */}
        <Section
          title="Earnings"
          rows={payslip.earnings}
          totalLabel="GROSS PAY"
          total={payslip.grossPay}
          currency={currency}
        />

        {/* Deductions */}
        <Section
          title="Deductions"
          rows={payslip.deductions.map(d => ({ name: `${d.name} (${d.shortCode})`, amount: d.amount }))}
          totalLabel="TOTAL DEDUCTIONS"
          total={payslip.totalDeductions}
          currency={currency}
        />

        {/* Employer contributions */}
        {payslip.employerContributions.length > 0 && (
          <Section
            title="Employer Contributions (not deducted from worker)"
            rows={payslip.employerContributions.map(c => ({ name: `${c.name} (${c.shortCode})`, amount: c.amount }))}
            totalLabel="TOTAL EMPLOYER COST"
            total={payslip.totalEmployerCost}
            currency={currency}
          />
        )}

        {/* Applied reliefs */}
        {payslip.appliedReliefs.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Tax Reliefs Applied</p>
            {payslip.appliedReliefs.map(r => (
              <div key={r.name} className="flex justify-between py-1">
                <span className="text-sm text-gray-600">{r.name}</span>
                <span className="text-sm text-emerald-700">{fmtAmt(r.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t border-gray-100 mt-1">
              <span className="text-xs text-gray-500">Taxable Income</span>
              <span className="text-xs font-semibold text-gray-700">{fmtAmt(payslip.taxableIncome)}</span>
            </div>
          </div>
        )}

        {/* Assumptions */}
        {payslip.assumptions.length > 0 && (
          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Assumptions</p>
            {payslip.assumptions.map((a, i) => (
              <p key={i} className="text-xs text-gray-500 mb-1">• {a}</p>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleDownloadPDF}
            disabled={exporting}
            className="flex-1 flex items-center justify-center gap-2 bg-primary-600 text-white text-sm font-semibold py-3 rounded-xl active:bg-primary-700 disabled:opacity-60"
          >
            <Download size={16} />
            {exporting ? 'Generating…' : 'Download PDF'}
          </button>
          <button
            onClick={handleWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white text-sm font-semibold py-3 rounded-xl active:bg-[#1ebe57]"
          >
            <Share2 size={16} />
            WhatsApp
          </button>
        </div>

        {/* Footer disclaimer */}
        <p className="text-xs text-gray-400 text-center pb-4">
          Generated by AgriManagerX — management tool only.<br />
          {profile.sourceNotes.split('.')[0]}. Last verified: {profile.lastVerified}
        </p>
      </div>
    </div>
  )
}
